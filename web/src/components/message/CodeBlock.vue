<template>
  <div class="code-block" :class="{ 'is-expanded': isExpanded }">
    <!-- 代码块头部 -->
    <div class="code-header">
      <div class="code-language">
        <Code :size="14" />
        <span>{{ language || 'code' }}</span>
      </div>
      <div class="code-actions">
        <button
          v-if="canExpand"
          class="action-btn"
          :title="isExpanded ? '收起' : '展开'"
          @click="toggleExpand"
        >
          <Maximize2 v-if="!isExpanded" :size="14" />
          <Minimize2 v-else :size="14" />
        </button>
        <button
          class="action-btn"
          :class="{ copied: isCopied }"
          title="复制代码"
          @click="handleCopy"
        >
          <Check v-if="isCopied" :size="14" />
          <Copy v-else :size="14" />
          <span v-if="isCopied">已复制</span>
        </button>
      </div>
    </div>

    <!-- 代码内容 -->
    <div class="code-content">
      <pre><code :class="`language-${language}`">{{ code }}</code></pre>
    </div>

    <!-- 行号（可选） -->
    <div v-if="showLineNumbers" class="line-numbers">
      <span v-for="n in lineCount" :key="n">{{ n }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, Code, Copy, Maximize2, Minimize2 } from '@/components/icons';
import { copyToClipboard } from '@/utils/helpers';

const props = withDefaults(
  defineProps<{
    code: string;
    language?: string;
    showLineNumbers?: boolean;
    maxHeight?: number;
  }>(),
  {
    language: 'plaintext',
    showLineNumbers: true,
    maxHeight: 400,
  },
);

const emit = defineEmits<{
  copy: [];
}>();

const isCopied = ref(false);
const isExpanded = ref(false);

const lineCount = computed(() => {
  return props.code.split('\n').length;
});

const canExpand = computed(() => {
  return lineCount.value > 15;
});

async function handleCopy() {
  const success = await copyToClipboard(props.code);
  if (success) {
    isCopied.value = true;
    emit('copy');
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  }
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}
</script>

<style lang="scss" scoped>
.code-block {
  position: relative;
  margin: 12px 0;
  overflow: hidden;
  background: #1e1e2e;
  border: 1px solid #2d2d3d;
  border-radius: 12px;

  &.is-expanded {
    .code-content {
      max-height: none;
    }
  }
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #181825;
  border-bottom: 1px solid #2d2d3d;
}

.code-language {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #a6adc8;

  svg {
    opacity: 0.7;
  }
}

.code-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-btn {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  color: #a6adc8;
  cursor: pointer;
  background: rgb(255 255 255 / 5%);
  border: none;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    color: #cdd6f4;
    background: rgb(255 255 255 / 10%);
  }

  &.copied {
    color: #a6e3a1;
    background: rgb(166 227 161 / 20%);
  }
}

.code-content {
  max-height: 400px;
  overflow: auto;

  pre {
    padding: 16px;
    margin: 0;
    overflow-x: auto;

    code {
      font-family: 'JetBrains Mono', 'Fira Code', Monaco, monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #cdd6f4;
      tab-size: 2;
    }
  }
}

.line-numbers {
  position: absolute;
  top: 49px;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 50px;
  padding: 16px 0;
  padding-right: 12px;
  pointer-events: none;
  user-select: none;
  background: rgb(0 0 0 / 20%);
  border-right: 1px solid #2d2d3d;

  span {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #585b70;
  }
}

:deep(.code-content) {
  .keyword {
    color: #cba6f7;
  }

  .string {
    color: #a6e3a1;
  }

  .number {
    color: #fab387;
  }

  .comment {
    font-style: italic;
    color: #6c7086;
  }

  .function {
    color: #89b4fa;
  }

  .operator {
    color: #89dceb;
  }

  .punctuation {
    color: #9399b2;
  }

  .class-name {
    color: #f9e2af;
  }
}
</style>
