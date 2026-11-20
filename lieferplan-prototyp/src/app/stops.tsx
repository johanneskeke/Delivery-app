import { router } from 'expo-router';

import { useTourStore } from '@/store/tour-store';
import { Badge, Button, Card, H2, P, Row, Screen, SimulatedNotice } from '@/ui/kit';
import { tagLabel, timeWindowLabel } from '@/ui/labels';

export default function StopsScreen() {
  const tour = useTourStore((s) => s.tour);
  const loadDemoTour = useTourStore((s) => s.loadDemoTour);

  if (!tour) {
    return (
      <Screen>
        <Card>
          <H2>Woher kommt die Tour?</H2>
          <P muted>Fahrer bekommen die Stoppliste heute als Ausdruck, Excel oder in der Firmen-App.</P>
          <Button title="Demo-Tour laden (Berlin-Kreuzberg)" onPress={loadDemoTour} />
          {/* TODO Schritt 2: CSV/Excel-Import und Geocoding der Adressen */}
          <Button title="CSV importieren (folgt)" variant="secondary" disabled onPress={() => {}} />
        </Card>
      </Screen>
    );
  }

  const packagesPerStop = (stopId: string) => tour.packages.filter((p) => p.stopId === stopId).length;
  const sorted = [...tour.stops].sort((a, b) => a.originalIndex - b.originalIndex);

  return (
    <Screen footer={<Button title="Weiter: Daten prüfen" onPress={() => router.push('/check')} />}>
      <SimulatedNotice text={`Quelle: ${tour.source}`} />
      <P muted>
        {tour.stops.length} Stopps in der Reihenfolge der Tourliste · Start: {tour.depot.name}
      </P>
      {sorted.map((stop, i) => {
        const tw = timeWindowLabel(stop);
        return (
          <Card key={stop.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H2>
                {i + 1}. {stop.recipient}
              </H2>
              <Badge label={`${packagesPerStop(stop.id)} Pkt.`} />
            </Row>
            <P>{stop.address}</P>
            <Row>
              {tw ? <Badge label={`Zeitfenster ${tw}`} tone="info" /> : null}
              {stop.tags.map((t) => (
                <Badge key={t} label={tagLabel[t]} tone={t === 'priority' ? 'warn' : 'neutral'} />
              ))}
              {!stop.position ? <Badge label="Adresse nicht gefunden" tone="danger" /> : null}
            </Row>
            {stop.note ? <P muted>{stop.note}</P> : null}
          </Card>
        );
      })}
    </Screen>
  );
}
