<template>
  <div class="message-bubble">
    <!-- ==================== 用户提问 ==================== -->
    <div class="msg-row user-row">
      <div class="msg-avatar user-avatar">
        <el-icon :size="20"><User /></el-icon>
      </div>
      <div class="msg-content user-content">
        <p>{{ message.question }}</p>
      </div>
    </div>

    <!-- ==================== AI 回答 ==================== -->
    <div class="msg-row ai-row">
      <div class="msg-avatar ai-avatar">
        <el-icon :size="20"><Cpu /></el-icon>
      </div>

      <div class="msg-content ai-content">
        <!-- ========== 区块1: 实时进度时间线 ========== -->
        <div v-if="hasAnyStage" class="stage-timeline">
          <div
            v-for="(stage, idx) in message.stages"
            :key="'done-' + idx"
            class="timeline-item done"
          >
            <div class="timeline-dot done-dot">
              <el-icon :size="12"><SuccessFilled /></el-icon>
            </div>
            <div class="timeline-text">
              <span class="timeline-label">{{ stage.message }}</span>
              <span v-if="stage.costMs" class="timeline-cost">{{ stage.costMs }}ms</span>
            </div>
          </div>

          <div v-if="message.loading && message.streamingStage" class="timeline-item active">
            <div class="timeline-dot active-dot">
              <el-icon :size="12" class="spinning"><Loading /></el-icon>
            </div>
            <div class="timeline-main">
              <div class="timeline-text">
                <span class="timeline-label">{{ message.streamingStage.stageName }}</span>
                <span class="timeline-progress">
                  {{ message.streamingStage.stepIndex }}/{{ message.streamingStage.totalSteps }}
                </span>
              </div>
              <div class="timeline-progress-bar">
                <div
                  class="timeline-progress-fill"
                  :style="{ width: message.streamingStage.progress + '%' }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ========== 区块2: 问题改写提示 ========== -->
        <div v-if="message.processedQuestion" class="understanding-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>我将您的问题理解为：「{{ message.processedQuestion }}」</span>
        </div>

        <!-- ========== 区块3: SQL 展示 ========== -->
        <el-collapse v-if="message.sql" class="sql-collapse">
          <el-collapse-item name="sql">
            <template #title>
              <span class="sql-collapse-title">
                <el-icon><Document /></el-icon>
                {{
                  message.loading && !message.data ? 'SQL 已生成（查询中...）' : '查看生成的 SQL'
                }}
                <el-tag
                  v-if="message.sqlStrategy && message.sqlStrategy !== 'DIRECT'"
                  type="success"
                  size="small"
                  effect="plain"
                  class="strategy-tag"
                >
                  {{ strategyLabel }}
                </el-tag>
              </span>
            </template>
            <SqlBlock :sql="message.sql" />
          </el-collapse-item>
        </el-collapse>

        <!-- ========== 区块4: SQL 修复提示 ========== -->
        <div v-if="message.loading && message.fixRounds > 0" class="fix-notice">
          <el-icon color="#e6a23c"><Warning /></el-icon>
          <span>正在进行第 {{ message.fixRounds }} 轮 SQL 自动修复...</span>
        </div>

        <!-- ========== 区块5: SQL 预检警告 ========== -->
        <el-alert
          v-if="!message.loading && message.sqlWarning"
          :title="message.sqlWarning"
          type="warning"
          show-icon
          :closable="false"
          class="warning-alert"
        />

        <!-- ========== 区块6: 数据表格 ========== -->
        <div v-if="showTable && message.columns?.length && message.data?.length" class="table-wrap">
          <DataTable :columns="message.columns" :data="message.data" />
        </div>

        <!-- ========== 区块7: AI 回答 ========== -->
        <div
          v-if="message.answer"
          class="answer-text"
          :class="{ 'streaming-cursor': message.answerStreaming }"
          v-html="renderedAnswer"
        />

        <!-- ========== 区块8: 状态标签栏 ========== -->
        <div v-if="!message.loading && message.success !== undefined" class="status-bar">
          <el-tag :type="message.success ? 'success' : 'danger'" size="small" effect="plain">
            <el-icon>
              <SuccessFilled v-if="message.success" />
              <CircleCloseFilled v-else />
            </el-icon>
            {{ message.success ? '查询成功' : '查询失败' }}
          </el-tag>

          <el-tag v-if="message.costMs" type="info" size="small" effect="plain">
            <el-icon><Timer /></el-icon>
            {{ message.costMs }}ms
          </el-tag>

          <el-tag v-if="message.rowCount > 0" size="small" effect="plain">
            <el-icon><Grid /></el-icon>
            {{ message.rowCount }} 行
          </el-tag>

          <el-tag v-if="message.fixRounds > 0" type="warning" size="small" effect="plain">
            <el-icon><Refresh /></el-icon>
            修复{{ message.fixRounds }}轮
          </el-tag>

          <el-tag v-if="message.federated" type="primary" size="small" effect="plain">
            <el-icon><Connection /></el-icon>
            联邦 · {{ message.datasourceCount }}源
          </el-tag>
        </div>

        <!-- ========== 区块9: 图表 ========== -->
        <div v-if="message.chartConfig && message.data?.length" class="chart-wrap">
          <ChartRenderer
            :chart-config="message.chartConfig"
            :columns="message.columns"
            :data="message.data"
          />
        </div>

        <!-- ========== 区块10: 操作按钮 ========== -->
        <div v-if="!message.loading && message.success && message.sql" class="action-bar">
          <el-button text size="small" @click="showTable = !showTable">
            <el-icon><Grid /></el-icon>
            {{ showTable ? '收起表格' : '展开表格' }}
          </el-button>

          <el-button text size="small" type="success" @click="handleConfirm">
            <el-icon><Select /></el-icon>
            SQL 正确
          </el-button>

          <el-button text size="small" type="warning" @click="handleFeedback">
            <el-icon><Warning /></el-icon>
            SQL 有误
          </el-button>
        </div>

        <!-- ========== 区块11: 错误信息 ========== -->
        <el-alert
          v-if="!message.loading && !message.success && message.errorMsg"
          :title="message.errorMsg"
          type="error"
          show-icon
          :closable="false"
          class="error-alert"
        />

        <!-- ========== 区块12: 澄清选项 ========== -->
        <ClarifyOptions
          v-if="!message.loading && message.clarification"
          :clarification="message.clarification"
          @select="$emit('askQuestion', $event)"
        />

        <!-- ========== 区块13: 推荐后续问题 ========== -->
        <div
          v-if="!message.loading && message.suggestedQuestions?.length"
          class="suggested-questions"
        >
          <div class="suggest-label">您可能还想问：</div>
          <div class="suggest-list">
            <el-button
              v-for="(sq, idx) in message.suggestedQuestions"
              :key="idx"
              size="small"
              round
              plain
              @click="$emit('askQuestion', sq)"
            >
              {{ sq }}
            </el-button>
          </div>
        </div>

        <!-- ========== 区块14: 兜底 loading ========== -->
        <div v-if="message.loading && !hasAnyContent" class="loading-dots">
          <span />
          <span />
          <span />
          <span class="loading-text">正在连接服务...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { marked } from 'marked';
import { ElMessage } from 'element-plus';
import SqlBlock from '@/components/dataQuery-chat/components/SqlBlock.vue';
import DataTable from '@/components/dataQuery-chat/components/DataTable.vue';
import ChartRenderer from '@/components/dataQuery-chat/components/ChartRenderer.vue';
import ClarifyOptions from '@/components/dataQuery-chat/components/ClarifyOptions.vue';

const props = defineProps({
  message: { type: Object, required: true },
});

const emit = defineEmits(['confirm', 'feedback', 'askQuestion']);

const showTable = ref(true);

const hasAnyStage = computed(() => {
  return (props.message.stages && props.message.stages.length > 0) || props.message.streamingStage;
});

const hasAnyContent = computed(() => {
  return (
    hasAnyStage.value ||
    props.message.sql ||
    props.message.answer ||
    props.message.data ||
    props.message.processedQuestion
  );
});

const strategyLabel = computed(() => {
  const s = props.message.sqlStrategy;
  if (s === 'MULTI_CANDIDATE') return '多候选投票';
  if (s === 'INCREMENTAL_MODIFY') return '增量修改';
  if (s === 'TRINO_FEDERATED') return 'Trino跨库';
  if (s === 'FEDERATED') return '联邦查询';
  if (s?.startsWith('FIX_ROUND')) return '已修复';
  return s;
});

const renderedAnswer = computed(() => {
  if (!props.message.answer) return '';
  try {
    return marked(props.message.answer, { breaks: true });
  } catch {
    return props.message.answer;
  }
});

function handleConfirm() {
  emit('confirm', { question: props.message.question, sql: props.message.sql });
  ElMessage.success('感谢反馈！此 SQL 已加入知识库');
}

function handleFeedback() {
  emit('feedback', { question: props.message.question, sql: props.message.sql });
  ElMessage.info('感谢反馈！我们会持续优化');
}
</script>

<style scoped lang="scss">
.message-bubble {
  box-sizing: border-box;
  width: 100%;
  padding: 0 6px;
  margin-bottom: 24px;
}

.msg-row {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-bottom: 14px;
  animation: fade-up 0.24s ease both;
}

.user-row {
  justify-content: flex-end;
}

.ai-row {
  align-items: flex-start;
}

.msg-avatar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 15px;
  box-shadow: 0 8px 22px rgb(15 23 42 / 10%);
}

.user-avatar {
  order: 1;
  color: #2563eb;
  background:
    radial-gradient(circle at 30% 20%, rgb(255 255 255 / 75%), transparent 32%),
    linear-gradient(135deg, #dbeafe, #eff6ff);
  border: 1px solid rgb(147 197 253 / 48%);
}

.ai-avatar {
  color: #fff;
  background:
    radial-gradient(circle at 28% 20%, rgb(255 255 255 / 35%), transparent 30%),
    linear-gradient(135deg, #4f46e5 0%, #7c3aed 48%, #ec4899 100%);
}

.msg-content {
  box-sizing: border-box;
  min-width: 0;
  font-size: 14px;
  line-height: 1.75;
}

.user-content {
  max-width: min(76%, 620px);
  padding: 11px 16px;
  color: #fff;
  background:
    radial-gradient(circle at 100% 0, rgb(255 255 255 / 18%), transparent 30%),
    linear-gradient(135deg, #2563eb 0%, #6366f1 100%);
  border-radius: 18px 18px 6px;
  box-shadow: 0 10px 24px rgb(59 130 246 / 22%);

  p {
    margin: 0;
    word-break: break-word;
    white-space: pre-wrap;
  }
}

.ai-content {
  width: min(86%, 860px);
  padding: 16px 18px;
  color: #1f2937;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 98%), rgb(248 250 252 / 94%)),
    radial-gradient(circle at 0 0, rgb(99 102 241 / 8%), transparent 32%);
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 18px 18px 18px 6px;
  box-shadow: 0 12px 34px rgb(15 23 42 / 8%);
  backdrop-filter: blur(10px);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.ai-content:hover {
  box-shadow: 0 16px 42px rgb(15 23 42 / 11%);
  transform: translateY(-1px);
}

.stage-timeline {
  position: relative;
  padding: 11px 12px;
  margin-bottom: 14px;
  overflow: hidden;
  background:
    linear-gradient(180deg, #f8fbff, #fff),
    radial-gradient(circle at 0 0, rgb(79 124 255 / 10%), transparent 36%);
  border: 1px solid rgb(226 232 240 / 92%);
  border-radius: 15px;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 5px 0;
}

.timeline-item:not(:last-child)::after {
  position: absolute;
  top: 26px;
  bottom: -5px;
  left: 9px;
  width: 2px;
  content: '';
  background: #dbeafe;
  border-radius: 99px;
}

.timeline-item.done::after {
  background: linear-gradient(180deg, rgb(34 197 94 / 65%), rgb(99 102 241 / 20%));
}

.timeline-item.active::after {
  display: none;
}

.timeline-dot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border-radius: 999px;
}

.done-dot {
  color: #22c55e;
  background: #ecfdf3;
  box-shadow: inset 0 0 0 1px rgb(34 197 94 / 20%);
}

.active-dot {
  color: #4f46e5;
  background: #eef2ff;
  box-shadow:
    inset 0 0 0 1px rgb(79 70 229 / 20%),
    0 0 0 5px rgb(79 70 229 / 8%);
}

.timeline-main {
  flex: 1;
  min-width: 0;
}

.timeline-text {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
  min-height: 24px;
}

.timeline-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.timeline-cost,
.timeline-progress {
  flex: 0 0 auto;
  padding: 2px 7px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  border-radius: 999px;
}

.timeline-cost {
  color: #94a3b8;
  background: #f1f5f9;
}

.timeline-progress {
  color: #4f46e5;
  background: #eef2ff;
}

.timeline-progress-bar {
  height: 4px;
  margin-top: 7px;
  overflow: hidden;
  background: #e5edff;
  border-radius: 999px;
}

.timeline-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #22c55e);
  border-radius: inherit;
  transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.understanding-tip {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.65;
  color: #92400e;
  background: linear-gradient(135deg, #fff7ed, #fffbeb);
  border: 1px solid rgb(245 158 11 / 24%);
  border-radius: 13px;

  .el-icon {
    flex: 0 0 auto;
    margin-top: 3px;
  }
}

.sql-collapse {
  margin: 10px 0 12px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid rgb(226 232 240 / 78%);
  border-radius: 13px;
}

.sql-collapse-title {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.strategy-tag {
  margin-left: 6px;
}

.sql-collapse :deep(.el-collapse-item__header) {
  height: 40px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 40px;
  color: #64748b;
  background: #f8fafc;
  border-bottom: none;
}

.sql-collapse :deep(.el-collapse-item__wrap) {
  background: #fff;
  border-bottom: none;
}

.sql-collapse :deep(.el-collapse-item__content) {
  padding: 10px 12px 12px;
}

.fix-notice {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  margin: 10px 0;
  font-size: 13px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid rgb(245 158 11 / 25%);
  border-radius: 13px;
}

.warning-alert {
  margin: 8px 0;
}

.error-alert {
  margin-top: 8px;
}

.table-wrap,
.chart-wrap {
  width: 100%;
  margin: 12px 0;
  overflow: auto hidden;
  border-radius: 13px;
  -webkit-overflow-scrolling: touch;
}

.table-wrap :deep(table) {
  min-width: 640px;
}

.answer-text {
  font-size: 14px;
  line-height: 1.85;
  color: #1f2937;
  word-break: break-word;
}

.answer-text :deep(p) {
  margin: 0 0 10px;
}

.answer-text :deep(p:last-child) {
  margin-bottom: 0;
}

.answer-text :deep(strong) {
  font-weight: 700;
  color: #111827;
}

.answer-text :deep(ul),
.answer-text :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.answer-text :deep(li) {
  margin: 4px 0;
}

.answer-text :deep(a) {
  color: #4f46e5;
  text-decoration: none;
  border-bottom: 1px solid rgb(79 70 229 / 28%);
}

.answer-text :deep(a:hover) {
  border-bottom-color: #4f46e5;
}

.answer-text :deep(blockquote) {
  padding: 9px 12px;
  margin: 10px 0;
  color: #475569;
  background: #f8fafc;
  border-left: 3px solid #4f46e5;
  border-radius: 9px;
}

.answer-text :deep(code) {
  padding: 2px 6px;
  font-size: 13px;
  color: #be123c;
  background: #fff1f2;
  border: 1px solid rgb(244 63 94 / 12%);
  border-radius: 6px;
}

.answer-text :deep(pre) {
  max-width: 100%;
  padding: 12px;
  margin: 10px 0;
  overflow: auto;
  color: #e5e7eb;
  background: #0f172a;
  border-radius: 13px;
  -webkit-overflow-scrolling: touch;
}

.answer-text :deep(pre code) {
  padding: 0;
  color: inherit;
  background: transparent;
  border: none;
}

.streaming-cursor::after {
  display: inline-block;
  margin-left: 2px;
  font-weight: 400;
  color: #4f46e5;
  content: '▍';
  animation: blink-cursor 0.85s infinite;
}

.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 8px;
}

.status-bar .el-tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  max-width: 100%;
  height: 27px;
  padding: 0 9px;
  overflow: hidden;
  font-weight: 600;
  border-radius: 999px;
}

.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px dashed #e5e7eb;
}

.action-bar .el-button {
  height: 32px;
  padding: 6px 11px;
  border-radius: 999px;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.action-bar .el-button:hover {
  box-shadow: 0 6px 16px rgb(15 23 42 / 8%);
  transform: translateY(-1px);
}

.suggested-questions {
  padding-top: 14px;
  margin-top: 16px;
  border-top: 1px dashed #e5e7eb;
}

.suggest-label {
  margin-bottom: 9px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.suggest-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggest-list .el-button {
  max-width: 100%;
  height: auto;
  min-height: 31px;
  padding: 6px 11px;
  font-size: 12px;
  line-height: 1.45;
  white-space: normal;
  background: #fff;
  border-radius: 999px;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.suggest-list .el-button:hover {
  border-color: rgb(79 70 229 / 55%);
  box-shadow: 0 8px 20px rgb(79 70 229 / 14%);
  transform: translateY(-1px);
}

.loading-dots {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 8px 0;
}

.loading-dots span:not(.loading-text) {
  width: 7px;
  height: 7px;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  border-radius: 50%;
  animation: bounce 1.35s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0s;
}

.loading-text {
  margin-left: 8px;
  font-size: 13px;
  color: #94a3b8;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes blink-cursor {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    opacity: 0.45;
    transform: scale(0.2);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (width <= 768px) {
  .message-bubble {
    padding: 0 2px;
    margin-bottom: 18px;
  }

  .msg-row {
    gap: 8px;
    margin-bottom: 12px;
  }

  .msg-avatar {
    width: 30px;
    height: 30px;
    border-radius: 12px;
  }

  .msg-avatar :deep(.el-icon) {
    font-size: 17px;
  }

  .user-content {
    max-width: calc(100% - 46px);
    padding: 10px 13px;
    font-size: 14px;
    line-height: 1.65;
    border-radius: 16px 16px 5px;
  }

  .ai-content {
    width: calc(100% - 38px);
    padding: 13px 12px;
    font-size: 14px;
    line-height: 1.7;
    border-radius: 16px 16px 16px 5px;
    box-shadow: 0 8px 24px rgb(15 23 42 / 8%);
  }

  .ai-content:hover {
    transform: none;
  }

  .stage-timeline {
    padding: 9px 10px;
    margin-bottom: 12px;
    border-radius: 13px;
  }

  .timeline-item {
    gap: 8px;
  }

  .timeline-label {
    white-space: normal;
  }

  .timeline-text {
    align-items: flex-start;
  }

  .timeline-cost,
  .timeline-progress {
    margin-top: 1px;
  }

  .understanding-tip,
  .fix-notice {
    padding: 9px 10px;
    font-size: 12px;
    border-radius: 12px;
  }

  .sql-collapse {
    border-radius: 12px;
  }

  .sql-collapse-title {
    width: 100%;
    overflow: hidden;
    font-size: 12px;
  }

  .strategy-tag {
    flex: 0 0 auto;
  }

  .sql-collapse :deep(.el-collapse-item__header) {
    height: auto;
    min-height: 38px;
    padding: 7px 10px;
    line-height: 1.45;
  }

  .sql-collapse :deep(.el-collapse-item__content) {
    padding: 8px 10px 10px;
  }

  .answer-text {
    font-size: 14px;
    line-height: 1.8;
  }

  .answer-text :deep(pre) {
    padding: 10px;
    font-size: 12px;
    border-radius: 11px;
  }

  .answer-text :deep(code) {
    font-size: 12px;
  }

  .status-bar {
    gap: 6px;
  }

  .status-bar .el-tag {
    height: 26px;
    padding: 0 8px;
    font-size: 12px;
  }

  .action-bar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 7px;
  }

  .action-bar .el-button {
    justify-content: center;
    width: 100%;
    height: 36px;
    margin-left: 0;
    background: #f8fafc;
  }

  .suggest-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 7px;
  }

  .suggest-list .el-button {
    justify-content: flex-start;
    width: 100%;
    margin-left: 0;
    border-radius: 12px;
  }

  .loading-dots {
    padding: 6px 0;
  }
}

@media (width <= 420px) {
  .msg-row {
    gap: 6px;
  }

  .msg-avatar {
    width: 28px;
    height: 28px;
    border-radius: 11px;
  }

  .ai-content {
    width: calc(100% - 34px);
    padding: 12px 10px;
  }

  .user-content {
    max-width: calc(100% - 40px);
    padding: 9px 12px;
  }

  .timeline-dot {
    width: 18px;
    height: 18px;
  }

  .timeline-item:not(:last-child)::after {
    top: 24px;
    left: 8px;
  }

  .timeline-text {
    flex-wrap: wrap;
    gap: 5px;
  }

  .timeline-label {
    width: 100%;
    font-size: 12px;
  }

  .timeline-cost,
  .timeline-progress {
    font-size: 10px;
  }
}
</style>
