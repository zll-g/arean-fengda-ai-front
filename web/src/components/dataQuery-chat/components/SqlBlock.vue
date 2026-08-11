<template>
  <div class="sql-block-wrapper">
    <div class="sql-header">
      <span class="sql-label">
        <el-icon><Document /></el-icon> 生成的 SQL
      </span>
      <el-button text size="small" @click="copySQL">
        <el-icon><CopyDocument /></el-icon> 复制
      </el-button>
    </div>
    <pre class="sql-block"><code v-html="highlightedSql" /></pre>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import hljs from 'highlight.js/lib/core';
// @ts-expect-error
import sqlLanguage from 'highlight.js/lib/languages/sql';
// @ts-expect-error
import 'highlight.js/styles/vs2015.css';
// @ts-expect-error
hljs.registerLanguage('sql', sqlLanguage);
// @ts-expect-error
const props = defineProps({
  sql: { type: String, default: '' },
});
const highlightedSql = computed(() => {
  if (!props.sql) return '';
  try {
    // @ts-expect-error
    return hljs.highlight(props.sql, { language: 'sql' }).value;
  } catch {
    return props.sql;
  }
});

function copySQL() {
  navigator.clipboard
    .writeText(props.sql)
    .then(() => {
      ElMessage.success('SQL 已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.error('复制失败');
    });
}
</script>

<style scoped lang="scss">
.sql-block-wrapper {
  margin: 8px 0;
  overflow: hidden;
  border: 1px solid #333;
  border-radius: 8px;

  .sql-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    font-size: 12px;
    color: #ccc;
    background: #2d2d2d;

    .sql-label {
      display: flex;
      gap: 4px;
      align-items: center;
    }
  }

  .sql-block {
    padding: 12px 16px;
    margin: 0;
    overflow-x: auto;
    font-family: 'Fira Code', Consolas, 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #d4d4d4;
    word-break: break-word;
    white-space: pre-wrap;
    background: #1e1e1e;

    code {
      font-family: inherit;
    }
  }
}
</style>
