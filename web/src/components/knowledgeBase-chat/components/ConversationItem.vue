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
      <!-- <button
        class="action-btn"
        :title="conversation.pinned ? '取消置顶' : '置顶'"
        @click="handleTogglePin"
      >
        <PinOff v-if="conversation.pinned" :size="14" />
        <Pin v-else :size="14" />
      </button> -->
      <button class="action-btn" title="重命名" @click="handleRename">
        <Edit3 :size="14" />
      </button>

      <el-popconfirm :title="t('dataQueryChat.deleteConversation')" @confirm="handleDelete">
        <template #reference>
          <Trash2 :size="14" @click.stop />
        </template>
      </el-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { Clock, Edit3, MessageSquare, Pin, Trash2 } from '@/components/icons';
import { formatTimestamp } from '@/utils/helpers';
import type { Conversation } from '@/types/chat';
import { useI18n } from 'vue-i18n';
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
const { t } = useI18n();
const formattedTime = computed(() => {
  return formatTimestamp(props.conversation.lastMessageAt);
});

function handleSelect() {
  if (!isEditing.value) {
    emit('select', props.conversation);
  }
}

// function handleTogglePin() {
//   emit('togglePin', props.conversation.id);
// }

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
  emit('delete', props.conversation.id);
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
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #fff7ef;
    border-color: #ffe1c2;
    box-shadow: 0 5px 16px rgb(249 115 22 / 7%);
    transform: translateY(-1px);

    .dark & {
      background: rgb(249 115 22 / 10%);
      border-color: rgb(255 138 38 / 18%);
      box-shadow: none;
    }

    .item-actions {
      pointer-events: auto;
      opacity: 1;
    }

    .pin-indicator {
      opacity: 0;
    }

    .item-icon {
      color: #f97316;
      background: #ffead7;
    }
  }

  &.active {
    background: #fff1e5;
    border-color: #ffd1a6;
    box-shadow:
      inset 3px 0 0 #ff8a26,
      0 6px 16px rgb(249 115 22 / 8%);

    .dark & {
      background: rgb(249 115 22 / 16%);
      border-color: rgb(255 138 38 / 26%);
      box-shadow: inset 3px 0 0 #ff8a26;
    }

    .item-icon {
      color: #fff;
      background: #ff8a26;
      box-shadow: 0 5px 12px rgb(255 138 38 / 22%);
    }

    .item-title {
      color: #d95f06;

      .dark & {
        color: #ffb36b;
      }
    }

    .item-meta {
      color: #d88a4b;

      .dark & {
        color: #c9966d;
      }
    }
  }

  &.pinned:not(.active) {
    background: rgb(255 247 237 / 62%);

    .dark & {
      background: rgb(249 115 22 / 5%);
    }
  }
}

.item-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: #8a7462;
  background: #fff8f1;
  border-radius: 8px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  .dark & {
    color: #b8a596;
    background: rgb(255 255 255 / 5%);
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
  color: #3f332a;
  white-space: nowrap;
  transition: color 0.2s ease;

  .dark & {
    color: #f4ebe4;
  }
}

.item-title-input {
  box-sizing: border-box;
  width: 100%;
  padding: 4px 7px;
  font-size: 14px;
  font-weight: 500;
  color: #3f332a;
  outline: none;
  background: #fff;
  border: 1px solid #ff8a26;
  border-radius: 6px;
  box-shadow:
    0 0 0 3px rgb(255 138 38 / 10%),
    0 4px 12px rgb(249 115 22 / 8%);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    border-color: #f97316;
  }

  &:focus {
    border-color: #f97316;
    box-shadow:
      0 0 0 3px rgb(255 138 38 / 12%),
      0 5px 14px rgb(249 115 22 / 10%);
  }

  .dark & {
    color: #fff5ed;
    background: #3a2d25;
    border-color: #ff8a26;
  }
}

.item-meta {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 3px;
  font-size: 11px;
  color: #aa9a8d;
  transition: color 0.2s ease;

  .dark & {
    color: #88766a;
  }

  svg {
    flex-shrink: 0;
  }
}

.pin-indicator {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
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
  padding: 0;
  color: #8a7462;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    color: #f97316;
    background: #ffead7;
    box-shadow: 0 3px 8px rgb(249 115 22 / 10%);
    transform: translateY(-1px);

    .dark & {
      color: #ffb36b;
      background: rgb(249 115 22 / 14%);
      box-shadow: none;
    }
  }

  &:active {
    box-shadow: none;
    transform: translateY(0);
  }

  &.delete:hover {
    color: #ef4444;
    background: #fef2f2;
    box-shadow: 0 3px 8px rgb(239 68 68 / 8%);

    .dark & {
      color: #fca5a5;
      background: rgb(239 68 68 / 12%);
    }
  }
}
</style>
