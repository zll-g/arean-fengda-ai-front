import { ref } from 'vue';
import type { Ref } from 'vue';

interface ReconnectPolicy {
  count: number;
  delay: number;
}

const DEFAULT_RECONNECT_POLICY: ReconnectPolicy[] = [
  { count: 5, delay: 3000 },
  { count: 10, delay: 300000 },
  { count: Infinity, delay: 0 },
];

export default function useWebSocket(wsObj: WebSocket, onMessage: (data: any) => void) {
  const timer: Ref<number | null> = ref(null);
  const disconnectCount: Ref<number> = ref(0);

  const initSocket = () => {
    wsObj.onopen = () => {
      disconnectCount.value = 0;
      console.log('WebSocket连接成功！');
      startHeartbeat();
    };

    wsObj.onmessage = (e) => {
      onMessage(e.data);
    };

    wsObj.onerror = (e) => {
      console.log('WebSocket通信异常', e);
      reconnect();
    };

    wsObj.onclose = (e) => {
      console.log('WebSocket连接关闭！');
      if (e.code != 1005) reconnect();
    };
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    timer.value = window.setInterval(() => {
      if (wsObj.readyState === WebSocket.OPEN) {
        wsObj.send('ping');
      }
    }, 60000);
  };

  const clearHeartbeat = () => {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
  };

  const reconnect = () => {
    if (timer.value) clearInterval(timer.value);

    const policy = DEFAULT_RECONNECT_POLICY.find((p) => disconnectCount.value < p.count)!;

    disconnectCount.value++;

    if (policy.delay > 0) {
      setTimeout(initSocket, policy.delay);
    } else {
      console.error('已达最大重连次数，停止自动连接！');
    }
  };

  const closeSocket = () => {
    if (timer.value) clearInterval(timer.value);
    wsObj?.close();
  };

  return {
    initSocket,
    closeSocket,
    reconnect,
  };
}
