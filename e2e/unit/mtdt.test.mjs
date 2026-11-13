import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeMtdt, decodeMtdt, isMtdt, mtdtFileName } from '../../lib/mtdt.ts';

test('.mtdt round trip keeps every field and is not JSON text', async () => {
  const p = { kind: 'jersey', name: 'Lions FC', savedAt: '2026-11-13T00:00:00Z', app: 'test', data: { kit: { body: '#123456' }, players: [{ name: 'Arun', number: '07', size: 'S' }] } };
  const b = await encodeMtdt(p);
  assert.ok(isMtdt(b));
  assert.equal(String.fromCharCode(...b.subarray(0, 4)), 'MTDT');
  assert.ok(b[0] !== 0x7b, 'does not start like JSON');
  assert.deepEqual(await decodeMtdt(b), p);
  await assert.rejects(() => decodeMtdt(new TextEncoder().encode('{"kind":"x"}')));
  assert.equal(mtdtFileName('Lions FC / Home'), 'Lions-FC-Home.mtdt');
});
