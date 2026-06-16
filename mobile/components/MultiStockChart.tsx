import { memo, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { colors } from '../constants/theme';
import { Stock } from '../types';

/**
 * Stable line/legend color assigned to each tracked symbol, shared by the
 * overview chart, its toggle chips, and the legend.
 */
export const SYMBOL_COLORS: Record<string, string> = {
  AAPL: '#4FC3F7',
  GOOGL: '#81C784',
  MSFT: '#FFB74D',
  TSLA: '#EF5350',
  AMZN: '#FF8A65',
  META: '#7986CB',
  NVDA: '#4DB6AC',
  NFLX: '#F06292',
};

const SYMBOLS = Object.keys(SYMBOL_COLORS);
const MIN_POINTS = 2;
const CHART_HEIGHT = 260;
const ANIMATION = { type: 'timing', duration: 300 } as const;
const LOG_PADDING_RATIO = 0.05;
const MIN_LOG_PADDING = 0.01;
const MIN_POSITIVE_PRICE = 1e-6;

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

function toLog10(value: number) {
  return Math.log10(value > 0 ? value : MIN_POSITIVE_PRICE);
}

function fromLog10(value: number) {
  return Math.pow(10, value);
}

interface MultiStockChartProps {
  stocksById: Record<string, Stock>;
  priceHistory: Record<string, number[]>;
}

/**
 * Overview chart plotting every tracked symbol on one shared axis at its actual
 * price, so a higher-priced stock sits above a lower-priced one and lines cross
 * only where prices truly cross.
 *
 * Prices are plotted on a base-10 logarithmic Y-axis: each point is rendered as
 * `log10(price)`, so equal percentage moves take equal vertical space and every
 * stock's movement stays visible across a wide price spread while symbols remain
 * ordered by absolute price. The Y-axis domain is a padded min/max in log space
 * computed from only the currently visible symbols' aligned points, so toggling
 * symbols off auto-zooms the axis to the remaining lines. The axis labels convert
 * each log tick back to a real dollar value, so the mid label is the geometric
 * mean of the visible price range. Each symbol has a toggle chip to show/hide its
 * line, and a live legend shows the current price per visible symbol. Renders a
 * placeholder until at least two data points are available. Exported as a
 * memoized component.
 *
 * @param stocksById - Current stocks keyed by symbol, used for the legend prices.
 * @param priceHistory - Rolling price history per symbol, used to plot the lines.
 */
function MultiStockChartComponent({ stocksById, priceHistory }: MultiStockChartProps) {
  const [hiddenSymbols, setHiddenSymbols] = useState<Set<string>>(new Set());

  const toggleSymbol = (symbol: string) => {
    setHiddenSymbols((current) => {
      const next = new Set(current);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  const visibleSymbols = useMemo(
    () =>
      SYMBOLS.filter(
        (symbol) => !hiddenSymbols.has(symbol) && (priceHistory[symbol]?.length ?? 0) >= MIN_POINTS,
      ),
    [hiddenSymbols, priceHistory],
  );

  const chartData = useMemo(() => {
    if (visibleSymbols.length === 0) {
      return [];
    }
    const minLength = Math.min(...visibleSymbols.map((symbol) => priceHistory[symbol].length));
    const rows: Record<string, number>[] = [];
    for (let index = 0; index < minLength; index += 1) {
      const row: Record<string, number> = { index };
      for (const symbol of visibleSymbols) {
        const history = priceHistory[symbol];
        row[symbol] = toLog10(history[history.length - minLength + index]);
      }
      rows.push(row);
    }
    return rows;
  }, [visibleSymbols, priceHistory]);

  const logRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const row of chartData) {
      for (const symbol of visibleSymbols) {
        const value = row[symbol];
        if (value < min) {
          min = value;
        }
        if (value > max) {
          max = value;
        }
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 0 };
    }
    return { min, max };
  }, [chartData, visibleSymbols]);

  const yDomain = useMemo<[number, number]>(() => {
    const padding = Math.max((logRange.max - logRange.min) * LOG_PADDING_RATIO, MIN_LOG_PADDING);
    return [logRange.min - padding, logRange.max + padding];
  }, [logRange]);

  const axisLabels = useMemo(() => {
    const midLog = (logRange.min + logRange.max) / 2;
    return {
      max: formatPrice(fromLog10(logRange.max)),
      mid: formatPrice(fromLog10(midLog)),
      min: formatPrice(fromLog10(logRange.min)),
    };
  }, [logRange]);

  const priceBySymbol = useMemo(() => {
    const map: Record<string, number> = {};
    for (const symbol of Object.keys(stocksById)) {
      map[symbol] = stocksById[symbol].price;
    }
    return map;
  }, [stocksById]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {SYMBOLS.map((symbol) => {
          const active = !hiddenSymbols.has(symbol);
          const symbolColor = SYMBOL_COLORS[symbol];
          return (
            <TouchableOpacity
              key={symbol}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: symbolColor, borderColor: symbolColor }
                  : styles.chipInactive,
              ]}
              onPress={() => toggleSymbol(symbol)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{symbol}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {chartData.length > 0 ? (
        <View style={styles.chartRow}>
          <View style={styles.axis}>
            <Text style={styles.axisLabel}>{axisLabels.max}</Text>
            <Text style={styles.axisLabel}>{axisLabels.mid}</Text>
            <Text style={styles.axisLabel}>{axisLabels.min}</Text>
          </View>
          <View style={styles.chart}>
            <CartesianChart
              data={chartData}
              xKey="index"
              yKeys={visibleSymbols}
              domain={{ y: yDomain }}
            >
              {({ points }) =>
                visibleSymbols.map((symbol) => (
                  <Line
                    key={symbol}
                    points={points[symbol]}
                    color={SYMBOL_COLORS[symbol]}
                    strokeWidth={2}
                    curveType="natural"
                    animate={ANIMATION}
                  />
                ))
              }
            </CartesianChart>
          </View>
        </View>
      ) : null}

      {chartData.length > 0 ? <Text style={styles.caption}>Log scale · $</Text> : null}

      {chartData.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Waiting for price data…</Text>
        </View>
      ) : null}

      <View style={styles.legend}>
        {visibleSymbols.map((symbol) => (
          <View key={symbol} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: SYMBOL_COLORS[symbol] }]} />
            <Text style={styles.legendSymbol}>{symbol}</Text>
            <Text style={styles.legendPrice}>
              {priceBySymbol[symbol] !== undefined
                ? `$${priceBySymbol[symbol].toFixed(2)}`
                : '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const MultiStockChart = memo(MultiStockChartComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chips: {
    paddingBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  chipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.background,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  axis: {
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingRight: 8,
    width: 52,
  },
  axisLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
  chart: {
    flex: 1,
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
  caption: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendSymbol: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  legendPrice: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
