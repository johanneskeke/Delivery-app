import { meta, tour } from '@/data/bundle';
import { formatDate, formatDateTime } from '@/lib/format';
import { Card, H2, P, Screen, SimulatedNotice } from '@/ui/kit';

const SOURCE_LABEL: Record<string, string> = {
  closures_viz: 'Closures, VIZ Berlin (editorial feed)',
  closures_landesmeldestelle: 'Closures, VIZ Berlin (Landesmeldestelle feed)',
  loading_zones_osm: 'Loading and no-stopping zones, OpenStreetMap',
  road_network_osm: 'Road network, traffic rules, addresses, OpenStreetMap',
  weather_dwd: 'Weather forecast, Deutscher Wetterdienst',
  demonstrations_police: 'Demonstrations, Berlin Police',
};

export default function AboutScreen() {
  return (
    <Screen>
      <SimulatedNotice text={tour.header.origin} />

      <Card>
        <H2>How this plan was made</H2>
        <P>
          Our planning engine checked every stop against the open data below and computed the plans before the round
          (offline, {formatDateTime(meta.generated_at)}). The app shows the result; it does not calculate.
        </P>
        <P muted>Tour day {formatDate(meta.tour_date)}, departure {meta.departure}.</P>
      </Card>

      <Card>
        <H2>Data as of</H2>
        {Object.entries(meta.data_as_of).map(([key, date]) => (
          <P key={key}>
            {formatDate(date)} · {SOURCE_LABEL[key] ?? key}
          </P>
        ))}
      </Card>

      <Card>
        <H2>Assumptions</H2>
        {meta.assumptions.map((a) => (
          <P key={a}>• {a}</P>
        ))}
        <P muted>Labelled assumptions; real times on the street differ.</P>
      </Card>

      <Card>
        <H2>Attributions</H2>
        {meta.attributions.map((a) => (
          <P key={a} muted>
            {a}
          </P>
        ))}
      </Card>

      <Card>
        <H2>Not built yet</H2>
        {meta.not_yet_included.map((a) => (
          <P key={a} muted>
            • {a}
          </P>
        ))}
      </Card>
    </Screen>
  );
}
