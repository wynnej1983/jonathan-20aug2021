import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Quote = {
  price: number;
  size: number;
  total: number;
  side: 'bids' | 'asks';
};

export type OrderbookState = {
  bids: Quote[];
  asks: Quote[];
};

export type OrderbookPayload = {
  feed: string;
  bids: [number, number][];
  asks: [number, number][];
};

const initialState: OrderbookState = {
  bids: [],
  asks: [],
};

export const orderbookSlice = createSlice({
  name: 'orderbook',
  initialState,
  reducers: {
    onBookData: (state, action: PayloadAction<OrderbookPayload>) => {
      if (action.payload.feed === 'book_ui_1_snapshot') {
        // snapshot
        state.bids = calculateRunningTotal(
          'bids',
          action.payload.bids.map(([price, size]) => ({ price, size })),
        );
        state.asks = calculateRunningTotal(
          'asks',
          action.payload.asks.map(([price, size]) => ({ price, size })),
        );
      } else if (action.payload.feed === 'book_ui_1') {
        // update
        state.asks = action.payload.asks.reduce(
          (acc, [price, size]) =>
            quoteReducer(acc, { price, size, side: 'asks' }),
          state,
        ).asks;
        state.bids = action.payload.bids.reduce(
          (acc, [price, size]) =>
            quoteReducer(acc, { price, size, side: 'bids' }),
          state,
        ).bids;
      }
    },
  },
});

const calculateRunningTotal = (
  side: Quote['side'],
  arr: Partial<Quote>[],
): Quote[] => {
  if (side === 'bids') {
    for (let i = 0; i < arr.length; i++) {
      arr[i].total = i === 0 ? arr[i].size : arr[i - 1].total + arr[i].size;
    }
  } else {
    for (let i = arr.length - 1; i >= 0; i--) {
      arr[i].total =
        i === arr.length - 1 ? arr[i].size : arr[i + 1].total + arr[i].size;
    }
  }
  return arr as Quote[];
};

const quoteReducer = (
  state: OrderbookState,
  { price, size, side }: Omit<Quote, 'total'>,
) => {
  if (size === 0) {
    state[side] = calculateRunningTotal(
      side,
      state[side].filter(d => d.price !== price).slice(0, 12),
    );
    return state;
  } else {
    const index = state[side].findIndex(d => d.price === price);
    if (index === -1) {
      //insert
      state[side] = calculateRunningTotal(
        side,
        [
          ...state[side],
          {
            price,
            size,
          },
        ]

          .sort((a, b) => b.price - a.price)
          .slice(0, 12),
      );
      return state;
    } else {
      //update
      state[side] = calculateRunningTotal(
        side,
        state[side]
          .map((d, idx) => (index === idx ? { ...d, price, size } : d))
          .slice(0, 12),
      );
      return state;
    }
  }
};

// Action creators are generated for each case reducer function
const { actions, reducer } = orderbookSlice;

export const { onBookData } = actions;

export default reducer;
