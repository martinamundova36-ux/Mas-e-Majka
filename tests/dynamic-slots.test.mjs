import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Exercise the actual Supabase availability handler without reading or writing
// customer data. The test clock is a Friday; 9 November 2026 is a Monday.
class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-11-06T09:00:00Z'])); }
  static now() { return Date.parse('2026-11-06T09:00:00Z'); }
}

function makeHandler({ bookings = [], blocks = [], serviceMinutes = 45 } = {}) {
  const data = {
    majka_services: [{ id: 2, name_sk: 'Klasická masáž', name_en: 'Classical massage', duration_minutes: serviceMinutes, price_eur: 30 }],
    majka_working_hours: { opens_at: '09:00:00', closes_at: '17:30:00', enabled: true },
    majka_bookings: bookings,
    majka_blocked_times: blocks,
  };
  const db = {
    from(table) {
      const result = { data: data[table], error: null };
      const chain = new Proxy({}, {
        get(_, property) {
          if (property === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
          return () => chain;
        },
      });
      return chain;
    },
  };
  let handler;
  const source = readFileSync(new URL('../integrations/supabase/majka-availability.ts', import.meta.url), 'utf8')
    .replace(/^import .+\n/, '');
  runInNewContext(stripTypeScriptTypes(source), {
    Deno: { env: { get: () => 'test-only' }, serve: fn => { handler = fn; } },
    createClient: () => db,
    Date: TestDate, Intl, URL, Response, console,
  });
  return async () => {
    const response = await handler({ method: 'GET', url: 'https://example.test?date=2026-11-09&service_id=2' });
    assert.equal(response.status, 200);
    return (await response.json()).slots;
  };
}

test('45-minute appointment creates an exact :45 follow-up without a 15-minute gap', async () => {
  const slots = await makeHandler({ bookings: [
    { starts_at: '2026-11-09T08:00:00Z', ends_at: '2026-11-09T08:45:00Z' },
  ] })();
  assert.ok(slots.includes('09:45'), 'follow-up must start right when prior treatment ends');
  assert.ok(!slots.includes('09:30'), 'overlapping half-hour must not be selectable');
  assert.ok(slots.includes('10:00'), 'ordinary half-hour times must remain available');
  assert.deepEqual(slots, [...slots].sort(), 'time buttons must remain in chronological order');
});

test('dynamic follow-up stays disabled if it conflicts with another appointment', async () => {
  const slots = await makeHandler({ bookings: [
    { starts_at: '2026-11-09T08:00:00Z', ends_at: '2026-11-09T08:45:00Z' },
    { starts_at: '2026-11-09T09:00:00Z', ends_at: '2026-11-09T09:30:00Z' },
  ] })();
  assert.ok(!slots.includes('09:45'), 'start cannot overlap the next booking');
  assert.ok(slots.includes('10:30'), 'times after the conflict remain available');
});

test('an administrative break ending at :15 permits immediate new appointments', async () => {
  const slots = await makeHandler({ blocks: [
    { starts_at: '2026-11-09T09:00:00Z', ends_at: '2026-11-09T09:15:00Z' },
  ] })();
  assert.ok(slots.includes('10:15'), 'blocked time ending at 10:15 should free 10:15');
  assert.ok(!slots.includes('10:00'), 'a still-blocked start cannot be offered');
});
