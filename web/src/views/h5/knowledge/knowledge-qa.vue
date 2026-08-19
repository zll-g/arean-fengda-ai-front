<template>
  <div class="data-query-page">
    <van-sticky>
      <van-nav-bar title="知识库问答" left-text="返回" left-arrow @click-left="onClickLeft" />
    </van-sticky>

    <div class="knowledge-selector-wrap">
      <div class="knowledge-selector" @click="openKnowledgePicker">
        <div class="selector-label">知识库</div>

        <div class="selector-content">
          <template v-if="selectedKnowledgeList.length">
            <div class="selected-tags">
              <div
                v-for="item in visibleSelectedKnowledgeList"
                :key="item.id"
                class="knowledge-tag"
                @click.stop
              >
                <span class="tag-text">{{ item.name }}</span>
                <van-icon name="cross" size="12" @click.stop="removeKnowledge(item.id)" />
              </div>

              <div v-if="hiddenSelectedCount" class="knowledge-tag more-tag">
                +{{ hiddenSelectedCount }}
              </div>
            </div>
          </template>

          <span v-else class="selector-placeholder">请选择知识库</span>
        </div>

        <van-icon name="arrow-down" class="selector-arrow" />
      </div>
    </div>

    <div ref="chatContainer" class="chat-container">
      <div
        v-for="(message, index) in messages"
        :key="message.id || index"
        :class="['message-row', message.role !== 'ASSISTANT' ? 'user-row' : 'ai-row']"
      >
        <div v-if="message.role !== 'ASSISTANT'" class="user-message">
          <div v-if="message.content" class="user-bubble">{{ message.content }}</div>

          <div
            v-if="message.imageList?.length || message.fileList?.length"
            class="message-assets user-assets"
          >
            <div
              v-if="message.imageList?.length"
              :class="['images-grid', { single: message.imageList.length === 1 }]"
            >
              <button
                v-for="(image, imageIndex) in message.imageList"
                :key="image.id || getImageUrl(image) || imageIndex"
                type="button"
                class="image-item"
                @click="openImagePreview(message.imageList, Number(imageIndex))"
              >
                <img :src="getImageUrl(image)" :alt="image.originalName || '图片'" loading="lazy" />

                <span class="image-overlay">
                  <Maximize2 :size="16" />
                </span>
              </button>
            </div>

            <div v-if="message.fileList?.length" class="files-list">
              <div
                v-for="file in message.fileList"
                :key="file.id || getFileSavedName(file) || file.originalName"
                class="file-item"
              >
                <div class="file-icon">
                  {{ getFileEmoji(getFileMimeType(file)) }}
                </div>

                <div class="file-info">
                  <span class="file-name">{{ getFileName(file) }}</span>
                  <span class="file-size">{{ formatSize(file.size) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="message-time">{{ formatTime(message.createdAt) }}</div>
        </div>

        <div v-else class="ai-message">
          <div class="ai-card">
            <div class="ai-header">
              <div class="ai-avatar">🤖</div>
              <span class="ai-title">电厂智能数据助手</span>
              <div class="message-time">{{ formatTime(message.createdAt) }}</div>
            </div>

            <div class="ai-content">
              <div v-if="message.content" class="text-content markstream-vue">
                <MarkdownRender
                  v-if="message.role !== 'USER'"
                  :content="message.content"
                  :custom-html-tags="['think']"
                  custom-id="playground-demo"
                  :escape-html-tags="['question', 'answer']"
                  @copy="textCopy"
                />
                <div v-else style="white-space: pre-wrap">{{ message.content }}</div>
              </div>

              <template
                v-for="suggestionList in [getSuggestionList(message.suggestions)]"
                :key="`suggestions-${message.id}-${suggestionList.length}`"
              >
                <div
                  v-if="suggestionList.length && message.id === messages[messages.length - 1]?.id"
                  class="suggestions"
                >
                  <button
                    v-for="(suggestion, suggestionIndex) in suggestionList"
                    :key="`${message.id}-${suggestionIndex}-${suggestion}`"
                    type="button"
                    class="suggestion-btn"
                    @click.stop="handleSend(suggestion)"
                  >
                    <span class="suggestion-text">{{ suggestion }}</span>
                  </button>
                </div>
              </template>

              <template
                v-for="referenceList in [getReferenceList(message.reference)]"
                :key="`${message.id}-${referenceList.length}`"
              >
                <div v-if="referenceList.length" class="suggestions">
                  <button
                    v-for="suggestion in referenceList"
                    :key="suggestion.id || suggestion.documentName"
                    type="button"
                    class="suggestion-btn plain"
                  >
                    <span class="suggestion-text">{{ suggestion.documentName }}</span>
                  </button>
                </div>
              </template>

              <div
                v-if="message.imageList?.length || message.fileList?.length"
                class="message-assets ai-assets"
              >
                <div
                  v-if="message.imageList?.length"
                  :class="['images-grid', { single: message.imageList.length === 1 }]"
                >
                  <button
                    v-for="(image, imageIndex) in message.imageList"
                    :key="image.id || getImageUrl(image) || imageIndex"
                    type="button"
                    class="image-item"
                    @click="openImagePreview(message.imageList, Number(imageIndex))"
                  >
                    <img
                      :src="getImageUrl(image)"
                      :alt="image.originalName || '图片'"
                      loading="lazy"
                    />

                    <span class="image-overlay">
                      <Maximize2 :size="16" />
                    </span>
                  </button>
                </div>

                <div v-if="message.fileList?.length" class="files-list">
                  <div
                    v-for="file in message.fileList"
                    :key="file.id || getFileSavedName(file) || file.originalName"
                    class="file-item"
                  >
                    <div class="file-icon">
                      {{ getFileEmoji(getFileMimeType(file)) }}
                    </div>

                    <div class="file-info">
                      <span class="file-name">{{ getFileName(file) }}</span>
                      <span class="file-size">{{ formatSize(file.size) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="input-section">
      <div class="input-wrapper">
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

        <div v-if="supportsAttachments && attachments.length" class="attachment-preview">
          <div
            v-for="attachment in attachments"
            :key="attachment.id"
            :class="['attachment-item', { error: attachment.uploadError }]"
          >
            <div class="attachment-thumb">
              <img
                v-if="attachment.type === 'image'"
                :src="attachment.url"
                :alt="attachment.name"
              />
              <van-icon v-else name="description-o" size="18" />
            </div>

            <div class="attachment-info">
              <div class="attachment-name">{{ attachment.name }}</div>
              <div class="attachment-meta">
                <span v-if="attachment.uploading">上传中...</span>
                <span v-else-if="attachment.uploadError">上传失败</span>
                <span v-else>已上传</span>
                <span> · {{ formatSize(attachment.size) }}</span>
              </div>
            </div>

            <van-loading v-if="attachment.uploading" size="16" color="#2563eb" />
            <van-icon
              v-else
              name="cross"
              size="14"
              class="attachment-remove"
              @click="removeAttachment(attachment)"
            />
          </div>
        </div>

        <div class="input-box">
          <div v-if="supportsAttachments" class="upload-actions-left">
            <button
              type="button"
              class="upload-action-btn"
              :disabled="isBusy"
              title="上传文件"
              @click="triggerFileInput"
            >
              <van-icon name="description-o" size="20" />
            </button>

            <button
              type="button"
              class="upload-action-btn"
              :disabled="isBusy"
              title="上传图片"
              @click="triggerImageInput"
            >
              <van-icon name="photo-o" size="20" />
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

          <van-field
            v-model="userInput"
            type="textarea"
            :autosize="{ minHeight: 44, maxHeight: 100 }"
            :placeholder="inputPlaceholder"
            :border="false"
            :disabled="isStreaming || isTranscribing"
            class="input-field"
            @keyup.enter.exact.prevent="handleSend(userInput.trim())"
            @paste="handlePaste"
          />

          <div class="input-actions">
            <van-button
              v-if="!isStreaming"
              round
              :disabled="!selectedKnowledgeIds.length || isTranscribing"
              :class="['voice-btn', { active: isRecording || isTranscribing }]"
              @click="toggleVoiceInput"
            >
              <van-icon name="volume-o" size="19" />
            </van-button>

            <van-button
              v-if="isStreaming"
              round
              type="primary"
              class="stop-btn"
              @click="handleStop"
            >
              <template #icon>
                <StopCircle style="margin-top: 4px" :size="20" />
              </template>
            </van-button>

            <van-button
              v-else
              icon="send"
              type="primary"
              color="#2563eb"
              round
              :disabled="!canSendMessage || isStreaming || isRecording || isTranscribing"
              class="send-btn"
              @click="handleSend(userInput.trim())"
            >
              <template #icon>
                <Send style="margin-top: 4px" :size="20" />
              </template>
            </van-button>
          </div>
        </div>
      </div>

      <div class="tool-list" role="tablist" aria-label="问答模式选择">
        <button
          v-for="item in toolList"
          :key="item.value"
          type="button"
          :class="['tool-item', { active: selectedTool === item.value }]"
          :title="t(item.labelKey)"
          :aria-pressed="selectedTool === item.value"
          @click="selectTool(item.value)"
        >
          <span class="tool-icon">{{ item.icon }}</span>
          <span class="tool-label">{{ t(item.labelKey) }}</span>
          <span class="tool-check">
            <van-icon name="success" size="11" />
          </span>
        </button>
      </div>
    </div>

    <van-popup
      v-model:show="state.showKnowledgePicker"
      position="bottom"
      round
      :style="{ height: '68%' }"
      teleport="body"
    >
      <div class="knowledge-popup">
        <div class="popup-header">
          <div>
            <div class="popup-title">选择知识库</div>
            <div class="popup-subtitle">已选择 {{ selectedKnowledgeList.length }} 个知识库</div>
          </div>
          <van-icon name="cross" size="20" @click="state.showKnowledgePicker = false" />
        </div>

        <div class="popup-search">
          <van-search
            v-model="state.keyword"
            shape="round"
            placeholder="搜索知识库名称"
            background="transparent"
          />
        </div>

        <div class="popup-body">
          <div
            v-for="item in filteredKnowledgeList"
            :key="item.id"
            :class="['knowledge-option', { active: item.checked }]"
            @click="toggleKnowledge(item)"
          >
            <div class="option-main">
              <div class="option-icon">
                <van-icon name="description-o" size="18" />
              </div>
              <div class="option-info">
                <div class="option-name">{{ item.name }}</div>
                <div class="option-desc">
                  {{ item.description || '用于限定当前问答的检索范围' }}
                </div>
              </div>
            </div>

            <div class="option-check">
              <van-checkbox
                v-model="item.checked"
                icon-size="18px"
                checked-color="#2563eb"
                @click.stop
              />
            </div>
          </div>

          <van-empty
            v-if="!filteredKnowledgeList.length"
            description="暂无匹配的知识库"
            image-size="88"
          />
        </div>

        <div class="popup-footer">
          <van-button round block class="clear-btn" @click="clearKnowledge">清空</van-button>
          <van-button round block type="primary" color="#2563eb" @click="handleApply">
            确定选择
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import api from '@/api';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { fetchEventSource as FetchEventSource } from '@microsoft/fetch-event-source';
import { MarkdownRender } from 'markstream-vue';
import { ElMessage } from 'element-plus';
import { showImagePreview, showToast } from 'vant';
import { API_ENDPOINTS, type ChatRequest, chatApi } from '@/api/modules/chat';
import { Maximize2, Send, StopCircle } from '@/components/icons';
import { useChatStore } from '@/store/modules/knowledge-chat';
import { MessageRole } from '@/types/chat';
import { getToken, getUserInfo } from '@/utils/device';
import { generateId, getFileIcon } from '@/utils/helpers';
import { useI18n } from 'vue-i18n';

type ToolType =
  | 'KNOWLEDGE_QA'
  | 'DEEP_SEARCH'
  | 'DEEP_RESEARCH'
  | 'DOCUMENT_ANALYSIS'
  | 'WEB_SEARCH'
  | '';
type AttachmentType = 'image' | 'file';

interface KnowledgeItem {
  id: string | number;
  name: string;
  description?: string;
  checked?: boolean;
}

interface AttachmentWithProgress {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  size: number;
  mimeType: string;
  uploading?: boolean;
  progress?: number;
  fileName?: string;
  docSessionId?: string;
  uploadError?: boolean;
  uploadedData?: any;
}

interface ReferenceItem {
  id?: string | number;
  documentName?: string;
}

const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif'];
const SUPPORTED_FORMATS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const SELECTED_TOOL_KEY = 'H5_SELECTED_TOOL';
const RECORD_MIN_DURATION = 500;
const WAV_TARGET_SAMPLE_RATE = 16000;

const router = useRouter();
const chatStore = useChatStore();
const { copy } = useClipboard({ legacy: true });
const { t } = useI18n();

const { currentConversation, isStreaming, knowledgeBaseId, fileNameList, imgList } =
  storeToRefs(chatStore);

const state = reactive({
  currentStreamingMessageId: null as string | null,
  abortController: null as AbortController | null,
  showKnowledgePicker: false,
  keyword: '',
  categories: [] as KnowledgeItem[],
});

const chatContainer = ref<HTMLElement>();
const userInput = ref('');
const attachments = ref<AttachmentWithProgress[]>([]);
const currentDocSessionId = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);

const isRecording = ref(false);
const isTranscribing = ref(false);
const speechTip = ref('');
const mediaStream = ref<MediaStream | null>(null);
const audioContext = ref<AudioContext | null>(null);
const audioSource = ref<MediaStreamAudioSourceNode | null>(null);
const scriptProcessor = ref<ScriptProcessorNode | null>(null);
const audioBuffers = ref<Float32Array[]>([]);
const recordingStartTime = ref(0);
const wavSampleRate = ref(WAV_TARGET_SAMPLE_RATE);
let speechTipTimer: number | null = null;

const supportedFormats = ref<string[]>(SUPPORTED_FORMATS);
const selectedTool = ref<ToolType>(
  (localStorage.getItem(SELECTED_TOOL_KEY) as ToolType) || 'KNOWLEDGE_QA',
);

const messages = computed(() => currentConversation.value?.messages || []);
const conversationId = computed(() => currentConversation.value?.id);
const selectedKnowledgeList = computed(() => state.categories.filter((item) => item.checked));
const visibleSelectedKnowledgeList = computed(() => selectedKnowledgeList.value.slice(0, 2));
const hiddenSelectedCount = computed(() =>
  Math.max(selectedKnowledgeList.value.length - visibleSelectedKnowledgeList.value.length, 0),
);
const selectedKnowledgeIds = computed(() => selectedKnowledgeList.value.map((item) => item.id));
const isDocumentAnalysis = computed(() => selectedTool.value === 'DOCUMENT_ANALYSIS');
/** 支持附件/图片上传的问答模式（与 web 端 ChatInput 保持一致） */
const ATTACHMENT_SUPPORTED_TOOLS = ['KNOWLEDGE_QA', 'DEEP_SEARCH', 'DOCUMENT_ANALYSIS'];
const supportsAttachments = computed(() =>
  ATTACHMENT_SUPPORTED_TOOLS.includes(selectedTool.value || ''),
);
const imageFormats = computed(() => IMAGE_FORMATS);
const fileFormats = computed(() =>
  supportedFormats.value.map(normalizeFormat).filter((item) => !IMAGE_FORMATS.includes(item)),
);
const fileAccept = computed(() => fileFormats.value.map((item) => `.${item}`).join(','));
const imageAccept = computed(() =>
  ['image/*', ...imageFormats.value.map((item) => `.${item}`)].join(','),
);
const hasUploadingAttachment = computed(() => attachments.value.some((item) => item.uploading));
const hasUploadErrorAttachment = computed(() => attachments.value.some((item) => item.uploadError));
const isBusy = computed(() => isStreaming.value || isTranscribing.value);

const filteredKnowledgeList = computed(() => {
  const keyword = state.keyword.trim().toLowerCase();
  return keyword
    ? state.categories.filter((item) =>
        String(item.name || '')
          .toLowerCase()
          .includes(keyword),
      )
    : state.categories;
});

const canSendMessage = computed(() => {
  if (
    isStreaming.value ||
    isRecording.value ||
    isTranscribing.value ||
    hasUploadingAttachment.value
  ) {
    return false;
  }

  return Boolean(userInput.value.trim() || (supportsAttachments.value && attachments.value.length));
});

const inputPlaceholder = computed(() => {
  if (isRecording.value) return '正在聆听，请说出您的问题...';
  if (isTranscribing.value) return '正在识别语音内容...';

  return selectedKnowledgeIds.value.length ? '请输入您的问题' : '请先选择知识库后再提问';
});

const voiceStatusText = computed(() => {
  if (isRecording.value) return '正在录音，请说出您的问题';
  if (isTranscribing.value) return '正在转换语音内容';
  return speechTip.value;
});

const toolList = [
  { labelKey: 'chatInput.tools.knowledgeQa', value: 'KNOWLEDGE_QA', icon: '📚' },
  { labelKey: 'chatInput.tools.deepSearch', value: 'DEEP_SEARCH', icon: '🔍' },
  { labelKey: 'chatInput.tools.documentAnalysis', value: 'DOCUMENT_ANALYSIS', icon: '📄' },
] as const;

function safeJsonParse<T = any>(data: any, fallback: T): T {
  try {
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function getReferenceList(reference: any) {
  if (Array.isArray(reference)) return reference;

  const list = safeJsonParse<ReferenceItem[]>(reference, []);
  return Array.isArray(list) ? list : [];
}

function getSuggestionList(suggestions: any): string[] {
  const data = Array.isArray(suggestions) ? suggestions : safeJsonParse<any>(suggestions, []);
  const list = Array.isArray(data) ? data : data?.suggestions;

  return Array.isArray(list)
    ? list.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function getImageUrl(image: any) {
  return image?.url || image?.fileUrl || image?.filePolicyUrl || image?.path || '';
}

function openImagePreview(imageList: any[] = [], index = 0) {
  const images = imageList.map(getImageUrl).filter(Boolean);

  if (!images.length) return;

  showImagePreview({
    images,
    startPosition: index,
    closeable: true,
    teleport: 'body',
  });
}

function getFileName(file: any) {
  return file?.originalName || file?.fileOriginalName || file?.name || file?.fileName || '下载文件';
}

function getFileSavedName(file: any) {
  return file?.savedFileName || file?.fileName || file?.savedName || '';
}

function getFileMimeType(file: any) {
  return file?.mimeType || file?.fileType || file?.type || file?.filetype || '';
}

function normalizeFormat(format: any) {
  return String(format || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();
}

function getFileExt(file: File) {
  return normalizeFormat(file.name.split('.').pop());
}

function getMimeExt(file: File) {
  return normalizeFormat(file.type.split('/')[1]?.replace('svg+xml', 'svg'));
}

function isImageFormat(format: string) {
  return IMAGE_FORMATS.includes(normalizeFormat(format));
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || isImageFormat(getFileExt(file));
}

function isSupportedByType(file: File, type: AttachmentType) {
  const ext = getFileExt(file) || getMimeExt(file);

  if (type === 'image') {
    return isImageFile(file) && imageFormats.value.includes(ext);
  }

  return !isImageFile(file) && fileFormats.value.includes(ext);
}

function showUnsupportedFileTip(file: File, type: AttachmentType) {
  const formats = type === 'image' ? imageFormats.value : fileFormats.value;
  const label = type === 'image' ? '图片' : '文件';

  ElMessage.warning({
    message: `不支持上传 ${file.name}，<br />${label}仅支持：${formats.join('、')}`,
    dangerouslyUseHTMLString: true,
  });
}

function resetFileInput(input?: HTMLInputElement | null) {
  if (input) input.value = '';
}

function setAttachmentStatus(id: string, patch: Partial<AttachmentWithProgress>) {
  const current = attachments.value.find((item) => item.id === id);
  if (current) Object.assign(current, patch);
  return current;
}

function getFileEmoji(mimeType?: string) {
  return getFileIcon(mimeType || '');
}

function revokeAttachmentUrl(url?: string) {
  if (url) URL.revokeObjectURL(url);
}

function buildFileInfo(id: string, data: any, fileSuffix: string) {
  return {
    id,
    fileName: data.fileName,
    filetype: fileSuffix,
    size: data.fileSize,
    url: data.filePolicyUrl,
    originalName: data.fileOriginalName,
  };
}

function openKnowledgePicker() {
  state.showKnowledgePicker = true;
}

function onClickLeft() {
  router.back();
}

function textCopy(data: any) {
  if (typeof data === 'string') copy(data);
}

function selectTool(value: ToolType) {
  selectedTool.value = value;
  localStorage.setItem(SELECTED_TOOL_KEY, value);

  if (!ATTACHMENT_SUPPORTED_TOOLS.includes(value || '')) {
    clearAttachments();
  }
}

async function getKnowledgeList() {
  const res = await api.base.getKnowledgeList({ page: 1, limit: 999 });
  const selectedIds = String(knowledgeBaseId.value || '')
    .split(',')
    .filter(Boolean);
  state.categories = (res.data || []).map((item: KnowledgeItem) => ({
    ...item,
    checked: selectedIds.includes(String(item.id)) || Boolean(item.checked),
  }));
}

function toggleKnowledge(item: KnowledgeItem) {
  item.checked = !item.checked;
}

function removeKnowledge(id: string | number) {
  const target = state.categories.find((item) => item.id === id);

  if (target) {
    target.checked = false;
    handleApply(false);
  }
}

function clearKnowledge() {
  state.categories.forEach((item) => {
    item.checked = false;
  });
  chatStore.updateKnowledgeBaseId('');
}

function handleApply(closePopup = true) {
  chatStore.updateKnowledgeBaseId(selectedKnowledgeIds.value.join(','));

  if (closePopup) {
    state.showKnowledgePicker = false;
  }
}

async function scrollToBottom() {
  await nextTick();

  requestAnimationFrame(() => {
    chatContainer.value?.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth',
    });
  });
}

function formatTime(timestamp: number) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatSize(size: number) {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function handleSend(text: string) {
  if (isRecording.value) {
    await stopVoiceInput();
    return;
  }

  const activeConversationId = conversationId.value || chatStore.createConversation();
  const trimmedText = text.trim();
  const hasAttachments = supportsAttachments.value && attachments.value.length > 0;
  const messageText =
    trimmedText || (isDocumentAnalysis.value && hasAttachments ? '请分析已上传的文件' : '');

  if ((!trimmedText && !hasAttachments) || isStreaming.value || isTranscribing.value) return;

  if (hasUploadingAttachment.value) {
    showToast('文件正在上传，请稍后再发送');
    return;
  }

  if (hasUploadErrorAttachment.value) {
    showToast('存在上传失败的文件，请删除后重试');
    return;
  }

  const currentImages = [...imgList.value];
  const currentFiles = [...fileNameList.value];
  const aiMessage = createStreamingMessages(
    activeConversationId,
    text,
    currentImages,
    currentFiles,
  );
  const abortController = new AbortController();
  const docSessionId =
    currentDocSessionId.value || currentConversation.value?.docSessionId || generateId();

  state.currentStreamingMessageId = aiMessage.id;
  state.abortController = abortController;

  chatStore.startStreaming(activeConversationId, aiMessage.id, abortController);
  chatStore.setConversationTyping(activeConversationId, true);
  chatStore.clearFileNameList();
  chatStore.clearImgList();

  // 发送后立即清空附件预览，不等 AI 回复
  clearAttachments();

  userInput.value = '';
  await scrollToBottom();

  const request = {
    userId: getUserInfo().userId,
    sessionId: activeConversationId,
    message: messageText,
    knowledgeBaseIds: selectedKnowledgeIds.value,
    images: currentImages.map((item: any) => item.fileName),
    files: currentFiles.map((item: any) => item.fileName),
    mode: selectedTool.value,
    enableRerank: true,
    enableHyde: true,
    enableExpansion: false,
    topK: 52,
    minScore: 100,
    docSessionId,
  } as ChatRequest;

  try {
    await streamChats(request, activeConversationId, aiMessage.id, abortController);
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      chatStore.updateMessageInConversation(activeConversationId, aiMessage.id, {
        isStreaming: false,
        isError: true,
        errorMessage: (error as Error).message || '请求失败',
      });
    }
  }
}

function createStreamingMessages(
  conversationId: string,
  text: string,
  currentImages: any[],
  currentFiles: any[],
) {
  chatStore.addMessageToConversation(
    conversationId,
    MessageRole.USER,
    text,
    currentImages,
    currentFiles,
  );

  const aiMessage = chatStore.addMessageToConversation(conversationId, MessageRole.ASSISTANT, '');

  chatStore.updateMessageInConversation(
    conversationId,
    aiMessage.id,
    { isStreaming: true, isEnd: false },
    true,
  );

  return aiMessage;
}

function triggerFileInput() {
  if (!supportsAttachments.value || isBusy.value) return;
  fileInputRef.value?.click();
}

function triggerImageInput() {
  if (!supportsAttachments.value || isBusy.value) return;
  imageInputRef.value?.click();
}

async function handleFileSelect(event: Event) {
  await handleSelectFiles(event, 'file');
}

async function handleImageSelect(event: Event) {
  await handleSelectFiles(event, 'image');
}

async function handleSelectFiles(event: Event, type: AttachmentType) {
  if (!supportsAttachments.value) return;

  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);

  for (const file of files) {
    await addFileAsAttachment(file, type);
  }

  resetFileInput(input);
}

async function handlePaste(event: ClipboardEvent) {
  if (!supportsAttachments.value) return;

  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean) as File[];

  if (!files.length) return;

  event.preventDefault();

  for (const file of files) {
    await addFileAsAttachment(file, 'image');
  }
}

async function addFileAsAttachment(file: File, type: AttachmentType) {
  if (!supportsAttachments.value) return;

  if (!isSupportedByType(file, type)) {
    showUnsupportedFileTip(file, type);
    return;
  }

  const id = generateId();
  const docSessionId = currentConversation.value?.docSessionId || currentDocSessionId.value || id;
  const attachment: AttachmentWithProgress = {
    id,
    docSessionId,
    name: file.name,
    fileName: '',
    type,
    url: URL.createObjectURL(file),
    size: file.size,
    mimeType: file.type,
    uploading: true,
    progress: 0,
    uploadError: false,
  };

  attachments.value.push(attachment);

  try {
    const { data } = await api.base.getoDssUpload('temp', file);
    const res = await api.knowledgeQa.upload({
      docSessionId,
      fileUrl: data.filePolicyUrl,
      originalName: data.fileOriginalName,
      fileSize: data.fileSize,
      fileName: data.fileName,
    });

    const fileSuffix = normalizeFormat(data.fileSuffix || getFileExt(file));
    const fileInfo = buildFileInfo(id, data, fileSuffix);

    if (isImageFormat(fileSuffix)) {
      chatStore.updateImgList(fileInfo);
    } else {
      chatStore.updateFileNameList(fileInfo);
    }

    const uploadedData = res?.data?.data;
    currentDocSessionId.value = docSessionId;

    setAttachmentStatus(id, {
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
        attachment.url,
    });
  } catch (error) {
    console.error('upload attachment failed:', error);
    setAttachmentStatus(id, { uploading: false, progress: 0, uploadError: true });
  }
}

async function removeAttachment(row: AttachmentWithProgress) {
  try {
    if (row.docSessionId && row.fileName) {
      await api.knowledgeQa.deleteFile(row.docSessionId, row.fileName);
    }

    const index = attachments.value.findIndex((item) => item.id === row.id);

    if (index !== -1) {
      revokeAttachmentUrl(attachments.value[index].url);
      attachments.value.splice(index, 1);
    }

    chatStore.removeFile(row.id);
  } catch (error) {
    console.error('delete attachment failed:', error);
    showToast('删除失败，请稍后重试');
  }
}

function clearAttachments() {
  attachments.value.forEach((attachment) => revokeAttachmentUrl(attachment.url));
  attachments.value = [];
  chatStore.clearFileNameList();
  chatStore.clearImgList();
  resetFileInput(fileInputRef.value);
  resetFileInput(imageInputRef.value);
}

function toggleVoiceInput() {
  if (!selectedKnowledgeIds.value.length) {
    showToast('请先选择知识库');
    openKnowledgePicker();
    return;
  }

  if (isStreaming.value || isTranscribing.value) return;

  if (isRecording.value) {
    stopVoiceInput();
  } else {
    startVoiceInput();
  }
}

function getAudioContextConstructor() {
  return window.AudioContext || (window as any).webkitAudioContext;
}

function getRecordConstraints(): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };
}

function getUserMediaCompat(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const mediaDevicesGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(
    navigator.mediaDevices,
  );
  const legacyGetUserMedia =
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia ||
    (navigator as any).msGetUserMedia;

  if (mediaDevicesGetUserMedia) {
    return mediaDevicesGetUserMedia(constraints);
  }

  if (!legacyGetUserMedia) {
    return Promise.reject({ name: 'NotSupportedError' });
  }

  return new Promise((resolve, reject) => {
    legacyGetUserMedia.call(navigator, constraints, resolve, reject);
  });
}

async function getAudioStream() {
  try {
    return await getUserMediaCompat(getRecordConstraints());
  } catch (error: any) {
    if (['OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(error?.name)) {
      return getUserMediaCompat({ audio: true });
    }

    throw error;
  }
}

async function resumeAudioContext(context: AudioContext) {
  if (context.state === 'suspended') {
    await context.resume();
  }
}

async function startVoiceInput() {
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
    wavSampleRate.value = context.sampleRate || WAV_TARGET_SAMPLE_RATE;

    await resumeAudioContext(context);

    const stream = await getAudioStream();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);

    mediaStream.value = stream;
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
    console.error('开启录音失败:', error);
    isRecording.value = false;
    isTranscribing.value = false;
    cleanupAudioRecorder();
    showSpeechTip(getRecordErrorTip(error));
  }
}

function getRecordErrorTip(error: any) {
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
    return '当前环境不支持录音，请使用 HTTPS 或开启 App 麦克风权限';
  }

  return '录音开启失败，请稍后重试';
}

async function stopVoiceInput() {
  if (!isRecording.value) return;

  isRecording.value = false;

  const duration = Date.now() - recordingStartTime.value;
  const buffers = [...audioBuffers.value];

  cleanupAudioRecorder();

  if (duration < RECORD_MIN_DURATION || !buffers.length) {
    audioBuffers.value = [];
    showSpeechTip('录音时间太短，请重新录入');
    return;
  }

  audioBuffers.value = [];
  await uploadVoiceFile(encodeWav(buffers, wavSampleRate.value));
}

function cleanupAudioRecorder() {
  safeDisconnect(scriptProcessor.value, '断开音频处理器失败:');
  safeDisconnect(audioSource.value, '断开音频源失败:');

  try {
    const context = audioContext.value;
    if (context && context.state !== 'closed') {
      context.close().catch((error) => console.warn('关闭 AudioContext 失败:', error));
    }
  } catch (error) {
    console.warn('关闭 AudioContext 失败:', error);
  }

  mediaStream.value?.getTracks().forEach((track) => track.stop());

  scriptProcessor.value = null;
  audioSource.value = null;
  audioContext.value = null;
  mediaStream.value = null;
}

function safeDisconnect(node: { disconnect: () => void } | null, message: string) {
  try {
    node?.disconnect();
  } catch (error) {
    console.warn(message, error);
  }
}

function createVoiceFile(audioBlob: Blob) {
  const fileName = `voice_${Date.now()}.wav`;

  try {
    return new File([audioBlob], fileName, { type: 'audio/wav' });
  } catch {
    return new Blob([audioBlob], { type: 'audio/wav' }) as File;
  }
}

async function uploadVoiceFile(audioBlob: Blob) {
  try {
    isTranscribing.value = true;
    speechTip.value = '';

    const audioFile = createVoiceFile(audioBlob);
    const formData = new FormData();
    formData.append('audio', audioFile);

    const res = await api.knowledgeQa.process(formData);
    const text = normalizeSpeechText(res?.data);

    if (!text) {
      showSpeechTip('未识别到有效内容');
      return;
    }

    userInput.value = mergeVoiceText(userInput.value, text);
    showSpeechTip('语音识别成功');

    await nextTick();

    const question = userInput.value.trim();
    isTranscribing.value = false;

    if (question) {
      await handleSend(question);
    }
  } catch (error) {
    console.error('语音转文字失败:', error);
    showSpeechTip('语音识别失败，请重试');
  } finally {
    isTranscribing.value = false;
  }
}

function encodeWav(buffers: Float32Array[], sampleRate: number) {
  const mergedBuffer = mergeAudioBuffers(buffers);
  const resampledBuffer = resampleAudioBuffer(mergedBuffer, sampleRate, WAV_TARGET_SAMPLE_RATE);
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
  view.setUint32(24, WAV_TARGET_SAMPLE_RATE, true);
  view.setUint32(28, WAV_TARGET_SAMPLE_RATE * 2, true);
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
  const result = new Float32Array(Math.round(buffer.length / ratio));

  for (let i = 0; i < result.length; i++) {
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

  return (
    ['text', 'result', 'content', 'data']
      .map((key) => data?.[key])
      .find(Boolean)
      ?.toString()
      .trim() || ''
  );
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

function resetStreamState() {
  state.currentStreamingMessageId = null;
  state.abortController = null;
}

function handleStop() {
  const activeConversationId = conversationId.value;

  if (!activeConversationId) return;

  const streamingMessageId = state.currentStreamingMessageId;

  if (streamingMessageId) {
    chatStore.updateMessageInConversation(
      activeConversationId,
      streamingMessageId,
      {
        isStreaming: false,
        isEnd: true,
        isBreak: true,
      },
      true,
    );
  }

  chatStore.stopStreaming(activeConversationId);
  resetStreamState();

  if (!chatStore.isTempConversationId(activeConversationId)) {
    chatApi.stopChat(getUserInfo().userId, activeConversationId);
  }
}

function streamChats(
  request: ChatRequest,
  conversationId: string,
  messageId: string,
  ctrl?: AbortController,
): Promise<void> {
  let fullText = '';
  let reference: any = null;
  let suggestions: any = null;

  const finishMessage = (patch: Record<string, any>, needRefresh = false) => {
    chatStore.updateMessageInConversation(
      conversationId,
      messageId,
      { content: fullText, ...patch },
      true,
    );
    chatStore.finishStreaming(conversationId);
    resetStreamState();

    if (needRefresh) {
      chatStore.getChat(
        chatStore.isTempConversationId(conversationId) ? 'create' : undefined,
        conversationId,
      );
    }
  };

  return new Promise((resolve, reject) => {
    FetchEventSource(API_ENDPOINTS.CHAT_STREAM, {
      openWhenHidden: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(request),
      signal: ctrl?.signal,
      onmessage(event: any) {
        if (event.event === 'reference') {
          reference = event.data;
          return;
        }

        if (event.event === 'suggestions') {
          suggestions = event.data;
          return;
        }

        if (event.event === 'stopped' || event.event === 'error') {
          finishMessage({
            isStreaming: false,
            isEnd: true,
            isBreak: true,
            messageId: event.id,
          });
          resolve();
          return;
        }

        if (event.event === 'done') {
          const referenceList = getReferenceList(reference);
          const suggestionList = getSuggestionList(suggestions);

          chatStore.updateReferenceInConversation(conversationId, messageId, referenceList);
          chatStore.updateSuggestionsConversation(conversationId, messageId, suggestionList);

          finishMessage(
            {
              isStreaming: false,
              isEnd: true,
              messageId: event.id,
            },
            true,
          );
          ctrl?.abort();
          resolve();
          return;
        }

        if (event.data && event.event === 'message') {
          fullText += safeJsonParse<{ message?: string }>(event.data, {}).message || '';
          chatStore.updateMessageContentInConversation(conversationId, messageId, fullText);
          chatStore.updateMessageInConversation(conversationId, messageId, {
            isStreaming: true,
            isEnd: false,
            messageId: event.id,
            content: fullText,
          });
          scrollToBottom();
        }
      },
      onclose() {
        chatStore.finishStreaming(conversationId);
        resetStreamState();
        ctrl?.abort();
        resolve();
      },
      onerror(err: any) {
        chatStore.finishStreaming(conversationId);
        resetStreamState();
        reject(err);
        showToast(err);
        throw err;
      },
    });
  });
}

onMounted(async () => {
  await getKnowledgeList();
  window.setTimeout(scrollToBottom, 300);
});

onBeforeUnmount(() => {
  isRecording.value = false;
  clearAttachments();
  cleanupAudioRecorder();

  if (speechTipTimer) {
    window.clearTimeout(speechTipTimer);
  }
});
</script>

<style lang="scss" scoped>
.data-query-page {
  --brand: #2563eb;
  --brand-dark: #1d4ed8;
  --brand-soft: #dbeafe;
  --cyan: #06b6d4;
  --ink: #0f172a;
  --text: #1e293b;
  --muted: #64748b;
  --placeholder: #94a3b8;
  --line: rgb(203 213 225 / 62%);
  --card: rgb(255 255 255 / 88%);
  --card-solid: #fff;
  --radius-xl: 24px;
  --radius-lg: 20px;
  --radius-md: 16px;
  --shadow-soft: 0 16px 42px rgb(15 23 42 / 9%);
  --shadow-blue: 0 18px 42px rgb(37 99 235 / 16%);
  --safe-bottom: env(safe-area-inset-bottom, 0px);

  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  color: var(--ink);
  background:
    radial-gradient(circle at 8% -4%, rgb(37 99 235 / 17%) 0, transparent 26%),
    radial-gradient(circle at 92% 6%, rgb(6 182 212 / 16%) 0, transparent 28%),
    radial-gradient(circle at 50% 100%, rgb(59 130 246 / 10%) 0, transparent 34%),
    linear-gradient(180deg, #f7fbff 0%, #f4f8ff 44%, #eef5fb 100%);
  isolation: isolate;

  &::before {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    content: '';
    background-image:
      linear-gradient(rgb(37 99 235 / 4%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(37 99 235 / 4%) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: linear-gradient(180deg, rgb(0 0 0 / 56%), transparent 72%);
  }

  :deep(.van-sticky) {
    z-index: 120;
  }

  :deep(.van-nav-bar) {
    background: rgb(255 255 255 / 78%);
    border-bottom: 1px solid rgb(226 232 240 / 70%);
    box-shadow: 0 10px 28px rgb(15 23 42 / 5%);
  }

  :deep(.van-nav-bar__title) {
    font-size: 17px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: 0.2px;
  }

  .knowledge-selector-wrap {
    z-index: 10;
    padding: 12px 14px 10px;
    background: linear-gradient(180deg, rgb(255 255 255 / 62%), rgb(255 255 255 / 38%));
    border-bottom: 1px solid rgb(226 232 240 / 58%);

    .knowledge-selector {
      display: flex;
      gap: 11px;
      align-items: center;
      min-height: 54px;
      padding: 10px 14px;
      cursor: pointer;
      background:
        linear-gradient(135deg, rgb(255 255 255 / 96%), rgb(248 250 252 / 90%)),
        radial-gradient(circle at 0 0, rgb(59 130 246 / 16%), transparent 34%);
      border: 1px solid rgb(191 219 254 / 86%);
      border-radius: var(--radius-lg);
      box-shadow:
        0 12px 32px rgb(37 99 235 / 10%),
        inset 0 1px 0 rgb(255 255 255 / 92%);
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease;

      &:active {
        border-color: rgb(96 165 250 / 92%);
        box-shadow: 0 8px 22px rgb(37 99 235 / 12%);
        transform: scale(0.99);
      }

      .selector-label {
        position: relative;
        flex-shrink: 0;
        padding-left: 12px;
        font-size: 15px;
        font-weight: 850;
        color: var(--ink);
        letter-spacing: 0.2px;

        &::before {
          position: absolute;
          top: 50%;
          left: 0;
          width: 4px;
          height: 18px;
          content: '';
          background: linear-gradient(180deg, var(--brand), var(--cyan));
          border-radius: 999px;
          box-shadow: 0 4px 10px rgb(37 99 235 / 26%);
          transform: translateY(-50%);
        }
      }

      .selector-content {
        flex: 1;
        min-width: 0;

        .selected-tags {
          display: flex;
          gap: 7px;
          align-items: center;
          min-width: 0;
        }

        .knowledge-tag {
          display: inline-flex;
          gap: 5px;
          align-items: center;
          max-width: 128px;
          height: 31px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--brand-dark);
          background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
          border: 1px solid rgb(147 197 253 / 72%);
          border-radius: 999px;
          box-shadow: 0 6px 14px rgb(37 99 235 / 8%);

          .tag-text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          :deep(.van-icon) {
            flex-shrink: 0;
            color: #3b82f6;
          }

          &.more-tag {
            flex-shrink: 0;
            max-width: none;
            color: #0369a1;
            background: #ecfeff;
            border-color: #a5f3fc;
          }
        }

        .selector-placeholder {
          font-size: 13px;
          font-weight: 600;
          color: var(--placeholder);
        }
      }

      .selector-arrow {
        flex-shrink: 0;
        color: #64748b;
        transition: transform 0.18s ease;
      }
    }
  }

  .chat-container {
    flex: 1;
    padding: 15px 12px;
    padding-bottom: 246px;
    overflow: hidden auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }

    .message-row {
      display: flex;
      width: 100%;
      margin-bottom: 18px;
      animation: message-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);

      &.user-row {
        justify-content: flex-end;

        .user-message {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          max-width: min(82%, 520px);

          .user-bubble {
            position: relative;
            padding: 12px 15px;
            font-size: 15px;
            line-height: 1.68;
            color: #fff;
            word-break: break-word;
            white-space: pre-wrap;
            background:
              radial-gradient(circle at 18% 0, rgb(255 255 255 / 22%), transparent 34%),
              linear-gradient(135deg, #1d4ed8 0%, #2563eb 46%, #06b6d4 100%);
            border: 1px solid rgb(255 255 255 / 16%);
            border-radius: 20px 8px 20px 20px;
            box-shadow:
              0 14px 30px rgb(37 99 235 / 24%),
              inset 0 1px 0 rgb(255 255 255 / 22%);
          }

          .message-assets {
            width: min(278px, 100%);
            margin-top: 8px;
          }

          .images-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;

            &.single {
              grid-template-columns: minmax(0, 150px);
              justify-content: end;
            }

            .image-item {
              position: relative;
              display: block;
              width: 100%;
              aspect-ratio: 1;
              padding: 0;
              overflow: hidden;
              touch-action: manipulation;
              cursor: pointer;
              background: rgb(255 255 255 / 22%);
              border: 1px solid rgb(255 255 255 / 34%);
              border-radius: 14px;
              box-shadow: 0 10px 22px rgb(37 99 235 / 16%);

              img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
              }

              .image-overlay {
                position: absolute;
                right: 5px;
                bottom: 5px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                color: #fff;
                background: rgb(15 23 42 / 52%);
                border-radius: 50%;
              }

              &:active img {
                transform: scale(1.04);
              }
            }
          }

          .files-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 8px;

            .file-item {
              display: flex;
              gap: 9px;
              align-items: center;
              min-height: 54px;
              padding: 9px;
              touch-action: manipulation;
              cursor: pointer;
              background: rgb(255 255 255 / 96%);
              border: 1px solid rgb(219 234 254 / 90%);
              border-radius: 15px;
              box-shadow: 0 10px 22px rgb(37 99 235 / 12%);

              &:active {
                transform: scale(0.985);
              }
            }

            .file-icon {
              display: flex;
              flex-shrink: 0;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 38px;
              font-size: 18px;
              background: #eff6ff;
              border-radius: 12px;
            }

            .file-info {
              display: flex;
              flex: 1;
              flex-direction: column;
              min-width: 0;
            }

            .file-name {
              display: -webkit-box;
              overflow: hidden;
              text-overflow: ellipsis;
              -webkit-line-clamp: 2;
              font-size: 13px;
              font-weight: 800;
              line-height: 1.35;
              color: var(--ink);
              word-break: break-all;
              -webkit-box-orient: vertical;
            }

            .file-size {
              margin-top: 3px;
              font-size: 11px;
              line-height: 1.2;
              color: var(--placeholder);
            }

            .download-btn {
              display: flex;
              flex-shrink: 0;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              padding: 0;
              color: var(--brand);
              background: #fff;
              border: 1px solid #dbeafe;
              border-radius: 50%;
            }
          }
        }
      }

      &.ai-row {
        justify-content: flex-start;

        .ai-message {
          width: 100%;
          max-width: 760px;

          .ai-card {
            position: relative;
            overflow: hidden;
            background: var(--card);
            border: 1px solid rgb(226 232 240 / 82%);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-soft);

            &::before {
              position: absolute;
              top: 0;
              right: 0;
              left: 0;
              height: 2px;
              content: '';
              background: linear-gradient(90deg, var(--brand), var(--cyan), transparent 78%);
              opacity: 0.76;
            }

            .ai-header {
              display: flex;
              gap: 10px;
              align-items: center;
              padding: 14px 16px 12px;
              background:
                radial-gradient(circle at 5% 0, rgb(59 130 246 / 10%), transparent 32%),
                linear-gradient(135deg, rgb(248 250 252 / 96%) 0%, rgb(239 246 255 / 92%) 100%);
              border-bottom: 1px solid rgb(226 232 240 / 78%);

              .ai-avatar {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 34px;
                height: 34px;
                font-size: 17px;
                background:
                  linear-gradient(#fff, #fff) padding-box,
                  linear-gradient(135deg, #60a5fa, #22d3ee) border-box;
                border: 1px solid transparent;
                border-radius: 50%;
                box-shadow: 0 8px 18px rgb(37 99 235 / 14%);
              }

              .ai-title {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 15px;
                font-weight: 850;
                color: var(--ink);
                white-space: nowrap;
              }

              .message-time {
                flex-shrink: 0;
                margin-top: 0;
              }
            }

            .ai-content {
              padding: 16px;
              font-size: 15px;
              line-height: 1.78;
              color: var(--text);
              word-break: break-word;

              :deep(p) {
                margin: 0 0 10px;
              }

              :deep(p:last-child) {
                margin-bottom: 0;
              }

              :deep(a) {
                font-weight: 700;
                color: var(--brand);
                text-decoration: none;
                border-bottom: 1px solid rgb(37 99 235 / 22%);
              }

              :deep(ul),
              :deep(ol) {
                padding-left: 20px;
                margin: 8px 0 12px;
              }

              :deep(li + li) {
                margin-top: 5px;
              }

              :deep(blockquote) {
                padding: 8px 12px;
                margin: 10px 0;
                color: #475569;
                background: #f8fafc;
                border-left: 4px solid #93c5fd;
                border-radius: 0 12px 12px 0;
              }

              :deep(code) {
                padding: 2px 7px;
                font-size: 13px;
                color: var(--brand-dark);
                background: #eff6ff;
                border: 1px solid #dbeafe;
                border-radius: 7px;
              }

              :deep(pre) {
                padding: 13px;
                margin: 10px 0;
                overflow-x: auto;
                background: #0f172a;
                border: 1px solid rgb(148 163 184 / 18%);
                border-radius: 15px;
                box-shadow: inset 0 1px 0 rgb(255 255 255 / 6%);
              }

              :deep(pre code) {
                padding: 0;
                color: #e2e8f0;
                background: transparent;
                border: 0;
              }

              :deep(table) {
                width: 100%;
                margin: 10px 0;
                overflow: hidden;
                font-size: 13px;
                border-spacing: 0;
                border-collapse: separate;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
              }

              :deep(th),
              :deep(td) {
                padding: 9px 10px;
                border-bottom: 1px solid #e2e8f0;
              }

              :deep(th) {
                font-weight: 800;
                color: #0f172a;
                background: #f8fafc;
              }

              :deep(tr:last-child td) {
                border-bottom: 0;
              }

              .suggestions {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                padding-top: 12px;
                margin-top: 14px;
                border-top: 1px dashed rgb(203 213 225 / 72%);
              }

              .suggestion-btn {
                position: relative;
                display: inline-flex;
                gap: 7px;
                align-items: center;
                max-width: 178px;
                height: 42px;
                padding: 0 15px;
                overflow: hidden;
                font-size: 13px;
                font-weight: 750;
                line-height: 1;
                color: #475569;
                cursor: pointer;
                background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
                border: 1px solid rgb(203 213 225 / 86%);
                border-radius: 999px;
                box-shadow:
                  0 7px 18px rgb(15 23 42 / 5%),
                  inset 0 1px 0 rgb(255 255 255 / 92%);
                transition:
                  color 0.2s ease,
                  background 0.2s ease,
                  border-color 0.2s ease,
                  box-shadow 0.2s ease,
                  transform 0.18s ease;

                &::before {
                  position: absolute;
                  inset: 0;
                  pointer-events: none;
                  content: '';
                  background:
                    radial-gradient(circle at 18% 20%, rgb(255 255 255 / 70%), transparent 32%),
                    linear-gradient(135deg, rgb(37 99 235 / 10%), rgb(14 165 233 / 8%));
                  opacity: 0;
                  transition: opacity 0.2s ease;
                }

                &:hover {
                  color: #2563eb;
                  background: #eff6ff;
                  border-color: #3b82f6;
                  box-shadow:
                    0 12px 26px rgb(37 99 235 / 14%),
                    inset 0 1px 0 rgb(255 255 255 / 95%);
                  transform: translateY(-1px);

                  &::before {
                    opacity: 1;
                  }

                  .suggestion-icon {
                    color: #fff;
                    background: linear-gradient(135deg, #2563eb, #0ea5e9);
                    box-shadow: 0 6px 14px rgb(37 99 235 / 24%);
                    transform: scale(1.04);
                  }

                  .suggestion-text {
                    color: #2563eb;
                  }
                }

                &:active {
                  transform: scale(0.97);
                }

                .suggestion-icon,
                .suggestion-text {
                  position: relative;
                  z-index: 1;
                }

                .suggestion-icon {
                  display: inline-flex;
                  flex-shrink: 0;
                  align-items: center;
                  justify-content: center;
                  width: 24px;
                  height: 24px;
                  color: #2563eb;
                  background: #eff6ff;
                  border-radius: 50%;
                  transition:
                    color 0.2s ease,
                    background 0.2s ease,
                    box-shadow 0.2s ease,
                    transform 0.2s ease;
                }

                .suggestion-text {
                  min-width: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  color: #475569;
                  white-space: nowrap;
                  transition: color 0.2s ease;
                }
              }

              @media (hover: none) {
                .suggestion-btn:active {
                  color: #2563eb;
                  background: #eff6ff;
                  border-color: #3b82f6;
                }
              }

              .message-assets {
                margin-top: 12px;
              }

              .images-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
                max-width: 100%;

                &.single {
                  grid-template-columns: minmax(0, 168px);
                }

                .image-item {
                  position: relative;
                  box-sizing: border-box;
                  display: block;
                  width: 100%;
                  aspect-ratio: 1;
                  padding: 0;
                  overflow: hidden;
                  touch-action: manipulation;
                  cursor: pointer;
                  background: #e2e8f0;
                  border: 1px solid rgb(226 232 240 / 88%);
                  border-radius: 14px;
                  box-shadow: 0 8px 20px rgb(15 23 42 / 8%);

                  img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.22s ease;
                  }

                  .image-overlay {
                    position: absolute;
                    right: 6px;
                    bottom: 6px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 26px;
                    height: 26px;
                    color: #fff;
                    background: rgb(15 23 42 / 56%);
                    border: 1px solid rgb(255 255 255 / 22%);
                    border-radius: 50%;
                  }

                  &:active img {
                    transform: scale(1.04);
                  }
                }
              }

              .single-video {
                margin-top: 12px;
                overflow: hidden;
                background: #0f172a;
                border-radius: 16px;
                box-shadow: 0 10px 24px rgb(15 23 42 / 12%);

                video {
                  display: block;
                  width: 100%;
                  max-height: 260px;
                }
              }

              .videos-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-top: 12px;

                .video-item {
                  position: relative;
                  aspect-ratio: 16 / 10;
                  overflow: hidden;
                  background: #0f172a;
                  border-radius: 14px;
                  box-shadow: 0 8px 20px rgb(15 23 42 / 10%);

                  img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                  }

                  .video-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    background: rgb(15 23 42 / 28%);
                  }

                  .video-duration {
                    position: absolute;
                    right: 7px;
                    bottom: 7px;
                    padding: 2px 7px;
                    font-size: 11px;
                    color: #fff;
                    background: rgb(15 23 42 / 74%);
                    border-radius: 999px;
                  }
                }
              }

              .files-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 10px;

                .file-item {
                  display: flex;
                  gap: 10px;
                  align-items: center;
                  min-height: 54px;
                  padding: 10px;
                  touch-action: manipulation;
                  cursor: pointer;
                  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
                  border: 1px solid #e2e8f0;
                  border-radius: 15px;
                  box-shadow: 0 8px 20px rgb(15 23 42 / 6%);

                  &:active {
                    background: #eff6ff;
                    transform: scale(0.985);
                  }

                  .file-icon {
                    display: flex;
                    flex-shrink: 0;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    font-size: 18px;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 6px 14px rgb(15 23 42 / 6%);
                  }

                  .file-info {
                    display: flex;
                    flex: 1;
                    flex-direction: column;
                    min-width: 0;

                    .file-name {
                      display: -webkit-box;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      -webkit-line-clamp: 2;
                      font-size: 13px;
                      font-weight: 800;
                      line-height: 1.35;
                      color: var(--ink);
                      word-break: break-all;
                      -webkit-box-orient: vertical;
                    }

                    .file-size {
                      margin-top: 3px;
                      font-size: 11px;
                      line-height: 1.2;
                      color: var(--placeholder);
                    }
                  }

                  .download-btn {
                    display: flex;
                    flex-shrink: 0;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    padding: 0;
                    color: var(--brand);
                    background: #fff;
                    border: 1px solid #dbeafe;
                    border-radius: 50%;
                    box-shadow: 0 6px 14px rgb(37 99 235 / 10%);
                  }
                }
              }
            }
          }
        }
      }

      .message-time {
        margin-top: 6px;
        font-size: 11px;
        font-weight: 600;
        color: var(--placeholder);
      }
    }
  }

  .input-section {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    padding: 12px 14px calc(12px + var(--safe-bottom));
    background: linear-gradient(
      180deg,
      rgb(255 255 255 / 52%) 0%,
      rgb(255 255 255 / 92%) 42%,
      #fff 100%
    );
    border-top: 1px solid rgb(226 232 240 / 86%);
    box-shadow: 0 -18px 40px rgb(15 23 42 / 8%);

    .input-wrapper {
      max-width: 680px;
      margin: 0 auto;

      .voice-panel {
        box-sizing: border-box;
        display: flex;
        gap: 10px;
        align-items: center;
        min-height: 40px;
        padding: 8px 12px;
        margin-bottom: 9px;
        background: linear-gradient(135deg, rgb(239 246 255 / 96%) 0%, rgb(224 242 254 / 92%) 100%);
        border: 1px solid rgb(147 197 253 / 38%);
        border-radius: 18px;
        box-shadow: 0 10px 24px rgb(37 99 235 / 9%);
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
        box-shadow: 0 0 0 6px rgb(59 130 246 / 10%);
        animation: voice-dot-pulse 1.4s infinite;
      }

      .voice-text {
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 13px;
        font-weight: 750;
        color: var(--brand-dark);
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
        height: 28px;
        padding: 0 12px;
        font-weight: 700;
        background: var(--brand);
        border: none;
        box-shadow: 0 6px 14px rgb(37 99 235 / 20%);
      }

      .attachment-preview {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        margin-bottom: 9px;
        background: linear-gradient(135deg, rgb(239 246 255 / 96%) 0%, rgb(248 250 252 / 94%) 100%);
        border: 1px solid rgb(147 197 253 / 36%);
        border-radius: 18px;
        box-shadow: 0 10px 24px rgb(37 99 235 / 8%);
      }

      .attachment-item {
        display: flex;
        gap: 9px;
        align-items: center;
        min-height: 44px;
        padding: 7px 9px;
        background: rgb(255 255 255 / 92%);
        border: 1px solid rgb(226 232 240 / 84%);
        border-radius: 14px;

        &.error {
          background: #fff7f7;
          border-color: #fecaca;

          .attachment-meta {
            color: #ef4444;
          }
        }

        .attachment-thumb {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          overflow: hidden;
          color: var(--brand);
          background: #eff6ff;
          border-radius: 12px;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .attachment-info {
          flex: 1;
          min-width: 0;
        }

        .attachment-name {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          font-weight: 800;
          color: var(--ink);
          white-space: nowrap;
        }

        .attachment-meta {
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 10px;
          font-weight: 650;
          color: var(--placeholder);
          white-space: nowrap;
        }

        .attachment-remove {
          flex-shrink: 0;
          color: #94a3b8;
          cursor: pointer;

          &:active {
            color: #ef4444;
            transform: scale(0.92);
          }
        }
      }

      .input-box {
        display: flex;
        gap: 9px;
        align-items: flex-end;
        padding: 8px 9px 8px 15px;
        background:
          linear-gradient(#fff, #fff) padding-box,
          linear-gradient(135deg, rgb(147 197 253 / 82%), rgb(165 243 252 / 66%)) border-box;
        border: 1px solid transparent;
        border-radius: 28px;
        box-shadow:
          0 14px 32px rgb(37 99 235 / 13%),
          inset 0 1px 0 rgb(255 255 255 / 92%);
        transition:
          box-shadow 0.18s ease,
          transform 0.18s ease;

        .upload-actions-left {
          display: flex;
          flex-shrink: 0;
          gap: 6px;
          align-items: center;
          padding-bottom: 1px;
        }

        .upload-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          color: #64748b;
          cursor: pointer;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          transition:
            color 0.16s ease,
            background 0.16s ease,
            border-color 0.16s ease,
            transform 0.16s ease;

          &:active {
            color: var(--brand);
            background: rgb(59 130 246 / 10%);
            border-color: #bfdbfe;
            transform: scale(0.94);
          }

          &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }
        }

        &:focus-within {
          box-shadow:
            0 16px 36px rgb(37 99 235 / 18%),
            0 0 0 4px rgb(59 130 246 / 9%);
        }

        .input-field {
          flex: 1;
          padding: 0 !important;
          background: transparent !important;

          :deep(.van-cell) {
            padding: 0;
            background: transparent;
          }

          :deep(.van-field__control) {
            font-size: 15px;
            line-height: 1.55;
            color: var(--ink);
          }

          :deep(.van-field__control::placeholder) {
            color: var(--placeholder);
          }
        }

        .input-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .voice-btn,
        .send-btn,
        .stop-btn {
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          padding: 0;
          border: none;
          border-radius: 50%;
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            background 0.16s ease;
        }

        .voice-btn {
          color: #64748b;
          background: #f1f5f9;
          box-shadow: inset 0 1px 0 rgb(255 255 255 / 78%);

          &.active {
            color: #fff;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            box-shadow: 0 10px 22px rgb(59 130 246 / 34%);
            animation: mic-breath 1.6s ease-in-out infinite;
          }

          &:not(.active):active {
            color: var(--brand);
            background: rgb(59 130 246 / 10%);
            transform: scale(0.96);
          }

          &.van-button--disabled {
            color: #aab5c4;
            background: #edf2f7;
            opacity: 1;
          }
        }

        .send-btn {
          color: #fff;
          background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%) !important;
          box-shadow: 0 10px 22px rgb(37 99 235 / 26%);

          &:active {
            transform: scale(0.95);
          }

          &.van-button--disabled {
            box-shadow: none;
            opacity: 0.42;
          }
        }

        .stop-btn {
          color: #fff;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
          box-shadow: 0 10px 22px rgb(239 68 68 / 26%);
          animation: stop-pulse 1.6s ease-in-out infinite;

          &:active {
            transform: scale(0.95);
          }
        }
      }
    }

    .tool-list {
      display: flex;
      gap: 9px;
      max-width: 680px;
      padding: 10px 2px 0;
      margin: 0 auto;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      .tool-item {
        position: relative;
        display: inline-flex;
        flex: 0 0 auto;
        gap: 6px;
        align-items: center;
        justify-content: center;
        min-width: 94px;
        height: 39px;
        padding: 0 13px;
        overflow: hidden;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        color: #475569;
        cursor: pointer;
        background: linear-gradient(180deg, rgb(255 255 255 / 95%) 0%, rgb(248 250 252 / 94%) 100%);
        border: 1px solid rgb(203 213 225 / 78%);
        border-radius: 999px;
        box-shadow:
          0 8px 20px rgb(15 23 42 / 5%),
          inset 0 1px 0 rgb(255 255 255 / 90%);
        transition:
          color 0.2s ease,
          border-color 0.2s ease,
          background 0.2s ease,
          box-shadow 0.2s ease,
          transform 0.18s ease;

        &::before {
          position: absolute;
          inset: 0;
          pointer-events: none;
          content: '';
          background:
            radial-gradient(circle at 20% 20%, rgb(255 255 255 / 55%), transparent 30%),
            linear-gradient(135deg, rgb(37 99 235 / 0%) 0%, rgb(14 165 233 / 0%) 100%);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        &:active {
          transform: scale(0.97);
        }

        .tool-icon,
        .tool-label,
        .tool-check {
          position: relative;
          z-index: 1;
        }

        .tool-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 23px;
          height: 23px;
          font-size: 14px;
          background: #f1f5f9;
          border-radius: 50%;
          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .tool-label {
          max-width: 86px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tool-check {
          position: absolute;
          top: 50%;
          right: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          color: #fff;
          background: linear-gradient(135deg, var(--brand), var(--cyan));
          border: 1px solid rgb(255 255 255 / 72%);
          border-radius: 50%;
          box-shadow: 0 6px 14px rgb(37 99 235 / 24%);
          opacity: 0;
          transform: translateY(-50%) scale(0.68);
          transition:
            opacity 0.18s ease,
            transform 0.18s ease;
        }

        &.active {
          padding-right: 31px;
          color: var(--brand-dark);
          background: linear-gradient(
            135deg,
            rgb(239 246 255 / 98%) 0%,
            rgb(224 242 254 / 94%) 100%
          );
          border-color: #60a5fa;
          box-shadow:
            0 12px 26px rgb(37 99 235 / 17%),
            inset 0 1px 0 rgb(255 255 255 / 92%);

          &::before {
            opacity: 1;
          }

          .tool-icon {
            background: #fff;
            transform: scale(1.05);
          }

          .tool-check {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }
      }
    }
  }
}

.knowledge-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: #0f172a;
  background:
    radial-gradient(circle at 50% 0%, rgb(59 130 246 / 12%) 0, transparent 34%),
    linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 18px 13px;
    background: rgb(255 255 255 / 92%);
    border-bottom: 1px solid rgb(226 232 240 / 70%);

    .popup-title {
      font-size: 20px;
      font-weight: 850;
      color: #0f172a;
      letter-spacing: 0.2px;
    }

    .popup-subtitle {
      margin-top: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }

    > .van-icon {
      padding: 7px;
      color: #64748b;
      background: #f1f5f9;
      border-radius: 50%;
    }
  }

  .popup-search {
    padding: 10px 10px 11px;
    background: rgb(255 255 255 / 92%);
    border-bottom: 1px solid #e2e8f0;

    :deep(.van-search) {
      padding: 0;
    }

    :deep(.van-search__content) {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      box-shadow: inset 0 1px 0 rgb(255 255 255 / 80%);
    }
  }

  .popup-body {
    flex: 1;
    padding: 13px 14px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }

    .knowledge-option {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      padding: 14px 13px;
      margin-bottom: 10px;
      cursor: pointer;
      background: rgb(255 255 255 / 94%);
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow:
        0 9px 24px rgb(15 23 42 / 5%),
        inset 0 1px 0 rgb(255 255 255 / 90%);
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease,
        background 0.18s ease;

      &:active {
        transform: scale(0.99);
      }

      &.active {
        background:
          radial-gradient(circle at 0 0, rgb(59 130 246 / 12%), transparent 38%),
          linear-gradient(135deg, rgb(239 246 255 / 98%) 0%, rgb(255 255 255 / 98%) 100%);
        border-color: #93c5fd;
        box-shadow:
          0 14px 30px rgb(37 99 235 / 13%),
          inset 0 1px 0 rgb(255 255 255 / 92%);

        .option-icon {
          color: #fff;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
          border-color: transparent;
          box-shadow: 0 9px 18px rgb(37 99 235 / 22%);
        }

        .option-name {
          color: #1d4ed8;
        }
      }

      .option-main {
        display: flex;
        flex: 1;
        gap: 11px;
        align-items: center;
        min-width: 0;

        .option-icon {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          transition: all 0.2s ease;
        }

        .option-info {
          min-width: 0;

          .option-name {
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            white-space: nowrap;
          }

          .option-desc {
            margin-top: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 12px;
            font-weight: 500;
            color: #94a3b8;
            white-space: nowrap;
          }
        }
      }

      .option-check {
        flex-shrink: 0;
      }
    }
  }

  .popup-footer {
    display: flex;
    gap: 10px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    background: rgb(255 255 255 / 94%);
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -12px 28px rgb(15 23 42 / 6%);

    .clear-btn {
      font-weight: 750;
      color: #475569;
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    :deep(.van-button--primary) {
      font-weight: 750;
      border: none;
      box-shadow: 0 10px 22px rgb(37 99 235 / 20%);
    }
  }
}

@media (width <=380px) {
  .data-query-page {
    .knowledge-selector-wrap {
      padding-right: 10px;
      padding-left: 10px;
    }

    .chat-container {
      padding-right: 10px;
      padding-bottom: 254px;
      padding-left: 10px;
    }

    .input-section {
      padding-right: 10px;
      padding-left: 10px;

      .tool-list .tool-item {
        min-width: 86px;
        padding: 0 11px;
      }
    }
  }
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mic-breath {
  0%,
  100% {
    box-shadow: 0 10px 22px rgb(59 130 246 / 34%);
  }

  50% {
    box-shadow:
      0 12px 28px rgb(59 130 246 / 52%),
      0 0 0 7px rgb(59 130 246 / 10%);
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

@keyframes stop-pulse {
  0%,
  100% {
    box-shadow: 0 10px 22px rgb(239 68 68 / 26%);
  }

  50% {
    box-shadow:
      0 12px 26px rgb(239 68 68 / 46%),
      0 0 0 7px rgb(239 68 68 / 10%);
  }
}
</style>
