import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MultiStockChart } from '../../components/MultiStockChart';
import { colors } from '../../constants/theme';
import { useThrottledStocksOverview } from '../../hooks/useThrottledStocksOverview';

export default function OverviewScreen() {
  const { stocksById, priceHistory } = useThrottledStocksOverview();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Market overview</Text>
      <Text style={styles.subtitle}>Tap a symbol to toggle its line.</Text>

      <View style={styles.chartWrapper}>
        <MultiStockChart stocksById={stocksById} priceHistory={priceHistory} />
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
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  chartWrapper: {
    marginTop: 4,
  },
});
