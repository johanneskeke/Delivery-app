import assert from 'node:assert/strict';
import { test } from 'node:test';

import { tour } from '../src/data/bundle';
import { EXAMPLE_NOTES } from '../src/data/example-notes';
import { appleUrl, driveLink, walkApp, walkHaltLink, wazeUrl } from '../src/services/navigation';

const P = { lat: 52.493451, lng: 13.393195 };
const D1 = { lat: 52.493361, lng: 13.392972 };
const D2 = { lat: 52.49272, lng: 13.392795 };

test('driving links per app (settings, 2026-11-20)', () => {
  assert.match(driveLink('google', P), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=52\.493451%2C13\.393195&travelmode=driving&dir_action=navigate$/);
  assert.equal(driveLink('apple', P), 'https://maps.apple.com/directions?destination=52.493451%2C13.393195&mode=driving');
  assert.equal(driveLink('waze', P), 'https://waze.com/ul?ll=52.493451,13.393195&navigate=yes');
  assert.equal(wazeUrl(P), driveLink('waze', P));
});

test('walking: one link per halt with all doors (Google and Apple Maps); Waze walks with Apple Maps', () => {
  assert.ok(walkHaltLink('google', [D1, D2]).includes('waypoints='));
  const apple = 'https://maps.apple.com/directions?destination=52.492720%2C13.392795&mode=walking&waypoint=52.493361%2C13.392972';
  assert.equal(walkHaltLink('apple', [D1, D2]), apple);
  assert.equal(walkHaltLink('waze', [D1, D2]), apple);
  assert.equal(walkApp('waze'), 'apple');
  assert.equal(
    appleUrl(D2, 'walking', [D1]),
    'https://maps.apple.com/directions?destination=52.492720%2C13.392795&mode=walking&waypoint=52.493361%2C13.392972',
  );
});

test('example driver note sits at Chamissoplatz 9 (the house number that does not exist)', () => {
  const no = tour.stops.find((s) => s.address === 'Chamissoplatz 9')!.no;
  assert.match(EXAMPLE_NOTES[no].text, /^Nr\. 9 gibt es nicht/);
  assert.equal(EXAMPLE_NOTES[no].example, true);
});
