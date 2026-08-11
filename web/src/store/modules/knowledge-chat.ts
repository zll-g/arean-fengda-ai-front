import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ConversationSettings, Message } from '@/types/chat';
import { MessageRole } from '@/types/chat';
import { generateId } from '@/utils/helpers';
import api from '@/api';
import { useRouter } from 'vue-router';

type ToolType =
  | 'KNOWLEDGE_QA'
  | 'DEEP_SEARCH'
  | 'DEEP_RESEARCH'
  | 'DOCUMENT_ANALYSIS'
  | 'WEB_SEARCH'
  | '';

type ConversationRuntime = {
  isStreaming: boolean;
  isTyping: boolean;
  controller: AbortController | null;
  messageId: string | null;
};

const TEMP_ID_PREFIX = 'temp_';

export const useChatStore = defineStore('knowledge-chat', () => {
  const router = useRouter();
  // 刷新文档状态
  const refreshStatus = ref(false);
  const conversations = ref<any[]>([]);
  const currentConversationId = ref<string | null>(null);
  const currentConversation = ref({} as any);

  // 每个对话自己的消息缓存，切换对话时不会丢掉正在流式生成的内容
  const conversationCache = ref<Record<string, any>>({});

  // 每个对话自己的运行状态：是否生成中、AbortController、当前流式消息 id
  const runtimeMap = ref<Record<string, ConversationRuntime>>({});

  const knowledgeBaseId = ref('');
  const dataSourceId = ref('');
  const fileNameList = ref([] as any[]);
  const imgList = ref([] as any[]);

  const selectedTool = ref<ToolType>(
    (localStorage.getItem('SELECTED_TOOL') as ToolType) || 'KNOWLEDGE_QA',
  );

  const activeConversationId = computed(() => {
    return currentConversation.value?.id || currentConversationId.value || '';
  });

  const isStreaming = computed(() => {
    return !!runtimeMap.value[activeConversationId.value]?.isStreaming;
  });

  const isTyping = computed(() => {
    return !!runtimeMap.value[activeConversationId.value]?.isTyping;
  });

  const streamController = computed(() => {
    return runtimeMap.value[activeConversationId.value]?.controller || null;
  });

  const sortedConversations = computed(() => {
    return [...conversations.value].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.lastMessageAt - a.lastMessageAt;
    });
  });

  const pinnedConversations = computed(() => {
    return sortedConversations.value.filter((c) => c.pinned && !c.archived);
  });

  const recentConversations = computed(() => {
    return sortedConversations.value.filter((c) => !c.pinned && !c.archived);
  });

  function isTempConversationId(id?: string | null) {
    return !!id && String(id).startsWith(TEMP_ID_PREFIX);
  }

  function createDefaultRuntime(): ConversationRuntime {
    return {
      isStreaming: false,
      isTyping: false,
      controller: null,
      messageId: null,
    };
  }

  function ensureRuntime(conversationId: string) {
    if (!runtimeMap.value[conversationId]) {
      runtimeMap.value[conversationId] = createDefaultRuntime();
    }

    return runtimeMap.value[conversationId];
  }

  function getConversationRuntime(conversationId: string) {
    return runtimeMap.value[conversationId] || createDefaultRuntime();
  }

  function cacheConversation(conversation: any) {
    if (!conversation?.id) return conversation;

    const old = conversationCache.value[conversation.id];

    const cached = {
      ...old,
      ...conversation,
      messages: conversation.messages ?? old?.messages ?? [],
    };

    conversationCache.value[conversation.id] = cached;

    return cached;
  }

  function getConversation(conversationId?: string | null) {
    if (!conversationId) return null;

    return (
      conversationCache.value[conversationId] ||
      conversations.value.find((item) => item.id === conversationId) ||
      null
    );
  }

  function syncCurrentConversation(conversationId: string) {
    if (currentConversationId.value === conversationId && conversationCache.value[conversationId]) {
      currentConversation.value = conversationCache.value[conversationId];
    }
  }

  function updateConversationInList(conversationId: string, updates: any) {
    const index = conversations.value.findIndex((item) => item.id === conversationId);

    if (index !== -1) {
      conversations.value[index] = {
        ...conversations.value[index],
        ...updates,
      };
    }
  }

  function updateSelectedTool(value: ToolType) {
    selectedTool.value = value;
    localStorage.setItem('SELECTED_TOOL', value);
  }

  function createConversation(): string {
    const id = `${TEMP_ID_PREFIX}${generateId()}`;

    const newConversation: any = {
      id,
      title: '新对话',
      messages: [],
      knowledgeBaseId: '',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      pinned: false,
      archived: false,
      settings: undefined,
    };

    cacheConversation(newConversation);

    currentConversationId.value = id;
    currentConversation.value = conversationCache.value[id];

    updateSelectedTool('KNOWLEDGE_QA');
    saveToStorage();

    return id;
  }

  async function getChat(type?: string, tempConversationId?: string) {
    try {
      const res: any = await api.knowledgeQa.getChatHistory();
      const serverList = res.data || [];

      if (!serverList.length) {
        const streamingLocalList = conversations.value.filter(
          (item) => runtimeMap.value[item.id]?.isStreaming,
        );

        conversations.value = streamingLocalList;

        if (!streamingLocalList.length) {
          currentConversation.value = {};
          currentConversationId.value = '';
        }

        saveToStorage();
        return;
      }

      // 新对话完成后，把临时 id 替换成后端真实 id
      if (type === 'create' && tempConversationId && isTempConversationId(tempConversationId)) {
        const serverConversation = serverList[0];
        const localConversation = conversationCache.value[tempConversationId];

        if (serverConversation?.id) {
          conversationCache.value[serverConversation.id] = {
            ...serverConversation,
            messages: localConversation?.messages || [],
          };

          delete conversationCache.value[tempConversationId];

          if (runtimeMap.value[tempConversationId]) {
            runtimeMap.value[serverConversation.id] = runtimeMap.value[tempConversationId];
            delete runtimeMap.value[tempConversationId];
          }

          conversations.value = serverList;

          if (currentConversationId.value === tempConversationId) {
            currentConversationId.value = serverConversation.id;
            currentConversation.value = conversationCache.value[serverConversation.id];
          }

          saveToStorage();
          return;
        }
      }

      // 正在生成中的本地对话不能被历史列表接口覆盖
      const streamingLocalList = conversations.value.filter((item) => {
        return (
          runtimeMap.value[item.id]?.isStreaming &&
          !serverList.some((serverItem: any) => serverItem.id === item.id)
        );
      });

      conversations.value = [...streamingLocalList, ...serverList];

      serverList.forEach((item: any) => {
        if (conversationCache.value[item.id]) {
          conversationCache.value[item.id] = {
            ...item,
            messages: conversationCache.value[item.id].messages || [],
          };
        }
      });

      saveToStorage();
    } catch (error) {
      console.error('获取对话列表失败：', error);
    }
  }

  function deleteConversation(id: string) {
    if (isTempConversationId(id)) {
      conversations.value = conversations.value.filter((item) => item.id !== id);
      delete conversationCache.value[id];
      delete runtimeMap.value[id];

      if (currentConversationId.value === id) {
        currentConversationId.value = conversations.value[0]?.id || '';
        currentConversation.value = currentConversationId.value
          ? getConversation(currentConversationId.value) || {}
          : {};
      }

      saveToStorage();
      return;
    }

    api.knowledgeQa.romoveChatMessages(id).then(() => {
      delete conversationCache.value[id];
      delete runtimeMap.value[id];

      getChat();

      if (currentConversation.value.id === id) {
        currentConversation.value = {};
        currentConversationId.value = '';
      }
    });
  }

  async function selectConversation(data: any, type?: string) {
    if (!data?.id) return;

    const conversationId = data.id;

    currentConversationId.value = conversationId;

    const cachedConversation = conversationCache.value[conversationId];

    // 如果该对话正在生成，直接用本地缓存，不能重新请求覆盖
    if (runtimeMap.value[conversationId]?.isStreaming && cachedConversation) {
      currentConversation.value = cachedConversation;

      if (type === 'h5') {
        router.push('/h5/knowledge-qa');
      }

      return;
    }

    // 有缓存时先展示缓存，避免切换闪烁
    if (cachedConversation?.messages) {
      currentConversation.value = cachedConversation;
    } else {
      currentConversation.value = {
        ...data,
        messages: [],
      };
    }

    try {
      const res: any = await api.knowledgeQa.getChatMessages(conversationId);

      // 防止快速切换时，旧请求回来覆盖新选中的对话
      if (currentConversationId.value !== conversationId) return;

      const nextConversation = cacheConversation({
        ...data,
        messages: (res.data || []).map((item: any) => {
          return {
            ...item,
            isEnd: true,
          };
        }),
      });

      currentConversation.value = nextConversation;

      if (type === 'h5') {
        router.push('/h5/knowledge-qa');
      }
    } catch (error) {
      console.error('获取对话消息失败：', error);
    }
  }

  function togglePinConversation(id: string) {
    const conversation = conversations.value.find((c) => c.id === id);

    if (conversation) {
      conversation.pinned = !conversation.pinned;
      saveToStorage();
    }
  }

  function renameConversation(id: string, newTitle: string) {
    api.knowledgeQa.updateTitle(id, newTitle).then(() => {
      const conversation = conversations.value.find((c) => c.id === id);

      if (conversation) {
        conversation.title = newTitle;
        conversation.lastMessageAt = Date.now();

        if (conversationCache.value[id]) {
          conversationCache.value[id].title = newTitle;
          conversationCache.value[id].lastMessageAt = conversation.lastMessageAt;
        }

        saveToStorage();
      }
    });
  }

  function updateConversationSettings(id: string, convSettings: ConversationSettings) {
    const conversation = conversations.value.find((c) => c.id === id);

    if (conversation) {
      conversation.settings = {
        ...conversation.settings,
        ...convSettings,
      };
      conversation.lastMessageAt = Date.now();

      if (conversationCache.value[id]) {
        conversationCache.value[id].settings = conversation.settings;
        conversationCache.value[id].lastMessageAt = conversation.lastMessageAt;
      }

      saveToStorage();
    }
  }

  function addMessageToConversation(
    conversationId: string,
    role: MessageRole,
    content: string,
    images?: any,
    files?: any,
  ) {
    let conversation = conversationCache.value[conversationId];

    if (!conversation) {
      const listConversation = conversations.value.find((item) => item.id === conversationId);

      conversation = cacheConversation({
        ...(listConversation || {}),
        id: conversationId,
        title: listConversation?.title || '新对话',
        messages: [],
        createdAt: listConversation?.createdAt || Date.now(),
        lastMessageAt: Date.now(),
        pinned: !!listConversation?.pinned,
        archived: !!listConversation?.archived,
      });
    }

    if (!conversation.messages) {
      conversation.messages = [];
    }

    const message: any = {
      id: generateId(),
      role,
      content,
      createdAt: Date.now(),
      isStreaming: false,
      isEnd: role === MessageRole.USER,
      imageList: images,
      fileList: files,
    };

    conversation.messages.push(message);
    conversation.lastMessageAt = Date.now();

    updateConversationInList(conversationId, {
      lastMessageAt: conversation.lastMessageAt,
    });

    syncCurrentConversation(conversationId);
    saveToStorage();

    return message;
  }

  function addMessage(role: MessageRole, content: string, images?: any, files?: any) {
    const conversationId = activeConversationId.value;

    if (!conversationId) return null;

    return addMessageToConversation(conversationId, role, content, images, files);
  }

  function updateMessageInConversation(
    conversationId: string,
    messageId: string,
    updates: Partial<Message>,
    shouldSave = false,
  ) {
    const conversation = conversationCache.value[conversationId];

    if (!conversation?.messages) return;

    const message = conversation.messages.find((m: Message) => m.id === messageId);

    if (message) {
      Object.assign(message, updates);
      syncCurrentConversation(conversationId);

      if (shouldSave) {
        saveToStorage();
      }
    }
  }

  function updateMessage(messageId: string, updates: Partial<Message>) {
    const conversationId = activeConversationId.value;

    if (!conversationId) return;

    updateMessageInConversation(conversationId, messageId, updates, true);
  }

  function updateMessageContentInConversation(
    conversationId: string,
    messageId: string,
    text: string,
  ) {
    updateMessageInConversation(conversationId, messageId, { content: text });
  }

  function updateMessageContent(messageId: string, text: string) {
    const conversationId = activeConversationId.value;

    if (!conversationId) return;

    updateMessageContentInConversation(conversationId, messageId, text);
  }

  function updateReferenceInConversation(
    conversationId: string,
    messageId: string,
    reference: any[],
  ) {
    updateMessageInConversation(
      conversationId,
      messageId,
      {
        reference: JSON.stringify(reference || []),
      },
      true,
    );
  }

  function updateReference(messageId: string, reference: any[]) {
    const conversationId = activeConversationId.value;

    if (!conversationId) return;

    updateReferenceInConversation(conversationId, messageId, reference);
  }

  function setMessageFeedback(messageId: string, feedback: 'like' | 'dislike' | null) {
    const conversationId = activeConversationId.value;
    const conversation = conversationCache.value[conversationId];

    if (!conversation?.messages) return;

    const message = conversation.messages.find((m: Message) => m.id === messageId);

    if (message) {
      message.feedback = {
        liked: feedback === 'like',
        disliked: feedback === 'dislike',
        copied: message.feedback?.copied,
      };

      syncCurrentConversation(conversationId);
      saveToStorage();
    }
  }

  function setMessageCopied(messageId: string) {
    const conversationId = activeConversationId.value;
    const conversation = conversationCache.value[conversationId];

    if (!conversation?.messages) return;

    const message = conversation.messages.find((m: Message) => m.id === messageId);

    if (message) {
      message.feedback = {
        ...message.feedback,
        copied: true,
      };

      syncCurrentConversation(conversationId);
    }
  }

  function startStreaming(
    conversationId?: string,
    messageId?: string,
    controller?: AbortController,
  ) {
    const id = conversationId || activeConversationId.value;

    if (!id) return null;

    const runtime = ensureRuntime(id);

    runtime.isStreaming = true;
    runtime.isTyping = true;
    runtime.messageId = messageId || null;
    runtime.controller = controller || new AbortController();

    return runtime.controller;
  }

  function setConversationTyping(conversationId: string, value: boolean) {
    const runtime = ensureRuntime(conversationId);
    runtime.isTyping = value;
  }

  function stopStreaming(conversationId?: string, abort = true) {
    const id = conversationId || activeConversationId.value;

    if (!id) return;

    const runtime = ensureRuntime(id);

    if (abort && runtime.controller) {
      runtime.controller.abort();
    }

    runtime.isStreaming = false;
    runtime.isTyping = false;
    runtime.controller = null;
    runtime.messageId = null;
  }

  function finishStreaming(conversationId?: string) {
    stopStreaming(conversationId, false);
  }

  function updateKnowledgeBaseId(id: string) {
    knowledgeBaseId.value = id;
  }

  function updateDataSourceId(id: string) {
    dataSourceId.value = id;
  }

  function updateFileNameList(file: any) {
    fileNameList.value.push(file);
  }

  function clearFileNameList() {
    fileNameList.value = [];
  }

  function updateImgList(img: any) {
    imgList.value.push(img);
  }

  function clearImgList() {
    imgList.value = [];
  }

  function removeFile(id: string) {
    const imgIndex = imgList.value.findIndex((a) => a.id === id);
    const fileIndex = fileNameList.value.findIndex((a) => a.id === id);

    if (imgIndex !== -1) {
      imgList.value.splice(imgIndex, 1);
    }

    if (fileIndex !== -1) {
      fileNameList.value.splice(fileIndex, 1);
    }
  }

  function clearConversation(id: string) {
    const conversation = conversations.value.find((c) => c.id === id);

    if (conversation) {
      conversations.value = [];
      conversationCache.value = {};
      runtimeMap.value = {};
      currentConversation.value = {};
      currentConversationId.value = '';
      saveToStorage();
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem('chat-conversations', JSON.stringify(conversations.value));
      localStorage.setItem('chat-current-id', currentConversationId.value || '');
      localStorage.setItem('SELECTED_TOOL', selectedTool.value);
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem('chat-conversations');

      if (stored) {
        conversations.value = JSON.parse(stored);
      }

      const storedId = localStorage.getItem('chat-current-id');

      if (storedId && conversations.value.find((c) => c.id === storedId)) {
        currentConversationId.value = storedId;
      } else if (conversations.value.length > 0) {
        currentConversationId.value = conversations.value[0].id;
      }

      selectedTool.value = (localStorage.getItem('SELECTED_TOOL') as ToolType) || 'KNOWLEDGE_QA';
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }

  function onChangeRefreshStatus() {
    refreshStatus.value = !refreshStatus.value;
  }

  getChat();

  return {
    conversations,
    currentConversation,
    currentConversationId,
    knowledgeBaseId,
    dataSourceId,
    selectedTool,
    fileNameList,
    imgList,
    isStreaming,
    isTyping,
    streamController,
    sortedConversations,
    pinnedConversations,
    recentConversations,
    refreshStatus,
    getChat,
    onChangeRefreshStatus,
    getConversation,
    getConversationRuntime,
    isTempConversationId,
    createConversation,
    deleteConversation,
    selectConversation,
    togglePinConversation,
    renameConversation,
    updateConversationSettings,
    addMessage,
    addMessageToConversation,
    updateMessage,
    updateMessageInConversation,
    updateMessageContent,
    updateMessageContentInConversation,
    updateReference,
    updateReferenceInConversation,
    setMessageFeedback,
    setMessageCopied,
    startStreaming,
    stopStreaming,
    finishStreaming,
    setConversationTyping,
    clearConversation,
    loadFromStorage,
    updateKnowledgeBaseId,
    updateDataSourceId,
    updateSelectedTool,
    updateFileNameList,
    clearFileNameList,
    updateImgList,
    clearImgList,
    removeFile,
  };
});
