<template>
  <main class="chat-main" :class="{ 'wide-mode': isWideMode }">
    <!-- 头部 -->
    <ChatHeader
      :title="currentConversation?.title || t('chatMain.newConversation')"
      :message-count="messages.length"
      :show-sidebar-toggle="sidebarCollapsed"
      :is-wide-mode="isWideMode"
      :is-pinned="currentConversation?.pinned"
    />

    <!-- 消息列表 -->
    <MessageList
      ref="messageListRef"
      :messages="messages"
      :show-timestamp="settings.showTimestamp"
      :compact="settings.compactMode"
      :is-typing="isTyping"
      @retry="handleRetry"
      @regenerate="handleRegenerate"
      @select-suggestion="handleSuggestion"
    />

    <!-- 输入区域 -->
    <div class="input-wrapper">
      <div class="input-container" :class="{ wide: isWideMode }">
        <ChatInput
          ref="chatInputRef"
          :placeholder="inputPlaceholder"
          :is-streaming="isStreaming"
          :current-chat-id="currentConversationId"
          :send-on-enter="settings.sendOnEnter"
          :disabled="false"
          @send="handleSend"
          @stop="handleStop"
        />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/store/modules/knowledge-chat';
import { useSettingsStore } from '@/store/modules/settings';
import ChatHeader from './components/ChatHeader.vue';
import MessageList from './components/MessageList.vue';
import ChatInput from '@/components/input/ChatInput.vue';
import { API_ENDPOINTS, type ChatRequest, chatApi } from '@/api/modules/chat';
import { MessageRole } from '@/types/chat';
import { fetchEventSource as FetchEventSource } from '@microsoft/fetch-event-source';
import { getToken, getUserInfo } from '@/utils/device';
import { generateId } from '@/utils/helpers';

const { t } = useI18n();

defineEmits<{
  'toggle-sidebar': [];
}>();

const chatStore = useChatStore();
const settingsStore = useSettingsStore();

const {
  currentConversation,
  currentConversationId,
  isStreaming,
  isTyping,
  knowledgeBaseId,
  fileNameList,
  imgList,
} = storeToRefs(chatStore);

const { settings, sidebarCollapsed } = storeToRefs(settingsStore);

const messageListRef = ref<InstanceType<typeof MessageList> | null>(null);
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null);

const isWideMode = ref(true);

const messages: any = computed(() => currentConversation.value?.messages || []);

const conversationId: any = computed(() => {
  return currentConversation.value?.id || currentConversationId.value;
});

const inputPlaceholder = computed(() => {
  if (isStreaming.value) {
    return t('chatMain.generatingReply');
  }

  return t('chatMain.placeholder');
});

// function toggleWideMode() {
//   isWideMode.value = !isWideMode.value;
// }

// function handleClear() {
//   if (currentConversation.value?.id) {
//     chatStore.deleteConversation(currentConversation.value.id);
//   }
// }

// function handleExport() {
//   if (!currentConversation.value) return;

//   const data = {
//     title: currentConversation.value.title,
//     messages: currentConversation.value.messages,
//     exportedAt: new Date().toISOString(),
//   };

//   const blob = new Blob([JSON.stringify(data, null, 2)], {
//     type: 'application/json',
//   });

//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');

//   a.href = url;
//   a.download = `${currentConversation.value.title}.json`;
//   a.click();

//   URL.revokeObjectURL(url);
// }

// function handlePin() {
//   if (currentConversation.value?.id) {
//     chatStore.togglePinConversation(currentConversation.value.id);
//   }
// }

function safeJsonParse<T = any>(data: any, fallback: T): T {
  try {
    if (!data) return fallback;

    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function getRequestSessionId(id: string) {
  if (!id || chatStore.isTempConversationId(id)) {
    return '';
  }

  return id;
}

// 发送消息
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

// 停止当前对话生成，只停止当前选中的对话，不影响其它对话
function handleStop() {
  const activeConversationId = conversationId.value;

  if (!activeConversationId) return;

  const runtime = chatStore.getConversationRuntime(activeConversationId);
  const streamingMessageId = runtime.messageId;

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

  const sessionId = getRequestSessionId(activeConversationId);

  if (sessionId) {
    chatApi.stopChat(getUserInfo().userId, sessionId);
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

        chatStore.updateReferenceInConversation(
          conversationId,
          messageId,
          Array.isArray(referenceList) ? referenceList : [],
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

// 重试
async function handleRetry(messageId: string) {
  const activeConversationId = conversationId.value;

  if (!activeConversationId) return;

  const currentMessages = messages.value;
  const message = currentMessages.find((m: any) => m.id === messageId);

  if (!message || message.role !== MessageRole.ASSISTANT) return;

  const messageIndex = currentMessages.findIndex((m: any) => m.id === messageId);

  if (messageIndex <= 0) return;

  const userMessage = currentMessages[messageIndex - 1];

  if (userMessage.role !== MessageRole.USER) return;

  chatStore.updateMessageInConversation(
    activeConversationId,
    messageId,
    {
      isError: false,
      errorMessage: undefined,
      isStreaming: true,
      isEnd: false,
      isBreak: false,
      content: '',
    },
    true,
  );

  const ctrl = new AbortController();

  chatStore.startStreaming(activeConversationId, messageId, ctrl);
  chatStore.setConversationTyping(activeConversationId, false);

  const params = {
    userId: getUserInfo().userId,
    message: userMessage.content || '',
    knowledgeBaseIds: [knowledgeBaseId.value],
    mode: localStorage.getItem('SELECTED_TOOL') || 'KNOWLEDGE_QA',
    enableRerank: true,
    enableHyde: true,
    enableExpansion: false,
    topK: 52,
    minScore: 100,
    docSessionId: activeConversationId || generateId(),
  };

  const sessionId = getRequestSessionId(activeConversationId);

  const request = sessionId ? Object.assign(params, { sessionId }) : params;

  try {
    await streamChats(request, activeConversationId, messageId, false, ctrl);
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      chatStore.updateMessageInConversation(
        activeConversationId,
        messageId,
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

function handleRegenerate(messageId: string) {
  handleRetry(messageId);
}

function handleSuggestion(text: string) {
  handleSend(text);
}

function focusInput() {
  chatInputRef.value?.focus();
}

defineExpose({
  focusInput,
  messageListRef,
});

watch(
  () => currentConversation.value?.id,
  () => {
    nextTick(() => {
      focusInput();
    });
  },
);
</script>

<style lang="scss" scoped>
.chat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 247 239 / 72%) 0, rgb(255 255 255 / 96%) 180px), #fff;

  .dark & {
    background: linear-gradient(180deg, rgb(255 138 38 / 8%) 0, transparent 180px), #17120f;
  }

  &.wide-mode {
    .input-container {
      max-width: 1000px;
    }
  }

  /* Element Plus 主按钮统一为橙色 */
  :deep(.el-button--primary) {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;
    box-shadow: 0 6px 16px rgb(255 138 38 / 18%);
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover:not(.is-disabled),
    &:focus:not(.is-disabled) {
      background: #f97a16;
      border-color: #f97a16;
      box-shadow: 0 8px 20px rgb(249 122 22 / 24%);
      transform: translateY(-1px);
    }

    &:active:not(.is-disabled) {
      background: #ea6b0b;
      border-color: #ea6b0b;
      transform: translateY(0);
    }

    &.is-disabled {
      color: #fff;
      background: #ffc58f;
      border-color: #ffc58f;
      box-shadow: none;
    }
  }

  /* 普通按钮橙色悬停 */
  :deep(.el-button:not(.el-button--primary, .el-button--danger)) {
    transition:
      color 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease;

    &:hover:not(.is-disabled),
    &:focus:not(.is-disabled) {
      color: #f97316;
      background: #fff7ef;
      border-color: #ffc995;
    }
  }

  /* 输入框、文本域聚焦统一橙色 */
  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    border-radius: 12px;
    transition:
      box-shadow 0.2s ease,
      background 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px #ffc995 inset;
    }

    &.is-focus,
    &.is-focused {
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 10%);
    }
  }

  :deep(.el-textarea__inner) {
    border-radius: 12px;
    transition: box-shadow 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px #ffc995 inset;
    }

    &:focus {
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 10%);
    }
  }

  /* 选中态、标签、链接类视觉统一 */
  :deep(.el-tag) {
    border-radius: 8px;
  }

  :deep(.el-tag--primary) {
    color: #e86f0b;
    background: #fff4e9;
    border-color: #ffd2aa;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;
    box-shadow: -1px 0 0 0 #ff8a26;
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
  :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
    background: #ff8a26;
    border-color: #ff8a26;
  }

  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #e86f0b;
  }

  :deep(.el-switch.is-checked .el-switch__core) {
    background: #ff8a26;
    border-color: #ff8a26;
  }

  :deep(.el-progress-bar__inner) {
    background: #ff8a26;
  }

  :deep(.el-loading-spinner .path) {
    stroke: #ff8a26;
  }

  :deep(.el-loading-spinner .el-loading-text) {
    color: #f97316;
  }

  /* 滚动条使用浅橙灰色 */
  :deep(.el-scrollbar__thumb) {
    background: #f3b77f;
  }

  :deep(.el-scrollbar__thumb:hover) {
    background: #eb9b50;
  }

  /* 常见激活类统一为橙色，兼容子组件 */
  :deep(.active),
  :deep(.is-active) {
    --el-color-primary: #ff8a26;
  }
}

.input-wrapper {
  position: relative;
  flex-shrink: 0;
  padding: 16px 24px 80px;
  background: linear-gradient(to top, #fff 78%, rgb(255 250 245 / 94%) 90%, transparent);

  &::before {
    position: absolute;
    right: 12%;
    bottom: 28px;
    left: 12%;
    height: 54px;
    pointer-events: none;
    content: '';
    background: rgb(255 138 38 / 7%);
    border-radius: 50%;
    filter: blur(34px);
  }

  .dark & {
    background: linear-gradient(to top, #17120f 78%, rgb(23 18 15 / 94%) 90%, transparent);

    &::before {
      background: rgb(255 138 38 / 8%);
    }
  }
}

.input-container {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  transition: max-width 0.3s ease;

  &.wide {
    max-width: 1000px;
  }

  /* 输入组件外层常见结构增强为橙色聚焦风格 */
  :deep(.input-box),
  :deep(.chat-input),
  :deep(.input-content),
  :deep(.input-area) {
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;

    &:focus-within {
      border-color: #ffb36b;
      box-shadow:
        0 0 0 1px rgb(255 138 38 / 18%),
        0 10px 28px rgb(255 138 38 / 10%);
    }
  }

  :deep(.el-button--primary) {
    box-shadow: 0 8px 18px rgb(255 138 38 / 22%);
  }
}

@media (width <= 768px) {
  .input-wrapper {
    padding: 12px 14px 28px;

    &::before {
      right: 8%;
      bottom: 10px;
      left: 8%;
    }
  }
}
</style>
