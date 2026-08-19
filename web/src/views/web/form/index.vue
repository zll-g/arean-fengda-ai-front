<template>
  <div v-loading="formStore.isLoading" class="voice-form-page">
    <!-- 头部信息 -->
    <div class="form-header">
      <div class="header-info">
        <el-button text @click="router.back()">
          <el-icon>
            <ArrowLeft />
          </el-icon>
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
            <el-icon>
              <RefreshLeft />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)">
          <el-button :disabled="!canRedo" circle @click="handleRedo">
            <el-icon>
              <RefreshRight />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="智能校验">
          <el-button circle @click="handleValidate">
            <el-icon>
              <CircleCheck />
            </el-icon>
          </el-button>
        </el-tooltip>
        <!-- <el-tooltip content="语音回读">
          <el-button circle @click="handleReadback">
            <el-icon><VideoPlay /></el-icon>
          </el-button>
        </el-tooltip> -->
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
        :color="formStore.completionRate === 100 ? '#22c55e' : '#ff8a26'"
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
                  <el-button
                    :disabled="field.masterDataCode !== 'gms'"
                    @click="openMasterDataPicker(field)"
                  >
                    <el-icon>
                      <Search />
                    </el-icon>
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
                <el-icon>
                  <WarningFilled />
                </el-icon>
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
            <el-icon>
              <CircleCheck />
            </el-icon>
            确认表单
          </el-button>
          <el-button
            type="success"
            size="large"
            round
            :disabled="formStore.formData?.status !== 'confirmed'"
            @click="handleSubmit"
          >
            <el-icon>
              <Upload />
            </el-icon>
            提交
          </el-button>
        </div>
      </div>

      <!-- 右侧对话面板 -->
      <div class="chat-panel" :class="{ 'panel-expanded': showChat }">
        <div class="chat-header">
          <h3>语音助手</h3>
          <el-button v-if="isMobile" text @click="showChat = !showChat">
            <el-icon>
              <component :is="showChat ? 'ArrowDown' : 'ArrowUp'" />
            </el-icon>
          </el-button>
        </div>

        <!-- 引导话术 -->
        <div
          v-if="voiceStore.conversationHistory.length === 0 && formStore.template?.sampleSpeech"
          class="guide-banner"
        >
          <el-icon :size="20">
            <InfoFilled />
          </el-icon>
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
              <el-icon v-if="msg.role === 'user'">
                <User />
              </el-icon>
              <el-icon v-else>
                <Cpu />
              </el-icon>
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
                <el-icon>
                  <VideoPlay />
                </el-icon>
                播放
              </el-button>
            </div>
          </div>

          <!-- 处理中 -->
          <div v-if="voiceStore.state === 'processing'" class="message-item assistant">
            <div class="message-avatar">
              <el-icon>
                <Cpu />
              </el-icon>
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
            <el-icon>
              <Microphone />
            </el-icon>
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
                <el-icon v-if="!isRecording" :size="28">
                  <Microphone />
                </el-icon>
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
    <!-- <div class="mobile-bottom-bar mobile-only">
      <el-button @click="handleUndo" :disabled="!canUndo" circle size="small">
        <el-icon><RefreshLeft /></el-icon>
      </el-button>
      <el-button @click="handleRedo" :disabled="!canRedo" circle size="small">
        <el-icon><RefreshRight /></el-icon>
      </el-button>
      <el-button @click="handleReadback" circle size="small">
        <el-icon><VideoPlay /></el-icon>
      </el-button>
      <el-button type="primary" @click="showChat = !showChat" circle size="small">
        <el-icon><ChatDotRound /></el-icon>
      </el-button>
    </div> -->

    <!-- 主数据选择弹窗 -->
    <MasterDataPicker
      v-model:visible="showMasterPicker"
      :source-code="pickerSourceCode"
      :field-code="pickerTargetField"
      :source-label="pickerSourceLabel"
      :input-value="fieldCodeValue"
      @select="handleMasterDataSelected"
    />
  </div>
</template>

<script setup lang="ts">
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioBase64?: string;
}
import { useMediaQuery } from '@vueuse/core';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useFormStore } from '@/store/formStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import { useHotkeys } from '@/composables/useHotkeys';
import MasterDataPicker from '@/components/MasterDataPicker.vue';
import type { TemplateField } from '@/types';
import { computed, nextTick, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import api from '@/api';
const router = useRouter();
const route = useRoute();
const isMobile = useMediaQuery('(max-width: 768px)');
const fieldCodeValue = ref('');
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
      // 偏好推荐值列表
      if (res.data?.recommendedValues?.length) {
        fieldRecommends.value[field.fieldCode] = res.data.recommendedValues;
      }
      // 默认值自动填入输入框
      if (res.data?.v !== null && res.data?.v !== undefined) {
        formStore.setFieldValue(field.fieldCode, res.data.v);
        fieldCodeValue.value = formStore.formValues[field.fieldCode];
      }
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
  console.log(formStore.formValues[fieldCode], 222);
  // @ts-expect-error
  formStore.setFieldValue(fieldCode, formStore.formValues[fieldCode], 'manual');
  fieldCodeValue.value = formStore.formValues[fieldCode];
}

function setFieldFromRecommend(fieldCode: string, val: string) {
  // @ts-expect-error
  formStore.setFieldValue(fieldCode, val, 'recommend');
  fieldCodeValue.value = formStore.formValues[fieldCode];
}

function openMasterDataPicker(field: TemplateField) {
  fieldCodeValue.value = formStore.formValues[field.fieldCode];
  pickerSourceCode.value = field.masterDataCode || '';
  pickerSourceLabel.value = field.fieldName;
  pickerTargetField.value = field.fieldCode;
  showMasterPicker.value = true;
}

function handleMasterDataSelected(item: any) {
  // 回填主数据
  // @ts-expect-error
  formStore.setFieldValue(pickerTargetField.value, item.kksCode, 'master_data');

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

  // stopRecording 可能会清空 partialText，需要提前保存
  const partialText = voiceStore.partialText?.trim() || '';

  voiceStore.stopRecording();

  const audioBlob = await stopAudioRecording();

  if (!audioBlob || audioBlob.size === 0) {
    voiceStore.setIdle();
    return;
  }

  // 语音接口返回前，先展示一条临时用户消息
  const userMessage = appendUserMessage(partialText || '语音消息（识别中...）');

  voiceStore.setProcessing('asr_processing', '正在识别语音...');

  try {
    const fd = new FormData();

    fd.append('audio', audioBlob, 'recording.wav');
    fd.append('templateId', String(templateId.value));

    if (formStore.formData?.id) {
      fd.append('formDataId', String(formStore.formData.id));
    }

    fd.append('mode', voiceStore.mode);

    if (voiceStore.mode === 'wizard') {
      fd.append('wizardStep', String(voiceStore.wizardStep));
    }

    fd.append('currentValuesJson', JSON.stringify(formStore.formValues));

    const res = await api.voiceForm.processAudio(fd);

    handlePipelineResult(res.data, userMessage);
  } catch (err: any) {
    if (!partialText) {
      userMessage.content = '语音消息（识别失败）';
    }

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

function appendUserMessage(content: string) {
  const message: ChatMessage = {
    role: 'user',
    content,
    timestamp: Date.now(),
  };

  voiceStore.conversationHistory.push(message);
  scrollToBottom();

  return message;
}

async function handleTextSubmit() {
  const text = textInput.value.trim();

  if (!text || voiceStore.state === 'processing') return;

  textInput.value = '';

  // 立即显示发送内容
  voiceStore.conversationHistory.push({
    role: 'user',
    content: text,
    timestamp: Date.now(),
  });

  scrollToBottom();

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

function handlePipelineResult(result: any, userMessage?: ChatMessage) {
  if (!result.success) {
    if (userMessage?.content === '语音消息（识别中...）') {
      userMessage.content = '语音消息（识别失败）';
    }

    voiceStore.setError(result.error || '处理失败');
    return;
  }

  // 语音识别完成后，替换临时文字
  if (userMessage && result.recognizedText) {
    userMessage.content = result.recognizedText;
  }

  /*
   * 用户消息已经提前加入，所以 recognizedText 传空字符串，
   * 避免 setResult 再添加一次用户消息。
   */
  voiceStore.setResult(
    result.recognizedText || '',
    result.replyText || '',
    result.ttsAudioBase64,
    false,
  );

  if (result.fieldUpdates && Object.keys(result.fieldUpdates).length > 0) {
    formStore.setFieldValues(result.fieldUpdates);
  }

  if (result.updatedFormValues) {
    for (const [key, value] of Object.entries(result.updatedFormValues)) {
      if (formStore.formValues[key] === undefined || formStore.formValues[key] === null) {
        formStore.formValues[key] = value;
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

// async function handleReadback() {
//   try {
//     const res = await api.voiceForm.readbackForm(templateId.value, formStore.formValues);
//     const { text, audioBase64 } = res.data || {};
//     if (audioBase64) {
//       audioPlayer.playBase64(audioBase64);
//       voiceStore.conversationHistory.push({
//         role: 'assistant',
//         content: text,
//         timestamp: Date.now(),
//         audioBase64,
//       });
//       scrollToBottom();
//     } else if (text) {
//       ElMessage.info(text);
//     }
//   } catch {
//     console.log(111);
//   }
// }

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
    router.back();
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
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 18px;
  margin: 0 auto;
  color: #2f3747;
  background: #f8f6f3;

  :deep(.el-button) {
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  :deep(.el-button--primary) {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;

    &:hover,
    &:focus {
      background: #f97a16;
      border-color: #f97a16;
    }

    &:active {
      background: #e96e0d;
      border-color: #e96e0d;
    }

    &.is-disabled,
    &.is-disabled:hover {
      color: #fff;
      background: #ffc18d;
      border-color: #ffc18d;
    }
  }

  :deep(.el-button--success) {
    color: #fff;
    background: #ff9a43;
    border-color: #ff9a43;

    &:hover,
    &:focus {
      background: #ff8425;
      border-color: #ff8425;
    }

    &.is-disabled,
    &.is-disabled:hover {
      color: #fff;
      background: #ffd0a8;
      border-color: #ffd0a8;
    }
  }

  :deep(.el-tag) {
    border-radius: 6px;
  }

  :deep(.el-tag--warning) {
    color: #d86400;
    background: #fff3e6;
    border-color: #ffd3ad;
  }

  :deep(.el-loading-mask) {
    background: rgb(255 255 255 / 72%);
  }

  :deep(.el-loading-spinner .path) {
    stroke: #ff8a26;
  }
}

/* 顶部信息 */
.form-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  margin-bottom: 14px;
  background: #fff;
  border: 1px solid #eee7e1;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgb(72 48 28 / 4%);
}

.header-info {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;

  > :deep(.el-button) {
    width: 36px;
    height: 36px;
    padding: 0;
    color: #ff8a26;
    background: #fff4e9;
    border-radius: 8px;

    &:hover {
      color: #fff;
      background: #ff8a26;
    }
  }
}

.form-title {
  max-width: 680px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.3;
  color: #2f3747;
  white-space: nowrap;
}

.form-subtitle {
  display: flex;
  align-items: center;
  margin: 6px 0 0;
  font-size: 13px;
  color: #9aa2af;
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  padding: 4px;
  background: #fffaf5;
  border: 1px solid #f2e6dc;
  border-radius: 10px;

  :deep(.el-button.is-circle) {
    width: 34px;
    height: 34px;
    margin-left: 0;
    color: #7d8796;
    background: #fff;
    border: 1px solid transparent;
    transition: all 0.2s ease;

    &:hover:not(.is-disabled) {
      color: #ff8a26;
      background: #fff4e9;
      border-color: #ffd7b5;
      box-shadow: 0 4px 10px rgb(255 138 38 / 12%);
      transform: translateY(-1px);
    }

    &.is-disabled {
      opacity: 0.35;
    }
  }
}

/* 进度条 */
.completion-bar {
  flex-shrink: 0;
  padding: 14px 18px;
  margin-bottom: 16px;
  background: #fff;
  border: 1px solid #eee7e1;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgb(72 48 28 / 4%);

  :deep(.el-progress-bar__outer) {
    background-color: #f4eee9;
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
  margin-bottom: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #5f6978;
}

.bar-percent {
  font-size: 15px;
  font-weight: 700;
  color: #ff8a26;
}

/* 主体布局 */
.form-body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 16px;
  min-height: 0;
}

/* 左侧表单 */
.form-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #eee7e1;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgb(72 48 28 / 5%);
}

.form-content {
  flex: 1;
  min-height: 0;
  padding: 18px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd3ca;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #cdbeb2;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.form-field {
  position: relative;
  padding: 15px;
  margin-bottom: 14px;
  background: #fffdfb;
  border: 1px solid #f0e9e3;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #fff;
    border-color: #ffc99b;
    box-shadow: 0 6px 16px rgb(255 138 38 / 8%);
    transform: translateY(-1px);
  }

  &.field-required {
    &::before {
      position: absolute;
      top: 15px;
      left: -1px;
      width: 3px;
      height: 22px;
      content: '';
      background: #ff8a26;
      border-radius: 0 3px 3px 0;
    }
  }

  &.field-filled {
    background: #fff9f2;
    border-color: #ffd8b6;

    &:hover {
      border-color: #ffb978;
      box-shadow: 0 6px 16px rgb(255 138 38 / 10%);
    }
  }

  &.field-warning {
    background: #fffaf0;
    border-color: #f5cf87;

    &:hover {
      box-shadow: 0 6px 16px rgb(217 144 16 / 10%);
    }
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-select__wrapper),
  :deep(.el-input-number .el-input__wrapper) {
    min-height: 40px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 0 0 1px #e5e0db inset;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px #ffc38f inset;
    }

    &.is-focus,
    &:focus-within {
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 3px rgb(255 138 38 / 10%);
    }
  }

  :deep(.el-textarea__inner:focus) {
    box-shadow:
      0 0 0 1px #ff8a26 inset,
      0 0 0 3px rgb(255 138 38 / 10%);
  }

  :deep(.el-input-group__append) {
    color: #ff8a26;
    background: #fff6ed;
    border-color: #e9ded4;
    border-radius: 0 8px 8px 0;

    .el-button:hover {
      color: #f16f0c;
    }
  }

  :deep(.el-input-number__increase),
  :deep(.el-input-number__decrease) {
    color: #7d8796;

    &:hover {
      color: #ff8a26;
    }
  }

  :deep(.el-select__caret) {
    color: #a0a8b4;
  }
}

.field-label {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 9px;
  font-size: 14px;
  font-weight: 650;
  color: #3d4654;
}

.field-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-required-mark {
  color: #f04438;
}

.field-unit {
  font-size: 12px;
  font-weight: 400;
  color: #a0a8b4;
}

.field-recommend {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  margin-top: 10px;
}

.recommend-label {
  font-size: 12px;
  color: #9aa2af;
}

.recommend-tag {
  color: #c7650f;
  cursor: pointer;
  background: #fff7ef;
  border-color: #ffd5b1;
  border-radius: 6px;
  transition: all 0.18s ease;

  &:hover {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;
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
  color: #b86b0b;
  background: #fff7e8;
  border: 1px solid #f7d7a5;
  border-radius: 8px;
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
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 18px;
  background: #fffdfa;
  border-top: 1px solid #eee7e1;

  :deep(.el-button) {
    height: 40px;
    padding: 0 22px;
    margin-left: 0;
    font-weight: 650;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover:not(.is-disabled) {
      box-shadow: 0 6px 14px rgb(255 138 38 / 16%);
      transform: translateY(-1px);
    }
  }

  :deep(.el-button--primary) {
    background: #ff8a26;
    border-color: #ff8a26;
  }

  :deep(.el-button--success) {
    background: #ff9a43;
    border-color: #ff9a43;
  }

  .btn-outline {
    color: #ff8a26 !important;
    background-color: #fff !important;
    border-color: #ffc38f !important;

    &:hover {
      color: #f16f0c !important;
      background-color: #fff6ed !important;
      border-color: #ff8a26 !important;
      box-shadow: 0 6px 14px rgb(255 138 38 / 12%);
    }
  }

  .btn-solid {
    background: #ff8a26 !important;
    border: 1px solid #ff8a26 !important;
    box-shadow: 0 6px 14px rgb(255 138 38 / 18%);

    &:hover {
      background: #f97a16 !important;
      border-color: #f97a16 !important;
      box-shadow: 0 8px 18px rgb(255 138 38 / 22%);
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
  background: #fff;
  border: 1px solid #eee7e1;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgb(72 48 28 / 5%);
}

.chat-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: #fffaf5;
  border-bottom: 1px solid #f0e7df;

  h3 {
    position: relative;
    padding-left: 12px;
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #2f3747;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 17px;
      content: '';
      background: #ff8a26;
      border-radius: 3px;
      transform: translateY(-50%);
    }
  }

  :deep(.el-button) {
    color: #ff8a26;

    &:hover {
      background: #fff0e2;
    }
  }
}

.guide-banner {
  display: flex;
  gap: 11px;
  padding: 13px;
  margin: 14px 14px 4px;
  color: #ff8a26;
  background: #fff7ef;
  border: 1px solid #ffd8b6;
  border-radius: 10px;
}

.guide-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: #c8640d;
}

.guide-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: #737d8b;
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
  background: #fff;

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd3ca;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #cdbeb2;
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
      background: #ff8a26;
    }

    .message-content {
      color: #fff;
      background: #ff8a26;
      border-radius: 12px 12px 3px;
      box-shadow: 0 6px 14px rgb(255 138 38 / 16%);
    }

    .message-time {
      text-align: right;
    }
  }

  &.assistant {
    align-self: flex-start;

    .message-avatar {
      color: #e97715;
      background: #fff1e5;
      border: 1px solid #ffd8b6;
    }

    .message-content {
      color: #46505f;
      background: #faf9f7;
      border: 1px solid #eee7e1;
      border-radius: 12px 12px 12px 3px;
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
  border-radius: 8px;
}

.message-body {
  min-width: 0;

  :deep(.el-button) {
    padding: 4px 0;
    margin-top: 2px;
    color: #ff8a26;

    &:hover {
      color: #e96e0d;
    }
  }
}

.message-content {
  padding: 10px 13px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
}

.message-time {
  margin-top: 5px;
  font-size: 11px;
  color: #b2b8c1;
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
  background: #ff9a43;
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
  background: #fffdfa;
  border-top: 1px solid #eee7e1;
}

.mode-switch {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;

  :deep(.el-radio-group) {
    padding: 3px;
    background: #f7f1eb;
    border: 1px solid #eee3d9;
    border-radius: 8px;
  }

  :deep(.el-radio-button__inner) {
    min-width: 64px;
    color: #7a8492;
    background: transparent;
    border: none;
    border-radius: 6px !important;
    box-shadow: none !important;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    color: #fff;
    background: #ff8a26;
    box-shadow: none;
  }

  :deep(.el-radio-button__inner:hover) {
    color: #ff8a26;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner:hover) {
    color: #fff;
  }
}

.recognized-preview {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 11px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6f7988;
  background: #fff7ef;
  border: 1px solid #ffd8b6;
  border-radius: 8px;

  :deep(.el-icon) {
    color: #ff8a26;
  }
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
    border-radius: 8px;
    box-shadow: 0 0 0 1px #e5e0db inset;

    &:hover {
      box-shadow: 0 0 0 1px #ffc38f inset;
    }

    &.is-focus {
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 3px rgb(255 138 38 / 10%);
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
  background: #ff8a26;
  border: 1px solid #ff8a26;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgb(255 138 38 / 22%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover:not(:disabled) {
    background: #f97a16;
    border-color: #f97a16;
    box-shadow: 0 10px 22px rgb(255 138 38 / 28%);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }

  &.recording {
    background: #ef4444;
    border-color: #ef4444;
    animation: recording-pulse 1.5s infinite;
  }

  &.processing {
    background: #a3aab4;
    border-color: #a3aab4;
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
  background: #f0e6dd;
  border-radius: 999px;
}

.volume-bar {
  height: 100%;
  background: linear-gradient(90deg, #ffb15f, #ff8a26, #ef4444);
  border-radius: 999px;
  transition: width 0.1s ease;
}

.mobile-bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  padding: 0 16px;
  background: #fff;
  border-top: 1px solid #eee7e1;
  box-shadow: 0 -6px 18px rgb(72 48 28 / 8%);
}

.ml-2 {
  margin-left: 8px;
}

/* 中等屏幕 */
@media (width <=1200px) {
  .form-body {
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 14px;
  }

  .voice-form-page {
    padding: 16px;
  }

  .form-title {
    max-width: 520px;
  }
}

/* 平板和移动端 */
@media (width <=768px) {
  .voice-form-page {
    height: 100%;
    padding: 12px;
    overflow-y: auto;
  }

  .form-header {
    align-items: flex-start;
    padding: 14px;
    border-radius: 10px;
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
    display: none;
  }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: auto;
  }

  .form-panel {
    min-height: 520px;
    border-radius: 10px;
  }

  .form-content {
    padding: 14px;
  }

  .form-field {
    padding: 14px;
    margin-bottom: 12px;
  }

  .form-actions {
    position: sticky;
    bottom: 0;
    z-index: 5;
    padding: 12px 14px;
  }

  .action-buttons {
    width: 100%;
  }

  .form-actions :deep(.el-button) {
    flex: 1;
    padding: 0 12px;
  }

  .chat-panel {
    position: fixed;
    right: 10px;
    bottom: 12px;
    left: 10px;
    z-index: 90;
    width: auto;
    height: 68vh;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -10px 28px rgb(72 48 28 / 16%);
    transform: translateY(calc(100% - 58px));
    transition: transform 0.3s ease;
  }

  .chat-panel.panel-expanded {
    transform: translateY(0);
  }

  .chat-header {
    padding: 15px 16px;
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
@media (width <=480px) {
  .voice-form-page {
    padding: 10px;
  }

  .completion-bar {
    padding: 13px;
    border-radius: 10px;
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
    border-radius: 10px;
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
