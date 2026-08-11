// import SockJS from 'sockjs-client/dist/sockjs.min.js';
// import Stomp from 'stompjs';

// /**
//  * 语音填单进度监听器 (修复版)
//  *
//  * 解决竞态问题:
//  * 1. 建立 WebSocket 连接
//  * 2. 订阅进度频道
//  * 3. 立即通过 HTTP 拉取已错过的历史进度
//  * 4. 合并去重后回调
//  */
// export function createProgressWatcher(recordId, callbacks = {}) {
//   let stompClient = null;
//   let subscription = null;
//   let receivedSteps = new Set(); // 已处理的 step，用于去重

//   function connect() {
//     const socket = new SockJS('/api/ws');
//     stompClient = Stomp.over(socket);
//     stompClient.debug = null;

//     stompClient.connect(
//       {},
//       () => {
//         // 1. 先订阅 WebSocket（接收后续新消息）
//         subscription = stompClient.subscribe(`/topic/progress/${recordId}`, (message) => {
//           try {
//             const msg = JSON.parse(message.body);
//             handleMessage(msg);
//           } catch (e) {
//             console.error('解析进度消息失败:', e);
//           }
//         });

//         // 2. 订阅成功后，立即拉取历史进度（补齐错过的消息）
//         fetchMissedProgress();
//       },
//       (error) => {
//         console.error('WebSocket 连接失败:', error);
//         callbacks.onError?.({ message: 'WebSocket 连接失败' });
//         // 降级为轮询模式
//         startPollingFallback();
//       },
//     );
//   }

//   /**
//    * 拉取已错过的历史进度
//    */
//   async function fetchMissedProgress() {
//     try {
//       const resp = await fetch(`/api/voice-form/progress/${recordId}`);
//       const result = await resp.json();
//       const history = result.data || [];

//       console.log(`[WS] 拉取历史进度: ${history.length} 条`);

//       // 按顺序回放历史消息
//       for (const msg of history) {
//         handleMessage(msg);
//       }
//     } catch (e) {
//       console.warn('拉取历史进度失败:', e);
//     }
//   }

//   /*function handleMessage(msg) {
//         switch (msg.step) {
//             case 'DONE':
//                 callbacks.onComplete?.(msg.data)
//                 break
//             case 'ERROR':
//                 callbacks.onError?.(msg)
//                 break
//             default:
//                 callbacks.onProgress?.(msg)
//         }
//     }

//     function disconnect() {
//         if (subscription) {
//             subscription.unsubscribe()
//             subscription = null
//         }
//         if (stompClient) {
//             stompClient.disconnect()
//             stompClient = null
//         }
//     }*/

//   /**
//    * 处理进度消息（带去重）
//    */
//   function handleMessage(msg) {
//     // 去重: 同一个 step+status 只处理一次
//     const key = `${msg.step}_${msg.status}_${msg.percent}`;
//     if (receivedSteps.has(key)) return;
//     receivedSteps.add(key);

//     switch (msg.step) {
//       case 'DONE':
//         callbacks.onComplete?.(msg.data);
//         break;
//       case 'ERROR':
//         callbacks.onError?.(msg);
//         break;
//       case 'BATCH_DONE':
//         callbacks.onComplete?.(msg.data);
//         break;
//       default:
//         callbacks.onProgress?.(msg);
//     }
//   }

//   /**
//    * 降级轮询（WebSocket 不可用时）
//    */
//   let pollingTimer = null;

//   function startPollingFallback() {
//     console.log('[WS] 降级为轮询模式');
//     pollingTimer = setInterval(async () => {
//       try {
//         const resp = await fetch(`/api/voice-form/progress/${recordId}/latest`);
//         const result = await resp.json();
//         const msg = result.data;
//         if (msg) {
//           handleMessage(msg);
//           // 如果已完成，停止轮询
//           if (msg.step === 'DONE' || msg.step === 'ERROR') {
//             stopPolling();
//           }
//         }
//       } catch (e) {
//         console.warn('轮询进度失败:', e);
//       }
//     }, 2000); // 每2秒轮询
//   }

//   function stopPolling() {
//     if (pollingTimer) {
//       clearInterval(pollingTimer);
//       pollingTimer = null;
//     }
//   }

//   function disconnect() {
//     stopPolling();
//     if (subscription) {
//       subscription.unsubscribe();
//       subscription = null;
//     }
//     if (stompClient) {
//       stompClient.disconnect();
//       stompClient = null;
//     }
//     receivedSteps.clear();
//   }

//   return { connect, disconnect };
// }
