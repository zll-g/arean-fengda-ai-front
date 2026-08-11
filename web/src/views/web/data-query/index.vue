<template>
  <div class="chat-view">
    <!-- ==================== 左侧：会话列表 ==================== -->
    <div class="session-panel">
      <div class="session-header">
        <el-button type="primary" icon="Plus" @click="chatStore.newSession()">
          {{ t('dataQueryChat.newChat') }}
        </el-button>
      </div>

      <el-scrollbar class="session-list">
        <div
          v-for="session in chatStore.sessions"
          :key="session.sessionId"
          class="session-item"
          :class="{ active: chatStore.sessionId === session.sessionId }"
          @click="handleSelectSession(session.sessionId)"
        >
          <div class="session-info">
            <div class="session-title">
              {{ session.title || t('dataQueryChat.newConversation') }}
            </div>

            <div class="session-meta">
              {{ session.messageCount }} {{ t('dataQueryChat.roundUnit') }} ·
              {{ formatTime(session.updatedTime) }}
            </div>
          </div>

          <el-popconfirm
            :title="t('dataQueryChat.deleteConversation')"
            @confirm="handleDeleteSession(session.sessionId)"
          >
            <template #reference>
              <el-button class="session-delete" text size="small" icon="Delete" @click.stop />
            </template>
          </el-popconfirm>
        </div>

        <el-empty
          v-if="chatStore.sessions.length === 0"
          :description="t('dataQueryChat.noConversation')"
          :image-size="60"
        />
      </el-scrollbar>
    </div>

    <!-- ==================== 右侧：对话区域 ==================== -->
    <div class="chat-panel">
      <!-- ==================== 顶部：数据源选择区 ==================== -->
      <div class="chat-topbar">
        <div class="topbar-spacer" />

        <div class="datasource-selector">
          <el-radio-group
            v-model="chatStore.queryMode"
            size="small"
            class="mode-switch"
            @change="handleModeChange"
          >
            <el-radio-button value="single">
              {{ t('dataQueryChat.singleDatasource') }}
            </el-radio-button>

            <el-radio-button value="multi">
              {{ t('dataQueryChat.multiDatasource') }}
            </el-radio-button>
          </el-radio-group>

          <div class="selector-divider" />

          <!-- 单数据源选择 -->
          <el-select
            v-if="chatStore.queryMode === 'single'"
            v-model="dsStore.currentId"
            :placeholder="t('dataQueryChat.selectDatasource')"
            class="single-ds-select"
            filterable
            @change="onDatasourceChange"
          >
            <el-option v-for="ds in dsStore.list" :key="ds.id" :label="ds.name" :value="ds.id">
              <div class="ds-option">
                <span class="ds-status-dot" :class="{ online: ds.lastTestResult === 1 }" />
                <el-icon class="ds-option-icon"><Coin /></el-icon>
                <span class="ds-option-name">{{ ds.name }}</span>
              </div>
            </el-option>
          </el-select>

          <!-- 多数据源选择 -->
          <template v-else>
            <el-select
              v-model="chatStore.selectedGroupId"
              :placeholder="t('dataQueryChat.selectGroupOptional')"
              clearable
              filterable
              class="group-select"
              @change="handleGroupChange"
            >
              <el-option
                v-for="g in dsStore.list"
                :key="g.id"
                :label="g.groupName || g.name"
                :value="g.id"
              />
            </el-select>

            <el-select
              v-model="chatStore.selectedDsIds"
              multiple
              collapse-tags
              collapse-tags-tooltip
              filterable
              :placeholder="t('dataQueryChat.selectMultipleDatasource')"
              class="multi-ds-select"
            >
              <el-option v-for="ds in dsStore.list" :key="ds.id" :label="ds.name" :value="ds.id">
                <div class="ds-option">
                  <span class="ds-status-dot" :class="{ online: ds.lastTestResult === 1 }" />
                  <el-icon class="ds-option-icon"><Coin /></el-icon>
                  <span class="ds-option-name">{{ ds.name }}</span>
                </div>
              </el-option>
            </el-select>
          </template>
        </div>
      </div>

      <!-- ==================== 消息列表 ==================== -->
      <el-scrollbar ref="messageScrollRef" class="message-area">
        <!-- 欢迎语 -->
        <div v-if="chatStore.messages.length === 0" class="welcome">
          <div class="welcome-icon">
            <el-icon :size="48"><Cpu /></el-icon>
          </div>

          <h2>{{ t('dataQueryChat.welcomeTitle') }}</h2>
          <p>{{ t('dataQueryChat.welcomeDesc') }}</p>

          <el-alert
            v-if="chatStore.queryMode === 'multi' && chatStore.selectedDsIds.length > 1"
            type="success"
            show-icon
            :closable="false"
            style="max-width: 600px; margin: 0 auto 20px"
          >
            <template #title>
              {{ t('dataQueryChat.federatedModePrefix') }}
              {{ chatStore.selectedDsIds.length }}
              {{ t('dataQueryChat.federatedModeSuffix') }}
            </template>
          </el-alert>

          <div class="welcome-tips">
            <div
              v-for="(tip, idx) in currentSampleQuestions"
              :key="idx"
              class="tip-card"
              @click="handleSendMessage(tip)"
            >
              <el-icon><Search /></el-icon>
              <span>{{ tip }}</span>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="message-list">
          <MessageBubble
            v-for="(msg, idx) in chatStore.messages"
            :key="msg.id"
            :message="msg"
            :is-last="idx === chatStore.messages.length - 1"
            :streaming="chatStore.loading"
            @feedback="handleFeedback"
            @ask-question="handleSendMessage"
            @regenerate="handleRegenerate(msg)"
            @switch-variant="handleSwitchVariant(msg, $event)"
          />
        </div>

        <div ref="scrollAnchorRef" />
      </el-scrollbar>

      <!-- ==================== 输入区域 ==================== -->
      <div class="input-area">
        <!-- 语音录音提示区 -->
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

          <el-button
            v-if="isRecording"
            class="voice-stop-btn"
            size="small"
            round
            @click="stopVoiceInput"
          >
            {{ t('dataQueryChat.voice.end') }}
          </el-button>
        </div>

        <div class="input-bar">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="1"
            :autosize="{ minRows: 1, maxRows: 4 }"
            :placeholder="inputPlaceholder"
            resize="none"
            :disabled="chatStore.loading || isTranscribing"
            @keydown.enter.exact="handleSend"
            @keydown.shift.enter.exact.prevent="inputText += '\n'"
          />

          <!-- 语音识别按钮 -->
          <el-button
            v-if="!chatStore.loading"
            class="voice-btn"
            :class="{ active: isRecording || isTranscribing }"
            circle
            :disabled="!canSend || isTranscribing"
            :title="micButtonTitle"
            @click="toggleVoiceInput"
          >
            <el-icon><Microphone /></el-icon>
          </el-button>

          <el-button
            v-if="!chatStore.loading"
            type="primary"
            :icon="Promotion"
            circle
            :disabled="!inputText.trim() || !canSend || isRecording || isTranscribing"
            @click="handleSend"
          />

          <el-button v-else type="danger" icon="Close" circle @click="handleCancel" />
        </div>

        <div class="input-hints">
          <span v-if="!canSend" class="hint-warning">
            <el-icon><Warning /></el-icon>
            {{ t('dataQueryChat.hint.selectDatasource') }}
          </span>

          <span v-else class="hint-info">
            <template v-if="chatStore.queryMode === 'multi'">
              🔀 {{ t('dataQueryChat.hint.federatedMode') }} ·
              {{ chatStore.selectedDsIds.length }}
              {{ t('dataQueryChat.hint.datasourceCount') }} ·
            </template>

            <template v-else>
              {{ t('dataQueryChat.hint.currentDatasource') }}:
              <strong>{{ dsStore.current?.name }}</strong> ·
            </template>

            {{ t('dataQueryChat.hint.send') }} · {{ t('dataQueryChat.hint.newline') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Coin, Cpu, Microphone, Promotion, Search, Warning } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useDataQueryStore } from '@/store';
import { useDatasourceStore } from '@/store/datasource';
import MessageBubble from '@/components/dataQuery-chat/components/Bubble.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import api from '@/api';

dayjs.extend(relativeTime);

const { t, tm, locale } = useI18n();

const chatStore = useDataQueryStore();
const dsStore = useDatasourceStore();

const inputText = ref('');
const scrollAnchorRef = ref(null as any);

// 语音录音状态：使用 AudioContext 采集 PCM，再编码成 audio/wav
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

// 是否可以发送
const canSend = computed(() => {
  if (chatStore.queryMode === 'multi') {
    return chatStore.selectedDsIds.length >= 1;
  }

  return !!dsStore.currentId;
});

// 输入框占位文本
const inputPlaceholder = computed(() => {
  if (isRecording.value) return t('dataQueryChat.voice.recordingPlaceholder');
  if (isTranscribing.value) return t('dataQueryChat.voice.transcribingPlaceholder');

  if (chatStore.queryMode === 'multi' && chatStore.selectedDsIds.length > 1) {
    return t('dataQueryChat.placeholder.multi');
  }

  return t('dataQueryChat.placeholder.single');
});

const voiceStatusText = computed(() => {
  if (isRecording.value) return t('dataQueryChat.voice.listening');
  if (isTranscribing.value) return t('dataQueryChat.voice.transcribing');

  return speechTip.value;
});

const micButtonTitle = computed(() => {
  if (isTranscribing.value) return t('dataQueryChat.voice.converting');
  if (isRecording.value) return t('dataQueryChat.voice.stopRecognition');

  return t('dataQueryChat.voice.recognition');
});

// 根据模式切换示例问题
const getLocaleArray = (key: string) => {
  const value = tm(key);

  return Array.isArray(value) ? (value as string[]) : [];
};

// 根据模式切换示例问题
const singleSampleQuestions = computed(() => {
  return getLocaleArray('dataQueryChat.sampleQuestions.single');
});

const federatedSampleQuestions = computed(() => {
  return getLocaleArray('dataQueryChat.sampleQuestions.multi');
});

const currentSampleQuestions = computed(() => {
  return chatStore.queryMode === 'multi' && chatStore.selectedDsIds.length > 1
    ? federatedSampleQuestions.value
    : singleSampleQuestions.value;
});

// 监听语言切换，处理 dayjs 相对时间
watch(
  () => locale.value,
  (lang) => {
    dayjs.locale(lang === 'en-US' ? 'en' : 'zh-cn');
  },
  { immediate: true },
);

// 监听数据源切换
watch(
  () => dsStore.currentId,
  (newId) => {
    if (newId && chatStore.queryMode === 'single') {
      chatStore.fetchSessions(String(newId));
      chatStore.newSession();
    }
  },
  { immediate: true },
);

// 滚动到底部
watch(
  () => chatStore.messages.length,
  () => scrollToBottom(),
);

// 监听多个变化源，确保进度更新时自动滚动
watch(
  () => {
    const lastMsg = chatStore.messages[chatStore.messages.length - 1];
    if (!lastMsg) return null;

    return {
      len: chatStore.messages.length,
      stages: lastMsg.stages?.length,
      answer: lastMsg.answer?.length,
      sql: lastMsg.sql,
      data: lastMsg.data?.length,
      stage: lastMsg.streamingStage?.stageId,
    };
  },
  () => {
    scrollToBottom();
  },
  { deep: true },
);

function scrollToBottom() {
  nextTick(() => scrollAnchorRef.value?.scrollIntoView({ behavior: 'smooth' }));
}

async function handleSelectSession(sessionId: string) {
  await chatStore.selectSession(sessionId);
  scrollToBottom();
}

function handleDeleteSession(sessionId: string) {
  chatStore.deleteSession(sessionId);
}

// 切换语音输入
function toggleVoiceInput() {
  if (!canSend.value || chatStore.loading || isTranscribing.value) return;

  if (isRecording.value) {
    stopVoiceInput();
  } else {
    startVoiceInput();
  }
}

// 开始录音
async function startVoiceInput() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showSpeechTip(t('dataQueryChat.voice.notSupported'));
    return;
  }

  const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextConstructor) {
    showSpeechTip(t('dataQueryChat.voice.audioNotSupported'));
    return;
  }

  try {
    speechTip.value = '';
    audioBuffers.value = [];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    mediaStream.value = stream;

    const context = new AudioContextConstructor();
    audioContext.value = context;
    wavSampleRate.value = context.sampleRate;

    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);

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

    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      showSpeechTip(t('dataQueryChat.voice.noPermission'));
      return;
    }

    if (error?.name === 'NotFoundError') {
      showSpeechTip(t('dataQueryChat.voice.noDevice'));
      return;
    }

    showSpeechTip(t('dataQueryChat.voice.startFailed'));
  }
}

// 停止录音并上传 WAV
async function stopVoiceInput() {
  if (!isRecording.value) return;

  isRecording.value = false;

  const duration = Date.now() - recordingStartTime.value;
  const buffers = [...audioBuffers.value];

  cleanupAudioRecorder();

  if (duration < 500 || buffers.length === 0) {
    showSpeechTip(t('dataQueryChat.voice.tooShort'));
    audioBuffers.value = [];
    return;
  }

  const wavBlob = encodeWav(buffers, wavSampleRate.value);

  audioBuffers.value = [];

  await uploadVoiceFile(wavBlob);
}

// 清理录音资源，避免麦克风持续占用
function cleanupAudioRecorder() {
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
    audioContext.value?.close();
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
}

// 上传语音文件到后端接口
async function uploadVoiceFile(audioBlob: Blob) {
  try {
    isTranscribing.value = true;
    speechTip.value = '';

    const audioFile = new File([audioBlob], `voice_${Date.now()}.wav`, {
      type: 'audio/wav',
    });

    const formData = new FormData();

    // 后端要求字段名为 audio，格式为 audio/wav；接口与左文件保持一致
    formData.append('audio', audioFile);

    const res = await api.knowledgeQa.process(formData);

    // 兼容不同返回包裹层级：优先取 res.data.text，同时兼容字符串 / result / content / data
    const text = normalizeSpeechText(res?.data);

    if (!text) {
      showSpeechTip(t('dataQueryChat.voice.noText'));
      return;
    }

    inputText.value = mergeVoiceText(inputText.value, text);
    showSpeechTip(t('dataQueryChat.voice.converted'));

    nextTick(() => {
      handleSendMessage(inputText.value.trim());
    });
  } catch (error) {
    console.error('语音转文字失败:', error);
    showSpeechTip(t('dataQueryChat.voice.convertFailed'));
  } finally {
    isTranscribing.value = false;
  }
}

// 编码为 16kHz 单声道 16bit PCM WAV
function encodeWav(buffers: Float32Array[], sampleRate: number) {
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
}

function mergeAudioBuffers(buffers: Float32Array[]) {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const result = new Float32Array(totalLength);

  let offset = 0;

  buffers.forEach((buffer) => {
    result.set(buffer, offset);
    offset += buffer.length;
  });

  return result;
}

function resampleAudioBuffer(
  buffer: Float32Array,
  originalSampleRate: number,
  targetSampleRate: number,
) {
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
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

// 规范化接口返回文字
function normalizeSpeechText(data: any) {
  if (typeof data === 'string') {
    return data.trim();
  }

  if (data?.text) return String(data.text).trim();
  if (data?.result) return String(data.result).trim();
  if (data?.content) return String(data.content).trim();
  if (data?.data) return String(data.data).trim();

  return '';
}

// 合并原输入内容和语音识别内容
function mergeVoiceText(baseText: string, voiceText: string) {
  const text = voiceText.trim();

  if (!text) return baseText;

  const trimmedBase = baseText.trimEnd();

  if (!trimmedBase) {
    return text;
  }

  return `${trimmedBase}${/[\s，。！？,.!?]$/.test(trimmedBase) ? '' : ' '}${text}`;
}

// 短提示
function showSpeechTip(message: string) {
  speechTip.value = message;

  if (speechTipTimer) {
    window.clearTimeout(speechTipTimer);
  }

  speechTipTimer = window.setTimeout(() => {
    speechTip.value = '';
    speechTipTimer = null;
  }, 2200);
}

function handleSend(e: any) {
  if (e && !e.shiftKey) e.preventDefault();

  if (isRecording.value) {
    stopVoiceInput();
    return;
  }

  if (isTranscribing.value) return;

  const question = inputText.value.trim();
  if (!question) return;

  handleSendMessage(question);
}

async function handleSendMessage(question: any) {
  if (!canSend.value) {
    ElMessage.warning(t('dataQueryChat.message.selectDatasourceFirst'));
    return;
  }

  inputText.value = '';

  try {
    await chatStore.sendMessage(String(dsStore.currentId), question);
  } catch (e) {
    // store 内部已处理
    console.log(e);
  }
}

function onDatasourceChange(id: string) {
  dsStore.setCurrent(id);
}

function handleModeChange(mode: string) {
  chatStore.newSession();

  if (mode === 'single') {
    chatStore.selectedDsIds = [];
    chatStore.selectedGroupId = null;
  }
}

async function handleGroupChange(groupId: string) {
  if (!groupId) {
    chatStore.selectedDsIds = [];
    return;
  }

  try {
    const res = await api.federated.getGroup(groupId);
    const group = res.data;
    chatStore.selectedDsIds = group.items.map((i: any) => i.datasourceId);
  } catch (e) {
    console.error('加载分组详情失败:', e);
    ElMessage.error(t('dataQueryChat.message.loadGroupFailed'));
  }
}

function handleCancel() {
  chatStore.cancelStreaming();
  ElMessage.info(t('dataQueryChat.message.stopped'));
}

// 重新回答：就地在原气泡内生成新回答变体（旧版本保留可切换）
async function handleRegenerate(msg: any) {
  const started = await chatStore.regenerateMessage(msg);
  if (!started) {
    ElMessage.warning(t('dataQueryChat.message.regenerateUnavailable'));
  }
}

// 切换回答版本（变体回溯）
async function handleSwitchVariant(msg: any, historyId: string | number) {
  try {
    await chatStore.switchVariant(msg, historyId);
  } catch {
    ElMessage.error(t('dataQueryChat.message.switchVariantFailed'));
  }
}

function handleFeedback() {
  ElMessage.info(t('dataQueryChat.message.feedbackThanks'));
}

function formatTime(time: string) {
  if (!time) return '';
  return dayjs(time).fromNow();
}

onBeforeUnmount(() => {
  if (isRecording.value) {
    stopVoiceInput();
  }

  cleanupAudioRecorder();

  if (speechTipTimer) {
    window.clearTimeout(speechTipTimer);
  }
});

onMounted(() => {
  dsStore.fetchList();
});
</script>

<style scoped lang="scss">
.chat-view {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #f8f6f3;
  border: 1px solid #eee6df;
  border-radius: 14px;
  box-shadow: 0 10px 32px rgb(116 78 42 / 8%);
}

// ==================== 左侧会话列表 ====================
.session-panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 280px;
  background: #fffaf5;
  border-right: 1px solid #f0e7de;
}

.session-header {
  padding: 14px 16px 12px;

  :deep(.el-button) {
    width: 100%;
    height: 44px;
    margin-left: 0;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    background: #ff8a26;
    border: 1px solid #ff8a26;
    border-radius: 10px;
    box-shadow: 0 7px 16px rgb(255 138 38 / 20%);
    transition: all 0.2s ease;
  }

  :deep(.el-button:hover) {
    background: #f77b16;
    border-color: #f77b16;
    box-shadow: 0 9px 20px rgb(255 138 38 / 26%);
    transform: translateY(-1px);
  }

  :deep(.el-button:active) {
    background: #ec6f0c;
    border-color: #ec6f0c;
    transform: translateY(0);
  }
}

.session-list {
  flex: 1;
  min-height: 0;
  padding: 0 10px 14px;
  overflow: hidden;

  :deep(.el-scrollbar__bar.is-vertical) {
    width: 7px;
  }

  :deep(.el-scrollbar__thumb) {
    background: #d8c8ba;
  }
}

.session-item {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 58px;
  padding: 10px 10px 10px 13px;
  margin-bottom: 6px;
  color: #4b4038;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all 0.18s ease;

  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 3px;
    height: 0;
    content: '';
    background: #ff8a26;
    border-radius: 0 4px 4px 0;
    transform: translateY(-50%);
    transition: height 0.18s ease;
  }

  &:hover {
    background: #fff3e8;
    border-color: #ffe1c4;

    .session-delete {
      opacity: 1;
    }
  }

  &.active {
    background: #fff0e1;
    border-color: #ffd5ae;
    box-shadow: 0 4px 12px rgb(255 138 38 / 8%);

    &::before {
      height: 28px;
    }

    .session-title {
      font-weight: 600;
      color: #d9650d;
    }
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-title {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    line-height: 20px;
    color: #4b4038;
    white-space: nowrap;
    transition: color 0.18s ease;
  }

  .session-meta {
    margin-top: 3px;
    font-size: 12px;
    line-height: 18px;
    color: #a79789;
  }

  .session-delete {
    color: #b8a99b;
    opacity: 0;
    transition: all 0.18s ease;

    &:hover {
      color: #e5484d;
      background: #fff0f0;
    }
  }
}

// ==================== 右侧对话区域 ====================
.chat-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  background: #fff;
}

// ==================== 顶部数据源选择区 ====================
.chat-topbar {
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  height: 68px;
  padding: 12px 22px 10px;
  background: #fff;
  border-bottom: 1px solid #f0e8e1;
}

.topbar-spacer {
  flex: 1;
  min-width: 0;
}

.datasource-selector {
  box-sizing: border-box;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  max-width: 100%;
  min-height: 42px;
  padding: 5px;
  background: #fff;
  border: 1px solid #eadfd5;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgb(116 78 42 / 7%);

  :deep(.el-select__wrapper) {
    min-height: 32px;
    background: #fffaf6;
    border-radius: 9px;
    box-shadow: 0 0 0 1px #f1e8df inset;
    transition: all 0.18s ease;
  }

  :deep(.el-select__wrapper:hover) {
    background: #fff;
    box-shadow: 0 0 0 1px #ffc58f inset;
  }

  :deep(.el-select__wrapper.is-focused) {
    background: #fff;
    box-shadow:
      0 0 0 1px #ff8a26 inset,
      0 0 0 3px rgb(255 138 38 / 10%);
  }

  :deep(.el-select__placeholder) {
    font-size: 13px;
    color: #ad9f92;
  }

  :deep(.el-select__selected-item) {
    font-size: 13px;
    color: #51453d;
  }

  :deep(.el-tag) {
    color: #d9650d;
    background: #fff1e3;
    border-color: #ffd6b0;
    border-radius: 7px;
  }

  :deep(.el-tag .el-tag__close) {
    color: #d9650d;

    &:hover {
      color: #fff;
      background: #ff8a26;
    }
  }
}

.mode-switch {
  flex-shrink: 0;

  :deep(.el-radio-button__inner) {
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
    line-height: 32px;
    color: #75675d;
    background: transparent;
    border-color: transparent;
    border-radius: 8px;
    box-shadow: none;
  }

  :deep(.el-radio-button:first-child .el-radio-button__inner) {
    border-left: none;
    border-radius: 8px;
  }

  :deep(.el-radio-button:last-child .el-radio-button__inner) {
    border-radius: 8px;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    color: #fff;
    background: #ff8a26;
    box-shadow: 0 5px 12px rgb(255 138 38 / 24%);
  }

  :deep(.el-radio-button__inner:hover) {
    color: #e56e11;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner:hover) {
    color: #fff;
  }
}

.selector-divider {
  flex-shrink: 0;
  width: 1px;
  height: 22px;
  background: #eee4db;
}

.single-ds-select {
  width: 220px;
}

.group-select {
  width: 170px;
}

.multi-ds-select {
  width: 260px;
}

.ds-option {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.ds-status-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  background: #cfc4ba;
  border-radius: 50%;

  &.online {
    background: #22c55e;
    box-shadow: 0 0 0 3px rgb(34 197 94 / 12%);
  }
}

.ds-option-icon {
  flex-shrink: 0;
  color: #e9781c;
}

.ds-option-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #51453d;
  white-space: nowrap;
}

.message-area {
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  padding: 0 24px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 0%, rgb(255 138 38 / 4%), transparent 34%), #fff;

  :deep(.el-scrollbar__thumb) {
    background: #d8c8ba;
  }
}

.message-list {
  max-width: 98%;
  padding: 28px 0;
  margin: 0 auto;
}

// ==================== 欢迎语 ====================
.welcome {
  box-sizing: border-box;
  min-height: 100%;
  padding: 90px 20px 160px;
  text-align: center;
}

.welcome-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  margin: 0 auto 18px;
  color: #fff;
  background: #ff8a26;
  border-radius: 15px;
  box-shadow: 0 12px 24px rgb(255 138 38 / 24%);
}

.welcome h2 {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 700;
  color: #332a24;
}

.welcome p {
  margin: 0 0 34px;
  font-size: 14px;
  color: #9b8d81;
}

.welcome-tips {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px;
  max-width: 650px;
  margin: 0 auto;
}

.tip-card {
  box-sizing: border-box;
  display: flex;
  gap: 11px;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  font-size: 14px;
  color: #51453d;
  cursor: pointer;
  background: #fff;
  border: 1px solid #eadfd5;
  border-radius: 11px;
  box-shadow: 0 3px 10px rgb(116 78 42 / 3%);
  transition: all 0.18s ease;

  .el-icon {
    flex-shrink: 0;
    color: #ff8a26;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: #d9650d;
    background: #fff8f1;
    border-color: #ffc58f;
    box-shadow: 0 8px 20px rgb(255 138 38 / 10%);
    transform: translateY(-1px);
  }
}

// ==================== 输入区域 ====================
.input-area {
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 0 24px 24px;
  background: #fff;
}

.voice-panel {
  box-sizing: border-box;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  max-width: 900px;
  min-height: 42px;
  padding: 9px 14px;
  margin: 0 auto 8px;
  background: #fff5eb;
  border: 1px solid #ffd8b5;
  border-radius: 12px;
}

.voice-status {
  display: flex;
  align-items: center;
  min-width: 0;
}

.voice-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  background: #ff8a26;
  border-radius: 50%;
  animation: voice-dot-pulse 1.4s infinite;
}

.voice-text {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #d9650d;
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
    background: #ff8a26;
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
  color: #d9650d;
  background: #fff;
  border-color: #ffc58f;

  &:hover {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;
  }
}

.input-bar {
  box-sizing: border-box;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  max-width: 900px;
  min-height: 64px;
  padding: 10px 12px 10px 18px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e7dbd0;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgb(116 78 42 / 8%);
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #ffb36f;
    box-shadow:
      0 8px 24px rgb(116 78 42 / 8%),
      0 0 0 3px rgb(255 138 38 / 8%);
  }

  :deep(.el-textarea) {
    flex: 1;
  }

  :deep(.el-textarea__inner) {
    min-height: 38px !important;
    padding: 9px 4px;
    font-size: 14px;
    line-height: 1.5;
    color: #51453d;
    resize: none;
    background: transparent;
    border: none;
    box-shadow: none;

    &::placeholder {
      color: #b4a69a;
    }
  }

  :deep(.el-button.is-circle) {
    width: 36px;
    height: 36px;
    margin-left: 0;
    border: none;
  }

  .voice-btn {
    flex-shrink: 0;
    color: #8b7c70;
    background: #f4eee8;

    &:hover:not(.is-disabled) {
      color: #e56e11;
      background: #fff0e1;
    }

    &.active {
      position: relative;
      color: #fff;
      background: #ff8a26;
      box-shadow: 0 4px 12px rgb(255 138 38 / 38%);
      animation: mic-breath 1.6s ease-in-out infinite;
    }
  }

  :deep(.el-button--primary) {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;
    box-shadow: 0 4px 12px rgb(255 138 38 / 22%);

    &:hover:not(.is-disabled) {
      background: #f77b16;
      border-color: #f77b16;
    }
  }

  :deep(.el-button--primary.is-disabled) {
    color: #b9aea5;
    background: #eee8e2;
    border-color: #eee8e2;
    box-shadow: none;
  }
}

.input-hints {
  box-sizing: border-box;
  max-width: 900px;
  padding: 0 6px;
  margin: 8px auto 0;
  font-size: 12px;
  color: #aa9d92;

  .hint-warning {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    color: #e87917;
  }

  .hint-info {
    color: #aa9d92;
  }

  strong {
    font-weight: 600;
    color: #e56e11;
  }
}

@keyframes mic-breath {
  0%,
  100% {
    box-shadow: 0 4px 12px rgb(255 138 38 / 36%);
  }

  50% {
    box-shadow: 0 6px 20px rgb(255 138 38 / 54%);
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

// ==================== Element Plus 微调 ====================
:deep(.el-alert) {
  border-radius: 11px;
}

:deep(.el-alert--success.is-light) {
  color: #b95c12;
  background: #fff4e9;
  border: 1px solid #ffd8b5;
}

:deep(.el-alert--success .el-alert__icon) {
  color: #ff8a26;
}

:deep(.el-empty__description p) {
  color: #a99b8f;
}

:deep(.el-empty__image) {
  opacity: 0.82;
}

// ==================== 响应式 ====================
@media (width <= 1100px) {
  .chat-topbar {
    align-items: flex-start;
    height: auto;
    min-height: 68px;
  }

  .datasource-selector {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .selector-divider {
    display: none;
  }

  .multi-ds-select {
    width: 230px;
  }
}

@media (width <= 900px) {
  .session-panel {
    width: 240px;
  }

  .welcome {
    padding-top: 70px;
  }

  .welcome-tips {
    grid-template-columns: 1fr;
  }

  .chat-topbar {
    padding: 12px 16px 8px;
  }

  .datasource-selector {
    width: 100%;
  }

  .topbar-spacer {
    display: none;
  }

  .single-ds-select,
  .group-select,
  .multi-ds-select {
    flex: 1;
    min-width: 180px;
  }
}

@media (width <= 720px) {
  .chat-view {
    border-radius: 0;
  }

  .session-panel {
    display: none;
  }

  .chat-topbar {
    padding: 10px 14px 8px;
  }

  .datasource-selector {
    justify-content: stretch;
  }

  .mode-switch {
    width: 100%;

    :deep(.el-radio-button) {
      flex: 1;
    }

    :deep(.el-radio-button__inner) {
      width: 100%;
    }
  }

  .single-ds-select,
  .group-select,
  .multi-ds-select {
    width: 100%;
    min-width: 100%;
  }

  .message-area {
    padding: 0 14px;
  }

  .input-area {
    padding: 0 14px 14px;
  }
}
</style>
