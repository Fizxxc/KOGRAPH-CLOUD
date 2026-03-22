import { promises as fs } from 'fs';
import path from 'path';
import { EVENTS_LOG, VAULT_DIR, ensureDataDirs } from './fs';

type Severity = 'info' | 'warn' | 'critical';

type SecurityEvent = {
  timestamp: string;
  level: Severity;
  message: string;
  meta?: Record<string, string | number | boolean | undefined>;
};

type GuardState = {
  recentFailures: Record<string, { count: number; lastAt: number }>;
  burnArmedUntil: Record<string, number>;
  lastHeartbeatAt: number;
};

const guardState: GuardState = globalThis.__kographState ?? {
  recentFailures: {},
  burnArmedUntil: {},
  lastHeartbeatAt: 0
};

declare global {
  var __kographState: GuardState | undefined;
}

globalThis.__kographState = guardState;

function sourceFromIp(raw?: string | null) {
  return raw?.split(',')[0]?.trim() || 'local-client';
}

export async function logSecurityEvent(event: SecurityEvent) {
  await ensureDataDirs();
  const line = JSON.stringify(event);
  await fs.appendFile(EVENTS_LOG, `${line}\n`, 'utf8');

  const consoleMethod = event.level === 'critical' ? console.error : event.level === 'warn' ? console.warn : console.log;
  consoleMethod(`[Kograph.INT][${event.level.toUpperCase()}] ${event.message}`, event.meta ?? '');
}

export async function heartbeat() {
  const now = Date.now();
  if (now - guardState.lastHeartbeatAt < 55_000) {
    return;
  }
  guardState.lastHeartbeatAt = now;
  await logSecurityEvent({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Kograph.INT sentinel online - 24/7 watch active',
    meta: { mode: process.env.VERCEL ? 'vercel' : 'local-cmd', watchedPath: VAULT_DIR }
  });
}

export async function recordFailure(ip?: string | null) {
  const source = sourceFromIp(ip);
  const current = guardState.recentFailures[source] ?? { count: 0, lastAt: 0 };
  const withinWindow = Date.now() - current.lastAt < 10 * 60 * 1000;
  const nextCount = withinWindow ? current.count + 1 : 1;

  guardState.recentFailures[source] = { count: nextCount, lastAt: Date.now() };

  if (nextCount >= 3) {
    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Suspicious repeated decrypt failures detected',
      meta: { source, failures: nextCount }
    });
  }

  if (nextCount >= 5) {
    guardState.burnArmedUntil[source] = Date.now() + 5 * 60 * 1000;
    await logSecurityEvent({
      timestamp: new Date().toISOString(),
      level: 'critical',
      message: 'Burn protocol threshold reached',
      meta: { source, failures: nextCount, action: 'burn-armed' }
    });
    return true;
  }

  return false;
}

export async function resetFailures(ip?: string | null) {
  const source = sourceFromIp(ip);
  delete guardState.recentFailures[source];
  delete guardState.burnArmedUntil[source];
}

export async function readSecurityLog(limit = 80) {
  await ensureDataDirs();
  try {
    const content = await fs.readFile(EVENTS_LOG, 'utf8');
    const rows = content.trim().split('\n').filter(Boolean).slice(-limit).reverse();
    return rows.map((row) => JSON.parse(row) as SecurityEvent);
  } catch {
    return [] as SecurityEvent[];
  }
}

export function getClientIp(headers: Headers) {
  return headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'local-client';
}

export async function deleteAllVaultFiles() {
  await ensureDataDirs();
  const entries = await fs.readdir(VAULT_DIR);
  await Promise.all(entries.map((entry) => fs.unlink(path.join(VAULT_DIR, entry))));
  await logSecurityEvent({
    timestamp: new Date().toISOString(),
    level: 'critical',
    message: 'Vault contents wiped after burn protocol',
    meta: { deletedFiles: entries.length }
  });
}
