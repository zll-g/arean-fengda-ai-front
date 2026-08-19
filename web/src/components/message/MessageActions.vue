<template>
  <div class="message-actions" :class="{ visible: alwaysVisible || isHovered }">
    <!-- 复制按钮 -->
    <button
      v-if="!isBreak"
      class="action-btn"
      :class="{ success: copied }"
      title="复制内容"
      @click="handleCopy"
    >
      <Check v-if="copied" :size="15" />
      <Copy v-else :size="15" />
    </button>

    <!-- 点赞按钮 -->
    <button
      v-if="isRegenerate"
      class="action-btn"
      :class="{ active: feedback?.liked }"
      title="有帮助"
      @click="handleLike"
    >
      <ThumbsUp :size="15" />
    </button>

    <button v-if="isRegenerate" title="分享" class="action-btn" @click="handleShare">
      <ExternalLink :size="14" />
    </button>

    <button v-if="isRegenerate" title="收藏" class="action-btn">
      <BookPlus :size="14" />
    </button>
    <!-- 点踩按钮 -->
    <!-- <button
      v-if="!isBreak"
      class="action-btn"
      :class="{ active: feedback?.disliked }"
      title="没帮助"
      @click="handleDislike"
    >
      <ThumbsDown :size="15" />
    </button> -->

    <!-- 重新生成（仅AI消息） -->
    <button v-if="isRegenerate" class="action-btn" title="重新生成" @click="handleRegenerate">
      <RefreshCw :size="15" />
    </button>

    <!-- 更多操作 -->
    <!-- <div v-if="showMore" class="more-menu">
      <button class="action-btn" title="更多" @click="toggleMoreMenu">
        <MoreHorizontal :size="15" />
      </button>

      <Transition name="dropdown">
        <div v-if="showMoreMenu" class="dropdown-menu">
          <button v-if="!isBreak" class="dropdown-item" @click="handleEdit">
            <Edit3 :size="14" />
            <span>编辑</span>
          </button>
        
          <button class="dropdown-item danger" @click="handleDelete">
            <Trash2 :size="14" />
            <span>删除</span>
          </button>
        </div>
      </Transition>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BookPlus, Check, Copy, ExternalLink, RefreshCw, ThumbsUp } from '@/components/icons';
import { copyToClipboard } from '@/utils/helpers';
import type { MessageFeedback } from '@/types/chat';

const props = withDefaults(
  defineProps<{
    content: string;
    feedback?: MessageFeedback;
    showRegenerate?: boolean;
    showMore?: boolean;
    alwaysVisible?: boolean;
    isHovered?: boolean;
    isNew?: boolean;
    isBreak?: boolean;
    isRegenerate?: boolean;
  }>(),
  {
    showRegenerate: false,
    showMore: true,
    alwaysVisible: false,
    isHovered: false,
  },
);

const emit = defineEmits<{
  copy: [];
  like: [];
  dislike: [];
  regenerate: [];
  edit: [];
  share: [];
  delete: [];
}>();

const copied = ref(false);
const showMoreMenu = ref(false);

async function handleCopy() {
  const success = await copyToClipboard(props.content);
  if (success) {
    copied.value = true;
    emit('copy');
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}

function handleLike() {
  emit('like');
}

// function handleDislike() {
//   emit('dislike');
// }

function handleRegenerate() {
  emit('regenerate');
}

// function toggleMoreMenu() {
//   showMoreMenu.value = !showMoreMenu.value;
// }

// function handleEdit() {
//   showMoreMenu.value = false;
//   emit('edit');
// }

function handleShare() {
  emit('share');
}

// function handleDelete() {
//   showMoreMenu.value = false;
//   emit('delete');
// }

// 点击外部关闭菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.more-menu')) {
    showMoreMenu.value = false;
  }
}

// 挂载时添加事件监听
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside);
}
</script>

<style lang="scss" scoped>
.message-actions {
  display: flex;
  gap: 4px;
  align-items: center;
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
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: all 0.15s ease;

  &:hover {
    color: #374151;
    background: #f3f4f6;

    .dark & {
      color: #e5e7eb;
      background: #374151;
    }
  }

  &.active {
    color: #3b82f6;

    &:hover {
      background: rgb(59 130 246 / 10%);
    }
  }

  &.success {
    color: #10b981;

    &:hover {
      background: rgb(16 185 129 / 10%);
    }
  }
}

.more-menu {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  bottom: 100%;
  z-index: 100;
  min-width: 140px;
  padding: 6px;
  margin-bottom: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgb(0 0 0 / 15%);

  .dark & {
    background: #2d2d3d;
    box-shadow: 0 4px 20px rgb(0 0 0 / 40%);
  }
}

.dropdown-item {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  color: #374151;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: all 0.15s ease;

  .dark & {
    color: #e5e7eb;
  }

  &:hover {
    background: #f3f4f6;

    .dark & {
      background: #374151;
    }
  }

  &.danger {
    color: #ef4444;

    &:hover {
      background: rgb(239 68 68 / 10%);
    }
  }

  svg {
    flex-shrink: 0;
  }
}

// 下拉动画
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}
</style>
