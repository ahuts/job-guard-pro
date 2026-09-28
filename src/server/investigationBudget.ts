import { hash, storageRpc, storeConfigured } from './searchStore.js';

// Integer microdollars avoid float drift. Supabase serializes reservations,
// settlements and retry identity in one database transaction per operation.
export const INVESTIGATION_VERSION = 'openai-jev-4';
export const RESERVATION_MICRO_USD = 1_000_000;
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
  const status = await storageRpc<number>('ghostjob_ai_reserve', { p_attempt_key: keys.attemptKey, p_account_key: hash(userId), p_reserved_micro_usd: RESERVATION_MICRO_USD, p_budget_micro_usd: monthlyBudgetMicroUsd() }, deadline);
  if (![1, 0, -1, -2].includes(status)) throw new Error('Invalid budget storage response');
  return { ...keys, status };
}
export async function settleInvestigation(reservation: BudgetReservation, costMicroUsd: number, deadline?: number) {
  if (!Number.isSafeInteger(costMicroUsd) || costMicroUsd < 0) throw new Error('Invalid provider cost');
  const settled = await storageRpc<number>('ghostjob_ai_settle', { p_attempt_key: reservation.attemptKey, p_actual_micro_usd: costMicroUsd }, deadline);
  if (settled !== 1) throw new Error('Budget settlement unavailable');
}
export function openaiCost(inputTokens: number, outputTokens: number, searches: number) {
  return Math.ceil(inputTokens * 0.75 + outputTokens * 4.5 + searches * 10_000);
}
export const jevCost = (inputTokens: number) => Math.ceil(inputTokens * 0.042);
