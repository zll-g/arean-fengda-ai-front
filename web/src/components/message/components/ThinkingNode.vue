<template>
  <section class="thinking-node">
    <button type="button" class="thinking-header" :aria-expanded="expanded" @click="toggleExpanded">
      <span class="thinking-title">
        {{ title }}
      </span>

      <span v-if="isLoading" class="thinking-dots" aria-hidden="true">
        <span class="dot dot-1" />
        <span class="dot dot-2" />
        <span class="dot dot-3" />
      </span>

      <svg
        class="thinking-arrow"
        :class="{ collapsed: !expanded }"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 7.5L10 12.5L15 7.5"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <transition name="thinking-collapse">
      <div v-show="expanded" class="thinking-panel">
        <div class="thinking-content-wrap">
          <div class="thinking-content">
            <MarkdownRender v-if="node.content" :content="node.content" @copy="textCopy" />

            <p v-else class="thinking-placeholder">
              {{ isLoading ? '正在整理思路…' : '暂无思考内容。' }}
            </p>
          </div>
        </div>

        <div class="thinking-footer">
          <span class="thinking-status-icon" aria-hidden="true">
            <svg
              v-if="!isLoading"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.6" />
              <path
                d="M6.5 10.2L8.8 12.5L13.8 7.5"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <svg
              v-else
              class="thinking-spinner"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="10"
                cy="10"
                r="7"
                stroke="currentColor"
                stroke-width="1.8"
                opacity="0.25"
              />
              <path
                d="M17 10A7 7 0 0 0 10 3"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </span>

          <span>{{ footerText }}</span>
        </div>
      </div>
    </transition>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useClipboard } from '@vueuse/core';
import { MarkdownRender } from 'markstream-vue';

const props = defineProps<{
  node: {
    type: 'think';
    content: string;
    children: any[];
    loading?: boolean;
  };
}>();

const { copy } = useClipboard({ legacy: true });

// 正在思考中默认展开
const expanded = ref(Boolean(props.node.loading));

const isLoading = computed(() => Boolean(props.node.loading));

const title = computed(() => {
  return isLoading.value ? '正在思考' : '已完成思考';
});

const footerText = computed(() => {
  return isLoading.value ? '思考中' : '已完成';
});

async function textCopy(data: any) {
  if (typeof data === 'string') {
    await copy(data);
  }
}

function toggleExpanded() {
  expanded.value = !expanded.value;
}

watch(
  () => isLoading.value,
  (loading, oldLoading) => {
    if (loading) {
      expanded.value = true;
      return;
    }

    if (oldLoading && !loading) {
      expanded.value = false;
    }
  },
);
</script>

<style scoped>
.thinking-node {
  margin: 1rem 0;
  font-size: 0.95rem;
  color: #333;
}

/* 顶部标题：已完成思考 v */
.thinking-header {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0;
  font: inherit;
  line-height: 1.5;
  color: #333;
  cursor: pointer;
  user-select: none;
  background: transparent;
  border: 0;
}

.thinking-header:hover {
  color: #555;
}

.thinking-title {
  font-size: 0.95rem;
  font-weight: 500;
}

.thinking-arrow {
  width: 1rem;
  height: 1rem;
  color: currentcolor;
  transition: transform 180ms ease;
}

.thinking-arrow.collapsed {
  transform: rotate(-90deg);
}

/* loading 小点 */
.thinking-dots {
  display: inline-flex;
  gap: 0.18rem;
  align-items: center;
  margin-left: 0.2rem;
}

.dot {
  width: 0.26rem;
  height: 0.26rem;
  background: currentcolor;
  border-radius: 999px;
  opacity: 0.35;
}

.dot-1 {
  animation: thinking-dot 1.1s infinite ease-in-out;
}

.dot-2 {
  animation: thinking-dot 1.1s infinite ease-in-out;
  animation-delay: 0.15s;
}

.dot-3 {
  animation: thinking-dot 1.1s infinite ease-in-out;
  animation-delay: 0.3s;
}

@keyframes thinking-dot {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

/* 展开内容区域 */
.thinking-panel {
  margin-top: 1rem;
}

/* 左侧竖线 + 内容缩进，模拟截图里的 quote / thinking layout */
.thinking-content-wrap {
  position: relative;
  padding-left: 1.45rem;
}

.thinking-content-wrap::before {
  position: absolute;
  top: 0.25rem;
  bottom: 0.25rem;
  left: 0.48rem;
  width: 1px;
  content: '';
  background: #d8d8d8;
}

.thinking-content {
  line-height: 1.8;
  color: #333;
  word-break: break-word;
}

.thinking-placeholder {
  margin: 0;
  color: #999;
}

/* 底部 已完成 */
.thinking-footer {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  margin-top: 1rem;
  font-size: 0.95rem;
  color: #333;
}

.thinking-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  color: #333;
}

.thinking-status-icon svg {
  width: 100%;
  height: 100%;
}

.thinking-spinner {
  animation: thinking-spin 0.9s linear infinite;
}

@keyframes thinking-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 收缩展开动画 */
.thinking-collapse-enter-active,
.thinking-collapse-leave-active {
  max-height: 1200px;
  overflow: hidden;
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    max-height 220ms ease;
}

.thinking-collapse-enter-from,
.thinking-collapse-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.thinking-collapse-enter-to,
.thinking-collapse-leave-from {
  max-height: 1200px;
  opacity: 1;
  transform: translateY(0);
}

/* Markdown 样式优化 */
.thinking-content :deep(p) {
  margin: 0.75rem 0;
}

.thinking-content :deep(p:first-child) {
  margin-top: 0;
}

.thinking-content :deep(p:last-child) {
  margin-bottom: 0;
}

.thinking-content :deep(ul),
.thinking-content :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.75rem 0;
}

.thinking-content :deep(li) {
  padding-left: 0.25rem;
  margin: 0.75rem 0;
}

.thinking-content :deep(blockquote) {
  padding-left: 1rem;
  margin: 0.45rem 0 0.85rem;
  color: #333;
  border-left: 2px solid #d8d8d8;
}

.thinking-content :deep(code) {
  padding: 0.12rem 0.3rem;
  font-size: 0.9em;
  color: #666;
  background: rgb(0 0 0 / 6%);
  border-radius: 0.35rem;
}

.thinking-content :deep(pre) {
  padding: 0.8rem 1rem;
  margin: 0.75rem 0;
  overflow-x: auto;
  background: rgb(0 0 0 / 6%);
  border-radius: 0.5rem;
}

.thinking-content :deep(pre code) {
  padding: 0;
  background: transparent;
}

/* 暗色模式 */
.dark .thinking-node,
.dark .thinking-header,
.dark .thinking-footer,
.dark .thinking-status-icon {
  color: #a3a3a3;
}

.dark .thinking-header:hover {
  color: #d4d4d4;
}

.dark .thinking-content {
  color: #a3a3a3;
}

.dark .thinking-content-wrap::before,
.dark .thinking-content :deep(blockquote) {
  border-color: #3f3f46;
}

.dark .thinking-content-wrap::before {
  background: #3f3f46;
}

.dark .thinking-placeholder {
  color: #737373;
}

.dark .thinking-content :deep(code) {
  color: #d4d4d4;
  background: rgb(255 255 255 / 8%);
}

.dark .thinking-content :deep(pre) {
  background: rgb(255 255 255 / 8%);
}
</style>
