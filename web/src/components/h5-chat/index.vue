<template>
  <main class="chat-main" :class="{ 'wide-mode': isWideMode }">
    <!-- 头部 -->
    <ChatHeader
      :title="currentConversation?.title || '新对话'"
      :message-count="messages.length"
      :show-sidebar-toggle="sidebarCollapsed"
      :is-wide-mode="isWideMode"
      :is-pinned="currentConversation?.pinned"
      @toggle-sidebar="$emit('toggle-sidebar')"
      @toggle-wide-mode="toggleWideMode"
      @clear="handleClear"
      @export="handleExport"
      @pin="handlePin"
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
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/store/modules/knowledge-chat';
import { useSettingsStore } from '@/store/modules/settings';
import ChatHeader from './ChatHeader.vue';
import MessageList from './MessageList.vue';
import ChatInput from '@/components/input/ChatInput.vue';
import { API_ENDPOINTS, type ChatRequest, chatApi } from '@/api/modules/chat';
import { MessageRole } from '@/types/chat';
import { getToken, getUserInfo } from '@/utils/device';
import { fetchEventSource as FetchEventSource } from '@microsoft/fetch-event-source';
import { useI18n } from 'vue-i18n';
import { generateId } from '@/utils/helpers';
defineEmits<{
  'toggle-sidebar': [];
}>();

const chatStore = useChatStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
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

const conversationId: any = computed(() => {
  return currentConversation.value?.id || currentConversationId.value;
});
const messages: any = computed(() => currentConversation.value?.messages || []);

const inputPlaceholder = computed(() => {
  if (isStreaming.value) return '正在生成回复...';
  return '输入你的问题，按 Ctrl+Enter 发送';
});

function toggleWideMode() {
  isWideMode.value = !isWideMode.value;
}

function handleClear() {
  if (currentConversation.value) {
    chatStore.clearConversation(currentConversation.value.id);
  }
}

function handleExport() {
  if (!currentConversation.value) return;

  const data = {
    title: currentConversation.value.title,
    messages: currentConversation.value.messages,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentConversation.value.title}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handlePin() {
  if (currentConversation.value) {
    chatStore.togglePinConversation(currentConversation.value.id);
  }
}

// 发送消息 - 使用真实 API
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
  };

  const mergeParams =
    searchType === 'DOCUMENT_ANALYSIS'
      ? Object.assign(params, { docSessionId: currentDocSessionId })
      : params;

  const sessionId = getRequestSessionId(activeConversationId);

  const request = sessionId ? Object.assign(mergeParams, { sessionId }) : mergeParams;

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

function getRequestSessionId(id: string) {
  if (!id || chatStore.isTempConversationId(id)) {
    return '';
  }

  return id;
}

// 停止生成
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

function safeJsonParse<T = any>(data: any, fallback: T): T {
  try {
    if (!data) return fallback;

    return JSON.parse(data);
  } catch {
    return fallback;
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
  background: #fff;

  .dark & {
    background: #11111b;
  }

  &.wide-mode {
    .input-container {
      max-width: 1000px;
    }
  }
}

.input-wrapper {
  flex-shrink: 0;
  padding: 16px 24px 24px;
  background: linear-gradient(to top, white 80%, transparent);

  .dark & {
    background: linear-gradient(to top, #11111b 80%, transparent);
  }
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
  transition: max-width 0.3s ease;

  &.wide {
    max-width: 1000px;
  }
}
</style>
