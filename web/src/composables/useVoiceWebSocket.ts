import { ref, onUnmounted } from 'vue';

export interface WsMessage {
  type: string;

  [key: string]: any;
}

export function useVoiceWebSocket() {
  const connected = ref(false);
  const ws = ref<WebSocket | null>(null);
  const lastMessage = ref<WsMessage | null>(null);

  const handlers: Record<string, Array<(msg: WsMessage) => void>> = {};

  function connect(userId: string) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/api/ws/voice/${userId}`;

    const socket = new WebSocket(url);

    socket.onopen = () => {
      connected.value = true;
      console.log('WebSocket 已连接');
    };

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        lastMessage.value = msg;

        // 触发类型处理器
        const typeHandlers = handlers[msg.type];
        if (typeHandlers) {
          typeHandlers.forEach((fn) => fn(msg));
        }

        // 触发通配处理器
        const allHandlers = handlers['*'];
        if (allHandlers) {
          allHandlers.forEach((fn) => fn(msg));
        }
      } catch (e) {
        console.error('WebSocket消息解析失败', e);
      }
    };

    socket.onclose = () => {
      connected.value = false;
      console.log('WebSocket 已断开');
    };

    socket.onerror = (error) => {
      console.error('WebSocket 错误', error);
      connected.value = false;
    };

    ws.value = socket;
  }

  function send(data: any) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  function sendBinary(data: ArrayBuffer | Blob) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(data);
    }
  }

  function on(type: string, handler: (msg: WsMessage) => void) {
    if (!handlers[type]) handlers[type] = [];
    handlers[type].push(handler);
  }

  function off(type: string, handler?: (msg: WsMessage) => void) {
    if (!handler) {
      delete handlers[type];
    } else {
      const arr = handlers[type];
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
      }
    }
  }

  function disconnect() {
    ws.value?.close();
    ws.value = null;
    connected.value = false;
  }

  onUnmounted(disconnect);

  return { connected, lastMessage, connect, send, sendBinary, on, off, disconnect };
}
