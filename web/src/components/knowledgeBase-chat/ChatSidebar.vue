<template>
  <aside
    class="chat-sidebar"
    :class="{ collapsed: isCollapsed }"
    :style="{ width: isCollapsed ? '0px' : `${sidebarWidth}px` }"
  >
    <div class="sidebar-inner">
      <!-- 新建对话按钮 -->
      <div class="new-chat-section">
        <button class="new-chat-btn" @click="handleNewChat">
          <Plus :size="18" />
          <span>{{ t('chatSidebar.newChat') }}</span>
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="search-section">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input
            v-model="searchKeyword"
            class="search-input"
            type="text"
            :placeholder="t('chatSidebar.searchPlaceholder')"
            autocomplete="off"
            @keydown.esc.stop="clearSearch"
          />
          <button
            v-if="searchKeyword"
            class="clear-search-btn"
            type="button"
            aria-label="清空搜索"
            @click="clearSearch"
          >
            ×
          </button>
        </div>
      </div>

      <!-- 对话列表 -->
      <div class="conversations-section">
        <!-- 置顶对话 -->
        <div v-if="filteredPinnedConversations.length > 0" class="conversation-group">
          <div class="group-header">
            <Pin :size="14" />
            <span>{{ t('chatSidebar.pinned') }}</span>
          </div>

          <div class="group-list">
            <ConversationItem
              v-for="conv in filteredPinnedConversations"
              :key="conv.id"
              :conversation="conv"
              :is-active="conv.id === currentConversation.id"
              @select="selectConversation"
              @delete="deleteConversation"
              @rename="renameConversation"
              @toggle-pin="togglePinConversation"
            />
          </div>
        </div>

        <!-- 最近对话 -->
        <div v-if="filteredRecentConversations.length > 0" class="conversation-group">
          <div class="group-header">
            <Clock :size="14" />
            <span>{{ t('chatSidebar.recent') }}</span>
          </div>

          <div class="group-list">
            <ConversationItem
              v-for="conv in filteredRecentConversations"
              :key="conv.id"
              :conversation="conv"
              :is-active="conv.id === currentConversation.id"
              @select="selectConversation"
              @delete="deleteConversation"
              @rename="renameConversation"
              @toggle-pin="togglePinConversation"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="isConversationEmpty" class="empty-state">
          <MessageSquare :size="40" class="empty-icon" />
          <p>{{ searchKeyword ? '未找到相关对话' : t('chatSidebar.emptyTitle') }}</p>
          <span>{{ searchKeyword ? '换个关键词试试' : t('chatSidebar.emptyDesc') }}</span>
        </div>
      </div>

      <!-- 分割线 -->
      <div class="sidebar-divider" />
    </div>

    <!-- 拖拽调整宽度 -->
    <div class="resize-handle" @mousedown="startResize" />
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/store/modules/knowledge-chat';
import { useSettingsStore } from '@/store/modules/settings';
import ConversationItem from './components/ConversationItem.vue';
import { Clock, MessageSquare, Pin, Plus, Search } from '@/components/icons';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const chatStore = useChatStore();
const settingsStore = useSettingsStore();

const { conversations, currentConversation, pinnedConversations, recentConversations } =
  storeToRefs(chatStore);

const { sidebarCollapsed: isCollapsed, sidebarWidth } = storeToRefs(settingsStore);

const searchKeyword = ref('');

const keyword = computed(() => searchKeyword.value.trim().toLowerCase());

const recentSourceConversations = computed(() => {
  return recentConversations.value?.length ? recentConversations.value : conversations.value;
});

const filteredPinnedConversations = computed(() => {
  return filterConversations(pinnedConversations.value);
});

const filteredRecentConversations = computed(() => {
  return filterConversations(recentSourceConversations.value);
});

const isConversationEmpty = computed(() => {
  return (
    filteredPinnedConversations.value.length === 0 && filteredRecentConversations.value.length === 0
  );
});

function filterConversations(list: any[] = []) {
  if (!keyword.value) return list;

  return list.filter((item) => {
    const title = item.title || item.name || '';
    const content = item.lastMessage || item.description || item.content || '';
    return `${title} ${content}`.toLowerCase().includes(keyword.value);
  });
}

function clearSearch() {
  searchKeyword.value = '';
}

// 新建对话
function handleNewChat() {
  chatStore.createConversation();
}

// 选择对话
function selectConversation(data: any) {
  if (currentConversation.value.id !== data.id) {
    chatStore.selectConversation(data);
    chatStore.updateKnowledgeBaseId(data.knowledgeBaseIds);
  }
}

// 删除对话
function deleteConversation(id: string) {
  chatStore.deleteConversation(id);
}

// 重命名对话
function renameConversation(id: string, title: string) {
  chatStore.renameConversation(id, title);
}

// 置顶 / 取消置顶
function togglePinConversation(id: string) {
  chatStore.togglePinConversation(id);
}

// 拖拽调整宽度
const isResizing = ref(false);

function startResize(e: MouseEvent) {
  isResizing.value = true;

  const startX = e.clientX;
  const startWidth = sidebarWidth.value;

  const handleMouseMove = (e: MouseEvent) => {
    const diff = e.clientX - startX;
    settingsStore.setSidebarWidth(startWidth + diff);
  };

  const handleMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}
</script>

<style lang="scss" scoped>
.chat-sidebar {
  position: relative;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 248 241 / 72%) 0%, transparent 180px), #fffaf5;
  border-right: 1px solid #f1dfcf;
  box-shadow: 8px 0 26px rgb(126 72 24 / 4%);
  transition: width 0.3s ease;

  .dark & {
    background: linear-gradient(180deg, rgb(249 115 22 / 6%) 0%, transparent 180px), #1b1512;
    border-right-color: #44352b;
    box-shadow: none;
  }

  &.collapsed {
    .sidebar-inner {
      pointer-events: none;
      opacity: 0;
    }
  }
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  transition: opacity 0.2s ease;
}

/* 新建对话 */
.new-chat-section {
  padding: 12px 20px;
}

.new-chat-btn {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border: 1px solid #ff8a26;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgb(249 115 22 / 18%);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #ff8a26 0%, #ea6b0b 100%);
    border-color: #f97316;
    box-shadow: 0 10px 22px rgb(249 115 22 / 24%);
    transform: translateY(-1px);
  }

  &:active {
    box-shadow: 0 5px 14px rgb(249 115 22 / 16%);
    transform: translateY(0);
  }

  .dark & {
    color: #fff;
    background: linear-gradient(135deg, #f97316 0%, #e86408 100%);
    border-color: #f97316;
    box-shadow: 0 8px 18px rgb(0 0 0 / 20%);

    &:hover {
      background: linear-gradient(135deg, #ff8a26 0%, #f97316 100%);
      border-color: #ff8a26;
    }
  }
}

/* 搜索区域 */
.search-section {
  padding: 0 20px 12px;
}

.search-box {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 44px;
  padding: 0 12px;
  color: #aa9381;
  background: #fff5eb;
  border: 1px solid transparent;
  border-radius: 14px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: #fff1e5;
    border-color: #ffe0c2;
  }

  &:focus-within {
    color: #f97316;
    background: #fff;
    border-color: #ffbd7c;
    box-shadow:
      0 0 0 3px rgb(255 138 38 / 10%),
      0 7px 18px rgb(249 115 22 / 7%);
  }

  .dark & {
    color: #9e8877;
    background: rgb(255 255 255 / 4%);
    border-color: transparent;

    &:hover {
      background: rgb(249 115 22 / 7%);
      border-color: rgb(255 138 38 / 10%);
    }

    &:focus-within {
      color: #ffb36b;
      background: rgb(249 115 22 / 10%);
      border-color: rgb(255 138 38 / 32%);
      box-shadow: 0 0 0 3px rgb(255 138 38 / 10%);
    }
  }
}

.search-icon {
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 14px;
  color: #4a3b30;
  outline: none;
  background: transparent;
  border: none;

  &::placeholder {
    color: #b5a093;
  }

  .dark & {
    color: #f4e9e0;

    &::placeholder {
      color: #806f63;
    }
  }
}

.clear-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  color: #b5a093;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 50%;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #f97316;
    background: #ffead7;
    transform: rotate(90deg);
  }

  .dark & {
    color: #806f63;

    &:hover {
      color: #ffb36b;
      background: rgb(249 115 22 / 12%);
    }
  }
}

/* 对话列表 */
.conversations-section {
  flex: 1;
  min-height: 0;
  padding-bottom: 12px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #d99755;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  .dark & {
    scrollbar-color: #76513a transparent;

    &::-webkit-scrollbar-thumb {
      background: #76513a;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: #946246;
    }
  }
}

.conversation-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 24px;
  font-size: 12px;
  font-weight: 700;
  color: #b18767;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  svg {
    color: #f59e0b;
  }

  .dark & {
    color: #927762;

    svg {
      color: #f59e0b;
    }
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;

  .empty-icon {
    margin-bottom: 12px;
    color: #e7c4a5;

    .dark & {
      color: #60493a;
    }
  }

  p {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #7f6857;

    .dark & {
      color: #bda99b;
    }
  }

  span {
    font-size: 12px;
    color: #b39d8d;

    .dark & {
      color: #7b685b;
    }
  }
}

/* 分割线 */
.sidebar-divider {
  height: 1px;
  margin: 8px 20px 0;
  background: linear-gradient(90deg, transparent, #f1dcc9 16%, #f1dcc9 84%, transparent);

  .dark & {
    background: linear-gradient(90deg, transparent, #44352b 16%, #44352b 84%, transparent);
  }
}

/* 底部区域 */
.sidebar-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-top: 1px solid #f0dfd0;

  .dark & {
    border-top-color: #44352b;
  }
}

.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #8d7868;
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
    background: #fff0e2;
    box-shadow: 0 5px 14px rgb(249 115 22 / 8%);
    transform: translateY(-1px);

    .dark & {
      color: #ffb36b;
      background: rgb(249 115 22 / 10%);
      box-shadow: none;
    }
  }

  &:active {
    transform: translateY(0);
  }
}

/* 拖拽调整宽度 */
.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  z-index: 10;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  transition: background 0.18s ease;

  &:hover {
    background: rgb(255 138 38 / 34%);
  }

  &::after {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 42px;
    content: '';
    background: transparent;
    border-radius: 999px;
    transform: translate(-50%, -50%);
    transition:
      height 0.18s ease,
      background 0.18s ease;
  }

  &:hover::after {
    height: 56px;
    background: #ff8a26;
  }

  .dark & {
    &:hover {
      background: rgb(255 138 38 / 18%);
    }

    &:hover::after {
      background: #f97316;
    }
  }
}
</style>
