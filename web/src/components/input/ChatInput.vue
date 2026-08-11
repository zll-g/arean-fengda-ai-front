<template>
  <div
    class="chat-input-container"
    :class="{
      'is-focused': isFocused,
      'is-expanded': isExpanded,
      'is-recording': isRecording || isTranscribing,
      'is-uploading-file': hasUploadingAttachments,
    }"
  >
    <div v-if="isDocumentAnalysis && attachments.length > 0" class="attachment-preview">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="attachment-card"
        :class="getAttachmentClass(attachment)"
      >
        <div class="attachment-thumb" :class="{ image: attachment.type === 'image' }">
          <img
            v-if="attachment.type === 'image'"
            :src="attachment.url"
            :alt="attachment.name"
            draggable="false"
          />
          <span v-else>{{ getAttachmentIcon(attachment) }}</span>
        </div>

        <div class="attachment-main">
          <div class="attachment-name" :title="attachment.name">
            {{ attachment.name }}
          </div>

          <div class="attachment-meta">
            <span>{{ formatFileSize(attachment.size) }}</span>
            <span v-if="attachment.uploading" class="upload-status uploading">上传中</span>
            <span v-else-if="attachment.uploadError" class="upload-status error">上传失败</span>
            <span v-else class="upload-status done">已上传</span>
          </div>

          <div v-if="attachment.uploading" class="attachment-progress">
            <span :style="{ width: `${getUploadProgress(attachment)}%` }" />
          </div>
        </div>

        <button
          class="attachment-remove"
          type="button"
          aria-label="移除附件"
          @click.stop="removeAttachment(attachment)"
        >
          ×
        </button>
      </div>
    </div>

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

      <button v-if="isRecording" class="voice-stop-btn" type="button" @click="stopVoiceInput">
        {{ t('chatInput.end') }}
      </button>
    </div>

    <div class="input-area">
      <div v-if="isDocumentAnalysis" class="input-actions left">
        <button
          class="action-btn"
          type="button"
          :title="t('chatInput.addAttachment')"
          @click="triggerFileInput"
        >
          <Paperclip :size="20" />
        </button>

        <button
          class="action-btn"
          type="button"
          :title="t('chatInput.addImage')"
          @click="triggerImageInput"
        >
          <Image :size="20" />
        </button>

        <input
          ref="fileInputRef"
          type="file"
          multiple
          hidden
          :accept="fileAccept"
          @change="handleFileSelect"
        />

        <input
          ref="imageInputRef"
          type="file"
          multiple
          hidden
          :accept="imageAccept"
          @change="handleImageSelect"
        />
      </div>

      <div class="textarea-wrapper">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          :placeholder="textareaPlaceholder"
          :rows="1"
          @input="autoResize"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown="handleKeydown"
          @paste="handlePaste"
        />
      </div>

      <div class="input-actions right">
        <button
          class="action-btn mic"
          :class="{ active: isRecording || isTranscribing }"
          :disabled="props.disabled || isTranscribing"
          :title="micButtonTitle"
          type="button"
          @click="toggleVoiceInput"
        >
          <Mic :size="20" />
        </button>

        <button
          v-if="isCurrentChatStreaming"
          class="action-btn stop"
          type="button"
          :title="t('chatInput.stopGenerating')"
          @click="$emit('stop')"
        >
          <StopCircle :size="20" />
        </button>

        <button
          v-else
          class="action-btn send"
          :class="{ active: canSend }"
          :disabled="!canSend"
          type="button"
          :title="t('chatInput.sendMessageWithEnter')"
          @click="handleSend"
        >
          <Send :size="20" />
        </button>
      </div>
    </div>

    <div class="input-toolbar">
      <div class="toolbar-left">
        <button
          v-for="item in toolList"
          :key="item.value"
          class="toolbar-btn"
          :class="{ active: selectedTool === item.value }"
          type="button"
          :title="t(item.labelKey)"
          @click="selectTool(item.value)"
        >
          <span class="mode-icon">{{ item.icon }}</span>
          <span>{{ t(item.labelKey) }}</span>
        </button>
      </div>

      <div class="toolbar-right">
        <span class="char-count" :class="{ warning: charCount > maxChars * 0.9 }">
          {{ charCount }} / {{ maxChars }}
        </span>
        <span class="send-hint">
          {{
            sendOnEnter
              ? t('chatInput.sendHint.enterSendShiftNewLine')
              : t('chatInput.sendHint.enterSend')
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Image, Mic, Paperclip, Send, StopCircle } from '@/components/icons';
import { generateId } from '@/utils/helpers';
import { useChatStore } from '@/store/modules/knowledge-chat';
import type { Attachment } from '@/types/chat';
import { storeToRefs } from 'pinia';
import api from '@/api';
import { ElMessage } from 'element-plus';

const { t } = useI18n();
const chatStore = useChatStore();
const { currentConversation, selectedTool } = storeToRefs(chatStore);

type ToolType =
  | 'KNOWLEDGE_QA'
  | 'DEEP_SEARCH'
  | 'DEEP_RESEARCH'
  | 'DOCUMENT_ANALYSIS'
  | 'WEB_SEARCH'
  | '';

const toolList = [
  { labelKey: 'chatInput.tools.knowledgeQa', value: 'KNOWLEDGE_QA', icon: '📚' },
  { labelKey: 'chatInput.tools.deepSearch', value: 'DEEP_SEARCH', icon: '🔍' },
  { labelKey: 'chatInput.tools.documentAnalysis', value: 'DOCUMENT_ANALYSIS', icon: '📄' },
] as const;

interface AttachmentWithProgress extends Attachment {
  uploading?: boolean;
  progress?: number;
  docSessionId?: string;
  uploadError?: boolean;
  uploadedData?: any;
  fileId?: string;
  fileName?: string;
}

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    currentChatId?: any;
    isStreaming?: boolean;
    sendOnEnter?: boolean;
    maxChars?: number;
    disabled?: boolean;
  }>(),
  {
    placeholder: '',
    currentChatId: '',
    isStreaming: false,
    sendOnEnter: false,
    maxChars: 4000,
    disabled: false,
  },
);

const emit = defineEmits<{
  send: [text: string, searchType: string, docSessionId?: string];
  stop: [];
}>();

const inputText = ref('');
const attachments = ref<AttachmentWithProgress[]>([]);
const isFocused = ref(false);
const isExpanded = ref(false);

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

const currentDocSessionId = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);

const IMAGE_FORMATS = ['jpg', 'jpeg', 'png'];

const supportedFormats = ref<string[]>(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
const streamingState = ref<Record<string, boolean>>({});

const charCount = computed(() => inputText.value.length);
const maxChars = computed(() => props.maxChars);
const sendOnEnter = computed(() => props.sendOnEnter);
const isDocumentAnalysis = computed(() => selectedTool.value === 'DOCUMENT_ANALYSIS');
const hasUploadingAttachments = computed(() => attachments.value.some((item) => item.uploading));

const fileFormats = computed(() =>
  supportedFormats.value.filter((item) => !IMAGE_FORMATS.includes(item)),
);

const imageFormats = computed(() => IMAGE_FORMATS);

const fileAccept = computed(() => fileFormats.value.map((item) => `.${item}`).join(','));

const imageAccept = computed(() =>
  ['image/*', ...imageFormats.value.map((item) => `.${item}`)].join(','),
);

const canSend = computed(() => {
  return (
    (inputText.value.trim().length > 0 || attachments.value.length > 0) &&
    !props.disabled &&
    !isRecording.value &&
    !isTranscribing.value &&
    !attachments.value.some((attachment) => attachment.uploading || attachment.uploadError) &&
    charCount.value <= props.maxChars
  );
});

const isCurrentChatStreaming = computed(() => {
  if (!props.currentChatId) return false;
  return streamingState.value[props.currentChatId] || false;
});

const voiceStatusText = computed(() => {
  if (isRecording.value) return t('chatInput.voice.listening');
  if (isTranscribing.value) return t('chatInput.voice.transcribing');
  return speechTip.value;
});

const textareaPlaceholder = computed(() => {
  if (isRecording.value) return t('chatInput.voice.recordingPlaceholder');
  if (isTranscribing.value) return t('chatInput.voice.transcribingPlaceholder');
  return props.placeholder || t('chatInput.placeholder');
});

const micButtonTitle = computed(() => {
  if (isTranscribing.value) return t('chatInput.voice.converting');
  if (isRecording.value) return t('chatInput.voice.stopRecognition');
  return t('chatInput.voice.recognition');
});

function normalizeFormat(format: any) {
  return String(format || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();
}

function setSupportedFormats(formats: any[]) {
  const list = formats.map(normalizeFormat).filter(Boolean);
  if (list.length) supportedFormats.value = list;
}

function getFileExt(file: File) {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

function isImageFormat(format: string) {
  return IMAGE_FORMATS.includes(normalizeFormat(format));
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || isImageFormat(getFileExt(file));
}

function isSupportedByType(file: File, type: 'image' | 'file') {
  const ext = getFileExt(file);

  if (type === 'image') {
    return isImageFile(file) && imageFormats.value.includes(ext);
  }

  return !isImageFile(file) && fileFormats.value.includes(ext);
}

function showUnsupportedFileTip(file: File, type: 'image' | 'file') {
  const formats = type === 'image' ? imageFormats.value : fileFormats.value;
  const label = type === 'image' ? '图片' : '文件';

  ElMessage.warning({
    message: `不支持上传 ${file.name}，<br />${label}仅支持：${formats.join('、')}`,
    dangerouslyUseHTMLString: true,
  });
}

function findAttachment(id: string) {
  return attachments.value.find((item) => item.id === id);
}

function patchAttachment(id: string, patch: Partial<AttachmentWithProgress>) {
  const attachment = findAttachment(id);
  if (!attachment) return null;

  Object.assign(attachment, patch);
  return attachment;
}

function getAttachmentClass(attachment: AttachmentWithProgress) {
  return {
    'is-uploading': attachment.uploading,
    'is-error': attachment.uploadError,
    'is-done': !attachment.uploading && !attachment.uploadError,
  };
}

function getAttachmentIcon(attachment: AttachmentWithProgress) {
  const ext = normalizeFormat(attachment.name?.split('.').pop());

  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (['xls', 'xlsx'].includes(ext)) return 'XLS';
  return 'FILE';
}

function getUploadProgress(attachment: AttachmentWithProgress) {
  if (attachment.uploadError) return 0;
  if (!attachment.uploading) return 100;

  return Math.max(attachment.progress || 0, 32);
}

function formatFileSize(size?: number) {
  if (!size) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function selectTool(value: ToolType) {
  chatStore.updateSelectedTool(value);

  if (value !== 'DOCUMENT_ANALYSIS') {
    clearAttachments();
  }

  console.log('current selected tool:', value);
}

function autoResize() {
  const textarea = textareaRef.value;
  if (!textarea) return;

  textarea.style.height = 'auto';
  const maxHeight = isExpanded.value ? 160 : 80;
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

function handleSend() {
  if (!canSend.value) return;

  if (isRecording.value) {
    stopVoiceInput();
    return;
  }

  emit('send', inputText.value.trim(), selectedTool.value, currentDocSessionId.value);

  inputText.value = '';
  clearAttachments();
  speechTip.value = '';

  nextTick(autoResize);
}

function toggleVoiceInput() {
  if (props.disabled || isTranscribing.value) return;
  isRecording.value ? stopVoiceInput() : startVoiceInput();
}

async function startVoiceInput() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showSpeechTip(t('chatInput.voice.notSupported'));
    return;
  }

  const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextConstructor) {
    showSpeechTip(t('chatInput.voice.audioNotSupported'));
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
      audioBuffers.value.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(context.destination);

    isRecording.value = true;
    isTranscribing.value = false;
    recordingStartTime.value = Date.now();
  } catch (error: any) {
    console.error('failed to start recording:', error);

    isRecording.value = false;
    isTranscribing.value = false;
    cleanupAudioRecorder();

    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      showSpeechTip(t('chatInput.voice.noPermission'));
      return;
    }

    if (error?.name === 'NotFoundError') {
      showSpeechTip(t('chatInput.voice.noDevice'));
      return;
    }

    showSpeechTip(t('chatInput.voice.startFailed'));
  }
}

async function stopVoiceInput() {
  if (!isRecording.value) return;

  isRecording.value = false;

  const duration = Date.now() - recordingStartTime.value;
  const buffers = [...audioBuffers.value];

  cleanupAudioRecorder();

  if (duration < 500 || buffers.length === 0) {
    showSpeechTip(t('chatInput.voice.tooShort'));
    audioBuffers.value = [];
    return;
  }

  const wavBlob = encodeWav(buffers, wavSampleRate.value);

  audioBuffers.value = [];
  await uploadVoiceFile(wavBlob);
}

function cleanupAudioRecorder() {
  try {
    scriptProcessor.value?.disconnect();
  } catch (error) {
    console.warn('failed to disconnect audio processor:', error);
  }

  try {
    audioSource.value?.disconnect();
  } catch (error) {
    console.warn('failed to disconnect audio source:', error);
  }

  try {
    audioContext.value?.close();
  } catch (error) {
    console.warn('failed to close AudioContext:', error);
  }

  mediaStream.value?.getTracks().forEach((track) => track.stop());

  scriptProcessor.value = null;
  audioSource.value = null;
  audioContext.value = null;
  mediaStream.value = null;
}

async function uploadVoiceFile(audioBlob: Blob) {
  try {
    isTranscribing.value = true;
    speechTip.value = '';

    const audioFile = new File([audioBlob], `voice_${Date.now()}.wav`, {
      type: 'audio/wav',
    });

    const formData = new FormData();
    formData.append('audio', audioFile);

    const res = await api.knowledgeQa.process(formData);
    const text = normalizeSpeechText(res?.data.text);

    if (!text) {
      showSpeechTip(t('chatInput.voice.noText'));
      return;
    }

    inputText.value = mergeVoiceText(inputText.value, text);
    showSpeechTip(t('chatInput.voice.converted'));

    nextTick(() => {
      autoResize();
      textareaRef.value?.focus();
      handleSend();
    });
  } catch (error) {
    console.error('speech-to-text failed:', error);
    showSpeechTip(t('chatInput.voice.convertFailed'));
  } finally {
    isTranscribing.value = false;
  }
}

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

  return new Blob([view], { type: 'audio/wav' });
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
  if (originalSampleRate === targetSampleRate) return buffer;

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

function normalizeSpeechText(data: any) {
  if (typeof data === 'string') return data.trim();

  if (data?.text) return String(data.text).trim();
  if (data?.result) return String(data.result).trim();
  if (data?.content) return String(data.content).trim();
  if (data?.data) return String(data.data).trim();

  return '';
}

function mergeVoiceText(baseText: string, voiceText: string) {
  const text = voiceText.trim();

  if (!text) return baseText;

  const trimmedBase = baseText.trimEnd();

  if (!trimmedBase) return text;

  return `${trimmedBase}${/[\s，。！？,.!?]$/.test(trimmedBase) ? '' : ' '}${text}`;
}

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

async function handlePaste(event: ClipboardEvent) {
  if (!isDocumentAnalysis.value || props.disabled) return;

  const clipboardData = event.clipboardData;
  if (!clipboardData) return;

  const files = getPastedFiles(clipboardData);
  if (!files.length) return;

  event.preventDefault();

  const tasks: Promise<void>[] = [];

  files.forEach((file) => {
    const type = getAttachmentType(file);
    const normalizedFile = normalizePastedFile(file, type);

    if (!isSupportedByType(normalizedFile, type)) {
      showUnsupportedFileTip(normalizedFile, type);
      return;
    }

    tasks.push(addFileAsAttachment(normalizedFile, type));
  });

  await Promise.all(tasks);

  nextTick(() => {
    textareaRef.value?.focus();
  });
}

function getPastedFiles(clipboardData: DataTransfer) {
  const files: File[] = [];
  const fileKeys = new Set<string>();

  const addFile = (file: File | null) => {
    if (!file) return;

    const key = `${file.name}_${file.size}_${file.type}_${file.lastModified}`;
    if (fileKeys.has(key)) return;

    fileKeys.add(key);
    files.push(file);
  };

  Array.from(clipboardData.files || []).forEach(addFile);

  Array.from(clipboardData.items || []).forEach((item) => {
    if (item.kind !== 'file') return;
    addFile(item.getAsFile());
  });

  return files;
}

function getAttachmentType(file: File): 'image' | 'file' {
  return isImageFile(file) ? 'image' : 'file';
}

function normalizePastedFile(file: File, type: 'image' | 'file') {
  if (file.name) return file;

  const ext = type === 'image' ? getImageExt(file.type) : 'file';

  return new File([file], `paste_${Date.now()}.${ext}`, {
    type: file.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
}

function getImageExt(mimeType: string) {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
  };

  return map[mimeType] || 'png';
}

function triggerFileInput() {
  if (!isDocumentAnalysis.value) return;
  fileInputRef.value?.click();
}

function triggerImageInput() {
  if (!isDocumentAnalysis.value) return;
  imageInputRef.value?.click();
}

async function handleFileSelect(event: Event) {
  if (!isDocumentAnalysis.value) return;

  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);

  const tasks = files.reduce<Promise<void>[]>((list, file) => {
    if (!isSupportedByType(file, 'file')) {
      showUnsupportedFileTip(file, 'file');
      return list;
    }

    list.push(addFileAsAttachment(file, 'file'));
    return list;
  }, []);

  await Promise.all(tasks);
  input.value = '';
}

async function handleImageSelect(event: Event) {
  if (!isDocumentAnalysis.value) return;

  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);

  const tasks = files.reduce<Promise<void>[]>((list, file) => {
    if (!isSupportedByType(file, 'image')) {
      showUnsupportedFileTip(file, 'image');
      return list;
    }

    list.push(addFileAsAttachment(file, 'image'));
    return list;
  }, []);

  await Promise.all(tasks);
  input.value = '';
}

async function addFileAsAttachment(file: File, type: 'image' | 'file' | 'video') {
  if (!isDocumentAnalysis.value) return;

  const attachmentType = type === 'image' ? 'image' : 'file';

  if (!isSupportedByType(file, attachmentType)) {
    showUnsupportedFileTip(file, attachmentType);
    return;
  }

  const id = generateId();
  const docSessionId = currentConversation.value.docSessionId || id;
  const previewUrl = URL.createObjectURL(file);

  const attachment: AttachmentWithProgress = {
    id,
    docSessionId,
    name: file.name,
    fileName: '',
    type: attachmentType,
    url: previewUrl,
    size: file.size,
    mimeType: file.type,
    uploading: true,
    progress: 32,
    uploadError: false,
  };

  attachments.value.push(attachment);

  try {
    const { data } = await api.base.getoDssUpload('temp', file);

    if (!patchAttachment(id, { progress: 68 })) return;
    console.log(data, 55);
    const res = await api.knowledgeQa.upload({
      docSessionId,
      fileUrl: data.filePolicyUrl,
      originalName: data.fileOriginalName,
      fileSize: data.fileSize,
      fileName: data.fileName,
      fileSuffix: data.fileSuffix,
      fileType: data.fileType,
    });

    const currentAttachment = patchAttachment(id, { progress: 92 });
    if (!currentAttachment) return;

    const fileSuffix = normalizeFormat(data.fileSuffix || getFileExt(file));
    const fileInfo = {
      id,
      fileName: data.fileName,
      filetype: fileSuffix,
      size: data.fileSize || file.size,
      url: data.filePolicyUrl,
      originalName: data.fileOriginalName || file.name,
      savedFileName: data.fileName,
    };

    if (isImageFormat(fileSuffix)) {
      chatStore.updateImgList(fileInfo);
    } else {
      chatStore.updateFileNameList(fileInfo);
    }

    const uploadedData = res?.data?.data;

    currentDocSessionId.value = docSessionId;
    console.log(currentDocSessionId.value, 888);
    patchAttachment(id, {
      fileName: data.fileName,
      uploading: false,
      progress: 100,
      uploadError: false,
      uploadedData,
      url:
        uploadedData?.url ||
        uploadedData?.fileUrl ||
        uploadedData?.path ||
        uploadedData?.ossUrl ||
        currentAttachment.url,
    });
    chatStore.onChangeRefreshStatus();
  } catch (error) {
    console.error('upload attachment failed:', error);

    patchAttachment(id, {
      uploading: false,
      progress: 0,
      uploadError: true,
    });

    ElMessage.error(`上传失败：${file.name}`);
  }
}

function removeLocalAttachment(row: AttachmentWithProgress) {
  const index = attachments.value.findIndex((attachment) => attachment.id === row.id);

  if (index === -1) return;

  URL.revokeObjectURL(attachments.value[index].url);
  attachments.value.splice(index, 1);
  chatStore.removeFile(row.id);
}

function removeAttachment(row: AttachmentWithProgress) {
  if (row.uploading || !row.fileName) {
    removeLocalAttachment(row);
    return;
  }

  api.knowledgeQa
    .deleteFile(row.docSessionId, row.fileName)
    .then(() => {
      removeLocalAttachment(row);
      chatStore.onChangeRefreshStatus();
    })
    .catch((error: any) => {
      console.error('delete attachment failed:', error);
      ElMessage.error('删除附件失败');
    });
}

function clearAttachments() {
  attachments.value.forEach((attachment) => {
    URL.revokeObjectURL(attachment.url);
  });

  attachments.value = [];
  chatStore.clearFileNameList();
  chatStore.clearImgList();

  if (!currentConversation.value?.docSessionId) {
    currentDocSessionId.value = '';
  }

  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }

  if (imageInputRef.value) {
    imageInputRef.value.value = '';
  }
}

function focus() {
  textareaRef.value?.focus();
}

function clear() {
  if (isRecording.value) {
    stopVoiceInput();
  }

  inputText.value = '';
  clearAttachments();
  speechTip.value = '';

  nextTick(autoResize);
}

defineExpose({
  focus,
  clear,
});

watch(inputText, () => {
  nextTick(autoResize);
});

watch(selectedTool, (newTool) => {
  if (newTool !== 'DOCUMENT_ANALYSIS') {
    clearAttachments();
  }
});

watch(
  () => props.isStreaming,
  (newVal) => {
    if (props.currentChatId) {
      streamingState.value[props.currentChatId] = newVal;
    }
  },
);

watch(
  () => props.currentChatId,
  (newId) => {
    if (newId && streamingState.value[newId] === undefined) {
      streamingState.value[newId] = false;
    }
  },
);

function handleFocusShortcut(event: KeyboardEvent) {
  if (props.disabled) return;

  const isCtrlSlash = event.ctrlKey && event.code === 'Slash';

  if (!isCtrlSlash) return;

  event.preventDefault();

  nextTick(() => {
    textareaRef.value?.focus();
  });
}

onMounted(() => {
  autoResize();

  window.addEventListener('keydown', handleFocusShortcut);

  api.base.getKnowledgeSupportedFormats().then((res) => {
    setSupportedFormats(res?.data?.formats || []);
  });

  if (!isDocumentAnalysis.value) {
    clearAttachments();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleFocusShortcut);

  if (isRecording.value) {
    stopVoiceInput();
  }

  cleanupAudioRecorder();

  if (speechTipTimer) {
    window.clearTimeout(speechTipTimer);
  }

  clearAttachments();
});
</script>
<style lang="scss" scoped>
.chat-input-container {
  display: flex;
  flex-direction: column;
  max-height: min(70vh, 420px);
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 12px 34px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;

  .dark & {
    background: #251d18;
    border-color: #49382e;
    box-shadow: none;
  }

  &.is-focused,
  &.is-recording {
    border-color: #ffad61;
    box-shadow:
      0 0 0 4px rgb(255 138 38 / 10%),
      0 14px 38px rgb(126 72 24 / 10%);
  }

  &.is-uploading-file {
    border-color: #e7b889;
    box-shadow:
      0 0 0 3px rgb(255 138 38 / 6%),
      0 12px 34px rgb(126 72 24 / 7%);
  }

  &.is-expanded {
    .textarea-wrapper textarea {
      min-height: 200px;
      max-height: 360px !important;
    }
  }
}

/* 附件预览 */
.attachment-preview {
  display: flex;
  gap: 8px;
  padding: 12px 14px 2px;
  overflow: auto hidden;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  .dark & {
    scrollbar-color: #76513a transparent;

    &::-webkit-scrollbar-thumb {
      background: #76513a;

      &:hover {
        background: #956344;
      }
    }
  }
}

.attachment-card {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
  width: 230px;
  min-width: 0;
  padding: 10px 34px 10px 10px;
  color: #4a382c;
  background: #fff;
  border: 1px solid #f0ddcb;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgb(126 72 24 / 6%);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  .dark & {
    color: #f4e9e0;
    background: #30251f;
    border-color: #4a382e;
    box-shadow: none;
  }

  &.is-uploading {
    color: #aa9585;
    background: #fff8f1;
    border-color: #f0dfcf;
    box-shadow: none;

    .dark & {
      color: #8f7969;
      background: #2a211c;
      border-color: #44342b;
    }

    .attachment-thumb,
    .attachment-main {
      opacity: 0.72;
      filter: grayscale(0.55);
    }
  }

  &.is-error {
    background: #fff7f7;
    border-color: rgb(239 68 68 / 35%);

    .dark & {
      background: rgb(239 68 68 / 8%);
      border-color: rgb(239 68 68 / 35%);
    }
  }

  &.is-done:hover {
    background: #fffaf5;
    border-color: #ffc58f;
    box-shadow: 0 8px 22px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }
}

.attachment-thumb {
  display: flex;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  color: #e86f0b;
  background: #fff0e2;
  border: 1px solid #ffd8b5;
  border-radius: 12px;

  .dark & {
    color: #ffb36b;
    background: rgb(249 115 22 / 14%);
    border-color: rgb(255 138 38 / 18%);
  }

  &.image {
    background: #fff5eb;
    border-color: #f0dfcf;

    .dark & {
      background: #3a2d25;
      border-color: #4a382e;
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.attachment-main {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.attachment-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 5px;
  font-size: 12px;
  color: #9f8877;

  .dark & {
    color: #9a8475;
  }
}

.upload-status {
  position: relative;
  padding-left: 8px;

  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 4px;
    height: 4px;
    content: '';
    background: currentcolor;
    border-radius: 50%;
    transform: translateY(-50%);
  }

  &.uploading {
    color: #e8893c;
  }

  &.done {
    color: #16a34a;
  }

  &.error {
    color: #ef4444;
  }
}

.attachment-progress {
  height: 3px;
  margin-top: 8px;
  overflow: hidden;
  background: #f3e4d6;
  border-radius: 999px;

  .dark & {
    background: #49382e;
  }

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #ffd0a4, #ff8a26, #ffd0a4);
    background-size: 160% 100%;
    border-radius: inherit;
    transition: width 0.25s ease;
    animation: upload-progress 1.1s linear infinite;
  }
}

.attachment-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  color: #b29b89;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 50%;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #e86f0b;
    background: #ffead7;
    transform: rotate(90deg);

    .dark & {
      color: #ffb36b;
      background: rgb(249 115 22 / 14%);
    }
  }
}

/* 语音区域 */
.voice-panel {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 9px 14px;
  background: linear-gradient(135deg, rgb(255 154 61 / 12%) 0%, rgb(249 115 22 / 10%) 100%);
  border-bottom: 1px solid rgb(255 138 38 / 18%);

  .dark & {
    background: linear-gradient(135deg, rgb(255 138 38 / 16%) 0%, rgb(249 115 22 / 12%) 100%);
    border-bottom-color: rgb(255 138 38 / 20%);
  }
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
  box-shadow: 0 0 0 3px rgb(255 138 38 / 12%);
  animation: voice-dot-pulse 1.4s infinite;
}

.voice-text {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #e86f0b;
  white-space: nowrap;

  .dark & {
    color: #ffb36b;
  }
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
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #e86f0b;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgb(255 138 38 / 28%);
  border-radius: 999px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;
    box-shadow: 0 5px 14px rgb(249 115 22 / 18%);
    transform: translateY(-1px);
  }

  &:active {
    box-shadow: none;
    transform: translateY(0);
  }

  .dark & {
    color: #ffbd7c;
    background: #382b24;
    border-color: rgb(255 138 38 / 30%);

    &:hover {
      color: #fff;
      background: #f97316;
      border-color: #f97316;
    }
  }
}

/* 输入区域 */
.input-area {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: flex-end;
  padding: 12px 14px 10px;
}

.input-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  padding-bottom: 3px;

  &.left,
  &.right {
    flex-shrink: 0;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  color: #8d7868;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 12px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease,
    opacity 0.18s ease;

  &:hover:not(:disabled) {
    color: #f97316;
    background: #fff0e2;
    box-shadow: 0 4px 12px rgb(249 115 22 / 8%);
    transform: translateY(-1px);

    .dark & {
      color: #ffb36b;
      background: rgb(249 115 22 / 12%);
      box-shadow: none;
    }
  }

  &:active:not(:disabled) {
    box-shadow: none;
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  &.mic,
  &.send {
    color: #a58e7d;
    background: #fff5eb;
    border: 1px solid #f4dfcc;

    .dark & {
      color: #9b8475;
      background: #382b24;
      border-color: #49382e;
    }
  }

  &.mic:hover:not(:disabled) {
    color: #f97316;
    background: #fff0e2;
    border-color: #ffc58f;
  }

  &.mic.active {
    position: relative;
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    border-color: #ff8a26;
    box-shadow: 0 4px 12px rgb(249 115 22 / 38%);
    animation: mic-breath 1.6s ease-in-out infinite;

    &::after {
      position: absolute;
      inset: -5px;
      content: '';
      border: 1px solid rgb(255 138 38 / 45%);
      border-radius: 16px;
      animation: mic-ring 1.6s ease-out infinite;
    }
  }

  &.send.active {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    border-color: #ff8a26;
    box-shadow: 0 6px 16px rgb(249 115 22 / 22%);

    .dark & {
      color: #fff;
      background: linear-gradient(135deg, #ff8a26 0%, #e86408 100%);
      border-color: #ff8a26;
    }

    &:hover {
      background: linear-gradient(135deg, #ff8a26 0%, #ea6b0b 100%);
      border-color: #f97316;
      box-shadow: 0 8px 20px rgb(249 115 22 / 28%);
      transform: translateY(-1px);
    }
  }

  &.stop {
    color: #fff;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    box-shadow: 0 5px 14px rgb(239 68 68 / 20%);
    animation: pulse 2s infinite;

    &:hover {
      color: #fff;
      background: linear-gradient(135deg, #f05252 0%, #dc2626 100%);
      transform: scale(1.04);
    }
  }
}

.textarea-wrapper {
  display: flex;
  flex: 1;
  align-items: flex-end;
  min-width: 0;
  overflow: hidden;

  textarea {
    width: 100%;
    height: 80px;
    padding: 8px 2px;
    overflow-y: auto;
    font-family: inherit;
    font-size: 15px;
    line-height: 1.6;
    color: #4a382c;
    resize: none;
    outline: none;
    scrollbar-color: #e7b889 transparent;
    scrollbar-width: thin;
    background: transparent;
    border: none;

    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-thumb {
      background: #e7b889;
      border-radius: 999px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    .dark & {
      color: #f4e9e0;
      scrollbar-color: #76513a transparent;

      &::-webkit-scrollbar-thumb {
        background: #76513a;
      }
    }

    &::placeholder {
      color: #b09b8c;
    }

    .dark &::placeholder {
      color: #806d61;
    }
  }
}

/* 底部工具栏 */
.input-toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 8px 14px 12px;
  background: #fffaf5;
  border-top: 1px solid #f3e3d5;

  .dark & {
    background: #251d18;
    border-top-color: #49382e;
  }
}

.toolbar-left {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.toolbar-btn {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  font-size: 13px;
  color: #8a7462;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &:hover {
    color: #e86f0b;
    background: #fff0e2;
    border-color: #ffe0c2;
    transform: translateY(-1px);

    .dark & {
      color: #ffb36b;
      background: rgb(249 115 22 / 10%);
      border-color: rgb(255 138 38 / 14%);
    }
  }

  &.active {
    font-weight: 600;
    color: #e86f0b;
    background: #fff0e2;
    border-color: #ffc995;
    box-shadow: 0 4px 12px rgb(249 115 22 / 9%);

    .dark & {
      color: #ffbd7c;
      background: rgb(249 115 22 / 14%);
      border-color: rgb(255 138 38 / 28%);
      box-shadow: none;
    }
  }
}

.mode-icon {
  font-size: 14px;
  line-height: 1;
}

.toolbar-right {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
}

.char-count,
.send-hint {
  font-size: 12px;
  color: #ad9888;
  white-space: nowrap;

  .dark & {
    color: #816f63;
  }
}

.char-count.warning {
  font-weight: 600;
  color: #f59e0b;
}

/* 移动端 */
@media (width <= 640px) {
  .chat-input-container {
    border-radius: 18px;
  }

  .attachment-card {
    width: 200px;
  }

  .input-area {
    gap: 6px;
    padding: 10px 10px 8px;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .input-toolbar {
    padding: 8px 10px 10px;
  }

  .send-hint {
    display: none;
  }

  .toolbar-btn {
    padding: 6px 9px;

    span:last-child {
      display: none;
    }
  }
}

/* 上传进度动画 */
@keyframes upload-progress {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -60% 0;
  }
}

/* 停止按钮动画 */
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(239 68 68 / 40%);
  }

  50% {
    box-shadow: 0 0 0 8px rgb(239 68 68 / 0%);
  }
}

/* 麦克风呼吸动画 */
@keyframes mic-breath {
  0%,
  100% {
    box-shadow: 0 4px 12px rgb(249 115 22 / 36%);
  }

  50% {
    box-shadow: 0 6px 20px rgb(249 115 22 / 52%);
  }
}

@keyframes mic-ring {
  0% {
    opacity: 0.75;
    transform: scale(0.92);
  }

  100% {
    opacity: 0;
    transform: scale(1.24);
  }
}

/* 语音波形 */
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
    box-shadow: 0 0 0 3px rgb(255 138 38 / 10%);
    opacity: 0.45;
    transform: scale(0.9);
  }

  50% {
    box-shadow: 0 0 0 6px rgb(255 138 38 / 5%);
    opacity: 1;
    transform: scale(1.2);
  }
}
</style>
