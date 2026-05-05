import { useEffect, useRef, useCallback } from 'react';

function getWsUrl() {
  const envWs = import.meta.env.VITE_WS_URL;
  if (envWs) return envWs;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return apiUrl.replace(/^http/, 'ws') + '/ws';
  // In dev: proxy handles /ws → backend
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function useWebSocket(handlers) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    const url = getWsUrl();
    try {
      ws.current = new WebSocket(url);
    } catch (e) {
      console.error('WS connect failed:', e.message);
      reconnectTimer.current = setTimeout(connect, 3000);
      return;
    }

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      handlersRef.current.onConnected?.();
    };

    ws.current.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        handlersRef.current[msg.type]?.(msg.data);
      } catch (e) {
        console.error('WS parse error:', e.message);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected — reconnecting in 3s');
      handlersRef.current.onDisconnected?.();
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = e => {
      console.error('WebSocket error:', e);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);
}
