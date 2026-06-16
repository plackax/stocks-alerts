import { useEffect, useRef, useState } from 'react';
import { useStocksStore } from '../store/stocks.store';
import { Stock } from '../types';

const THROTTLE_MS = 1000;

interface StocksOverview {
  stocksById: Record<string, Stock>;
  priceHistory: Record<string, number[]>;
}

function readOverview(): StocksOverview {
  const { stocksById, priceHistory } = useStocksStore.getState();
  return { stocksById, priceHistory };
}

/**
 * Throttled, reference-stable projection of the live stocks for the overview
 * chart. The store emits a price tick per symbol several times a second; feeding
 * those straight into the memoized {@link MultiStockChart} would re-render it and
 * replay its line animation on every tick.
 *
 * This hook subscribes to the store but republishes the `stocksById` /
 * `priceHistory` maps at most once per second on the trailing edge, so the chart
 * updates at ~1Hz while still reflecting the most recent prices. Between windows
 * it returns the same object reference, so the memoized chart skips re-rendering
 * entirely.
 */
export function useThrottledStocksOverview() {
  const [overview, setOverview] = useState<StocksOverview>(readOverview);

  const lastEmitRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const publish = () => {
      lastEmitRef.current = Date.now();
      setOverview(readOverview());
    };

    const unsubscribe = useStocksStore.subscribe(() => {
      const elapsed = Date.now() - lastEmitRef.current;
      if (elapsed >= THROTTLE_MS) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        publish();
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          publish();
        }, THROTTLE_MS - elapsed);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return overview;
}
