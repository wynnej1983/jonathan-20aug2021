import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import numeral from 'numeral';
import { Quote } from './orderbookSlice';

const windowHeight = Dimensions.get('window').height;

const Columns: React.FC = React.memo(() => {
  let cols = useMemo(
    () => [
      { name: 'PRICE', flex: 0.4 },
      { name: 'SIZE', flex: 0.3 },
      { name: 'TOTAL', flex: 0.3 },
    ],
    [],
  );
  return (
    <View style={styles.columnsContainer}>
      {cols.map(({ name, flex }) => (
        <Text key={name} style={[styles.columnHeaderText, { flex }]}>
          {name}
        </Text>
      ))}
    </View>
  );
});

type RowProps = {
  maxTotal: number;
} & Quote;

const Row: React.FC<RowProps> = React.memo<RowProps>(
  ({ side, size, total, maxTotal, price }) => {
    let cols = useMemo(
      () => [
        { name: price, flex: 0.4, format: '0,0.00' },
        { name: size, flex: 0.3, format: '0,00' },
        { name: total, flex: 0.3, format: '0,00' },
      ],
      [price, size, total],
    );

    const barPercentWidth = useMemo(
      () => (100 * total) / maxTotal,
      [total, maxTotal],
    );

    return (
      <View style={styles.row}>
        <View
          style={[
            side === 'bids' ? styles.bidBar : styles.askBar,
            {
              width: `${barPercentWidth}%`,
            },
          ]}
        />
        {cols.map(({ name, flex, format }, idx) => (
          <Text
            key={`${name}${idx}`}
            style={[
              styles.valueText,
              idx === 0 && (side === 'bids' ? styles.bidText : styles.askText),
              { flex },
            ]}>
            {numeral(name).format(format)}
          </Text>
        ))}
      </View>
    );
  },
);

type OrderBookProps = {
  bids: Quote[];
  asks: Quote[];
};

const OrderBook: React.FC<OrderBookProps> = React.memo(({ bids, asks }) => {
  const topAsk = useMemo(() => Math.min(...asks.map(ask => ask.price)), [asks]);
  const topBid = useMemo(() => Math.max(...bids.map(bid => bid.price)), [bids]);

  const maxTotal = useMemo(
    () =>
      Math.max(
        Math.max(...bids.map(bid => bid.total)),
        Math.max(...asks.map(ask => ask.total)),
      ),
    [bids, asks],
  );

  const [spread, spreadPercent] = useMemo(() => {
    const _spread = topAsk - topBid;
    const _spreadPercent = _spread / topAsk;
    return [_spread.toFixed(2), _spreadPercent.toFixed(3)];
  }, [topAsk, topBid]);

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Order Book</Text>
      <Columns />
      <View style={styles.asksList}>
        {asks.map((ask, idx) => (
          <Row
            key={`${ask.price} ${idx}`}
            {...ask}
            side="asks"
            maxTotal={maxTotal}
          />
        ))}
      </View>
      <Text style={styles.spreadText}>
        Spread: {spread} ({spreadPercent}%)
      </Text>
      <View style={styles.bidsList}>
        {bids.map((bid, idx) => (
          <Row
            key={`${bid.price} ${idx}`}
            {...bid}
            side="bids"
            maxTotal={maxTotal}
          />
        ))}
      </View>
    </View>
  );
});

export default OrderBook;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgb(20,23,24)',
  },
  headerText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 30,
    marginBottom: 8,
    marginLeft: 15,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 26,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgb(34,41,54)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgb(34,41,54)',
  },
  columnHeaderText: {
    textAlign: 'center',
    color: 'rgb(75,80,93)',
    fontSize: 14,
    opacity: 0.75,
  },
  asksList: {
    justifyContent: 'flex-end',
    height: windowHeight / 2 - 136,
    overflow: 'hidden',
  },
  bidsList: {
    height: windowHeight / 2 - 136,
    overflow: 'hidden',
  },
  row: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidBar: {
    backgroundColor: 'rgb(29,52,52)',
    position: 'absolute',
    left: 0,
    height: '100%',
  },
  askBar: {
    backgroundColor: 'rgb(55,32,40)',
    position: 'absolute',
    left: 0,
    height: '100%',
  },
  bidText: {
    color: 'rgb(76,155,112)',
  },
  askText: {
    color: 'rgb(188,66,63)',
  },
  spreadText: {
    padding: 5,
    marginLeft: '30%',
    fontSize: 14,
    color: 'rgb(75,80,93)',
  },
  valueText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
});
