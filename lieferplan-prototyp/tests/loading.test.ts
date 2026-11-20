import assert from 'node:assert/strict';
import { test } from 'node:test';

import { meta } from '../src/data/bundle';
import { isLoaded, loadable, scanResult, stillToScan } from '../src/data/loading';

test('92 shipments are loaded; 79 count as already loaded, the 13 demo labels are left to scan', () => {
  assert.equal(loadable.length, 92);
  assert.equal(loadable.filter((s) => isLoaded(s.id, {})).length, 79);
  assert.equal(stillToScan({}).length, 13);
  assert.deepEqual(new Set(stillToScan({}).map((s) => s.id)), new Set(meta.demo_labels.on_tour));
});

test('scan: Feinkost 18.5 kg → bottom slot; scanning again → already scanned', () => {
  const r = scanResult('SYN232967813', {});
  assert.equal(r.kind, 'slot');
  if (r.kind === 'slot') {
    assert.match(r.slot, /^[ABC][12]$/);
    assert.equal(r.heavyKg, 18.5);
  }
  assert.equal(scanResult('SYN232967813', { SYN232967813: true }).kind, 'already');
});

test('scan: bulky item → floor; label 14 → not on the list; lower-case input works', () => {
  assert.equal(scanResult('SYN842112630', {}).kind, 'floor');
  assert.equal(scanResult(meta.demo_labels.not_on_tour, {}).kind, 'not_on_list');
  assert.equal(scanResult('  syn969042356 ', {}).kind, 'slot');
});
