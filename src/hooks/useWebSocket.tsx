import { useState, useCallback, useEffect, useRef } from 'react';

type Options = {
  onOpen: () => void;
  onMessage: (event: WebSocketMessageEvent) => void;
  onClose: () => void;
  onError: (error: WebSocketErrorEvent) => void;
  reconnect?: boolean;
};

export const useWebSocket = (
  url: string,
  { onMessage, onOpen, onClose, onError, reconnect = true }: Options,
) => {
  const [shouldReconnect, setShouldReconnect] = useState(reconnect);
  const websocket = useRef<any>(null);

  const handleInitWebsocket = useCallback(() => {
    const ws = new WebSocket(url);
    ws.onopen = () => onOpen?.();
    ws.onmessage = event => onMessage?.(event);
    ws.onerror = error => onError?.(error);
    ws.onclose = () => (shouldReconnect ? handleInitWebsocket() : onClose?.());
    websocket.current = ws;
  }, [onClose, onError, onMessage, onOpen, shouldReconnect, url]);

  useEffect(() => {
    handleInitWebsocket();
    return () => {
      setShouldReconnect(false);
      websocket.current?.close();
    };
  }, []);

  return {
    sendJsonMessage: (data: any) =>
      websocket.current.send(JSON.stringify(data)),
  };
};
