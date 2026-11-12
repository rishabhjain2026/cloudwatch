/**
 * Real system metric collection.
 * Linux: reads /proc/stat, /proc/meminfo, /proc/net/dev, runs df
 * Windows: uses os module + wmic for disk, PowerShell for CPU
 * Never fabricates values — returns null for unavailable readings.
 */

import os from 'node:os';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const IS_LINUX = process.platform === 'linux';
const IS_WIN = process.platform === 'win32';

// ── CPU ───────────────────────────────────────────────────────────────────────
let prevCpu = null;

async function readLinuxCpuTimes() {
  const stat = await fs.readFile('/proc/stat', 'utf8');
  const parts = stat.split('\n')[0].split(/\s+/).slice(1).map(Number);
  const idle = parts[3] + (parts[4] || 0);
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}

async function getWindowsCpuPercent() {
  try {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile', '-Command',
      'Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average'
    ], { timeout: 8000 });
    const val = parseFloat(stdout.trim());
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

export async function getCpuUsage() {
  if (IS_LINUX) {
    try {
      const current = await readLinuxCpuTimes();
      if (!prevCpu) {
        prevCpu = current;
        await new Promise(r => setTimeout(r, 200));
        const second = await readLinuxCpuTimes();
        const idleDelta = second.idle - current.idle;
        const totalDelta = second.total - current.total;
        prevCpu = second;
        return totalDelta === 0 ? 0 : Number(((1 - idleDelta / totalDelta) * 100).toFixed(2));
      }
      const idleDelta = current.idle - prevCpu.idle;
      const totalDelta = current.total - prevCpu.total;
      prevCpu = current;
      return totalDelta === 0 ? 0 : Number(((1 - idleDelta / totalDelta) * 100).toFixed(2));
    } catch { return null; }
  }
  if (IS_WIN) return getWindowsCpuPercent();
  return null;
}

// ── Memory ────────────────────────────────────────────────────────────────────
export async function getMemory() {
  if (IS_LINUX) {
    try {
      const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
      const parse = key => {
        const m = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'));
        return m ? parseInt(m[1], 10) * 1024 : null;
      };
      const total = parse('MemTotal');
      const available = parse('MemAvailable');
      if (total && available != null) {
        const used = total - available;
        return { totalBytes: total, usedBytes: used, availableBytes: available, usagePercent: Number(((used / total) * 100).toFixed(2)) };
      }
    } catch {}
  }
  // Windows + macOS fallback — os module gives real values
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return { totalBytes: total, usedBytes: used, availableBytes: free, usagePercent: Number(((used / total) * 100).toFixed(2)) };
}

// ── Disk ──────────────────────────────────────────────────────────────────────
export async function getDisk() {
  if (IS_LINUX) {
    try {
      const { stdout } = await execFileAsync('df', ['-B1', '--output=size,used,avail,pcent', '/'], { timeout: 5000 });
      const parts = stdout.trim().split('\n')[1].trim().split(/\s+/);
      return {
        totalBytes: parseInt(parts[0], 10),
        usedBytes: parseInt(parts[1], 10),
        availableBytes: parseInt(parts[2], 10),
        usagePercent: parseFloat(parts[3]),
        mountpoint: '/',
      };
    } catch { return null; }
  }
  if (IS_WIN) {
    try {
      const { stdout } = await execFileAsync('wmic', ['logicaldisk', 'where', 'DeviceID="C:"', 'get', 'Size,FreeSpace', '/format:csv'], { timeout: 8000 });
      const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
      if (lines.length) {
        const parts = lines[0].trim().split(',');
        const free = parseInt(parts[1], 10);
        const total = parseInt(parts[2], 10);
        if (!isNaN(free) && !isNaN(total) && total > 0) {
          const used = total - free;
          return { totalBytes: total, usedBytes: used, availableBytes: free, usagePercent: Number(((used / total) * 100).toFixed(2)), mountpoint: 'C:' };
        }
      }
    } catch {}
  }
  return null;
}

// ── Network ───────────────────────────────────────────────────────────────────
let prevNet = null;
let prevNetTime = null;

async function readLinuxNetBytes() {
  const netdev = await fs.readFile('/proc/net/dev', 'utf8');
  let rx = 0, tx = 0, iface = null;
  for (const line of netdev.split('\n').slice(2)) {
    const t = line.trim();
    if (!t) continue;
    const [name, ...f] = t.split(/\s+/);
    const n = name.replace(':', '');
    if (n === 'lo') continue;
    rx += parseInt(f[0], 10) || 0;
    tx += parseInt(f[8], 10) || 0;
    if (!iface) iface = n;
  }
  return { rx, tx, iface };
}

export async function getNetwork() {
  const now = Date.now();
  let current = null;

  if (IS_LINUX) {
    try { current = await readLinuxNetBytes(); } catch {}
  }

  if (!current) {
    // Windows/macOS: use os.networkInterfaces() byte counters (not available in Node)
    // Return null throughput but still report the interface
    const ifaces = os.networkInterfaces();
    const iface = Object.keys(ifaces).find(n => !n.includes('Loopback') && !n.includes('lo'));
    return { rxBytes: null, txBytes: null, rxThroughputBps: null, txThroughputBps: null, interface: iface || null };
  }

  if (!prevNet || !prevNetTime) {
    prevNet = current;
    prevNetTime = now;
    return { rxBytes: current.rx, txBytes: current.tx, rxThroughputBps: null, txThroughputBps: null, interface: current.iface };
  }

  const elapsedSec = (now - prevNetTime) / 1000;
  const rxBps = elapsedSec > 0 ? Math.max(0, (current.rx - prevNet.rx) / elapsedSec) : null;
  const txBps = elapsedSec > 0 ? Math.max(0, (current.tx - prevNet.tx) / elapsedSec) : null;
  prevNet = current;
  prevNetTime = now;

  return {
    rxBytes: current.rx,
    txBytes: current.tx,
    rxThroughputBps: rxBps != null ? Number(rxBps.toFixed(0)) : null,
    txThroughputBps: txBps != null ? Number(txBps.toFixed(0)) : null,
    interface: current.iface,
  };
}

// ── Load average ──────────────────────────────────────────────────────────────
export function getLoad() {
  const [avg1, avg5, avg15] = os.loadavg();
  // Windows always returns [0,0,0] — mark as unavailable
  if (IS_WIN && avg1 === 0 && avg5 === 0 && avg15 === 0) return null;
  return { avg1, avg5, avg15 };
}

// ── System info ───────────────────────────────────────────────────────────────
export async function getSystemInfo() {
  let kernelVersion = os.release();
  if (IS_LINUX) {
    try {
      const { stdout } = await execFileAsync('uname', ['-r'], { timeout: 3000 });
      kernelVersion = stdout.trim();
    } catch {}
  }
  return {
    hostname: os.hostname(),
    platform: process.platform,
    os: `${os.type()} ${os.release()}`,
    kernelVersion,
    uptimeSec: Math.floor(os.uptime()),
    arch: os.arch(),
  };
}

// ── Collect everything ────────────────────────────────────────────────────────
export async function collectAll() {
  const [cpu, memory, disk, network, sysinfo] = await Promise.all([
    getCpuUsage(),
    getMemory(),
    getDisk(),
    getNetwork(),
    getSystemInfo(),
  ]);
  const load = getLoad();

  const payload = { collectedAt: new Date().toISOString() };
  if (cpu != null) payload.cpu = { usagePercent: cpu };
  if (memory) payload.memory = memory;
  if (disk) payload.disk = disk;
  if (network && (network.rxThroughputBps != null || network.rxBytes != null)) payload.network = network;
  if (load) payload.load = load;

  return { payload, sysinfo };
}
