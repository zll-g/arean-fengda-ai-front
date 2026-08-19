<template>
  <div ref="boxRef" class="message-list-box">
    <div ref="containerRef" class="message-list" @scroll="handleScroll">
      <!-- 欢迎界面 -->
      <WelcomeScreen v-if="messages.length === 0" @select="$emit('select-suggestion', $event)" />

      <!-- 消息列表 -->
      <template v-else>
        <div class="messages-wrapper">
          <TransitionGroup name="message">
            <MessageBubble
              v-for="(message, index) in messages"
              :key="message.id"
              :message="message"
              :show-timestamp="showTimestamp"
              :compact="compact"
              :is-last-assistant="message.role === 'ASSISTANT' && index === messages.length - 1"
              @retry="$emit('retry', message.id)"
              @regenerate="$emit('regenerate', message.id)"
              @switch-variant="$emit('switch-variant', message.id, $event)"
              @copy="handleCopy(message)"
              @like="handleLike(message)"
              @dislike="handleDislike(message)"
              @select-suggestion="$emit('select-suggestion', $event.text)"
              @preview-image="handlePreviewImage"
              @play-video="handlePlayVideo"
              @download-file="handleDownloadFile"
            />
          </TransitionGroup>
        </div>
      </template>
    </div>

    <!-- 回到底部按钮 -->
    <Transition name="fade">
      <button v-if="showScrollButton" class="scroll-bottom-btn" @click="handleScrollToBottom">
        <ChevronDown :size="20" />
        <span v-if="newMessageCount > 0" class="new-count">
          {{ newMessageCount }}
        </span>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';

import { useChatStore } from '@/store/modules/knowledge-chat';
import MessageBubble from '@/components/message/MessageBubble.vue';
import WelcomeScreen from './WelcomeScreen.vue';
import { ChevronDown } from '@/components/icons';
import type { Attachment, Message, VideoInfo } from '@/types/chat';

const props = withDefaults(
  defineProps<{
    messages: Message[];
    showTimestamp?: boolean;
    compact?: boolean;
    isTyping?: boolean;
  }>(),
  {
    showTimestamp: true,
    compact: false,
    isTyping: false,
  },
);

const emit = defineEmits<{
  retry: [messageId: string];
  regenerate: [messageId: string];
  'switch-variant': [messageId: string, delta: number];
  'select-suggestion': [text: string];
  'preview-image': [image: Attachment, index: number];
  'play-video': [video: VideoInfo];
  'download-file': [file: Attachment];
}>();

const chatStore = useChatStore();

// 响应式状态
const boxRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const showScrollButton = ref(false);
const newMessageCount = ref(0);
const isAutoScrolling = ref(true);
const lastScrollTop = ref(0);

// 高度完全交给 CSS flex 自适应（.message-list-box/.message-list: flex:1 + min-height:0），
// 不再用 JS 固定内联高度——不同分辨率/窗口缩放/侧栏收起时都能实时自适应，
// 避免历史上 onMounted 一次性量高后写下死 height 导致的展示区域错位。

// 滚动处理
function handleScroll() {
  const container = containerRef.value;
  if (!container) return;

  const { scrollTop, scrollHeight, clientHeight } = container;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

  if (scrollTop < lastScrollTop.value && !isAtBottom) {
    isAutoScrolling.value = false;
    showScrollButton.value = true;
  }

  if (isAtBottom) {
    isAutoScrolling.value = true;
    showScrollButton.value = false;
    newMessageCount.value = 0;
  }

  lastScrollTop.value = scrollTop;
}

// 滚动到底部
function scrollToBottom(smooth = true) {
  const container = containerRef.value;
  if (!container) return;

  container.scrollTo({
    top: container.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  });

  isAutoScrolling.value = true;
  showScrollButton.value = false;
  newMessageCount.value = 0;
}

// 按钮点击处理
function handleScrollToBottom() {
  scrollToBottom(true);
}

// 消息操作
function handleCopy(message: Message) {
  chatStore.setMessageCopied(message.id);
}

function handleLike(message: Message) {
  const currentLiked = message.feedback?.liked;
  chatStore.setMessageFeedback(message.id, currentLiked ? null : 'like');
}

function handleDislike(message: Message) {
  const currentDisliked = message.feedback?.disliked;
  chatStore.setMessageFeedback(message.id, currentDisliked ? null : 'dislike');
}

function handlePreviewImage(image: Attachment, index: number) {
  emit('preview-image', image, index);
}

function handlePlayVideo(video: VideoInfo) {
  emit('play-video', video);
}

function handleDownloadFile(file: Attachment) {
  emit('download-file', file);
}

// 监听消息变化
watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    console.log(props.messages, '555');
    if (newLen > oldLen) {
      if (isAutoScrolling.value) {
        nextTick(() => {
          scrollToBottom(false);
        });
      } else {
        newMessageCount.value++;
      }
    }
  },
);

// 监听最后一条消息的内容变化
watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => {
    if (isAutoScrolling.value) {
      nextTick(() => {
        const container = containerRef.value;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  },
);

// 监听 isTyping 变化
watch(
  () => props.isTyping,
  (typing) => {
    if (typing && isAutoScrolling.value) {
      nextTick(() => {
        scrollToBottom(true);
      });
    }
  },
);

// 暴露方法
defineExpose({
  scrollToBottom,
});

onMounted(() => {
  scrollToBottom(false);
});
</script>

<style lang="scss" scoped>
/* 外层盒：在 .chat-main 纵向 flex 中占满头部与输入区之外的剩余空间（随分辨率自适应） */
.message-list-box {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.message-list {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background: linear-gradient(180deg, rgb(255 248 241 / 65%) 0%, transparent 180px), #fff;

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;
    transition: background 0.2s ease;

    &:hover {
      background: #dc9857;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  .dark & {
    scrollbar-color: #76513a transparent;
    background: linear-gradient(180deg, rgb(249 115 22 / 5%) 0%, transparent 180px), #17120f;

    &::-webkit-scrollbar-thumb {
      background: #76513a;

      &:hover {
        background: #956344;
      }
    }
  }
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 20px 0;
}

/* 正在输入区域 */
.typing-indicator {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 24px;
}

.typing-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border: 1px solid rgb(255 138 38 / 20%);
  border-radius: 12px;
  box-shadow:
    0 8px 18px rgb(249 115 22 / 20%),
    0 0 0 4px rgb(255 138 38 / 7%);

  .dark & {
    box-shadow:
      0 8px 18px rgb(0 0 0 / 20%),
      0 0 0 4px rgb(255 138 38 / 8%);
  }
}

.typing-dots {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
  background: #fff6ed;
  border: 1px solid #ffe0c2;
  border-radius: 16px;
  box-shadow: 0 5px 14px rgb(249 115 22 / 6%);

  .dark & {
    background: rgb(249 115 22 / 10%);
    border-color: rgb(255 138 38 / 16%);
    box-shadow: none;
  }

  span {
    width: 8px;
    height: 8px;
    background: #ff8a26;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgb(255 138 38 / 10%);

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }

    &:nth-child(3) {
      animation-delay: 0s;
    }
  }
}

.typing-text {
  font-size: 13px;
  color: #b2794c;

  .dark & {
    color: #c99770;
  }
}

/* 回到底部按钮 */
.scroll-bottom-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: #f97316;
  cursor: pointer;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #ffd6af;
  border-radius: 50%;
  box-shadow:
    0 8px 22px rgb(126 72 24 / 12%),
    0 0 0 4px rgb(255 138 38 / 5%);
  backdrop-filter: blur(12px);
  transform: translateX(-50%);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  .dark & {
    color: #ffb36b;
    background: rgb(53 42 35 / 96%);
    border-color: rgb(255 138 38 / 20%);
    box-shadow:
      0 8px 22px rgb(0 0 0 / 34%),
      0 0 0 4px rgb(255 138 38 / 6%);
  }

  &:hover {
    color: #fff;
    background: #ff8a26;
    border-color: #ff8a26;
    box-shadow:
      0 10px 26px rgb(249 115 22 / 26%),
      0 0 0 5px rgb(255 138 38 / 9%);
    transform: translateX(-50%) translateY(-2px) scale(1.06);

    .dark & {
      color: #fff;
      background: #f97316;
      border-color: #f97316;
    }
  }

  &:active {
    box-shadow: 0 5px 14px rgb(249 115 22 / 18%);
    transform: translateX(-50%) translateY(0) scale(0.96);
  }

  .new-count {
    position: absolute;
    top: -5px;
    right: -5px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
    font-weight: 700;
    line-height: 20px;
    color: #fff;
    background: linear-gradient(135deg, #ff8a26, #f97316);
    border: 2px solid #fff;
    border-radius: 999px;
    box-shadow: 0 4px 10px rgb(249 115 22 / 28%);

    .dark & {
      border-color: #352a23;
    }
  }
}

/* 消息过渡动画 */
.message-enter-active,
.message-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
