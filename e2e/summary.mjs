// Prints a readable summary of e2e-out/ and exits non-zero when anything failed,
// so a broken feature turns the run red instead of passing silently.
import fs from 'node:fs';
const out = 'e2e-out';
const read = (f) => { try { return fs.readFileSync(`${out}/${f}`, 'utf8'); } catch { return ''; } };
let bad = 0;
const steps = read('steps.txt');
const failedSteps = steps.split('\n').filter((l) => l.startsWith('FAILED'));
console.log('== Steps'); console.log(steps.trim() || '(none)');
if (failedSteps.length) bad += failedSteps.length;
const tsc = read('tsc.txt').split('\n').filter((l) => /error TS\d+/.test(l));
console.log(`\n== Type check: ${tsc.length ? `${tsc.length} error(s)` : 'clean'}`); tsc.slice(0, 25).forEach((l) => console.log('  ' + l));
bad += tsc.length ? 1 : 0;
const unit = read('unit.txt');
const um = unit.match(/# pass (\d+)[\s\S]*# fail (\d+)/);
console.log(`\n== Unit tests: ${um ? `${um[1]} passed, ${um[2]} failed` : 'no results'}`);
if (um && Number(um[2])) { bad++; unit.split('\n').filter((l) => /^not ok|# Subtest|error:|expected|actual/.test(l.trim())).slice(0, 30).forEach((l) => console.log('  ' + l)); }
let results = [];
try { results = JSON.parse(read('results.json') || '[]'); } catch {}
const failed = results.filter((r) => r.error || (r.checks || []).some((c) => !c.ok));
console.log(`\n== Browser scenarios: ${results.length - failed.length}/${results.length} passed`);
failed.forEach((r) => {
  console.log(`  FAIL ${r.name}${r.error ? ` — ${String(r.error).slice(0, 200)}` : ''}`);
  (r.checks || []).filter((c) => !c.ok).slice(0, 5).forEach((c) => console.log(`       ✗ ${c.name}${c.detail ? `: ${c.detail}` : ''}`));
});
if (results.length === 0 && !failedSteps.length) { console.log('  (no scenario results)'); bad++; }
bad += failed.length;
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) fs.appendFileSync(summary, `### Tests\n\n- Type check: ${tsc.length ? `${tsc.length} errors` : 'clean'}\n- Unit: ${um ? `${um[1]} passed, ${um[2]} failed` : 'n/a'}\n- Browser: ${results.length - failed.length}/${results.length} passed\n`);
process.exit(bad ? 1 : 0);
