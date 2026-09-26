// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hash } from '../server/searchStore';

const db = new PGlite();
const sql = readFileSync(new URL('../../docs/ghostjob-ai-storage-review.sql', import.meta.url), 'utf8');
const attempt = (value: string) => `gj:ai-attempt:${hash(value)}`;
const reserve = async (value: string, account = value, budget = 25_000_000) => (await db.query<{ status: number }>(
  'select public.ghostjob_ai_reserve($1, $2, 1000000, $3) as status', [attempt(value), hash(account), budget])).rows[0].status;
const settle = async (value: string, amount: number) => (await db.query<{ status: number }>(
  'select public.ghostjob_ai_settle($1, $2) as status', [attempt(value), amount])).rows[0].status;
const spend = async () => Number((await db.query<{ amount: string }>(
  'select coalesce(sum(spent_micro_usd), 0)::text as amount from ghostjob_private.ai_monthly_spend')).rows[0].amount);

beforeAll(async () => {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(sql);
}, 30_000);
beforeEach(async () => {
  await db.exec('reset role; truncate ghostjob_private.ai_attempts, ghostjob_private.ai_account_rate, ghostjob_private.ai_monthly_spend, ghostjob_private.cache;');
});
afterAll(async () => { await db.close(); });

describe('Supabase storage SQL executed in PostgreSQL', () => {
  it('enforces the shared monthly ceiling across independent accounts and queued requests', async () => {
    const statuses = await Promise.all(Array.from({ length: 40 }, (_, i) => reserve(`case-${i}`)));
    expect(statuses.filter(status => status === 1)).toHaveLength(25);
    expect(statuses.filter(status => status === -1)).toHaveLength(15);
    expect(await spend()).toBe(25_000_000);
  });
  it('reserves identical attempts once and settles once, including repeated requests', async () => {
    const statuses = await Promise.all(Array.from({ length: 10 }, () => reserve('same')));
    expect(statuses.filter(status => status === 1)).toHaveLength(1);
    expect(await spend()).toBe(1_000_000);
    expect(await settle('same', 12_345)).toBe(1);
    expect(await settle('same', 999_999)).toBe(1);
    expect(await spend()).toBe(12_345);
    expect(await reserve('same')).toBe(0);
  });
  it('keeps uncertain costs reserved, rate-limits accounts, and releases known costs', async () => {
    for (let i = 0; i < 5; i++) expect(await reserve(`rate-${i}`, 'one-account')).toBe(1);
    expect(await reserve('rate-six', 'one-account')).toBe(-2);
    expect(await reserve('other', 'other-account')).toBe(1);
    expect(await spend()).toBe(6_000_000);
    await settle('other', 100);
    expect(await spend()).toBe(5_000_100);
  });
  it('settles against the original month and does not refund expired attempts', async () => {
    await reserve('old-month');
    await db.exec("insert into ghostjob_private.ai_monthly_spend values ('2026-01', 1000000); update ghostjob_private.ai_monthly_spend set spent_micro_usd = 0 where month_key <> '2026-01'; update ghostjob_private.ai_attempts set month_key = '2026-01';");
    await settle('old-month', 100);
    expect(await spend()).toBe(100);
    await db.exec("update ghostjob_private.ai_attempts set expires_at = clock_timestamp() - interval '1 second';");
    expect(await settle('old-month', 0)).toBe(0);
    expect(await spend()).toBe(100);
  });
  it('round-trips JSON, refreshes corrected evidence, and expires private cache values', async () => {
    await db.query('select public.ghostjob_cache_put($1, $2::jsonb, 900)', ['gj:test', JSON.stringify({ finding: 'probable_match' })]);
    const get = async () => (await db.query<{ value: unknown }>("select public.ghostjob_cache_get('gj:test') as value")).rows[0].value;
    expect(await get()).toEqual({ finding: 'probable_match' });
    await db.query('select public.ghostjob_cache_put($1, $2::jsonb, 900)', ['gj:test', JSON.stringify({ finding: 'different_role' })]);
    expect(await get()).toEqual({ finding: 'different_role' });
    await db.exec("update ghostjob_private.cache set expires_at = clock_timestamp() - interval '1 second';");
    expect(await get()).toBeNull();
    await db.query('select public.ghostjob_cache_put($1, $2::jsonb, 900)', ['gj:other', '{}']);
    expect((await db.query('select * from ghostjob_private.cache')).rows).toHaveLength(1);
  });
  it('denies anonymous and authenticated clients, while service_role RPCs work', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role};`);
      await expect(db.query("select public.ghostjob_cache_get('gj:test')")).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from ghostjob_private.ai_attempts')).rejects.toThrow(/permission denied/);
      await db.exec('reset role;');
    }
    await db.exec('set role service_role;');
    expect(await reserve('server')).toBe(1);
    expect(await settle('server', 123)).toBe(1);
    await db.exec('reset role;');
    const flags = await db.query<{ prosecdef: boolean }>("select prosecdef from pg_proc where proname in ('ghostjob_ai_reserve','ghostjob_ai_settle','ghostjob_cache_get','ghostjob_cache_put')");
    expect(flags.rows).toHaveLength(4); expect(flags.rows.every(row => row.prosecdef === false)).toBe(true);
  });
  it('rejects attempts to expand the cap and permits reapplying the reviewed SQL', async () => {
    await expect(reserve('over-cap', 'a', 26_000_000)).rejects.toThrow('Invalid investigation reservation');
    expect(await reserve('zero-budget', 'a', 0)).toBe(-1);
    await db.exec(sql);
    expect(await reserve('after-reapply')).toBe(1);
  });
});
