<template>
  <div
    class="conversation-item group"
    :class="{
      active: isActive,
      pinned: conversation.pinned,
    }"
    @click="handleSelect"
    @dblclick="handleRename"
  >
    <!-- 图标 -->
    <div class="item-icon">
      <MessageSquare :size="18" />
    </div>

    <!-- 内容 -->
    <div class="item-content">
      <div v-if="!isEditing" class="item-title">
        {{ conversation.title }}
      </div>
      <input
        v-else
        ref="inputRef"
        v-model="editTitle"
        class="item-title-input"
        @blur="handleSaveRename"
        @keydown.enter="handleSaveRename"
        @keydown.escape="handleCancelRename"
        @click.stop
      />
      <div class="item-meta">
        <Clock :size="12" />
        <span>{{ formattedTime }}</span>
      </div>
    </div>

    <!-- 置顶标识 -->
    <div v-if="conversation.pinned" class="pin-indicator">
      <Pin :size="12" />
    </div>

    <!-- 操作按钮 -->
    <div class="item-actions" @click.stop>
      <button
        class="action-btn"
        :title="conversation.pinned ? '取消置顶' : '置顶'"
        @click="handleTogglePin"
      >
        <PinOff v-if="conversation.pinned" :size="14" />
        <Pin v-else :size="14" />
      </button>
      <button class="action-btn" title="重命名" @click="handleRename">
        <Edit3 :size="14" />
      </button>
      <button class="action-btn delete" title="删除" @click="handleDelete">
        <Trash2 :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { Clock, Edit3, MessageSquare, Pin, PinOff, Trash2 } from '@/components/icons';
import { formatTimestamp } from '@/utils/helpers';
import type { Conversation } from '@/types/chat';

const props = defineProps<{
  conversation: Conversation;
  isActive: boolean;
}>();

const emit = defineEmits<{
  select: [data: object];
  delete: [id: string];
  rename: [id: string, title: string];
  togglePin: [id: string];
}>();

const isEditing = ref(false);
const editTitle = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const formattedTime = computed(() => {
  return formatTimestamp(props.conversation.updatedTime!);
});

function handleSelect() {
  if (!isEditing.value) {
    emit('select', props.conversation);
  }
}

function handleTogglePin() {
  emit('togglePin', props.conversation.id);
}

function handleRename() {
  isEditing.value = true;
  editTitle.value = props.conversation.title;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
}

function handleSaveRename() {
  if (editTitle.value.trim()) {
    emit('rename', props.conversation.id, editTitle.value.trim());
  }
  isEditing.value = false;
}

function handleCancelRename() {
  isEditing.value = false;
  editTitle.value = '';
}

function handleDelete() {
  if (confirm('确定要删除这个对话吗？')) {
    emit('delete', props.conversation.id);
  }
}
</script>

<style lang="scss" scoped>
.conversation-item {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  margin: 2px 8px;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    background: rgb(0 0 0 / 5%);

    .dark & {
      background: rgb(255 255 255 / 5%);
    }

    .item-actions {
      pointer-events: auto;
      opacity: 1;
    }

    .pin-indicator {
      opacity: 0;
    }
  }

  &.active {
    background: rgb(59 130 246 / 10%);

    .dark & {
      background: rgb(59 130 246 / 20%);
    }

    .item-icon {
      color: #3b82f6;
    }
  }
}

.item-icon {
  flex-shrink: 0;
  color: #6b7280;

  .dark & {
    color: #9ca3af;
  }
}

.item-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;

  .dark & {
    color: #f3f4f6;
  }
}

.item-title-input {
  width: 100%;
  padding: 2px 6px;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  outline: none;
  background: white;
  border: 1px solid #3b82f6;
  border-radius: 4px;

  .dark & {
    color: #f3f4f6;
    background: #374151;
  }
}

.item-meta {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 2px;
  font-size: 11px;
  color: #9ca3af;

  .dark & {
    color: #6b7280;
  }
}

.pin-indicator {
  position: absolute;
  right: 12px;
  color: #f59e0b;
  transition: opacity 0.2s ease;
}

.item-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  transition: all 0.15s ease;

  &:hover {
    color: #374151;
    background: rgb(0 0 0 / 10%);

    .dark & {
      color: #e5e7eb;
      background: rgb(255 255 255 / 10%);
    }
  }

  &.delete:hover {
    color: #ef4444;
    background: rgb(239 68 68 / 10%);
  }
}
</style>
