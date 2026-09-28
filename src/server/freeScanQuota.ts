import { randomUUID } from 'node:crypto';
import { hash, storageRpc } from './searchStore.js';
import type { FreeUsage } from '../lib/trustScore.js';

export const FREE_SCAN_LIMIT = 3;
type StorageResult = {
  status: 'available' | 'reserved' | 'existing' | 'limited' | 'completed' | 'released' | 'invalid';
  monthKey?: string;
  used?: number;
  remaining?: number;
  leaseKey?: string;
};
export type FreeReservation = { accountKey: string; jobKey: string; monthKey: string; leaseKey: string | null; existing: boolean };

function monthReset(monthKey: string): string {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error('Invalid scan allowance response');
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return new Date(Date.UTC(year, month, 1)).toISOString();
}
function usageFrom(result: StorageResult): FreeUsage {
  const used = result.used;
  if (!Number.isInteger(used) || used! < 0 || used! > FREE_SCAN_LIMIT || !result.monthKey) throw new Error('Invalid scan allowance response');
  return { limit: FREE_SCAN_LIMIT, used: used!, remaining: Math.max(0, Math.min(FREE_SCAN_LIMIT, result.remaining ?? FREE_SCAN_LIMIT - used!)), resetsAt: monthReset(result.monthKey) };
}
export function freeJobKey(input: { url?: string | null; title: string; company: string; location?: string | null }): string {
  let linkedinId: string | null = null;
  try {
    const url = new URL(input.url ?? '');
    if (url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname)) {
      linkedinId = url.pathname.match(/^\/jobs\/view\/(?:.*-)?([0-9]+)\/?$/)?.[1] ?? null;
    }
  } catch { /* A manual scan may have no job URL. */ }
  return hash(linkedinId
    ? ['linkedin', linkedinId]
    : ['manual', input.company.trim().toLowerCase(), input.title.trim().toLowerCase(), (input.location ?? '').trim().toLowerCase()]);
}
export async function freeUsage(userId: string): Promise<FreeUsage> {
  const result = await storageRpc<StorageResult>('ghostjob_free_scan', { p_action: 'status', p_account_key: hash(userId) });
  if (result.status !== 'available') throw new Error('Scan allowance unavailable');
  return usageFrom(result);
}
export async function reserveFreeScan(userId: string, input: { url?: string | null; title: string; company: string; location?: string | null }): Promise<{ reservation: FreeReservation | null; usage: FreeUsage; limited: boolean; inProgress: boolean }> {
  const accountKey = hash(userId);
  const jobKey = freeJobKey(input);
  const leaseKey = randomUUID();
  const result = await storageRpc<StorageResult>('ghostjob_free_scan', {
    p_action: 'reserve', p_account_key: accountKey, p_job_key: jobKey, p_lease_key: leaseKey,
  });
  if (!['reserved', 'existing', 'limited'].includes(result.status) || !result.monthKey) throw new Error('Scan allowance unavailable');
  const usage = usageFrom(result);
  if (result.status === 'limited') return { reservation: null, usage: { ...usage, remaining: 0 }, limited: true, inProgress: false };
  if (result.status === 'reserved' && !result.leaseKey) throw new Error('Scan allowance unavailable');
  if (result.status === 'reserved' && result.leaseKey !== leaseKey) {
    return { reservation: null, usage, limited: false, inProgress: true };
  }
  return {
    reservation: { accountKey, jobKey, monthKey: result.monthKey, leaseKey: result.status === 'reserved' ? result.leaseKey! : null, existing: result.status === 'existing' },
    usage, limited: false, inProgress: false,
  };
}
export async function finishFreeScan(reservation: FreeReservation, success: boolean): Promise<FreeUsage | null> {
  if (reservation.existing) return null;
  const result = await storageRpc<StorageResult>('ghostjob_free_scan', {
    p_action: 'finish', p_account_key: reservation.accountKey, p_job_key: reservation.jobKey,
    p_month_key: reservation.monthKey, p_lease_key: reservation.leaseKey, p_success: success,
  });
  if (result.status !== (success ? 'completed' : 'released')) throw new Error('Scan allowance unavailable');
  return usageFrom(result);
}
