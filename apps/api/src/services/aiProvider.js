import { env } from '../config/env.js';

export function aiProviderStatus() {
  const configured = Boolean(env.AI_ANALYSIS_ENABLED && env.AI_PROVIDER && env.AI_API_KEY && env.AI_MODEL);
  return { configured, provider: env.AI_PROVIDER || null, model: configured ? env.AI_MODEL : null, enabled: env.AI_ANALYSIS_ENABLED };
}

export function getAiProvider() {
  const status = aiProviderStatus();
  if (!env.AI_ANALYSIS_ENABLED) throw Object.assign(new Error('AI analysis is disabled'), { code: 'AI_DISABLED' });
  if (!status.configured) throw Object.assign(new Error('AI provider is not configured'), { code: 'AI_NOT_CONFIGURED' });
  if (!['openai', 'openai-compatible'].includes(env.AI_PROVIDER.toLowerCase())) throw Object.assign(new Error('Configured AI provider is not supported'), { code: 'AI_PROVIDER_UNSUPPORTED' });
  return {
    name: env.AI_PROVIDER.toLowerCase(),
    model: env.AI_MODEL,
    async complete({ messages, json = false, maxTokens = 3000 }) {
      const baseUrl = (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      let response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: env.AI_MODEL, messages, temperature: 0.1, max_tokens: maxTokens, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
          signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
        });
      } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') throw Object.assign(new Error('AI provider request timed out'), { code: 'AI_TIMEOUT' });
        throw Object.assign(new Error('AI provider could not be reached'), { code: 'AI_UNAVAILABLE' });
      }
      if (response.status === 429) throw Object.assign(new Error('AI provider rate limit reached'), { code: 'AI_RATE_LIMITED' });
      if (response.status === 401 || response.status === 403) throw Object.assign(new Error('AI provider rejected the configured credentials'), { code: 'AI_AUTH_FAILED' });
      if (!response.ok) throw Object.assign(new Error('AI provider returned an unsuccessful response'), { code: 'AI_UPSTREAM_ERROR' });
      let payload;
      try { payload = await response.json(); } catch { throw Object.assign(new Error('AI provider returned invalid JSON'), { code: 'AI_INVALID_RESPONSE' }); }
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw Object.assign(new Error('AI provider response did not include message content'), { code: 'AI_INVALID_RESPONSE' });
      return content;
    },
  };
}
