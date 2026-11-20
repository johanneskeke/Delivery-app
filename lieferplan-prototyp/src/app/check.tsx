import { router } from 'expo-router';
import { useEffect } from 'react';

import { disruptionKindLabel } from '@/services/disruptions';
import { useTourStore } from '@/store/tour-store';
import { Badge, Button, Card, H2, P, Row, Screen, SimulatedNotice } from '@/ui/kit';
import { formatTime } from '@/ui/labels';

export default function CheckScreen() {
  const tour = useTourStore((s) => s.tour);
  const disruptions = useTourStore((s) => s.disruptions);
  const impacts = useTourStore((s) => s.impacts);
  const dataErrors = useTourStore((s) => s.dataErrors);
  const checkedAt = useTourStore((s) => s.checkedAt);
  const checking = useTourStore((s) => s.checking);
  const runDataCheck = useTourStore((s) => s.runDataCheck);

  // Beim ersten Öffnen direkt prüfen.
  useEffect(() => {
    if (!checkedAt) runDataCheck();
  }, [checkedAt, runDataCheck]);

  if (!tour) return null;

  const stopName = (id: string) => tour.stops.find((s) => s.id === id)?.recipient ?? id;
  const affectedCount = new Set(impacts.map((i) => i.stopId)).size;
  const anySimulated = disruptions.some((d) => d.simulated);

  return (
    <Screen
      footer={
        <>
          <Button title="Weiter: Route ansehen" disabled={!checkedAt || checking} onPress={() => router.push('/route')} />
          <Button title="Erneut prüfen" variant="secondary" loading={checking} onPress={runDataCheck} />
        </>
      }>
      {anySimulated ? <SimulatedNotice text="Enthält simulierte Störungen (Demo-Daten)" /> : null}

      <Card>
        <H2>{checking ? 'Prüfe Datenquellen …' : `${disruptions.length} Störungen gefunden`}</H2>
        <P muted>
          {affectedCount} von {tour.stops.length} Stopps betroffen · geprüft {formatTime(checkedAt)}
        </P>
      </Card>

      {dataErrors.map((e) => (
        <Card key={e}>
          <Badge label="Quelle nicht erreichbar" tone="danger" />
          <P muted>{e}</P>
        </Card>
      ))}

      {disruptions.map((d) => {
        const hits = impacts.filter((i) => i.disruptionId === d.id);
        return (
          <Card key={d.id}>
            <Row>
              <Badge label={disruptionKindLabel[d.kind]} tone="danger" />
              {d.simulated ? <Badge label="simuliert" tone="warn" /> : null}
            </Row>
            <H2>{d.title}</H2>
            {d.description ? <P>{d.description}</P> : null}
            <P muted>
              {formatTime(d.validFrom)}–{formatTime(d.validTo)} Uhr · Quelle: {d.source}
            </P>
            {hits.length ? (
              <P>Betrifft: {hits.map((h) => `${stopName(h.stopId)} (${h.distanceM} m)`).join(', ')}</P>
            ) : (
              <P muted>{d.geometry ? 'Kein Stopp direkt betroffen' : 'Gilt für die ganze Tour'}</P>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
