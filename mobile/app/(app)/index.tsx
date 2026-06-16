import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StockCard } from '../../components/StockCard';
import { colors } from '../../constants/theme';
import { selectSymbols, useStocksStore } from '../../store/stocks.store';

function StockRow({ symbol, onPress }: { symbol: string; onPress: (symbol: string) => void }) {
  const stock = useStocksStore((state) => state.stocksById[symbol]);
  if (!stock) {
    return null;
  }
  return <StockCard stock={stock} onPress={onPress} />;
}

export default function StocksScreen() {
  const router = useRouter();
  const symbols = useStocksStore(selectSymbols);
  const connected = useStocksStore((state) => state.connected);
  const reconnecting = useStocksStore((state) => state.reconnecting);

  const statusLabel = connected ? 'Live' : reconnecting ? 'Reconnecting…' : 'Disconnected';

  const goToChart = useCallback(
    (symbol: string) => {
      router.push({ pathname: '/(app)/chart', params: { symbol } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: string }) => <StockRow symbol={item} onPress={goToChart} />,
    [goToChart],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.status}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: connected
                  ? colors.positive
                  : reconnecting
                    ? colors.accent
                    : colors.negative,
              },
            ]}
          />
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>
      </View>

      <FlatList
        data={symbols}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {connected ? 'Waiting for stock prices…' : 'Connecting to live prices…'}
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});
