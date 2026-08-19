<template>
  <div
    class="message-bubble"
    :class="[
      `role-${message.role}`,
      {
        'is-streaming': message.isStreaming,
        'is-end': !message.isEnd && message.role !== 'USER',
        'is-error': message.isError,
        compact: compact,
      },
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 头像 -->
    <div class="avatar">
      <div class="avatar-inner" :class="message.role">
        <Bot v-if="message.role === 'ASSISTANT'" :size="20" />
        <User v-else :size="20" />
      </div>
    </div>

    <!-- 消息内容区域 -->
    <div class="message-content-wrapper">
      <!-- 角色名称 -->
      <div class="message-header">
        <span class="role-name">
          {{
            message.role === 'ASSISTANT' ? t('messageBubble.aiAssistant') : t('messageBubble.you')
          }}
        </span>

        <span v-if="showTimestamp" class="timestamp">
          {{ formattedTime }}
        </span>
      </div>

      <!-- 消息主体 -->
      <div class="message-body">
        <!-- 错误状态 -->
        <div v-if="message.isError" class="error-content">
          <AlertCircle :size="18" />
          <span>{{ message.errorMessage || t('messageBubble.sendFailed') }}</span>

          <button class="retry-btn" @click="$emit('retry')">
            <RefreshCw :size="14" />
            {{ t('messageBubble.retry') }}
          </button>
        </div>

        <!-- 正常内容 -->
        <template v-else>
          <!-- 文本内容 - 使用 markstream-vue -->
          <div v-if="message.content" class="text-content markstream-vue">
            <MarkdownRender
              v-if="message.role !== 'USER'"
              :content="message.content"
              :custom-html-tags="['think']"
              custom-id="playground-demo"
              :escape-html-tags="['question', 'answer']"
              @copy="textCopy"
            />

            <div v-else style="white-space: pre-wrap">
              {{ message.content }}
            </div>
          </div>

          <!-- 推荐选项 -->
          <div
            v-if="
              message.suggestions &&
                JSON.parse(message.suggestions).length &&
                message.id ===
                currentConversation.messages[currentConversation.messages.length - 1].id
            "
            class="suggestions"
          >
            <button
              v-for="suggestion in JSON.parse(message.suggestions)"
              :key="suggestion.id"
              class="suggestion-btn"
              @click="handleSend(suggestion, selectedTool)"
            >
              {{ suggestion }}
            </button>
          </div>

          <!-- 文件引用选项 -->
          <div v-if="message.reference && JSON.parse(message.reference).length" class="suggestions">
            <button
              v-for="suggestion in JSON.parse(message.reference)"
              :key="suggestion.id"
              class="suggestion-btn"
              @click="handlePreviewFile(suggestion)"
            >
              <Zap :size="14" />
              {{ suggestion.documentName }}
              <Download :size="16" @click.stop="handleDownloadDocument(suggestion)" />
            </button>
          </div>

          <!-- 图片展示 -->
          <div v-if="message.imageList?.length" class="images-grid">
            <div
              v-for="(image, index) in message.imageList"
              :key="image.id || image.url"
              class="image-item"
              @click="openImagePreview(Number(index))"
            >
              <img :src="image.url" :alt="image.originalName" loading="lazy" />

              <div class="image-overlay">
                <Maximize2 :size="18" />
              </div>
            </div>
          </div>

          <!-- 图片放大预览 -->
          <ElImageViewer
            v-if="previewVisible"
            :url-list="previewUrlList"
            :initial-index="previewIndex"
            :hide-on-click-modal="true"
            teleported
            @close="previewVisible = false"
          />

          <!-- 单个视频 -->
          <!-- <div v-if="message.content.videos?.length === 1" class="single-video">
            <video
              :src="message.content.videos[0].url"
              :poster="message.content.videos[0].poster"
              controls
              preload="metadata"
            />
          </div> -->

          <!-- 多个视频 -->
          <!-- <div
            v-if="message.content.videos && message.content.videos.length > 1"
            class="videos-grid"
          >
            <div
              v-for="video in message.content.videos"
              :key="video.id"
              class="video-item"
              @click="$emit('play-video', video)"
            >
              <img :src="video.poster" :alt="video.title" />
              <div class="video-overlay">
                <Play :size="32" />
              </div>
              <span v-if="video.duration" class="video-duration">
                {{ formatDuration(video.duration) }}
              </span>
            </div>
          </div> -->

          <!-- 附件列表 -->
          <div v-if="message.fileList?.length" class="files-list">
            <div
              v-for="file in message.fileList"
              :key="file.id"
              class="file-item"
              @click="handlePreviewFile(file)"
            >
              <div class="file-icon">
                {{ getFileEmoji(file.mimeType) }}
              </div>
              <div class="file-info">
                <span class="file-name">{{ file.originalName }}</span>
                <span class="file-size">{{ formatSize(file.size) }}</span>
              </div>
              <button
                class="download-btn"
                @click.stop="handleDownload(file.originalName, file.savedFileName)"
              >
                <Download :size="16" />
              </button>
            </div>
          </div>
        </template>

        <!-- 加载动画 -->
        <div v-if="message.isStreaming && !message.content" class="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>

      <!-- 操作行：复制 / 重新生成 / 回答版本切换（同一行、统一样式风格） -->
      <div v-if="showActionRow" class="action-row">
        <MessageActions
          v-if="showMessageActions"
          :content="message.content || ''"
          :feedback="message.feedback"
          :show-regenerate="isLastAssistant"
          :is-hovered="isHovered"
          :is-break="message.isBreak"
          :is-regenerate="isLastAssistant"
          @copy="handleCopy"
          @like="handleLike"
          @dislike="handleDislike"
          @regenerate="$emit('regenerate')"
        />

        <!-- 用户消息操作栏：仅复制 -->
        <MessageActions
          v-if="showUserActions"
          :content="message.content || ''"
          :is-hovered="isHovered"
          :is-regenerate="false"
          @copy="handleCopy"
        />

        <!-- 回答版本切换器：同一问题存在多个回答版本时可见（重新生成产生的旧版本可回溯） -->
        <div
          v-if="showVariantSwitcher"
          class="variant-switcher"
          :class="{ visible: isHovered, switching: message.variantSwitching }"
        >
          <button
            class="variant-nav-btn"
            type="button"
            :disabled="!hasPrevVariant"
            :title="t('messageBubble.prevVariant')"
            @click="$emit('switch-variant', -1)"
          >
            <ChevronLeft :size="14" />
          </button>
          <span class="variant-label">{{ currentVariantIndex }} / {{ variantTotal }}</span>
          <button
            class="variant-nav-btn"
            type="button"
            :disabled="!hasNextVariant"
            :title="t('messageBubble.nextVariant')"
            @click="$emit('switch-variant', 1)"
          >
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>

      <FilePreviewDialog ref="filePreviewDialogRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
// 正确导入 markstream-vue
import { MarkdownRender, setCustomComponents } from 'markstream-vue';
import FilePreviewDialog from '@/components/filePreviewDialog/index.vue';
import {
  AlertCircle,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  RefreshCw,
  User,
  Zap,
} from '@/components/icons';
import MessageActions from './MessageActions.vue';
import { formatFileSize, formatTimestamp, generateId, getFileIcon } from '@/utils/helpers';
import ThinkingNode from './components/ThinkingNode.vue';
import { useChatStore } from '@/store/modules/knowledge-chat';
import EChartsContainerNode from './components/EChartsContainerNode.vue';
import { ElImageViewer, ElMessage } from 'element-plus';
import api from '@/api/index.ts';
import { API_ENDPOINTS, type ChatRequest } from '@/api/modules/chat';
import { storeToRefs } from 'pinia';
import { fetchEventSource as FetchEventSource } from '@microsoft/fetch-event-source';
import { getToken, getUserInfo } from '@/utils/device';
import {
  type Attachment,
  type Message,
  MessageRole,
  type Suggestion,
  type VideoInfo,
} from '@/types/chat';
const filePreviewDialogRef = ref();
const { t } = useI18n();
import { ossPrefix } from '@/api/http';

const props = withDefaults(
  defineProps<{
    message: Message;
    showTimestamp?: boolean;
    compact?: boolean;
    /** 是否为消息列表中最新一条 AI 回答（仅它允许重新生成） */
    isLastAssistant?: boolean;
  }>(),
  {
    showTimestamp: true,
    compact: false,
    isLastAssistant: false,
  },
);

const { copy } = useClipboard({ legacy: true });
const chatStore = useChatStore();
const {
  currentConversation,
  currentConversationId,
  selectedTool,
  knowledgeBaseId,
  fileNameList,
  imgList,
} = storeToRefs(chatStore);

const emit = defineEmits<{
  retry: [];
  regenerate: [];
  copy: [];
  like: [];
  dislike: [];
  /** 切换回答版本：delta=-1 上一版 / +1 下一版 */
  'switch-variant': [delta: number];
  'select-suggestion': [suggestion: Suggestion];
  'preview-image': [image: Attachment, index: number];
  'play-video': [video: VideoInfo];
  'download-file': [file: Attachment];
}>();

const isHovered = ref(false);
const previewVisible = ref(false);
const previewIndex = ref(0);
const conversationId: any = computed(() => {
  return currentConversation.value?.id || currentConversationId.value;
});
const previewUrlList = computed(() => {
  return props.message.imageList?.map((item: any) => item.url) || [];
});

function openImagePreview(index: number) {
  previewIndex.value = index;
  previewVisible.value = true;
}

const formattedTime = computed(() => {
  return formatTimestamp(props.message.createdAt);
});

// ==================== 操作区（复制/重新生成） ====================

// 操作区可见条件：AI 回答且非流式、非错误态
const showMessageActions = computed(() => {
  const m = props.message;

  return m.role === 'ASSISTANT' && !m.isStreaming && !m.isError;
});

// ==================== 回答版本切换器 ====================

// 版本总数：变体详情已懒加载时以详情为准，否则用历史接口下发的 variantCount
const variantTotal = computed(() => {
  const list = props.message.variants;

  if (Array.isArray(list) && list.length > 1) return list.length;

  return props.message.variantCount || 0;
});

// 当前版本序号：优先变体列表中的生效项，回退消息自身 variantIndex
const currentVariantIndex = computed(() => {
  const list = props.message.variants;

  if (Array.isArray(list) && list.length) {
    const active = list.find((v: any) => v?.activeVariant);

    if (active?.variantIndex) return Number(active.variantIndex);
  }

  return props.message.variantIndex || 1;
});

const showVariantSwitcher = computed(() => {
  const m = props.message;

  return (
    m.role === 'ASSISTANT' &&
    !m.isStreaming &&
    !m.isError &&
    !!m.userMessageId &&
    variantTotal.value > 1
  );
});

// 用户消息操作区可见条件
const showUserActions = computed(() => {
  const m = props.message;
  return m.role === 'USER' && !m.isStreaming && !m.isError && !!m.content;
});

// 整个操作行（含操作区与版本切换器）可见条件
const showActionRow = computed(
  () => showMessageActions.value || showUserActions.value || showVariantSwitcher.value,
);

const hasPrevVariant = computed(() => {
  return currentVariantIndex.value > 1 && !props.message.variantSwitching;
});

const hasNextVariant = computed(() => {
  return currentVariantIndex.value < variantTotal.value && !props.message.variantSwitching;
});

function textCopy(data: any) {
  if (typeof data === 'string') {
    copy(data);
  }
}

function handleCopy() {
  emit('copy');
}

function handleLike() {
  emit('like');
}

function handleDislike() {
  emit('dislike');
}

const handlePreviewFile = async (row: any) => {
  console.log(row, 9998);
  try {
    // 知识库引用文件
    if (row.documentId) {
      const { data } = await api.base.getDocumentFileName(row.documentId);

      filePreviewDialogRef.value?.open({
        id: row.id || row.documentId,
        fileUrl: `${ossPrefix}/downloadByFileName?fileName=${encodeURIComponent(data)}`,
        fileOriginalName: row.documentName || row.fileOriginalName || data,
        fileName: data,
        fileSuffix: getSuffixByName(row.documentName || data),
        fileType: row.fileType || '',
      });

      return;
    }

    // 聊天上传附件
    if (row.savedFileName) {
      filePreviewDialogRef.value?.open({
        id: row.id || row.savedFileName,
        fileUrl: `${ossPrefix}/downloadByBucketFileName?bucketName=temp&fileName=${encodeURIComponent(
          row.savedFileName,
        )}`,
        fileOriginalName: row.originalName || row.fileOriginalName || row.savedFileName,
        fileName: row.savedFileName,
        fileSuffix: getSuffixByName(row.originalName || row.savedFileName),
        fileType: row.mimeType || row.fileType || '',
      });

      return;
    }

    // 文件列表接口返回的数据
    filePreviewDialogRef.value?.open(row);
  } catch (error) {
    console.error('文件预览失败：', error);
    ElMessage.error('文件预览失败');
  }
};

const getSuffixByName = (fileName = '') => {
  const list = fileName.split('.');
  return list.length > 1 ? list[list.length - 1] : '';
};

function getRequestSessionId(id: string) {
  if (!id || chatStore.isTempConversationId(id)) {
    return '';
  }

  return id;
}

function safeJsonParse<T = any>(data: any, fallback: T): T {
  try {
    if (!data) return fallback;

    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

async function handleSend(text: string, searchType?: string, docSessionId?: string) {
  let activeConversationId = conversationId.value;

  if (!activeConversationId) {
    activeConversationId = chatStore.createConversation();
  }

  const activeConversation =
    chatStore.getConversation(activeConversationId) || currentConversation.value;
  const currentDocSessionId = docSessionId || activeConversation?.docSessionId || generateId();

  const currentImages = [...imgList.value];
  const currentFiles = [...fileNameList.value];

  // 添加用户消息到指定对话，而不是添加到当前对话
  chatStore.addMessageToConversation(
    activeConversationId,
    MessageRole.USER,
    text,
    currentImages,
    currentFiles,
  );

  // 添加 AI 占位消息到指定对话
  const aiMessage = chatStore.addMessageToConversation(
    activeConversationId,
    MessageRole.ASSISTANT,
    '',
  );

  chatStore.updateMessageInConversation(
    activeConversationId,
    aiMessage.id,
    {
      isStreaming: true,
      isEnd: false,
    },
    true,
  );

  const ctrl = new AbortController();

  chatStore.startStreaming(activeConversationId, aiMessage.id, ctrl);
  chatStore.setConversationTyping(activeConversationId, true);

  // 发送后立即清空附件，避免等待流式结束才清空
  chatStore.clearFileNameList();
  chatStore.clearImgList();

  const params = {
    userId: getUserInfo().userId,
    message: text,
    images: currentImages.map((v): any => v.fileName),
    files: currentFiles.map((v): any => v.fileName),
    knowledgeBaseIds: [knowledgeBaseId.value],
    mode: searchType,
    enableRerank: true,
    enableHyde: true,
    enableExpansion: false,
    topK: 52,
    minScore: 100,
    docSessionId: currentDocSessionId,
  };

  const sessionId = getRequestSessionId(activeConversationId);

  const request = sessionId ? Object.assign(params, { sessionId }) : params;

  try {
    await streamChats(request, activeConversationId, aiMessage.id, true, ctrl);
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      chatStore.updateMessageInConversation(
        activeConversationId,
        aiMessage.id,
        {
          isStreaming: false,
          isEnd: true,
          isError: true,
          errorMessage: (error as Error).message || t('chatMain.requestFailed'),
        },
        true,
      );
    }
  } finally {
    chatStore.finishStreaming(activeConversationId);
  }
}

async function streamChats(
  request: ChatRequest,
  conversationId: string,
  messageId: string,
  showTyping: boolean,
  ctrl: AbortController,
) {
  let fullText = '';
  let reference: any = null;
  let suggestions: any = null;
  await FetchEventSource(`${API_ENDPOINTS.CHAT_STREAM}`, {
    openWhenHidden: true,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(request),
    signal: ctrl.signal,

    onmessage(event) {
      if (event.event === 'reference') {
        reference = event.data;
        return;
      }

      if (event.event === 'suggestions') {
        console.log(event.data);
        suggestions = event.data;
        return;
      }

      if (event.event === 'stopped' || event.event === 'error') {
        chatStore.updateMessageInConversation(
          conversationId,
          messageId,
          {
            isStreaming: false,
            isEnd: true,
            isBreak: true,
            messageId: event.id,
            content: fullText,
          },
          true,
        );

        chatStore.finishStreaming(conversationId);
        ctrl.abort();

        return;
      }

      if (event.event === 'done') {
        const referenceList = safeJsonParse<any[]>(reference, []);
        const suggestionsList: any = safeJsonParse<any[]>(suggestions, []);
        chatStore.updateReferenceInConversation(
          conversationId,
          messageId,
          Array.isArray(referenceList) ? referenceList : [],
        );

        chatStore.updateSuggestionsConversation(
          conversationId,
          messageId,
          Array.isArray(suggestionsList.suggestions) ? suggestionsList.suggestions : [],
        );

        chatStore.updateMessageInConversation(
          conversationId,
          messageId,
          {
            isStreaming: false,
            isEnd: true,
            messageId: event.id,
            content: fullText,
          },
          true,
        );

        chatStore.finishStreaming(conversationId);
        ctrl.abort();

        // 如果是新对话，完成后把 temp_xxx 换成后端真实 sessionId
        chatStore.getChat(
          chatStore.isTempConversationId(conversationId) ? 'create' : undefined,
          conversationId,
        );

        return;
      }

      if (event.event === 'message' && event.data) {
        if (showTyping) {
          chatStore.setConversationTyping(conversationId, false);
        }

        const data = safeJsonParse<{ message?: string }>(event.data, {});

        fullText += data.message || '';

        // 关键：更新指定 conversationId 的消息，不再更新 currentConversation
        chatStore.updateMessageContentInConversation(conversationId, messageId, fullText);

        chatStore.updateMessageInConversation(conversationId, messageId, {
          isStreaming: true,
          isEnd: false,
          messageId: event.id,
          content: fullText,
        });
      }
    },

    onclose() {
      chatStore.finishStreaming(conversationId);
    },

    onerror(err) {
      chatStore.finishStreaming(conversationId);
      throw err;
    },
  });
}

async function handleDownloadDocument(row: any) {
  try {
    const { data } = await api.base.getDocumentFileName(row.documentId);
    const res = await fetch(
      `${ossPrefix}/downloadByFileName?fileName=${encodeURIComponent(data)}`,
      {
        method: 'GET',
      },
    );

    if (!res.ok) {
      throw new Error('下载失败');
    }

    const blob = await res.blob();
    console.log(row);
    const fileName = row.documentName || row.fileOriginalName || data || row.fileName || '下载文件';
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = fileName;
    a.click();

    window.URL.revokeObjectURL(blobUrl);

    ElMessage.success('下载成功');
  } catch (error) {
    console.error('下载失败：', error);
  }
}

async function handleDownload(fileName: string, SaveName: string) {
  try {
    const res = await fetch(
      `${ossPrefix}/downloadByBucketFileName?bucketName=temp&fileName=${SaveName}`,
      {
        method: 'GET',
      },
    );

    if (!res.ok) {
      throw new Error('下载失败');
    }

    const blob = await res.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = fileName;
    a.click();

    window.URL.revokeObjectURL(blobUrl);

    ElMessage.success('下载成功');
  } catch (error) {
    console.error('下载失败：', error);
  }
}

function getFileEmoji(mimeType?: string) {
  return getFileIcon(mimeType || '');
}

function formatSize(size?: number) {
  return size ? formatFileSize(size) : '';
}

setCustomComponents('playground-demo', {
  think: ThinkingNode,
  vmr_container: EChartsContainerNode,
});
</script>

<style lang="scss" scoped>
.message-bubble {
  display: flex;
  gap: 14px;
  padding: 18px 24px;
  color: #3f332a;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: rgb(255 138 38 / 3%);
  }

  &.role-USER {
    flex-direction: row-reverse;

    .message-content-wrapper {
      align-items: flex-end;
      max-width: min(720px, 78%);
    }

    .message-header {
      flex-direction: row-reverse;
    }

    .message-body {
      width: fit-content;
      max-width: 100%;
      padding: 12px 14px;
      color: #4a3424;
      background: #fff3e8;
      border: 1px solid #ffd8b5;
      border-radius: 18px;
      box-shadow: 0 6px 16px rgb(249 115 22 / 7%);

      .dark & {
        color: #fff3e8;
        background: rgb(249 115 22 / 14%);
        border-color: rgb(255 138 38 / 24%);
        box-shadow: none;
      }
    }

    .text-content {
      max-width: 100%;

      :deep(a) {
        color: #ea6b0b;
      }

      :deep(code:not(pre code)) {
        color: #5c3519;
        background: rgb(249 115 22 / 10%);
      }
    }

    .images-grid,
    .files-list {
      max-width: 100%;
    }
  }

  &.role-ASSISTANT {
    .message-body {
      padding: 14px 16px;
      color: #3f332a;
      background: #fff;
      border: 1px solid #f0dfcf;
      border-radius: 18px;
      box-shadow:
        0 1px 2px rgb(126 72 24 / 4%),
        0 8px 20px rgb(126 72 24 / 3%);

      .dark & {
        color: #f4e9e0;
        background: #2e241e;
        border-color: #49382e;
        box-shadow: none;
      }
    }
  }

  &.compact {
    padding: 12px 20px;

    .avatar-inner {
      width: 30px;
      height: 30px;
      border-radius: 9px;

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  &.is-end {
    .message-body {
      position: relative;

      &::after {
        position: absolute;
        right: -14px;
        bottom: 10px;
        width: 6px;
        height: 6px;
        content: '';
        background: #ff8a26;
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgb(255 138 38 / 12%);
        animation: pulse 1.4s infinite;
      }
    }
  }

  &.is-error {
    .message-body {
      width: 100%;
    }
  }

  .dark & {
    color: #f4e9e0;

    &:hover {
      background: rgb(249 115 22 / 5%);
    }
  }
}

.avatar {
  flex-shrink: 0;
  padding-top: 2px;
}

.avatar-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &.ASSISTANT {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    box-shadow:
      0 6px 14px rgb(249 115 22 / 20%),
      0 0 0 3px rgb(255 138 38 / 6%);
  }

  &.USER {
    color: #d86208;
    background: #fff4e9;
    border: 1px solid #ffd7b0;
  }

  .message-bubble:hover & {
    transform: translateY(-1px);
  }

  .dark &.ASSISTANT {
    box-shadow:
      0 6px 14px rgb(0 0 0 / 20%),
      0 0 0 3px rgb(255 138 38 / 7%);
  }

  .dark &.USER {
    color: #ffb36b;
    background: rgb(249 115 22 / 12%);
    border-color: rgb(255 138 38 / 20%);
  }
}

.message-content-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  max-width: min(1000px, calc(100% - 52px));
}

.message-header {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 20px;
}

.role-name {
  font-size: 13px;
  font-weight: 600;
  color: #4a382c;

  .dark & {
    color: #f5e9df;
  }
}

.timestamp {
  font-size: 12px;
  color: #b09a89;

  .dark & {
    color: #8f7969;
  }
}

.message-body {
  max-width: 100%;
  line-height: 1.75;
  overflow-wrap: break-word;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  .dark & {
    color: #f0e6de;
  }
}

.text-content {
  font-size: 15px;

  :deep(p) {
    margin: 0 0 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 22px;
    margin: 10px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(code:not(pre code)) {
    padding: 2px 6px;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 0.9em;
    color: #b95008;
    background: #fff1e5;
    border: 1px solid #ffe0c2;
    border-radius: 6px;

    .dark & {
      color: #ffc38a;
      background: rgb(249 115 22 / 12%);
      border-color: rgb(255 138 38 / 16%);
    }
  }

  :deep(pre) {
    max-width: 100%;
    margin: 14px 0;
    overflow: auto;
    background: #1f1712;
    border: 1px solid #3c2d24;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgb(61 34 18 / 12%);
  }

  :deep(pre code) {
    display: block;
    min-width: 0;
    padding: 14px 16px;
    overflow-x: auto;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    line-height: 1.65;
    color: #f4e8df;
    white-space: pre;
    background: transparent;
  }

  :deep(a) {
    font-weight: 500;
    color: #f97316;
    text-decoration: none;
    text-underline-offset: 3px;

    &:hover {
      color: #e86408;
      text-decoration: underline;
    }
  }

  :deep(table) {
    width: 100%;
    margin: 14px 0;
    overflow: hidden;
    border-spacing: 0;
    border-collapse: separate;
    border: 1px solid #f0ddcb;
    border-radius: 10px;

    th,
    td {
      padding: 10px 12px;
      text-align: left;
      border-right: 1px solid #f0ddcb;
      border-bottom: 1px solid #f0ddcb;

      &:last-child {
        border-right: none;
      }
    }

    tr:last-child td {
      border-bottom: none;
    }

    th {
      font-weight: 600;
      color: #4a382c;
      background: #fff6ed;
    }

    tbody tr {
      transition: background 0.18s ease;

      &:hover {
        background: #fffaf5;
      }
    }

    .dark & {
      border-color: #4a382e;

      th,
      td {
        border-color: #4a382e;
      }

      th {
        color: #f4e9e0;
        background: #382b24;
      }

      tbody tr:hover {
        background: rgb(249 115 22 / 6%);
      }
    }
  }

  :deep(blockquote) {
    padding: 10px 14px;
    margin: 14px 0;
    color: #765e4c;
    background: #fff7ef;
    border-left: 3px solid #ff9a3d;
    border-radius: 8px;

    p {
      margin: 0;
    }

    .dark & {
      color: #d5c3b5;
      background: rgb(249 115 22 / 8%);
      border-left-color: #ff8a26;
    }
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 18px 0 10px;
    font-weight: 650;
    line-height: 1.35;
    color: inherit;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h1) {
    font-size: 1.45em;
  }

  :deep(h2) {
    font-size: 1.28em;
  }

  :deep(h3) {
    font-size: 1.15em;
  }

  :deep(h4) {
    font-size: 1em;
  }

  :deep(hr) {
    height: 1px;
    margin: 20px 0;
    background: #f0ddcb;
    border: none;

    .dark & {
      background: #4a382e;
    }
  }
}

// 操作行：复制 / 重新生成 / 回答版本切换（同一行、统一样式风格）
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

// 回答版本切换器（仅 ASSISTANT 多版本回答可见），与 MessageActions 同一卡片风格
.variant-switcher {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 40px;
  padding: 4px;
  pointer-events: none;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.2s ease;

  .dark & {
    background: #2d2d3d;
    box-shadow: 0 2px 8px rgb(0 0 0 / 30%);
  }

  &.visible {
    pointer-events: auto;
    opacity: 1;
    transform: translateY(0);
  }

  &.switching {
    pointer-events: none;
    opacity: 0.6;
  }

  .variant-nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 32px;
    padding: 0;
    color: #6b7280;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 8px;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      color: #374151;
      background: #f3f4f6;

      .dark & {
        color: #e5e7eb;
        background: #374151;
      }
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  }

  .variant-label {
    min-width: 40px;
    padding: 0 2px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: #6b7280;
    text-align: center;
    user-select: none;

    .dark & {
      color: #9ca3af;
    }
  }
}

.error-content {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  font-size: 14px;
  color: #b42318;
  background: #fff4f3;
  border: 1px solid #ffd7d3;
  border-radius: 12px;

  .retry-btn {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 6px 12px;
    margin-left: auto;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    background: #ef4444;
    border: none;
    border-radius: 999px;
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover {
      background: #dc2626;
      box-shadow: 0 6px 14px rgb(239 68 68 / 20%);
      transform: translateY(-1px);
    }

    &:active {
      box-shadow: none;
      transform: translateY(0);
    }
  }

  .dark & {
    color: #fecaca;
    background: rgb(239 68 68 / 10%);
    border-color: rgb(239 68 68 / 25%);
  }
}

/* 推荐引用 */
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.suggestion-btn {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  max-width: 100%;
  padding: 8px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #6f4b32;
  white-space: nowrap;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0ddcb;
  border-radius: 999px;
  box-shadow: 0 3px 10px rgb(126 72 24 / 4%);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  svg {
    flex-shrink: 0;
    color: #ff8a26;
  }

  &:hover {
    color: #d95f06;
    background: #fff4e9;
    border-color: #ffc58f;
    box-shadow: 0 6px 16px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }

  .dark & {
    color: #eaded5;
    background: #30251f;
    border-color: #4a382e;
    box-shadow: none;

    &:hover {
      color: #ffbd7c;
      background: rgb(249 115 22 / 12%);
      border-color: rgb(255 138 38 / 32%);
    }
  }
}

/* 图片展示 */
.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  margin-top: 10px;
}

.image-item {
  position: relative;
  flex: 0 0 auto;
  width: 132px;
  height: 132px;
  overflow: hidden;
  cursor: zoom-in;
  background: #fff5eb;
  border: 1px solid #f0ddcb;
  border-radius: 14px;
  box-shadow: 0 5px 14px rgb(126 72 24 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s ease;
  }

  .image-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: rgb(103 52 16 / 38%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    border-color: #ffbd7c;
    box-shadow: 0 8px 20px rgb(249 115 22 / 12%);
    transform: translateY(-1px);

    img {
      transform: scale(1.04);
    }

    .image-overlay {
      opacity: 1;
    }
  }

  .dark & {
    background: #30251f;
    border-color: #4a382e;
    box-shadow: none;

    &:hover {
      border-color: rgb(255 138 38 / 32%);
    }
  }
}

.single-video {
  margin-top: 12px;

  video {
    width: 100%;
    max-width: 520px;
    overflow: hidden;
    background: #000;
    border: 1px solid #f0ddcb;
    border-radius: 14px;
    box-shadow: 0 8px 20px rgb(126 72 24 / 8%);
  }
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.video-item {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  cursor: pointer;
  background: #fff5eb;
  border: 1px solid #f0ddcb;
  border-radius: 14px;
  box-shadow: 0 5px 14px rgb(126 72 24 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

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
    background: rgb(103 52 16 / 28%);
    transition: background 0.2s ease;
  }

  .video-duration {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 2px 8px;
    font-size: 12px;
    color: #fff;
    background: rgb(65 34 15 / 75%);
    border-radius: 999px;
  }

  &:hover {
    border-color: #ffbd7c;
    box-shadow: 0 8px 20px rgb(249 115 22 / 12%);
    transform: translateY(-1px);

    .video-overlay {
      background: rgb(103 52 16 / 46%);
    }
  }
}

/* 文件展示 */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, 100%);
  margin-top: 10px;
}

.file-item {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0ddcb;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgb(126 72 24 / 4%);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #fff8f1;
    border-color: #ffc58f;
    box-shadow: 0 7px 18px rgb(249 115 22 / 9%);
    transform: translateY(-1px);

    .file-icon {
      background: #ffead7;
      transform: scale(1.03);
    }
  }

  .dark & {
    background: #30251f;
    border-color: #4a382e;
    box-shadow: none;

    &:hover {
      background: #382b24;
      border-color: rgb(255 138 38 / 30%);
    }
  }
}

.file-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  background: #fff4e9;
  border: 1px solid #ffe0c2;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  .dark & {
    background: rgb(249 115 22 / 10%);
    border-color: rgb(255 138 38 / 14%);
  }
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: #4a382c;
  white-space: nowrap;

  .dark & {
    color: #f4e9e0;
  }
}

.file-size {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.3;
  color: #aa9585;

  .dark & {
    color: #8f7969;
  }
}

.download-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: #a16d48;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #f97316;
    background: #ffead7;
    box-shadow: 0 4px 10px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }

  &:active {
    box-shadow: none;
    transform: translateY(0);
  }

  .dark & {
    color: #c9b4a5;

    &:hover {
      color: #ffb36b;
      background: rgb(249 115 22 / 12%);
      box-shadow: none;
    }
  }
}

/* 加载动画 */
.loading-dots {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 6px 0;

  span {
    width: 7px;
    height: 7px;
    background: #ff8a26;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgb(255 138 38 / 8%);
    animation: loading-dot 1.2s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.24s;
    }

    &:nth-child(2) {
      animation-delay: -0.12s;
    }
  }
}

@media (width <=768px) {
  .message-bubble {
    gap: 10px;
    padding: 14px 12px;

    &.role-USER {
      .message-content-wrapper {
        max-width: calc(100% - 44px);
      }

      .message-body {
        max-width: 100%;
      }
    }
  }

  .message-content-wrapper {
    max-width: calc(100% - 44px);
  }

  .image-item {
    width: 108px;
    height: 108px;
    border-radius: 12px;
  }

  .files-list {
    width: min(320px, 100%);
  }
}

@keyframes loading-dot {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: scale(0.75);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.45;
    transform: scale(0.8);
  }
}
</style>
