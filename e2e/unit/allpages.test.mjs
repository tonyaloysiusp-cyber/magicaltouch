import test from 'node:test';
import assert from 'node:assert/strict';
import { allPages } from '../../lib/allPages.ts';

test('a page that fails once is retried', async () => {
  let fails = 1;
  const rows = Array.from({ length: 2500 }, (_, i) => i);
  const r = await allPages(async (from, to) => {
    if (from === 1000 && fails-- > 0) return { data: null, error: { message: 'timeout' } };
    return { data: rows.slice(from, to + 1), error: null };
  });
  assert.equal(r.error, null);
  assert.equal(r.data.length, 2500);
});
