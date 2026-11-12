import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { hashToken } from '../utils/crypto.js';
import { fail } from '../utils/response.js';

// Every agent token starts with this literal prefix followed by 48 hex chars.
// Format: ip_agent_<48 hex chars> = 9 + 48 = 57 characters total.
const TOKEN_PREFIX_LITERAL = 'ip_agent_';
const TOKEN_TOTAL_LENGTH = 57; // "ip_agent_" (9) + randomBytes(24).toString('hex') (48)
const TOKEN_DB_PREFIX_LENGTH = 16; // first 16 chars stored in Agent.tokenPrefix for fast lookup

/**
 * Timing-safe comparison of two hex strings.
 *
 * crypto.timingSafeEqual requires both Buffers to be the same length.
 * SHA-256 always produces a 64-char hex string, so both sides are always
 * equal length here. We still guard against length mismatch to be safe.
 */
function safeCompareHex(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * requireAgentAuth middleware
 *
 * Reads the Authorization: Bearer <token> header, verifies the token
 * against the database, and attaches req.agent and req.server.
 *
 * Rejects:
 *   - Missing or malformed Authorization header
 *   - Tokens that do not match the expected format
 *   - Tokens whose prefix does not match any Agent record
 *   - Tokens whose full SHA-256 hash does not match Agent.tokenHash
 *   - Agents with status REVOKED
 *   - Agents with status PENDING
 *
 * On success:
 *   - req.agent  → the Agent row (without tokenHash — never forwarded)
 *   - req.server → the Server row associated with this agent
 */
export async function requireAgentAuth(req, res, next) {
  try {
    // ── 1. Extract the raw token from the Authorization header ──────────────
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return fail(res, 401, 'AGENT_AUTH_FAILED', 'Agent authentication required');
    }

    const rawToken = authHeader.slice(7); // remove "Bearer " prefix

    // ── 2. Structural validation — reject garbage before hitting the DB ──────
    // This is not security — it is a fast sanity check that avoids a DB round
    // trip for obviously invalid tokens (e.g. someone sending a JWT by mistake).
    if (
      !rawToken.startsWith(TOKEN_PREFIX_LITERAL) ||
      rawToken.length !== TOKEN_TOTAL_LENGTH
    ) {
      return fail(res, 401, 'AGENT_AUTH_FAILED', 'Agent authentication required');
    }

    // ── 3. Extract the DB lookup prefix (first 16 chars) ────────────────────
    // The Agent table has @@index([tokenPrefix]) so this is an indexed lookup.
    const tokenPrefix = rawToken.slice(0, TOKEN_DB_PREFIX_LENGTH);

    // ── 4. Find the agent by prefix ──────────────────────────────────────────
    // We include the server so we can attach it to req without a second query.
    const agent = await prisma.agent.findFirst({
      where: { tokenPrefix },
      include: { server: true },
    });

    // Use the same error for "not found" and "hash mismatch" to prevent
    // an attacker from learning whether a given prefix exists in the DB.
    if (!agent) {
      return fail(res, 401, 'AGENT_AUTH_FAILED', 'Agent authentication required');
    }

    // ── 5. Check agent status before doing the expensive hash comparison ─────
    // REVOKED and PENDING get distinct error codes so the operator knows why
    // their agent is being rejected (these are not security-sensitive — the
    // operator already knows their own token prefix).
    if (agent.status === 'REVOKED') {
      return fail(res, 401, 'AGENT_REVOKED', 'Agent token has been revoked');
    }

    if (agent.status === 'PENDING') {
      return fail(res, 401, 'AGENT_PENDING', 'Agent is pending activation');
    }

    // ── 6. Timing-safe hash verification ────────────────────────────────────
    // Compute SHA-256 of the incoming token and compare to the stored hash.
    // safeCompareHex uses crypto.timingSafeEqual to prevent timing attacks.
    const incomingHash = hashToken(rawToken);
    if (!safeCompareHex(incomingHash, agent.tokenHash)) {
      return fail(res, 401, 'AGENT_AUTH_FAILED', 'Agent authentication required');
    }

    // ── 7. Attach agent and server to the request ────────────────────────────
    // We deliberately omit tokenHash from what we attach — downstream handlers
    // should never need it and we do not want it accidentally logged or returned.
    req.agent = {
      id: agent.id,
      serverId: agent.serverId,
      status: agent.status,
      permissions: agent.permissions,
      lastSeenAt: agent.lastSeenAt,
    };
    req.server = agent.server;

    return next();
  } catch (err) {
    // Pass unexpected errors (e.g. DB connection failure) to the central
    // error handler rather than leaking stack traces to the caller.
    return next(err);
  }
}
