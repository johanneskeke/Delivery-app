import { StyleSheet, Text, View } from 'react-native';

import { importData, shipmentById } from '@/data/bundle';
import type { ImportNote } from '@/data/types';
import { Badge, Card, colors, H2, P, Row, Screen } from '@/ui/kit';

const KIND_LABEL: Record<ImportNote['kind'], string> = {
  street_fixed: 'Street corrected',
  postcode_missing: 'Postcode missing',
  postcode_wrong: 'Postcode wrong',
  house_no_cleaned: 'House number cleaned',
  house_no_not_found: 'House number not found',
  other: 'Note',
};

export default function ImportScreen() {
  const corrected = importData.notes.filter((n) => n.kind !== 'house_no_not_found');
  const notFound = importData.notes.filter((n) => n.kind === 'house_no_not_found');

  return (
    <Screen>
      <P muted>
        Every address of the tour list was matched with OpenStreetMap addresses. Nothing was dropped
        {importData.missing.length ? `, except: ${importData.missing.join(', ')}` : ''}.
      </P>

      <H2>Corrected automatically ({corrected.length})</H2>
      {corrected.map((n, i) => (
        <NoteCard key={`c${i}`} note={n} />
      ))}

      <H2>House number not found ({notFound.length})</H2>
      <P muted>The van and the walking link use the nearest existing house number. Check the door on site.</P>
      {notFound.map((n, i) => (
        <NoteCard key={`n${i}`} note={n} />
      ))}
    </Screen>
  );
}

function NoteCard({ note }: { note: ImportNote }) {
  const shipment = note.shipment_id ? shipmentById(note.shipment_id) : undefined;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge label={KIND_LABEL[note.kind]} tone={note.kind === 'house_no_not_found' ? 'warn' : 'info'} />
        <Text style={styles.stop}>Stop {note.stop_no}</Text>
      </Row>
      <P>{note.text}</P>
      <View style={{ gap: 2 }}>
        <Text style={styles.small}>In the list: {note.original}</Text>
        {note.used ? <Text style={styles.small}>Used: {note.used}</Text> : null}
        {shipment ? (
          <Text style={styles.small}>
            {shipment.id} · {shipment.recipient}
          </Text>
        ) : null}
        <Text style={styles.small}>Source: {note.source}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stop: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  small: { fontSize: 13, color: colors.muted },
});
