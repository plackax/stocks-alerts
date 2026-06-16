import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/theme';
import { Stock } from '../types';

interface StockCardProps {
  stock: Stock;
  onPress: (symbol: string) => void;
}

function StockCardComponent({ stock, onPress }: StockCardProps) {
  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? colors.positive : colors.negative;
  const changeLabel = `${isPositive ? '+' : ''}${stock.change.toFixed(2)}%`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(stock.symbol)}
      accessibilityRole="button"
    >
      <View style={styles.left}>
        <Text style={styles.symbol}>{stock.symbol}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {stock.name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>${stock.price.toFixed(2)}</Text>
        <Text style={[styles.change, { color: changeColor }]}>{changeLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

export const StockCard = memo(
  StockCardComponent,
  (prev, next) =>
    prev.stock.symbol === next.stock.symbol &&
    prev.stock.price === next.stock.price &&
    prev.stock.change === next.stock.change &&
    prev.onPress === next.onPress,
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
  left: {
    flex: 1,
    marginRight: 12,
  },
  symbol: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
