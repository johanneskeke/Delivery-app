import type { Tour, VehicleSlot } from './types';

/**
 * Demo-Tour in Berlin-Kreuzberg (Bergmannkiez).
 *
 * Empfänger sind erfunden. Die Koordinaten sind von Hand gesetzt und nur ungefähr;
 * sobald das Geocoding angebunden ist (Schritt 2), werden sie aus der Adresse berechnet.
 * Die Reihenfolge der Stopps ist absichtlich ungünstig, so wie sie oft vom Disponenten kommt.
 */
export function createDemoTour(today = new Date()): Tour {
  const date = today.toISOString().slice(0, 10);
  const stops: Omit<Tour['stops'][number], 'originalIndex' | 'status'>[] = [
    { id: 's09', recipient: 'Fam. Hoffmann', address: 'Körtestraße 20, 10967 Berlin', position: { lat: 52.4908, lng: 13.4062 }, tags: [] },
    { id: 's01', recipient: 'Fam. Becker', address: 'Bergmannstraße 12, 10961 Berlin', position: { lat: 52.48935, lng: 13.3906 }, tags: [] },
    { id: 's07', recipient: 'M. Schulz', address: 'Fidicinstraße 10, 10965 Berlin', position: { lat: 52.4864, lng: 13.3927 }, tags: [] },
    { id: 's04', recipient: 'Café in der Markthalle (Demo)', address: 'Marheinekeplatz 15, 10961 Berlin', position: { lat: 52.4889, lng: 13.3958 }, tags: ['priority', 'cooled'], timeWindow: { from: '08:00', to: '10:00' }, note: 'Lieferung über Seiteneingang' },
    { id: 's10', recipient: 'Getränke-Kiosk (Demo)', address: 'Mittenwalder Straße 30, 10961 Berlin', position: { lat: 52.4933, lng: 13.3948 }, tags: ['heavy'] },
    { id: 's02', recipient: 'Buchladen am Kiez (Demo)', address: 'Bergmannstraße 26, 10961 Berlin', position: { lat: 52.48925, lng: 13.3925 }, tags: [] },
    { id: 's05', recipient: 'J. Nowak', address: 'Solmsstraße 30, 10961 Berlin', position: { lat: 52.4902, lng: 13.399 }, tags: [] },
    { id: 's08', recipient: 'A. Weber', address: 'Kopischstraße 5, 10965 Berlin', position: { lat: 52.4869, lng: 13.389 }, tags: ['fragile'] },
    { id: 's12', recipient: 'T. Richter', address: 'Bergmannstraße 40, 10961 Berlin', position: { lat: 52.4891, lng: 13.3943 }, tags: [] },
    { id: 's03', recipient: 'K. Yilmaz', address: 'Zossener Straße 48, 10961 Berlin', position: { lat: 52.4905, lng: 13.3936 }, tags: [] },
    { id: 's11', recipient: 'L. Fischer', address: 'Chamissoplatz 4, 10965 Berlin', position: { lat: 52.4876, lng: 13.3935 }, tags: [] },
    { id: 's06', recipient: 'Praxis Dr. Lang (Demo)', address: 'Gneisenaustraße 60, 10961 Berlin', position: { lat: 52.4916, lng: 13.4005 }, tags: ['priority'], timeWindow: { from: '09:00', to: '12:00' } },
  ];

  // Paket-IDs entsprechen dem Inhalt der Barcodes/QR-Codes auf den Demo-Etiketten.
  const packageCounts: Record<string, number> = {
    s01: 1, s02: 2, s03: 1, s04: 3, s05: 1, s06: 1,
    s07: 1, s08: 2, s09: 1, s10: 2, s11: 1, s12: 1,
  };
  let n = 1001;
  const packages = stops.flatMap((s) =>
    Array.from({ length: packageCounts[s.id] ?? 1 }, () => ({ id: `PKT-${n++}`, stopId: s.id })),
  );

  return {
    id: `demo-${date}`,
    name: 'Demo-Tour Kreuzberg',
    date,
    source: 'Demo-Tour (Adressen und Koordinaten beispielhaft)',
    depot: {
      name: 'Depot (Demo)',
      address: 'Tempelhofer Damm, 12101 Berlin',
      position: { lat: 52.472, lng: 13.385 },
    },
    stops: stops.map((s, i) => ({ ...s, originalIndex: i, status: 'open' as const })),
    packages,
  };
}

/** Standard-Fahrzeug: 3 Regale (A–C) mit je 4 Fächern. A1 ist am nächsten an der Schiebetür. */
export function createDefaultSlots(): VehicleSlot[] {
  const slots: VehicleSlot[] = [];
  let order = 0;
  for (const rack of ['A', 'B', 'C']) {
    for (let level = 1; level <= 4; level++) {
      const id = `${rack}${level}`;
      slots.push({ id, label: id, order: order++ });
    }
  }
  return slots;
}
