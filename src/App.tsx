import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  StatusBar,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  AppState,
} from 'react-native';
import throttle from 'lodash.throttle';

import OrderBook from './modules/orderbook/orderBook';
import { onBookData } from './modules/orderbook/orderbookSlice';
import { useWebSocket } from './hooks/useWebSocket';
import { RootState } from './store';

const RERENDER_THROTTLE_MS = 0;

type ProductId = 'PI_XBTUSD' | 'PI_ETHUSD';
type Feed = 'book_ui_1' | 'book_ui_1_snapshot';
type Event =
  | 'info'
  | 'error'
  | 'subscribed'
  | 'unsubscribed'
  | 'subscribe'
  | 'unsubscribe';

type IncomingMessagePayload = {
  event?: Exclude<Event, 'subscribe' | 'unsubscribe'>;
  feed?: Feed;
  bids?: [number, number][];
  asks?: [number, number][];
};

type OutgoingMessagePayload = {
  event?: Extract<Event, 'subscribe' | 'unsubscribe'>;
  feed?: Exclude<Feed, 'book_ui_1_snapshot'>;
  product_ids?: ProductId[];
};

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [activeFeed] = useState('book_ui_1');
  const [contracts] = useState(['PI_XBTUSD', 'PI_ETHUSD']);
  const [activeContract, setActiveContract] = useState('PI_XBTUSD');
  const bids = useSelector((state: RootState) => state.orderbook.bids);
  const asks = useSelector((state: RootState) => state.orderbook.asks);
  const dispatch = useDispatch();

  const subscribeFeed = useCallback(
    (feed, contract) => {
      ws?.sendJsonMessage({
        event: 'subscribe',
        feed,
        product_ids: [contract],
      });
    },
    [ws],
  );

  const unsubscribeFeed = useCallback(
    (feed, contract) => {
      const msg: OutgoingMessagePayload = {
        event: 'unsubscribe',
        feed,
        product_ids: [contract],
      };
      ws?.sendJsonMessage(msg);
    },
    [ws],
  );

  const handleAppStateChange = useCallback(
    nextAppState => {
      if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        unsubscribeFeed(activeFeed, activeContract);
      } else if (
        appState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        subscribeFeed(activeFeed, activeContract);
      }
      setAppState(nextAppState);
    },
    [appState, unsubscribeFeed, activeFeed, activeContract, subscribeFeed],
  );

  useEffect(
    () => AppState.addEventListener('change', handleAppStateChange),
    [handleAppStateChange],
  );

  const handleMessage = ({ data }: WebSocketMessageEvent) => {
    const message: IncomingMessagePayload = JSON.parse(data);
    const { event, feed } = message;
    if (event === 'subscribed') {
      console.log(`subscribed to feed ${feed}`);
    } else if (event === 'unsubscribed') {
      console.log(`unsubscribed from feed ${feed}`);
    } else if (event === 'error') {
      console.log('error', message);
    } else if (event === 'info') {
      console.log('info', message);
    } else {
      dispatchBookDataThrottled(message);
    }
  };

  const dispatchBookDataThrottled = throttle(message => {
    dispatch(onBookData(message));
  }, RERENDER_THROTTLE_MS);

  const handleOpen = () => {
    console.log('websocket connected :)');
    setIsConnected(true);
    subscribeFeed(activeFeed, activeContract);
  };

  const handleClose = () => {
    console.log('websocket disconnected :(');
    setIsConnected(false);
  };

  const handleError = () => {
    console.log('websocket error :(');
    setIsConnected(false);
  };

  const toggleContract = () => {
    unsubscribeFeed(activeFeed, activeContract);
    const currentIndex = contracts.indexOf(activeContract);
    const nextContract =
      currentIndex + 1 > contracts.length - 1
        ? contracts[0]
        : contracts[currentIndex + 1];
    setActiveContract(nextContract);
    subscribeFeed(activeFeed, nextContract);
    console.log(`switched to ${nextContract}`);
  };

  const ws = useWebSocket('wss://www.cryptofacilities.com/ws/v1', {
    onOpen: handleOpen,
    onMessage: handleMessage,
    onClose: handleClose,
    onError: handleError,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={'rgb(20,23,24)'}
      />
      <OrderBook bids={bids} asks={asks} />
      <TouchableOpacity
        onPress={toggleContract}
        disabled={!isConnected}
        style={[styles.toggleButton, !isConnected && styles.disabledButton]}>
        <Text style={styles.toggleButtonText}>Toggle Feed</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgb(20,23,24)',
  },
  toggleButton: {
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: 'rgb(83,69,209)',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  toggleButtonText: {
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.2,
  },
});
