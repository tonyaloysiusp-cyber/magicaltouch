import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERATORS, generate, genDefaults, pathBytes } from '../../lib/textile/generators.ts';
import { normalize, bbox } from '../../lib/textile/vector.ts';

const box = { x: 100, y: 50, w: 560, h: 740 };
for (const g of GENERATORS) {
  test(`generator ${g.kind}: vector paths, one per colour, repeatable, near the piece`, () => {
    const spec = { kind: g.kind, params: genDefaults(g.kind, ['#111111', '#C9A86A', '#FFFFFF'], 7), pieces: ['front'] };
    const el = generate(spec, [box]);
    assert.equal(el.kind, 'group');
    assert.ok(el.els.length >= 1, 'draws something');
    assert.ok(el.els.every((e) => e.kind === 'path' && /^M/.test(e.d)));
    assert.deepEqual(generate(spec, [box]), el, 'same seed, same artwork');
    const other = generate({ ...spec, params: { ...spec.params, seed: 8 } }, [box]);
    if (g.kind !== 'scales' && g.kind !== 'halftone') assert.notDeepEqual(other.els.map((e) => e.d), el.els.map((e) => e.d), 'new seed, new variation');
    for (const e of el.els) {
      const b = bbox(normalize(e.d));
      assert.ok(b.x > box.x - 1200 && b.x + b.w < box.x + box.w + 1200 && b.y > box.y - 1200 && b.y + b.h < box.y + box.h + 1200, `${g.kind} stays near the piece`);
    }
    assert.ok(pathBytes(el) < 2_500_000, `${g.kind} file size ${pathBytes(el)}`);
    assert.ok(el.gen && el.gen.kind === g.kind, 'remembers its settings');
  });
}
