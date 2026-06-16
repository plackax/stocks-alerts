import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/theme';
import { PriceAlert } from '../types';

interface AlertCardProps {
  alert: PriceAlert;
  onDelete: (id: string) => void;
}

function AlertCardComponent({ alert, onDelete }: AlertCardProps) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.symbol}>{alert.symbol}</Text>
        <Text style={styles.target}>Target ${alert.targetPrice.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(alert.id)}
        accessibilityRole="button"
        accessibilityLabel={`Delete alert for ${alert.symbol}`}
      >
        <Text style={styles.deleteLabel}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

export const AlertCard = memo(
  AlertCardComponent,
  (prev, next) =>
    prev.alert.id === next.alert.id &&
    prev.alert.symbol === next.alert.symbol &&
    prev.alert.targetPrice === next.alert.targetPrice &&
    prev.onDelete === next.onDelete,
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  symbol: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  target: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  deleteLabel: {
    color: colors.negative,
    fontSize: 13,
    fontWeight: '600',
  },
});
