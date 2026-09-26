import { hash, redis, storeConfigured } from './searchStore.js';

// Integer microdollars avoid float drift. This namespace never touches legacy
// Brave query reservations. All paid calls in the new pipeline share this ledger.
export const INVESTIGATION_VERSION = 'openai-jev-1';
export const RESERVATION_MICRO_USD = 1_000_000;
export const RESERVE_INVESTIGATION = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
if tonumber(redis.call('GET', KEYS[2]) or '0') + tonumber(ARGV[1]) > tonumber(ARGV[2]) then return -1 end
if tonumber(redis.call('GET', KEYS[3]) or '0') >= 5 then return -2 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', 86400)
redis.call('INCRBY', KEYS[2], ARGV[1])
redis.call('EXPIRE', KEYS[2], 5356800)
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], 120)
return 1`;
export const SETTLE_INVESTIGATION = `
local reserved = redis.call('GET', KEYS[1])
if not reserved or reserved == 'settled' then return 0 end
local actual = tonumber(ARGV[1])
local amount = tonumber(reserved)
if not actual or actual < 0 then return 0 end
redis.call('INCRBY', KEYS[2], actual - amount)
redis.call('SET', KEYS[1], 'settled', 'EX', 86400)
return 1`;
export interface BudgetReservation { attemptKey: string; monthKey: string; resultKey: string; status: number }
export function investigationKeys(userId: string, fingerprint: string, now = new Date()) {
  const attempt = hash([userId, fingerprint, INVESTIGATION_VERSION]);
  return { attemptKey: `gj:ai-attempt:${attempt}`, monthKey: `gj:ai-spend:${now.toISOString().slice(0, 7)}`,
    resultKey: `gj:ai-result:${attempt}`, minuteKey: `gj:ai-minute:${hash(userId)}:${Math.floor(now.getTime() / 60000)}` };
}
export function monthlyBudgetMicroUsd() {
  const value = Number(process.env.GHOSTJOB_AI_MONTHLY_BUDGET_USD ?? 25);
  // A configuration typo cannot expand the authorized pilot ceiling.
  return Number.isFinite(value) && value > 0 && value <= 25 ? Math.floor(value * 1_000_000) : 0;
}
export async function reserveInvestigation(userId: string, fingerprint: string, deadline?: number): Promise<BudgetReservation> {
  if (!storeConfigured()) throw new Error('Budget storage unavailable');
  const keys = investigationKeys(userId, fingerprint);
  const status = await redis<number>(['EVAL', RESERVE_INVESTIGATION, 3, keys.attemptKey, keys.monthKey, keys.minuteKey, RESERVATION_MICRO_USD, monthlyBudgetMicroUsd()], deadline);
  return { ...keys, status };
}
export async function settleInvestigation(reservation: BudgetReservation, costMicroUsd: number, deadline?: number) {
  if (!Number.isSafeInteger(costMicroUsd) || costMicroUsd < 0) throw new Error('Invalid provider cost');
  await redis(['EVAL', SETTLE_INVESTIGATION, 2, reservation.attemptKey, reservation.monthKey, costMicroUsd], deadline);
}
export function openaiCost(inputTokens: number, outputTokens: number, searches: number) {
  return Math.ceil(inputTokens * 0.75 + outputTokens * 4.5 + searches * 10_000);
}
export const jevCost = (inputTokens: number) => Math.ceil(inputTokens * 0.042);
