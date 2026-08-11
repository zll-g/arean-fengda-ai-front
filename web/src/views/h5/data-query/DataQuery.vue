<template>
  <div class="data-query-page">
    <van-sticky>
      <van-nav-bar title="智能问数" left-text="返回" left-arrow @click-left="onClickLeft" />
    </van-sticky>

    <div ref="chatContainer" class="chat-container">
      <LineChart
        v-for="msg in chatStore.messages"
        :key="msg.id"
        :message="msg"
        @ask-question="handleSendMessage"
      />
    </div>

    <!-- 移动端输入区域 -->
    <div class="mobile-input-area">
      <div v-if="isRecording || isTranscribing || speechTip" class="voice-panel">
        <div class="voice-status">
          <span class="voice-dot" />
          <span class="voice-text">{{ voiceStatusText }}</span>
        </div>

        <div v-if="isRecording || isTranscribing" class="voice-waves">
          <span />
          <span />
          <span />
          <span />
        </div>

        <van-button
          v-if="isRecording"
          class="voice-stop-btn"
          size="mini"
          round
          type="primary"
          @click="stopVoiceInput"
        >
          结束
        </van-button>
      </div>

      <div class="input-card">
        <div v-if="!canSend" class="input-warning">
          <van-icon name="warning-o" />
          <span>请先选择至少一个数据库</span>
        </div>

        <div v-else class="input-tip">当前已选择 {{ currentDatasourceName }}</div>

        <div class="input-bar">
          <van-field
            v-model="inputText"
            class="message-input"
            type="textarea"
            rows="1"
            autosize
            :maxlength="500"
            :placeholder="inputPlaceholder"
            :disabled="chatStore.loading || isTranscribing"
            @keydown.enter.exact.prevent="handleSend"
            @keydown.shift.enter.exact.stop
          />

          <van-button
            v-if="!chatStore.loading"
            class="voice-btn"
            :class="{ active: isRecording || isTranscribing }"
            round
            :disabled="!canSend || isTranscribing"
            @click="toggleVoiceInput"
          >
            <van-icon name="volume-o" size="19" />
          </van-button>

          <van-button
            v-if="!chatStore.loading"
            class="send-btn"
            type="primary"
            round
            :disabled="!inputText.trim() || !canSend || isRecording || isTranscribing"
            @click="handleSend"
          >
            <van-icon name="guide-o" size="19" />
          </van-button>

          <van-button v-else class="cancel-btn" type="danger" round @click="handleCancel">
            <van-icon name="cross" size="18" />
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { useDatasourceStore } from '@/store/datasource';
import { useDataQueryStore } from '@/store';
import LineChart from './components/LineChart.vue';
import api from '@/api';

const router = useRouter();
const chatStore = useDataQueryStore();
const dsStore = useDatasourceStore();

const chatContainer = ref<HTMLElement>();
const inputText = ref('');

let scrollAnimationFrame: number | null = null;
let mutationObserver: MutationObserver | null = null;

const selectedDatabases = ref<string[]>(['power_realtime']);

const isRecording = ref(false);
const isTranscribing = ref(false);
const speechTip = ref('');
const mediaStream = ref<MediaStream | null>(null);
const audioContext = ref<AudioContext | null>(null);
const audioSource = ref<MediaStreamAudioSourceNode | null>(null);
const scriptProcessor = ref<ScriptProcessorNode | null>(null);
const audioBuffers = ref<Float32Array[]>([]);
const recordingStartTime = ref(0);
const wavSampleRate = ref(16000);

let speechTipTimer: number | null = null;

const canSend = computed(() => selectedDatabases.value.length > 0);

const inputPlaceholder = computed(() => {
  if (isRecording.value) return '正在聆听，请说出你的问题...';
  if (isTranscribing.value) return '正在识别语音内容...';

  return canSend.value ? '请输入你的问题，或点击语音按钮提问' : '请先选择数据库后再提问';
});

const voiceStatusText = computed(() => {
  if (isRecording.value) return '正在录音，请说出你的问题';
  if (isTranscribing.value) return '正在转换语音内容';

  return speechTip.value;
});

watch(
  () => [
    chatStore.messages.length,
    chatStore.messages[chatStore.messages.length - 1],
    chatStore.loading,
  ],
  () => {
    scrollToBottom();
  },
  {
    deep: true,
    flush: 'post',
  },
);

const onClickLeft = () => {
  router.back();
};

const handleSend = async () => {
  if (isRecording.value) {
    stopVoiceInput();
    return;
  }

  if (isTranscribing.value) return;

  const question = inputText.value.trim();

  if (!canSend.value) {
    showToast('请先选择至少一个数据库');
    return;
  }

  if (!question) {
    showToast('请输入您的问题');
    return;
  }

  await handleSendMessage(question);
};

const handleSendMessage = async (question: string) => {
  inputText.value = '';

  await nextTick();
  scrollToBottom();

  try {
    await chatStore.sendMessage(String(dsStore.currentId), question);
  } catch (error) {
    console.error('发送消息失败:', error);
    showToast('发送失败，请稍后重试');
  } finally {
    scrollToBottom();
  }
};

const handleCancel = () => {
  if (typeof chatStore.cancelStreaming === 'function') {
    chatStore.cancelStreaming();
  }

  showToast('已停止生成');
};

const toggleVoiceInput = () => {
  if (!canSend.value) {
    showToast('请先选择至少一个数据库');
    return;
  }

  if (chatStore.loading || isTranscribing.value) return;

  if (isRecording.value) {
    stopVoiceInput();
  } else {
    startVoiceInput();
  }
};

const getAudioContextConstructor = () => {
  return window.AudioContext || (window as any).webkitAudioContext;
};

const getRecordConstraints = (): MediaStreamConstraints => {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
  };
};

const getUserMediaCompat = (constraints: MediaStreamConstraints): Promise<MediaStream> => {
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacyGetUserMedia =
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia ||
    (navigator as any).msGetUserMedia;

  if (!legacyGetUserMedia) {
    return Promise.reject({ name: 'NotSupportedError' });
  }

  return new Promise((resolve, reject) => {
    legacyGetUserMedia.call(navigator, constraints, resolve, reject);
  });
};

const getRecordStream = async () => {
  try {
    return await getUserMediaCompat(getRecordConstraints());
  } catch (error: any) {
    const needSimpleAudio =
      error?.name === 'OverconstrainedError' ||
      error?.name === 'ConstraintNotSatisfiedError' ||
      error?.name === 'TypeError';

    if (needSimpleAudio) {
      return getUserMediaCompat({ audio: true });
    }

    throw error;
  }
};

const resumeAudioContext = async (context: AudioContext) => {
  if (context.state === 'suspended') {
    await context.resume();
  }
};

const getRecordErrorTip = (error: any) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return '请允许浏览器使用麦克风';
  }

  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return '未检测到可用麦克风';
  }

  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return '麦克风被占用，请关闭其他录音应用后重试';
  }

  if (error?.name === 'NotSupportedError') {
    return '当前移动端环境不支持录音，请使用 HTTPS 或开启 App 麦克风权限';
  }

  return '录音开启失败，请稍后重试';
};

const startVoiceInput = async () => {
  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    showSpeechTip('当前浏览器不支持音频处理');
    return;
  }

  try {
    speechTip.value = '';
    audioBuffers.value = [];
    cleanupAudioRecorder();

    const context = new AudioContextConstructor();
    audioContext.value = context;
    wavSampleRate.value = context.sampleRate || 16000;

    await resumeAudioContext(context);

    const stream = await getRecordStream();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);

    mediaStream.value = stream;
    audioSource.value = source;
    scriptProcessor.value = processor;

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!isRecording.value) return;

      const inputData = event.inputBuffer.getChannelData(0);
      audioBuffers.value.push(new Float32Array(inputData));
    };

    source.connect(processor);
    processor.connect(context.destination);

    isRecording.value = true;
    isTranscribing.value = false;
    recordingStartTime.value = Date.now();
  } catch (error: any) {
    console.error('开启录音失败:', error);

    isRecording.value = false;
    isTranscribing.value = false;
    cleanupAudioRecorder();
    showSpeechTip(getRecordErrorTip(error));
  }
};

const stopVoiceInput = async () => {
  if (!isRecording.value) return;

  isRecording.value = false;

  const duration = Date.now() - recordingStartTime.value;
  const buffers = [...audioBuffers.value];

  cleanupAudioRecorder();

  if (duration < 500 || buffers.length === 0) {
    showSpeechTip('录音时间太短，请重新录入');
    audioBuffers.value = [];
    return;
  }

  const wavBlob = encodeWav(buffers, wavSampleRate.value);

  audioBuffers.value = [];

  await uploadVoiceFile(wavBlob);
};

const cleanupAudioRecorder = () => {
  try {
    scriptProcessor.value?.disconnect();
  } catch (error) {
    console.warn('断开音频处理器失败:', error);
  }

  try {
    audioSource.value?.disconnect();
  } catch (error) {
    console.warn('断开音频源失败:', error);
  }

  try {
    const context = audioContext.value as any;

    if (context && context.state !== 'closed') {
      const closeTask = context.close?.();
      closeTask?.catch?.((error: any) => console.warn('关闭 AudioContext 失败:', error));
    }
  } catch (error) {
    console.warn('关闭 AudioContext 失败:', error);
  }

  mediaStream.value?.getTracks().forEach((track) => {
    track.stop();
  });

  scriptProcessor.value = null;
  audioSource.value = null;
  audioContext.value = null;
  mediaStream.value = null;
};

const uploadVoiceFile = async (audioBlob: Blob) => {
  try {
    isTranscribing.value = true;
    speechTip.value = '';

    const audioFile = new File([audioBlob], `voice_${Date.now()}.wav`, {
      type: 'audio/wav',
    });

    const formData = new FormData();
    formData.append('audio', audioFile);

    const res = await api.knowledgeQa.process(formData);
    const text = normalizeSpeechText(res?.data);

    if (!text) {
      showSpeechTip('未识别到有效内容');
      return;
    }

    inputText.value = mergeVoiceText(inputText.value, text);
    showSpeechTip('语音识别成功');

    await nextTick();

    const question = inputText.value.trim();

    if (question) {
      await handleSendMessage(question);
    }
  } catch (error) {
    console.error('语音转文字失败:', error);
    showSpeechTip('语音识别失败，请重试');
  } finally {
    isTranscribing.value = false;
  }
};

const encodeWav = (buffers: Float32Array[], sampleRate: number) => {
  const mergedBuffer = mergeAudioBuffers(buffers);
  const targetSampleRate = 16000;
  const resampledBuffer = resampleAudioBuffer(mergedBuffer, sampleRate, targetSampleRate);

  const dataLength = resampledBuffer.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  floatTo16BitPCM(view, 44, resampledBuffer);

  return new Blob([view], {
    type: 'audio/wav',
  });
};

const mergeAudioBuffers = (buffers: Float32Array[]) => {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const result = new Float32Array(totalLength);

  let offset = 0;

  buffers.forEach((buffer) => {
    result.set(buffer, offset);
    offset += buffer.length;
  });

  return result;
};

const resampleAudioBuffer = (
  buffer: Float32Array,
  originalSampleRate: number,
  targetSampleRate: number,
) => {
  if (originalSampleRate === targetSampleRate) {
    return buffer;
  }

  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const beforeIndex = Math.floor(originalIndex);
    const afterIndex = Math.min(beforeIndex + 1, buffer.length - 1);
    const weight = originalIndex - beforeIndex;

    result[i] = buffer[beforeIndex] * (1 - weight) + buffer[afterIndex] * weight;
  }

  return result;
};

const floatTo16BitPCM = (view: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
};

const writeString = (view: DataView, offset: number, value: string) => {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
};

const normalizeSpeechText = (data: any) => {
  if (typeof data === 'string') {
    return data.trim();
  }

  if (data?.text) return String(data.text).trim();
  if (data?.result) return String(data.result).trim();
  if (data?.content) return String(data.content).trim();
  if (data?.data) return String(data.data).trim();

  return '';
};

const mergeVoiceText = (baseText: string, voiceText: string) => {
  const text = voiceText.trim();

  if (!text) return baseText;

  const trimmedBase = baseText.trimEnd();

  if (!trimmedBase) return text;

  return `${trimmedBase}${/[\s，。！？,.!?]$/.test(trimmedBase) ? '' : ' '}${text}`;
};

const showSpeechTip = (message: string) => {
  speechTip.value = message;

  if (speechTipTimer) {
    window.clearTimeout(speechTipTimer);
  }

  speechTipTimer = window.setTimeout(() => {
    speechTip.value = '';
    speechTipTimer = null;
  }, 2200);
};

const scrollToBottom = (behavior: any = 'smooth') => {
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
  }

  scrollAnimationFrame = requestAnimationFrame(() => {
    const el = chatContainer.value;

    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });

    scrollAnimationFrame = null;
  });
};

const currentDatasource = computed(() => {
  return (
    dsStore.list.find((item: any) => String(item.id) === String(dsStore.currentId)) ||
    dsStore.current ||
    null
  );
});

const currentDatasourceName = computed(() => {
  return currentDatasource.value?.name || currentDatasource.value?.groupName || '请选择数据源';
});

onMounted(() => {
  nextTick(() => {
    scrollToBottom('auto');

    if (chatContainer.value) {
      mutationObserver = new MutationObserver(() => {
        if (chatStore.loading) {
          scrollToBottom();
        }
      });

      mutationObserver.observe(chatContainer.value, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  });

  setTimeout(scrollToBottom, 300);
});

onBeforeUnmount(() => {
  if (isRecording.value) {
    stopVoiceInput();
  }

  cleanupAudioRecorder();

  if (speechTipTimer) {
    window.clearTimeout(speechTipTimer);
  }

  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
  }

  mutationObserver?.disconnect();
  mutationObserver = null;
});
</script>

<style scoped lang="scss">
.data-query-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f8fafc;

  .history-icon {
    margin-left: 16px;
  }
}

.chat-container {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: hidden auto;
  background-color: #f8fafc;
  -webkit-overflow-scrolling: touch;
}

.message-row {
  margin-bottom: 16px;
  animation: message-in 0.25s ease-out;
}

.ai-row {
  display: flex;
  justify-content: flex-start;
  width: 100%;
}

.ai-message {
  width: 100%;
}

.ai-card {
  width: 100%;
  overflow: hidden;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
}

.ai-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;

  .ai-avatar {
    flex-shrink: 0;
    font-size: 18px;
  }

  .ai-title {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
  }

  .message-time {
    flex-shrink: 0;
    font-size: 11px;
    color: #94a3b8;
  }
}

.ai-content {
  width: 100%;
  padding: 16px;
}

.loading-animation {
  display: flex;
  gap: 8px;
  padding: 20px 0;

  .dot {
    width: 12px;
    height: 12px;
    background: #2563eb;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }
  }
}

.mobile-input-area {
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  padding: 8px 12px calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgb(248 250 252 / 0%) 0%, #f8fafc 22%, #f8fafc 100%);
}

.voice-panel {
  box-sizing: border-box;
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 38px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgb(59 130 246 / 10%) 0%, rgb(37 99 235 / 10%) 100%);
  border: 1px solid rgb(59 130 246 / 18%);
  border-radius: 14px;
}

.voice-status {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.voice-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: voice-dot-pulse 1.4s infinite;
}

.voice-text {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #2563eb;
  white-space: nowrap;
}

.voice-waves {
  display: flex;
  flex-shrink: 0;
  gap: 3px;
  align-items: center;
  height: 18px;

  span {
    display: block;
    width: 3px;
    height: 8px;
    background: #3b82f6;
    border-radius: 99px;
    animation: voice-wave 0.9s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.12s;
    }

    &:nth-child(3) {
      animation-delay: 0.24s;
    }

    &:nth-child(4) {
      animation-delay: 0.36s;
    }
  }
}

.voice-stop-btn {
  flex-shrink: 0;
  height: 26px;
  padding: 0 10px;
  background: #2563eb;
  border: none;
}

.input-card {
  padding: 8px 10px 10px;
  background: rgb(255 255 255 / 96%);
  border: 1px solid rgb(226 232 240 / 86%);
  border-radius: 18px;
  box-shadow: 0 10px 28px rgb(15 23 42 / 10%);
  backdrop-filter: blur(10px);
}

.input-warning,
.input-tip {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 4px 7px;
  font-size: 12px;
  line-height: 1.2;
}

.input-warning {
  color: #f59e0b;
}

.input-tip {
  color: #94a3b8;
}

.input-bar {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  border-radius: 14px;

  :deep(.van-cell) {
    padding: 0;
    background: transparent;
  }

  :deep(.van-field__body) {
    align-items: center;
    min-height: 42px;
    padding: 8px 12px;
  }

  :deep(.van-field__control) {
    max-height: 96px;
    font-size: 14px;
    line-height: 22px;
    color: #1e293b;

    &::placeholder {
      color: #a7b1c2;
    }
  }

  :deep(.van-field__word-limit) {
    display: none;
  }
}

.voice-btn,
.send-btn,
.cancel-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  padding: 0;
  border: none;
  border-radius: 50%;
}

.voice-btn {
  color: #64748b;
  background: #eef2f7;

  &.active {
    color: #fff;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 6px 16px rgb(59 130 246 / 36%);
    animation: mic-breath 1.6s ease-in-out infinite;
  }

  &:not(.active):active {
    color: #2563eb;
    background: rgb(59 130 246 / 10%);
  }
}

.send-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 6px 16px rgb(59 130 246 / 32%);

  &.van-button--disabled {
    color: #aab5c4;
    background: #e8edf5;
    box-shadow: none;
    opacity: 1;
  }
}

.cancel-btn {
  background: #ef4444;
  box-shadow: 0 6px 16px rgb(239 68 68 / 28%);
}

.database-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;

  .drawer-title {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }
}

.database-search {
  flex-shrink: 0;
}

.database-list {
  flex: 1;
  padding-bottom: 16px;
  overflow-y: auto;
}

.database-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;

  .database-item-content {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: 8px;
  }

  .database-icon {
    font-size: 16px;
  }

  .database-name {
    font-size: 14px;
    color: #1e293b;
  }
}

.drawer-footer {
  flex-shrink: 0;
  padding: 16px;
  background: #fff;
  border-top: 1px solid #e2e8f0;

  .selected-count {
    margin-bottom: 12px;
    font-size: 13px;
    color: #64748b;
    text-align: center;
  }
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}

@keyframes mic-breath {
  0%,
  100% {
    box-shadow: 0 6px 16px rgb(59 130 246 / 36%);
  }

  50% {
    box-shadow: 0 8px 24px rgb(59 130 246 / 52%);
  }
}

@keyframes voice-wave {
  0%,
  100% {
    height: 6px;
    opacity: 0.55;
  }

  50% {
    height: 18px;
    opacity: 1;
  }
}

@keyframes voice-dot-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.9);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>
