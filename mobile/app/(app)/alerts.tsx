import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AlertCard } from '../../components/AlertCard';
import { colors } from '../../constants/theme';
import { api } from '../../services/api';
import { selectPendingAlerts, useAlertsStore } from '../../store/alerts.store';
import { selectSymbols, useStocksStore } from '../../store/stocks.store';

export default function AlertsScreen() {
  const symbols = useStocksStore(selectSymbols);
  const alerts = useAlertsStore((state) => state.alerts);
  const fetchAlerts = useAlertsStore((state) => state.fetchAlerts);
  const createAlert = useAlertsStore((state) => state.createAlert);
  const removeAlert = useAlertsStore((state) => state.removeAlert);

  const pendingAlerts = useMemo(() => selectPendingAlerts(alerts), [alerts]);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPrice = useStocksStore((state) =>
    selectedSymbol ? state.stocksById[selectedSymbol]?.price : undefined,
  );

  const parsedTarget = Number(targetPrice);
  const hasValidTarget = targetPrice.length > 0 && !Number.isNaN(parsedTarget) && parsedTarget > 0;
  const triggersImmediately =
    hasValidTarget && currentPrice !== undefined && parsedTarget <= currentPrice;

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchAlerts();
    } catch {
      setError('Could not load alerts.');
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts]),
  );

  useEffect(() => {
    if (!selectedSymbol && symbols.length > 0) {
      setSelectedSymbol(symbols[0]);
    }
  }, [symbols, selectedSymbol]);

  const handleCreate = async () => {
    if (!selectedSymbol) {
      setError('Pick a stock first.');
      return;
    }
    if (!hasValidTarget) {
      setError('Enter a valid target price.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createAlert(selectedSymbol, parsedTarget);
      setTargetPrice('');
    } catch {
      setError('Could not create the alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/alerts/${id}`);
        removeAlert(id);
      } catch {
        setError('Could not delete the alert.');
      }
    },
    [removeAlert],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingAlerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertCard alert={item} onDelete={handleDelete} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>New alert</Text>

            <Text style={styles.label}>Symbol</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {symbols.map((symbol) => {
                const active = symbol === selectedSymbol;
                return (
                  <TouchableOpacity
                    key={symbol}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedSymbol(symbol)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {symbol}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {symbols.length === 0 ? (
              <Text style={styles.hint}>Waiting for stocks to load…</Text>
            ) : null}

            <Text style={styles.label}>Target price</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={targetPrice}
              onChangeText={setTargetPrice}
              editable={!submitting}
            />

            <Text style={styles.helper}>
              {hasValidTarget
                ? `Notify me when ${selectedSymbol ?? 'the price'} rises above $${parsedTarget.toFixed(2)}.`
                : 'You will be notified when the price rises above your target.'}
            </Text>

            {triggersImmediately && currentPrice !== undefined ? (
              <Text style={styles.warning}>
                {selectedSymbol} is already at ${currentPrice.toFixed(2)} — this alert will trigger
                immediately.
              </Text>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={submitting}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.buttonLabel}>Set Alert</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.heading}>Your alerts</Text>
            {loading ? (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : <Text style={styles.empty}>No alerts yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  chips: {
    paddingBottom: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.background,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  warning: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  error: {
    color: colors.negative,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 12,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
});
