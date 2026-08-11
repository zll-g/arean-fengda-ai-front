<template>
  <div v-loading="formStore.isLoading" class="voice-form-page">
    <!-- 头部信息 -->
    <div class="form-header">
      <div class="header-info">
        <el-button text @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div>
          <h2 class="form-title">
            {{ formStore.template?.templateName || '加载中...' }}
          </h2>
          <p class="form-subtitle">
            {{ formStore.formData?.formNo || '未创建' }}
            <el-tag v-if="formStore.formData" :type="statusType" size="small" class="ml-2">
              {{ formStore.formData.statusLabel }}
            </el-tag>
          </p>
        </div>
      </div>
      <div class="header-actions desktop-only">
        <el-tooltip content="撤销 (Ctrl+Z)">
          <el-button :disabled="!canUndo" circle @click="handleUndo">
            <el-icon><RefreshLeft /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)">
          <el-button :disabled="!canRedo" circle @click="handleRedo">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="智能校验">
          <el-button circle @click="handleValidate">
            <el-icon><CircleCheck /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="语音回读">
          <el-button circle @click="handleReadback">
            <el-icon><VideoPlay /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="completion-bar">
      <div class="bar-info">
        <span>填写进度</span>
        <span class="bar-percent">{{ formStore.completionRate }}%</span>
      </div>
      <el-progress
        :percentage="formStore.completionRate"
        :stroke-width="8"
        :show-text="false"
        :color="formStore.completionRate === 100 ? '#10b981' : '#6366f1'"
      />
    </div>

    <div class="form-body">
      <!-- 左侧表单 -->
      <div class="form-panel">
        <div class="form-content">
          <template v-for="field in formStore.visibleFields" :key="field.fieldCode">
            <div
              class="form-field"
              :class="{
                'field-required': field.required === 1,
                'field-filled': isFilled(field.fieldCode),
                'field-warning': getFieldWarning(field.fieldCode),
              }"
            >
              <label class="field-label">
                <span class="field-name">{{ field.fieldName }}</span>
                <span v-if="field.required === 1" class="field-required-mark">*</span>
                <span v-if="field.unit" class="field-unit">（{{ field.unit }}）</span>
              </label>

              <!-- 文本 + 主数据搜索 -->
              <el-input
                v-if="field.fieldType === 'text'"
                v-model="formStore.formValues[field.fieldCode]"
                :placeholder="field.placeholder || `请输入${field.fieldName}`"
                clearable
                @change="onFieldChange(field.fieldCode)"
              >
                <template v-if="field.masterDataCode" #append>
                  <el-button @click="openMasterDataPicker(field)">
                    <el-icon><Search /></el-icon>
                  </el-button>
                </template>
              </el-input>

              <!-- 数字 -->
              <el-input-number
                v-else-if="field.fieldType === 'number'"
                v-model="formStore.formValues[field.fieldCode]"
                :min="field.minValue ?? undefined"
                :max="field.maxValue ?? undefined"
                :precision="isPriceField(field) ? 2 : 0"
                controls-position="right"
                class="w-full"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 日期 -->
              <el-date-picker
                v-else-if="field.fieldType === 'date'"
                v-model="formStore.formValues[field.fieldCode]"
                type="date"
                value-format="YYYY-MM-DD"
                :placeholder="field.placeholder || `请选择${field.fieldName}`"
                class="w-full"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 下拉 -->
              <el-select
                v-else-if="field.fieldType === 'select'"
                v-model="formStore.formValues[field.fieldCode]"
                :placeholder="field.placeholder || `请选择${field.fieldName}`"
                clearable
                class="w-full"
                @change="onFieldChange(field.fieldCode)"
              >
                <el-option
                  v-for="opt in field.options || []"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <!-- 多行文本 -->
              <el-input
                v-else-if="field.fieldType === 'textarea'"
                v-model="formStore.formValues[field.fieldCode]"
                type="textarea"
                :rows="3"
                :placeholder="field.placeholder || `请输入${field.fieldName}`"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 其他 -->
              <el-input
                v-else
                v-model="formStore.formValues[field.fieldCode]"
                :placeholder="field.placeholder || `请输入${field.fieldName}`"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 偏好推荐 -->
              <div v-if="fieldRecommends[field.fieldCode]?.length" class="field-recommend">
                <span class="recommend-label">常用：</span>
                <el-tag
                  v-for="val in fieldRecommends[field.fieldCode].slice(0, 3)"
                  :key="val"
                  size="small"
                  class="recommend-tag"
                  @click="setFieldFromRecommend(field.fieldCode, val)"
                >
                  {{ val }}
                </el-tag>
              </div>

              <!-- 校验警告 -->
              <div v-if="getFieldWarning(field.fieldCode)" class="field-warning-msg">
                <el-icon><WarningFilled /></el-icon>
                {{ getFieldWarning(field.fieldCode) }}
              </div>
            </div>
          </template>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button
            type="primary"
            size="large"
            round
            :disabled="formStore.completionRate < 100"
            @click="handleConfirm"
          >
            <el-icon><CircleCheck /></el-icon> 确认表单
          </el-button>
          <el-button
            type="success"
            size="large"
            round
            :disabled="formStore.formData?.status !== 'confirmed'"
            @click="handleSubmit"
          >
            <el-icon><Upload /></el-icon> 提交
          </el-button>
        </div>
      </div>

      <!-- 右侧对话面板 -->
      <div class="chat-panel" :class="{ 'panel-expanded': showChat }">
        <div class="chat-header">
          <h3>语音助手</h3>
          <el-button v-if="isMobile" text @click="showChat = !showChat">
            <el-icon><component :is="showChat ? 'ArrowDown' : 'ArrowUp'" /></el-icon>
          </el-button>
        </div>

        <!-- 引导话术 -->
        <div
          v-if="voiceStore.conversationHistory.length === 0 && formStore.template?.sampleSpeech"
          class="guide-banner"
        >
          <el-icon :size="20"><InfoFilled /></el-icon>
          <div>
            <p class="guide-title">语音引导</p>
            <p class="guide-text">{{ formStore.template.sampleSpeech }}</p>
          </div>
        </div>

        <!-- 对话历史 -->
        <div ref="chatMessagesRef" class="chat-messages">
          <div
            v-for="(msg, idx) in voiceStore.conversationHistory"
            :key="idx"
            class="message-item"
            :class="msg.role"
          >
            <div class="message-avatar">
              <el-icon v-if="msg.role === 'user'"><User /></el-icon>
              <el-icon v-else><Cpu /></el-icon>
            </div>
            <div class="message-body">
              <div class="message-content">{{ msg.content }}</div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              <el-button
                v-if="msg.audioBase64"
                text
                size="small"
                @click="audioPlayer.playBase64(msg.audioBase64!)"
              >
                <el-icon><VideoPlay /></el-icon> 播放
              </el-button>
            </div>
          </div>

          <!-- 处理中 -->
          <div v-if="voiceStore.state === 'processing'" class="message-item assistant">
            <div class="message-avatar">
              <el-icon><Cpu /></el-icon>
            </div>
            <div class="message-body">
              <div class="message-content typing">
                <span class="dot" /><span class="dot" /><span class="dot" />
                {{ voiceStore.processingMessage }}
              </div>
            </div>
          </div>
        </div>

        <!-- 语音输入区 -->
        <div class="voice-input-area">
          <div class="mode-switch">
            <el-radio-group v-model="voiceStore.mode" size="small">
              <el-radio-button value="normal">普通</el-radio-button>
              <el-radio-button value="wizard">向导</el-radio-button>
            </el-radio-group>
          </div>

          <div
            v-if="voiceStore.partialText || voiceStore.state === 'listening'"
            class="recognized-preview"
          >
            <el-icon><Microphone /></el-icon>
            <span>{{ voiceStore.partialText || '正在听...' }}</span>
          </div>

          <div class="record-controls">
            <div class="text-input-wrapper">
              <el-input
                v-model="textInput"
                placeholder="也可以输入文字..."
                clearable
                @keyup.enter="handleTextSubmit"
              />
            </div>
            <button
              class="record-btn"
              :class="{
                recording: isRecording,
                processing: voiceStore.state === 'processing',
              }"
              :disabled="voiceStore.state === 'processing'"
              @mousedown="handleRecordStart"
              @mouseup="handleRecordStop"
              @touchstart.prevent="handleRecordStart"
              @touchend.prevent="handleRecordStop"
            >
              <div class="btn-inner">
                <el-icon v-if="!isRecording" :size="28"><Microphone /></el-icon>
                <div v-else class="wave-bars">
                  <span v-for="i in 5" :key="i" class="voice-wave-bar" />
                </div>
              </div>
              <span class="btn-label">
                {{
                  isRecording
                    ? formatRecordingDuration(recordingDuration)
                    : voiceStore.state === 'processing'
                      ? '处理中...'
                      : '按住说话'
                }}
              </span>
            </button>
          </div>

          <div v-if="isRecording" class="volume-indicator">
            <div class="volume-bar" :style="{ width: audioLevel + '%' }" />
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端底部操作栏 -->
    <div class="mobile-bottom-bar mobile-only">
      <el-button :disabled="!canUndo" circle size="small" @click="handleUndo">
        <el-icon><RefreshLeft /></el-icon>
      </el-button>
      <el-button :disabled="!canRedo" circle size="small" @click="handleRedo">
        <el-icon><RefreshRight /></el-icon>
      </el-button>
      <el-button circle size="small" @click="handleReadback">
        <el-icon><VideoPlay /></el-icon>
      </el-button>
      <el-button type="primary" circle size="small" @click="showChat = !showChat">
        <el-icon><ChatDotRound /></el-icon>
      </el-button>
    </div>

    <!-- 主数据选择弹窗 -->
    <MasterDataPicker
      v-model:visible="showMasterPicker"
      :source-code="pickerSourceCode"
      :source-label="pickerSourceLabel"
      @select="handleMasterDataSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useFormStore } from '@/store/formStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import { useHotkeys } from '@/composables/useHotkeys';
import MasterDataPicker from '@/components/MasterDataPicker.vue';
import type { MasterDataItem, TemplateField } from '@/types';
import { computed, nextTick, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import api from '@/api';
const router = useRouter();
const route = useRoute();
const isMobile = useMediaQuery('(max-width: 768px)');

const formStore = useFormStore();
const voiceStore = useVoiceStore();
const audioPlayer = useAudioPlayer();

const showChat = ref(!isMobile.value);
const textInput = ref('');
const chatMessagesRef = ref<HTMLElement>();
const fieldRecommends = ref<Record<string, string[]>>({});

// 语音录音状态：与数据问答页面保持一致，使用 AudioContext 采集 PCM，再编码成 16kHz audio/wav
const isRecording = ref(false);
const mediaStream = ref<MediaStream | null>(null);
const audioContext = ref<AudioContext | null>(null);
const audioSource = ref<MediaStreamAudioSourceNode | null>(null);
const scriptProcessor = ref<ScriptProcessorNode | null>(null);
const audioBuffers = ref<Float32Array[]>([]);
const recordingStartTime = ref(0);
const recordingDuration = ref(0);
const audioLevel = ref(0);
const wavSampleRate = ref(16000);
let recordingTimer: number | null = null;

// 主数据弹窗
const showMasterPicker = ref(false);
const pickerSourceCode = ref('');
const pickerSourceLabel = ref('');
const pickerTargetField = ref('');

const templateId = computed(() => Number(route.params.templateId));
const existingFormId = computed(() =>
  route.query.formDataId ? Number(route.query.formDataId) : null,
);

const canUndo = computed(() => formStore.historyPointer > 0);
const canRedo = computed(() => formStore.historyPointer < formStore.historyStack.length - 1);

const statusType = computed(() => {
  switch (formStore.formData?.status) {
    case 'confirmed':
      return 'success';
    case 'submitted':
      return 'info';
    default:
      return 'warning';
  }
});

watchEffect(() => {
  console.log(formStore.formData, 6666);
});
// 快捷键
useHotkeys({
  'ctrl+r': () => {
    if (isRecording.value) handleRecordStop();
    else handleRecordStart();
  },
  'ctrl+enter': () => handleConfirm(),
  'ctrl+z': () => handleUndo(),
  'ctrl+y': () => handleRedo(),
  escape: () => {
    if (isRecording.value) cancelAudioRecording();
    voiceStore.setIdle();
  },
});

onMounted(async () => {
  await formStore.loadTemplate(templateId.value);

  if (existingFormId.value) {
    // 继续填已有表单
    try {
      const res = await api.voiceForm.getFormDetail(existingFormId.value);
      formStore.formData = res.data;
      console.log(res.data, 4444);
      formStore.formValues = {
        ...formStore.formValues,
        ...(res.data.formValues || {}),
      };
    } catch (e) {
      console.error('加载已有表单失败', e);
    }
  } else {
    await formStore.initFormData();
  }

  loadRecommends();

  if (formStore.template?.sampleSpeech) {
    voiceStore.conversationHistory.push({
      role: 'assistant',
      content: `欢迎使用${formStore.template.templateName}。${formStore.template.sampleSpeech}`,
      timestamp: Date.now(),
    });
  }
});

onUnmounted(() => {
  cancelAudioRecording();
  formStore.$reset();
  voiceStore.$reset();
});

async function loadRecommends() {
  if (!formStore.template?.fields) return;
  for (const field of formStore.template.fields) {
    try {
      const res = await api.voiceForm.getRecommendedValues(templateId.value, field.fieldCode);
      if (res.data?.length) fieldRecommends.value[field.fieldCode] = res.data;
    } catch {
      console.log(11);
    }
  }
}

function isFilled(fieldCode: string): boolean {
  const v = formStore.formValues[fieldCode];
  return v !== undefined && v !== null && v !== '';
}

function isPriceField(field: TemplateField): boolean {
  return (
    field.fieldCode.toLowerCase().includes('price') ||
    field.fieldCode.toLowerCase().includes('amount')
  );
}

function onFieldChange(fieldCode: string) {
  // @ts-expect-error
  formStore.setFieldValue(fieldCode, formStore.formValues[fieldCode], 'manual');
}

function setFieldFromRecommend(fieldCode: string, val: string) {
  // @ts-expect-error
  formStore.setFieldValue(fieldCode, val, 'recommend');
}

function openMasterDataPicker(field: TemplateField) {
  pickerSourceCode.value = field.masterDataCode || '';
  pickerSourceLabel.value = field.fieldName;
  pickerTargetField.value = field.fieldCode;
  showMasterPicker.value = true;
}

function handleMasterDataSelected(item: MasterDataItem) {
  // 回填主数据
  // @ts-expect-error
  formStore.setFieldValue(pickerTargetField.value, item.dataName, 'master_data');

  // 回填关联字段
  if (item.dataValues) {
    const updates: Record<string, any> = {};
    const allFieldCodes = formStore.template?.fields.map((f) => f.fieldCode) || [];

    for (const [key, val] of Object.entries(item.dataValues)) {
      if (allFieldCodes.includes(key)) updates[key] = val;
    }
    // productCode
    if (allFieldCodes.includes('productCode')) {
      updates['productCode'] = item.dataCode;
    }

    if (Object.keys(updates).length > 0) {
      formStore.setFieldValues(updates);
      ElMessage.success(`已联动填充 ${Object.keys(updates).length} 个字段`);
    }
  }
}

async function handleRecordStart() {
  if (voiceStore.state === 'processing' || isRecording.value) return;

  const ok = await startAudioRecording();

  if (ok) {
    voiceStore.startRecording();
  } else {
    ElMessage.error('无法启动录音，请检查麦克风权限');
  }
}

async function handleRecordStop() {
  if (!isRecording.value) return;

  voiceStore.stopRecording();

  const audioBlob = await stopAudioRecording();

  if (!audioBlob || audioBlob.size === 0) {
    voiceStore.setIdle();
    return;
  }

  voiceStore.setProcessing('asr_processing', '正在识别语音...');

  try {
    const fd = new FormData();
    fd.append('audio', audioBlob, 'recording.wav');
    fd.append('templateId', String(templateId.value));
    if (formStore.formData?.id) fd.append('formDataId', String(formStore.formData.id));
    fd.append('mode', voiceStore.mode);
    if (voiceStore.mode === 'wizard') fd.append('wizardStep', String(voiceStore.wizardStep));
    fd.append('currentValuesJson', JSON.stringify(formStore.formValues));

    const res = await api.voiceForm.processAudio(fd);
    handlePipelineResult(res.data);
  } catch (err: any) {
    voiceStore.setError(err.message || '处理失败');
  }
}

async function startAudioRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextConstructor) {
    return false;
  }

  try {
    audioBuffers.value = [];
    recordingDuration.value = 0;
    audioLevel.value = 0;

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
      const copiedData = new Float32Array(inputData);
      audioBuffers.value.push(copiedData);

      let sum = 0;
      for (let i = 0; i < copiedData.length; i++) {
        sum += copiedData[i] * copiedData[i];
      }
      audioLevel.value = Math.min(100, Math.round(Math.sqrt(sum / copiedData.length) * 260));
    };

    source.connect(processor);
    processor.connect(context.destination);

    isRecording.value = true;
    recordingStartTime.value = Date.now();

    recordingTimer = window.setInterval(() => {
      recordingDuration.value = Math.floor((Date.now() - recordingStartTime.value) / 1000);
    }, 200);

    return true;
  } catch (error) {
    console.error('开启录音失败:', error);
    isRecording.value = false;
    cleanupAudioRecorder();
    return false;
  }
}

async function stopAudioRecording() {
  if (!isRecording.value) return null;

  isRecording.value = false;

  const duration = Date.now() - recordingStartTime.value;
  const buffers = [...audioBuffers.value];

  cleanupAudioRecorder();

  if (duration < 500 || buffers.length === 0) {
    audioBuffers.value = [];
    return null;
  }

  const wavBlob = encodeWav(buffers, wavSampleRate.value);

  audioBuffers.value = [];

  return wavBlob;
}

function cancelAudioRecording() {
  isRecording.value = false;
  audioBuffers.value = [];
  cleanupAudioRecorder();
}

function cleanupAudioRecorder() {
  if (recordingTimer) {
    window.clearInterval(recordingTimer);
    recordingTimer = null;
  }

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
  recordingDuration.value = 0;
  audioLevel.value = 0;
}

function formatRecordingDuration(seconds: number) {
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;

  return `${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

// 编码为 16kHz 单声道 16bit PCM WAV，与左侧文件语音采集方式保持一致
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

async function handleTextSubmit() {
  const text = textInput.value.trim();
  if (!text) return;
  textInput.value = '';

  voiceStore.setProcessing('nlu_processing', '正在理解...');

  try {
    const res = await api.voiceForm.processText({
      text,
      templateId: templateId.value,
      formDataId: formStore.formData?.id,
      mode: voiceStore.mode,
      wizardStep: voiceStore.mode === 'wizard' ? voiceStore.wizardStep : undefined,
      currentValues: formStore.formValues,
      needTts: false,
    });
    handlePipelineResult(res.data);
  } catch (err: any) {
    voiceStore.setError(err.message || '处理失败');
  }
}

function handlePipelineResult(result: any) {
  if (!result.success) {
    voiceStore.setError(result.error || '处理失败');
    return;
  }

  voiceStore.setResult(result.recognizedText || '', result.replyText || '', result.ttsAudioBase64);

  if (result.fieldUpdates && Object.keys(result.fieldUpdates).length > 0) {
    formStore.setFieldValues(result.fieldUpdates);
  }

  if (result.updatedFormValues) {
    // 同步服务端返回的完整值（含计算联动结果）
    for (const [k, v] of Object.entries(result.updatedFormValues)) {
      if (formStore.formValues[k] === undefined || formStore.formValues[k] === null) {
        formStore.formValues[k] = v;
      }
    }
  }

  if (result.validationWarnings?.length) {
    formStore.validationWarnings = result.validationWarnings;
  }

  if (result.formDataId && !formStore.formData?.id) {
    formStore.formData = {
      ...formStore.formData,
      id: result.formDataId,
    } as any;
  }

  if (result.ttsAudioBase64) {
    audioPlayer.playBase64(result.ttsAudioBase64);
  }

  if (
    voiceStore.mode === 'wizard' &&
    result.nluResult?.intent === 'FILL_FORM' &&
    !result.needFollowUp
  ) {
    voiceStore.wizardStep++;
  }

  scrollToBottom();
}

async function handleUndo() {
  const ok = formStore.formData?.id ? await formStore.remoteUndo() : formStore.localUndo();
  if (ok) ElMessage.success('已撤销');
  else ElMessage.info('没有可撤销的操作');
}

async function handleRedo() {
  const ok = formStore.formData?.id ? await formStore.remoteRedo() : formStore.localRedo();
  if (ok) ElMessage.success('已重做');
  else ElMessage.info('没有可重做的操作');
}

async function handleValidate() {
  try {
    const res = await api.voiceForm.validateForm(templateId.value, formStore.formValues);
    const warnings = res.data || [];
    formStore.validationWarnings = warnings;
    if (warnings.length === 0) ElMessage.success('校验通过，未发现异常');
    else ElMessage.warning(`发现 ${warnings.length} 项需要注意`);
  } catch {
    console.log(111);
  }
}

async function handleReadback() {
  try {
    const res = await api.voiceForm.readbackForm(templateId.value, formStore.formValues);
    const { text, audioBase64 } = res.data || {};
    if (audioBase64) {
      audioPlayer.playBase64(audioBase64);
      voiceStore.conversationHistory.push({
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        audioBase64,
      });
      scrollToBottom();
    } else if (text) {
      ElMessage.info(text);
    }
  } catch {
    console.log(111);
  }
}

async function handleConfirm() {
  if (formStore.missingRequiredFields.length > 0) {
    const names = formStore.missingRequiredFields.map((f) => f.fieldName).join('、');
    ElMessage.warning(`还有必填项未填写：${names}`);
    return;
  }
  await ElMessageBox.confirm('确认表单内容无误？', '确认');
  if (formStore.formData?.id) {
    const res = await api.voiceForm.confirmForm(formStore.formData.id);
    formStore.formData = res.data;
    ElMessage.success('表单已确认');
  }
}

async function handleSubmit() {
  await ElMessageBox.confirm('提交后不可修改，确定提交？', '提交');
  if (formStore.formData?.id) {
    const res = await api.voiceForm.submitForm(formStore.formData.id);
    formStore.formData = res.data;
    ElMessage.success('表单已提交');
  }
}

function getFieldWarning(fieldCode: string): string | null {
  const w = formStore.validationWarnings.find((w) => w.fieldCode === fieldCode);
  return w?.warningMessage || null;
}

function formatTime(ts: number) {
  return dayjs(ts).format('HH:mm:ss');
}

function scrollToBottom() {
  nextTick(() => {
    const el = chatMessagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}
</script>

<style lang="scss" scoped>
.voice-form-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  color: #0f172a;
}

/* 顶部信息 */
.form-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  margin-bottom: 16px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid rgb(229 234 243 / 88%);
  border-radius: 20px;
  box-shadow: 0 12px 32px rgb(15 23 42 / 5%);
  backdrop-filter: blur(14px);
}

.header-info {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.form-title {
  max-width: 680px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
  white-space: nowrap;
}

.form-subtitle {
  display: flex;
  align-items: center;
  margin: 8px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  padding: 5px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 999px;

  :deep(.el-button.is-circle) {
    width: 36px;
    height: 36px;
    margin-left: 0;
    color: #64748b;
    background: transparent;
    border: none;
    transition: all 0.2s ease;

    &:hover:not(.is-disabled) {
      color: #2563eb;
      background: #fff;
      box-shadow: 0 8px 18px rgb(15 23 42 / 8%);
      transform: translateY(-1px);
    }

    &.is-disabled {
      opacity: 0.35;
    }
  }
}

/* 显示控制：默认桌面端显示，移动端按钮隐藏 */
.mobile-only {
  display: none !important;
}

.desktop-only {
  display: flex !important;
}

/* 进度条 */
.completion-bar {
  flex-shrink: 0;
  padding: 16px 20px;
  margin-bottom: 18px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid rgb(229 234 243 / 88%);
  border-radius: 18px;
  box-shadow: 0 10px 26px rgb(15 23 42 / 4%);
  backdrop-filter: blur(12px);

  :deep(.el-progress-bar__outer) {
    background-color: #edf2f7;
    border-radius: 999px;
  }

  :deep(.el-progress-bar__inner) {
    border-radius: 999px;
    transition: width 0.35s ease;
  }
}

.bar-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.bar-percent {
  font-size: 15px;
  font-weight: 800;
  color: #6366f1;
}

/* 主体布局 */
.form-body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 20px;
  min-height: 0;
}

/* 左侧表单 */
.form-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: rgb(255 255 255 / 92%);
  border: 1px solid rgb(229 234 243 / 88%);
  border-radius: 22px;
  box-shadow: 0 16px 38px rgb(15 23 42 / 6%);
  backdrop-filter: blur(12px);
}

.form-content {
  flex: 1;
  min-height: 0;
  padding: 22px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.form-field {
  position: relative;
  padding: 16px;
  margin-bottom: 16px;
  background: #f9fbff;
  border: 1px solid transparent;
  border-radius: 16px;
  transition:
    background 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;

  &:hover {
    background: #fff;
    border-color: #dbeafe;
    box-shadow: 0 10px 24px rgb(37 99 235 / 7%);
    transform: translateY(-1px);
  }

  &.field-required {
    &::before {
      position: absolute;
      top: 16px;
      left: 0;
      width: 3px;
      height: 22px;
      content: '';
      background: #2563eb;
      border-radius: 0 999px 999px 0;
    }
  }

  &.field-filled {
    background: #f0fdf4;
    border-color: #bbf7d0;

    &:hover {
      box-shadow: 0 10px 24px rgb(16 185 129 / 8%);
    }
  }

  &.field-warning {
    background: #fffbeb;
    border-color: #fde68a;

    &:hover {
      box-shadow: 0 10px 24px rgb(245 158 11 / 10%);
    }
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-select__wrapper),
  :deep(.el-input-number .el-input__wrapper) {
    min-height: 40px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 0 0 1px #e5eaf3 inset;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px #bfdbfe inset;
    }

    &.is-focus,
    &:focus-within {
      box-shadow:
        0 0 0 1px #2563eb inset,
        0 0 0 4px rgb(37 99 235 / 10%);
    }
  }

  :deep(.el-input-group__append) {
    background: #f8fafc;
    border-color: #e5eaf3;
    border-radius: 0 12px 12px 0;
  }
}

.field-label {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #334155;
}

.field-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-required-mark {
  color: #ef4444;
}

.field-unit {
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
}

.field-recommend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.recommend-label {
  font-size: 12px;
  color: #94a3b8;
}

.recommend-tag {
  cursor: pointer;
  border-radius: 999px;
  transition: all 0.18s ease;

  &:hover {
    color: #2563eb;
    background: #eef4ff;
    border-color: #bfdbfe;
    transform: translateY(-1px);
  }
}

.field-warning-msg {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  margin-top: 10px;
  font-size: 12px;
  color: #b45309;
  background: rgb(245 158 11 / 10%);
  border: 1px solid rgb(245 158 11 / 16%);
  border-radius: 10px;
}

.w-full {
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 16px 22px;
  background: rgb(255 255 255 / 92%);
  border-top: 1px solid #eef2f7;

  .btn-outline {
    color: #2563eb !important;
    background-color: #fff !important;
    border-color: #bfdbfe !important;

    &:hover {
      background-color: #eef4ff !important;
      border-color: #2563eb !important;
      box-shadow: 0 10px 22px rgb(37 99 235 / 10%);
    }
  }

  .btn-solid {
    background: linear-gradient(135deg, #2563eb, #6366f1) !important;
    border: none !important;
    box-shadow: 0 10px 22px rgb(37 99 235 / 20%);

    &:hover {
      box-shadow: 0 14px 26px rgb(37 99 235 / 25%);
    }
  }
}

/* 右侧对话面板 */
.chat-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: rgb(255 255 255 / 94%);
  border: 1px solid rgb(229 234 243 / 88%);
  border-radius: 22px;
  box-shadow: 0 16px 38px rgb(15 23 42 / 6%);
  backdrop-filter: blur(12px);
}

.chat-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgb(37 99 235 / 7%), transparent 62%), #fff;
  border-bottom: 1px solid #eef2f7;

  h3 {
    position: relative;
    padding-left: 12px;
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 16px;
      content: '';
      background: linear-gradient(180deg, #2563eb, #6366f1);
      border-radius: 999px;
      transform: translateY(-50%);
    }
  }
}

.guide-banner {
  display: flex;
  gap: 12px;
  padding: 14px;
  margin: 14px 16px 4px;
  color: #6366f1;
  background: linear-gradient(135deg, #eef2ff, #faf5ff);
  border: 1px solid #e0e7ff;
  border-radius: 16px;
}

.guide-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  color: #4338ca;
}

.guide-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: #64748b;
}

/* 对话区 */
.chat-messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.message-item {
  display: flex;
  gap: 10px;
  max-width: 92%;

  &.user {
    flex-direction: row-reverse;
    align-self: flex-end;

    .message-avatar {
      color: #fff;
      background: linear-gradient(135deg, #2563eb, #6366f1);
    }

    .message-content {
      color: #fff;
      background: linear-gradient(135deg, #2563eb, #6366f1);
      border-radius: 16px 16px 4px;
      box-shadow: 0 10px 22px rgb(37 99 235 / 16%);
    }

    .message-time {
      text-align: right;
    }
  }

  &.assistant {
    align-self: flex-start;

    .message-avatar {
      color: #2563eb;
      background: #eef4ff;
    }

    .message-content {
      color: #334155;
      background: #f8fafc;
      border: 1px solid #eef2f7;
      border-radius: 16px 16px 16px 4px;
    }
  }
}

.message-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 14px;
  border-radius: 50%;
}

.message-body {
  min-width: 0;
}

.message-content {
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
}

.message-time {
  margin-top: 5px;
  font-size: 11px;
  color: #cbd5e1;
}

.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.typing .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typing-dot 1.4s infinite;
}

.typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-dot {
  0%,
  60%,
  100% {
    opacity: 0.45;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-5px);
  }
}

/* 语音输入区 */
.voice-input-area {
  flex-shrink: 0;
  padding: 14px 16px 16px;
  background: #fff;
  border-top: 1px solid #eef2f7;
}

.mode-switch {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;

  :deep(.el-radio-group) {
    padding: 3px;
    background: #f1f5f9;
    border-radius: 999px;
  }

  :deep(.el-radio-button__inner) {
    border: none;
    border-radius: 999px !important;
  }
}

.recognized-preview {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 12px;
}

.record-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.text-input-wrapper {
  flex: 1;
  min-width: 0;

  :deep(.el-input__wrapper) {
    min-height: 42px;
    border-radius: 999px;
    box-shadow: 0 0 0 1px #e5eaf3 inset;

    &:hover {
      box-shadow: 0 0 0 1px #bfdbfe inset;
    }

    &.is-focus {
      box-shadow:
        0 0 0 1px #2563eb inset,
        0 0 0 4px rgb(37 99 235 / 10%);
    }
  }
}

.record-btn {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #2563eb, #6366f1);
  border: none;
  border-radius: 50%;
  box-shadow: 0 14px 26px rgb(37 99 235 / 24%);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background 0.22s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 18px 32px rgb(37 99 235 / 30%);
    transform: translateY(-2px) scale(1.03);
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }

  &.recording {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    animation: recording-pulse 1.5s infinite;
  }

  &.processing {
    background: linear-gradient(135deg, #94a3b8, #64748b);
    box-shadow: none;
  }
}

@keyframes recording-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(239 68 68 / 35%);
  }

  70% {
    box-shadow: 0 0 0 14px rgb(239 68 68 / 0%);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(239 68 68 / 0%);
  }
}

.btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
}

.btn-label {
  max-width: 60px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.wave-bars {
  display: flex;
  gap: 3px;
  align-items: center;
  height: 26px;
}

.voice-wave-bar {
  width: 3px;
  height: 10px;
  background: #fff;
  border-radius: 999px;
  animation: voice-wave 1s ease-in-out infinite;

  &:nth-child(2) {
    animation-delay: 0.1s;
  }

  &:nth-child(3) {
    animation-delay: 0.2s;
  }

  &:nth-child(4) {
    animation-delay: 0.3s;
  }

  &:nth-child(5) {
    animation-delay: 0.4s;
  }
}

@keyframes voice-wave {
  0%,
  100% {
    height: 8px;
  }

  50% {
    height: 24px;
  }
}

.volume-indicator {
  height: 5px;
  margin-top: 10px;
  overflow: hidden;
  background: #eef2f7;
  border-radius: 999px;
}

.volume-bar {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
  border-radius: 999px;
  transition: width 0.1s ease;
}

.mobile-bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 120;
  display: none;
  align-items: center;
  justify-content: space-around;
  min-height: calc(64px + env(safe-area-inset-bottom));
  padding: 10px 24px calc(10px + env(safe-area-inset-bottom));
  background: rgb(255 255 255 / 98%);
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -10px 28px rgb(15 23 42 / 14%);
  backdrop-filter: blur(14px);

  :deep(.el-button) {
    width: 40px;
    height: 40px;
    margin-left: 0;
    color: #64748b;
    background: #fff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 8px 18px rgb(15 23 42 / 6%);
  }

  :deep(.el-button.is-disabled) {
    color: #cbd5e1 !important;
    cursor: not-allowed;
    background: #f8fafc !important;
    border-color: #e5e7eb !important;
    box-shadow: none !important;
    opacity: 1;
  }

  :deep(.el-button--primary:not(.is-disabled)) {
    color: #fff;
    background: linear-gradient(135deg, #2563eb, #60a5fa);
    border: none;
    box-shadow: 0 10px 22px rgb(37 99 235 / 24%);
  }
}

.ml-2 {
  margin-left: 8px;
}

/* 中等屏幕 */
@media (width <= 1200px) {
  .form-body {
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 16px;
  }

  .voice-form-page {
    padding: 16px;
  }

  .form-title {
    max-width: 520px;
  }
}

/* 平板和移动端 */
@media (width <= 768px) {
  .voice-form-page {
    --mobile-bottom-bar-height: calc(64px + env(safe-area-inset-bottom));
    --mobile-chat-peek-height: 74px;

    height: 100%;
    padding: 12px;
    padding-bottom: calc(168px + env(safe-area-inset-bottom));
    overflow-y: auto;
  }

  .form-header {
    align-items: flex-start;
    padding: 16px;
    border-radius: 18px;
  }

  .form-title {
    max-width: 100%;
    font-size: 19px;
    white-space: normal;
  }

  .form-subtitle {
    flex-wrap: wrap;
    gap: 6px;
  }

  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: auto;
  }

  .form-panel {
    min-height: 520px;
    border-radius: 18px;
  }

  .form-content {
    padding: 16px;
    padding-bottom: calc(100px + env(safe-area-inset-bottom));
  }

  .form-field {
    padding: 14px;
    margin-bottom: 14px;
  }

  .form-actions {
    position: fixed;
    right: 12px;
    bottom: calc(var(--mobile-bottom-bar-height) + var(--mobile-chat-peek-height) - 108px);
    left: 12px;
    z-index: 95;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
    padding: 10px 12px;
    background: rgb(255 255 255 / 98%);
    border: 1px solid #e5eaf3;
    border-radius: 18px;
    box-shadow: 0 12px 30px rgb(15 23 42 / 12%);
    backdrop-filter: blur(14px);
  }

  .action-buttons {
    width: 100%;
  }

  .form-actions :deep(.el-button) {
    width: 100%;
    height: 46px;
    padding: 0 10px;
    margin-left: 0;
    overflow: hidden;
    font-size: 15px;
    white-space: nowrap;
  }

  .form-actions :deep(.el-button > span) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-panel {
    position: fixed;
    right: 10px;
    bottom: var(--mobile-bottom-bar-height);
    left: 10px;
    z-index: 100;
    width: auto;
    height: min(68vh, calc(100vh - var(--mobile-bottom-bar-height) - 16px));
    border-radius: 22px 22px 0 0;
    box-shadow: 0 -12px 34px rgb(15 23 42 / 18%);
    transform: translateY(calc(100% - var(--mobile-chat-peek-height)));
    transition: transform 0.3s ease;
  }

  .chat-panel.panel-expanded {
    transform: translateY(0);
  }

  .chat-header {
    padding: 16px;
  }

  .record-controls {
    align-items: stretch;
  }

  .record-btn {
    width: 64px;
    height: 64px;
  }
}

/* 小屏幕 */
@media (width <= 480px) {
  .voice-form-page {
    padding: 10px;
    padding-bottom: calc(162px + env(safe-area-inset-bottom));
  }

  .completion-bar {
    padding: 14px;
    border-radius: 16px;
  }

  .form-actions {
    right: 10px;
    left: 10px;
    gap: 6px;
    padding: 9px 10px;
  }

  .form-actions :deep(.el-button) {
    height: 44px;
    padding: 0 8px;
    font-size: 14px;
  }

  .mobile-bottom-bar {
    padding-right: 22px;
    padding-left: 22px;
  }

  .record-controls {
    flex-direction: column;
  }

  .text-input-wrapper {
    width: 100%;
  }

  .record-btn {
    flex-direction: row;
    gap: 8px;
    width: 100%;
    height: 54px;
    border-radius: 16px;
  }

  .btn-inner {
    height: auto;
  }

  .btn-label {
    max-width: none;
    margin-top: 0;
    font-size: 12px;
  }
}
</style>
