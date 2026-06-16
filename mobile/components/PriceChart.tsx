import { StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { colors } from '../constants/theme';

interface PriceChartProps {
  symbol: string;
  data: number[];
}

const CHART_HEIGHT = 260;
const ANIMATION = { type: 'timing', duration: 300 } as const;
const MIN_Y_PADDING = 0.5;

export function PriceChart({ symbol, data }: PriceChartProps) {
  if (data.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Waiting for price data for {symbol}…</Text>
      </View>
    );
  }

  const points = data.map((value, index) => ({ index, value }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = Math.max((max - min) * 0.1, MIN_Y_PADDING);
  const yDomain: [number, number] = [min - padding, max + padding];

  return (
    <View style={styles.chart}>
      <CartesianChart data={points} xKey="index" yKeys={['value']} domain={{ y: yDomain }}>
        {({ points: chartPoints }) => (
          <Line
            points={chartPoints.value}
            color={colors.accent}
            strokeWidth={2}
            curveType="natural"
            animate={ANIMATION}
          />
        )}
      </CartesianChart>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: CHART_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  empty: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
