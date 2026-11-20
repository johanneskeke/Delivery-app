import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlanKind, RoutePlan, Tour } from '@/domain/types';
import { formatDistance } from '@/lib/geo';
import { useTourStore } from '@/store/tour-store';
import { Badge, Button, Card, colors, H2, P, Row, Screen } from '@/ui/kit';
import { tagLabel, timeWindowLabel } from '@/ui/labels';

export default function RouteScreen() {
  const tour = useTourStore((s) => s.tour);
  const original = useTourStore((s) => s.original);
  const proposed = useTourStore((s) => s.proposed);
  const impacts = useTourStore((s) => s.impacts);
  const chosenPlan = useTourStore((s) => s.chosenPlan);
  const buildPlans = useTourStore((s) => s.buildPlans);
  const choosePlan = useTourStore((s) => s.choosePlan);
  const [view, setView] = useState<PlanKind>('proposed');

  useEffect(() => {
    if (tour && !proposed) buildPlans();
  }, [tour, proposed, buildPlans]);

  if (!tour || !original || !proposed) return null;

  const affected = new Set(impacts.map((i) => i.stopId));
  const shown = view === 'proposed' ? proposed : original;

  const choose = (kind: PlanKind) => {
    choosePlan(kind);
    router.push('/load');
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Vorschlag übernehmen" onPress={() => choose('proposed')} />
          <Button title="Originalreihenfolge behalten" variant="secondary" onPress={() => choose('original')} />
        </>
      }>
      {chosenPlan ? <Badge label={`Gewählt: ${chosenPlan === 'proposed' ? 'Vorschlag' : 'Original'}`} tone="ok" /> : null}

      <Card>
        <H2>Vergleich</H2>
        <CompareRow label="Halte" a={String(original.halts.length)} b={String(proposed.halts.length)} />
        <CompareRow label="Fahrstrecke*" a={formatDistance(original.driveDistanceM)} b={formatDistance(proposed.driveDistanceM)} />
        <CompareRow label="Fußwege*" a={formatDistance(original.walkDistanceM)} b={formatDistance(proposed.walkDistanceM)} />
        <CompareRow label="Sperrungen berücksichtigt" a="nein" b="ja" />
        <P muted>* Luftlinie. Echte Straßenstrecken folgen mit dem Routing-Dienst.</P>
      </Card>

      <View style={styles.segment}>
        {(['proposed', 'original'] as const).map((k) => (
          <Pressable key={k} onPress={() => setView(k)} style={[styles.segmentItem, view === k && styles.segmentActive]}>
            <Text style={[styles.segmentText, view === k && styles.segmentTextActive]}>
              {k === 'proposed' ? 'Vorschlag' : 'Original'}
            </Text>
          </Pressable>
        ))}
      </View>
      <P muted>{shown.method}</P>

      <PlanList plan={shown} tour={tour} affected={affected} />
    </Screen>
  );
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareValue}>
        {a} → <Text style={{ fontWeight: '700' }}>{b}</Text>
      </Text>
    </Row>
  );
}

function PlanList({ plan, tour, affected }: { plan: RoutePlan; tour: Tour; affected: Set<string> }) {
  return (
    <>
      {plan.halts.map((halt, i) => (
        <Card key={halt.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>Halt {i + 1}</H2>
            {halt.stopIds.length > 1 ? <Badge label={`${halt.stopIds.length} Stopps zu Fuß`} tone="info" /> : null}
          </Row>
          {halt.notes.map((n) => (
            <Badge key={n} label={n} tone="warn" />
          ))}
          {halt.stopIds.map((id) => {
            const stop = tour.stops.find((s) => s.id === id);
            if (!stop) return null;
            const tw = timeWindowLabel(stop);
            return (
              <View key={id} style={styles.stopLine}>
                <P>
                  {stop.recipient} · {stop.address.split(',')[0]}
                </P>
                <Row>
                  {affected.has(id) ? <Badge label="an Sperrung" tone="danger" /> : null}
                  {tw ? <Badge label={tw} tone="info" /> : null}
                  {stop.tags.map((t) => (
                    <Badge key={t} label={tagLabel[t]} />
                  ))}
                </Row>
              </View>
            );
          })}
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  compareLabel: { color: colors.muted, fontSize: 15 },
  compareValue: { color: colors.text, fontSize: 15 },
  segment: { flexDirection: 'row', backgroundColor: colors.neutralBg, borderRadius: 10, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { color: colors.muted, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  stopLine: { gap: 4, paddingTop: 4 },
});
