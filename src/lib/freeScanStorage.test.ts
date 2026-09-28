// @vitest-environment node
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hash } from '../server/searchStore';

const db = new PGlite();
const sql = readFileSync(new URL('../../docs/ghostjob-free-scan-storage-review.sql', import.meta.url), 'utf8');
const account = hash('free-account');
const job = (value: string) => hash(value);
type Row = { value: { status: string; monthKey?: string; used?: number; remaining?: number; leaseKey?: string } };
const call = async (action: string, jobKey: string | null = null, month: string | null = null, lease: string | null = null, success: boolean | null = null) =>
  (await db.query<Row>('select public.ghostjob_free_scan($1,$2,$3,$4,$5::uuid,$6) as value',
    [action, account, jobKey, month, lease, success])).rows[0].value;
const reserve = (name: string) => call('reserve', job(name), null, randomUUID());

beforeAll(async () => {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema ghostjob_private; grant usage on schema ghostjob_private to service_role;');
  await db.exec(sql);
}, 30_000);
beforeEach(async () => {
  await db.exec('reset role; truncate ghostjob_private.free_scan_jobs, ghostjob_private.free_scan_monthly;');
});
afterAll(async () => { await db.close(); });

describe('private Free scan allowance in PostgreSQL', () => {
  it('counts only successful distinct jobs, and lets a completed job be rescanned', async () => {
    const first = await reserve('first');
    expect(first.status).toBe('reserved');
    expect((await call('finish', job('first'), first.monthKey, first.leaseKey, true)).used).toBe(1);
    expect((await reserve('first')).status).toBe('existing');
    for (const name of ['second', 'third']) {
      const next = await reserve(name);
      await call('finish', job(name), next.monthKey, next.leaseKey, true);
    }
    expect((await reserve('fourth')).status).toBe('limited');
    expect((await call('status')).remaining).toBe(0);
    expect((await reserve('first')).status).toBe('existing');
  });
  it('releases failures, deduplicates concurrent reservations, and clears stale leases', async () => {
    const [a, b] = await Promise.all([reserve('same'), reserve('same')]);
    expect(a.status).toBe('reserved');
    expect(b.leaseKey).toBe(a.leaseKey);
    expect((await call('status')).remaining).toBe(2);
    expect((await call('finish', job('same'), a.monthKey, a.leaseKey, false)).status).toBe('released');
    expect((await call('status')).remaining).toBe(3);
    const retried = await reserve('same');
    await db.query("update ghostjob_private.free_scan_jobs set expires_at = clock_timestamp() - interval '1 second'");
    expect((await reserve('same')).leaseKey).not.toBe(retried.leaseKey);
    expect((await call('finish', job('same'), retried.monthKey, retried.leaseKey, true)).status).toBe('invalid');
  });
  it('keeps private privileges', async () => {
    const first = await reserve('first');
    await call('finish', job('first'), first.monthKey, first.leaseKey, true);
    expect((await call('status')).used).toBe(1);
    for (const role of ['anon', 'authenticated']) {
      await db.exec('set role ' + role + ';');
      await expect(call('status')).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from ghostjob_private.free_scan_monthly')).rejects.toThrow(/permission denied/);
      await db.exec('reset role;');
    }
    await db.exec('set role service_role;');
    expect((await call('status')).status).toBe('available');
    await db.exec('reset role;');
  });
  it('is safe to reapply without resetting live usage', async () => {
    const first = await reserve('first');
    await call('finish', job('first'), first.monthKey, first.leaseKey, true);
    await db.exec(sql);
    expect((await call('status')).used).toBe(1);
  });
  it('limits concurrent distinct reservations and starts the next UTC month at zero', async () => {
    const attempts = await Promise.all(['a', 'b', 'c', 'd'].map(reserve));
    expect(attempts.filter(result => result.status === 'reserved')).toHaveLength(3);
    expect(attempts.filter(result => result.status === 'limited')).toHaveLength(1);
    const oldMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    await db.query('insert into ghostjob_private.free_scan_monthly(account_key, month_key, used) values ($1, $2, 3) on conflict (account_key, month_key) do update set used = 3', [account, oldMonth]);
    expect((await call('status')).used).toBe(0);
  });
});
