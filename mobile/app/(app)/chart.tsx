import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PriceChart } from '../../components/PriceChart';
import { colors } from '../../constants/theme';
import { useAlertsStore } from '../../store/alerts.store';
import { useStocksStore } from '../../store/stocks.store';

const EMPTY: number[] = [];

export default function ChartScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const stock = useStocksStore(useCallback((state) => state.stocksById[symbol], [symbol]));
  const history = useStocksStore(
    useCallback((state) => state.priceHistory[symbol] ?? EMPTY, [symbol]),
  );
  const createAlert = useAlertsStore((state) => state.createAlert);

  const [targetPrice, setTargetPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPositive = (stock?.change ?? 0) >= 0;
  const changeColor = isPositive ? colors.positive : colors.negative;

  const currentPrice = stock?.price;
  const parsedTarget = Number(targetPrice);
  const hasValidTarget = targetPrice.length > 0 && !Number.isNaN(parsedTarget) && parsedTarget > 0;
  const triggersImmediately =
    hasValidTarget && currentPrice !== undefined && parsedTarget <= currentPrice;

  const handleCreateAlert = async () => {
    if (!hasValidTarget) {
      setError('Enter a valid target price.');
      setFeedback(null);
      return;
    }
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      await createAlert(symbol, parsedTarget);
      setTargetPrice('');
      setFeedback(`Alert set for ${symbol} above $${parsedTarget.toFixed(2)}.`);
    } catch {
      setError('Could not create the alert.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: symbol }} />

      <Text style={styles.symbol}>{symbol}</Text>
      {stock ? (
        <View style={styles.priceRow}>
          <Text style={styles.price}>${stock.price.toFixed(2)}</Text>
          <Text style={[styles.change, { color: changeColor }]}>
            {isPositive ? '+' : ''}
            {stock.change.toFixed(2)}%
          </Text>
        </View>
      ) : null}

      <View style={styles.chartWrapper}>
        <PriceChart symbol={symbol} data={history} />
      </View>

      <Text style={styles.caption}>Last {history.length} price points</Text>

      <View style={styles.alertSection}>
        <Text style={styles.alertHeading}>Create alert</Text>
        <TextInput
          style={styles.input}
          placeholder="Target price"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={targetPrice}
          onChangeText={setTargetPrice}
          editable={!submitting}
        />

        <Text style={styles.helper}>
          {hasValidTarget
            ? `Notify me when ${symbol} rises above $${parsedTarget.toFixed(2)}.`
            : `You will be notified when ${symbol} rises above your target.`}
        </Text>

        {triggersImmediately && currentPrice !== undefined ? (
          <Text style={styles.warning}>
            {symbol} is already at ${currentPrice.toFixed(2)} — this alert will trigger immediately.
          </Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleCreateAlert}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonLabel}>Create alert</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  symbol: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 20,
  },
  price: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginRight: 10,
  },
  change: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartWrapper: {
    marginTop: 4,
  },
  caption: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  alertSection: {
    marginTop: 28,
  },
  alertHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
  feedback: {
    color: colors.positive,
    fontSize: 13,
    fontWeight: '600',
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
});
