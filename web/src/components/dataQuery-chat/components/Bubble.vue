<template>
  <div class="message-bubble">
    <!-- ==================== 用户提问 ==================== -->
    <div class="msg-row user-row">
      <div class="msg-avatar user-avatar">
        <el-icon :size="20">
          <User />
        </el-icon>
      </div>
      <div class="user-message-wrap">
        <div class="msg-content user-content">
          <p>{{ message.question }}</p>
        </div>

        <div v-if="message.question" class="lifecycle-bar">
          <button class="action-btn" title="复制问题" @click="handleCopyQuestion">
            <el-icon :size="15">
              <DocumentCopy />
            </el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== AI 回答 ==================== -->
    <div class="msg-row ai-row">
      <div class="msg-avatar ai-avatar">
        <el-icon :size="20">
          <Cpu />
        </el-icon>
      </div>

      <div class="ai-message-wrap">
        <div class="msg-content ai-content">
          <!-- ========== 区块1: 实时进度时间线（始终展示已完成和当前阶段） ========== -->
          <div v-if="hasAnyStage" class="stage-timeline">
            <!-- 已完成的阶段 -->
            <div
              v-for="(stage, idx) in message.stages"
              :key="'done-' + idx"
              class="timeline-item done"
            >
              <div class="timeline-dot done-dot">
                <el-icon :size="12">
                  <SuccessFilled />
                </el-icon>
              </div>
              <div class="timeline-text">
                <span class="timeline-label">{{ stage.message }}</span>
                <span v-if="stage.costMs" class="timeline-cost">{{ stage.costMs }}ms</span>
              </div>
            </div>

            <!-- 当前正在进行的阶段 -->
            <div v-if="message.loading && message.streamingStage" class="timeline-item active">
              <div class="timeline-dot active-dot">
                <el-icon :size="12" class="spinning">
                  <Loading />
                </el-icon>
              </div>
              <div class="timeline-text">
                <span class="timeline-label">{{ message.streamingStage.stageName }}</span>
                <span class="timeline-progress">
                  {{ message.streamingStage.stepIndex }}/{{ message.streamingStage.totalSteps }}
                </span>
              </div>
              <!-- 进度条 -->
              <div class="timeline-progress-bar">
                <div
                  class="timeline-progress-fill"
                  :style="{ width: message.streamingStage.progress + '%' }"
                />
              </div>
            </div>
          </div>

          <!-- ========== 区块2: 问题改写提示 ========== -->
          <div v-if="message.processedQuestion" class="understanding-tip">
            <el-icon>
              <InfoFilled />
            </el-icon>
            <span>我将您的问题理解为：「{{ message.processedQuestion }}」</span>
          </div>

          <!-- ========== 区块3: SQL 展示 ========== -->
          <el-collapse v-if="message.sql" class="sql-collapse">
            <el-collapse-item name="sql">
              <template #title>
                <span class="sql-collapse-title">
                  <el-icon>
                    <Document />
                  </el-icon>
                  {{
                    message.loading && !message.data ? 'SQL 已生成（查询中...）' : '查看生成的 SQL'
                  }}
                  <el-tag
                    v-if="message.sqlStrategy && message.sqlStrategy !== 'DIRECT'"
                    type="success"
                    size="small"
                    effect="plain"
                    style="margin-left: 8px"
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
            <el-icon color="#e6a23c">
              <Warning />
            </el-icon>
            <span>正在进行第 {{ message.fixRounds }} 轮 SQL 自动修复...</span>
          </div>

          <!-- ========== 区块5: SQL 预检警告 ========== -->
          <el-alert
            v-if="!message.loading && message.sqlWarning"
            :title="message.sqlWarning"
            type="warning"
            show-icon
            :closable="false"
            style="margin: 8px 0"
          />

          <!-- ========== 区块6: 数据表格 ========== -->
          <DataTable
            v-if="showTable && message.columns?.length && message.data?.length"
            :columns="message.columns"
            :display-columns="message.displayColumns"
            :data="message.data"
          />

          <!-- ========== 区块7: AI 回答（流式打字机 + 静态） ========== -->
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
              <el-icon>
                <Timer />
              </el-icon>
              {{ message.costMs }}ms
            </el-tag>
            <el-tag v-if="message.rowCount > 0" size="small" effect="plain">
              <el-icon>
                <Grid />
              </el-icon>
              {{ message.rowCount }} 行
            </el-tag>
            <el-tag v-if="message.fixRounds > 0" type="warning" size="small" effect="plain">
              <el-icon>
                <Refresh />
              </el-icon>
              修复{{ message.fixRounds }}轮
            </el-tag>
            <el-tag v-if="message.federated" type="primary" size="small" effect="plain">
              <el-icon>
                <Connection />
              </el-icon>
              联邦 · {{ message.datasourceCount }}源
            </el-tag>
          </div>

          <!-- ========== 区块9: 图表 ========== -->
          <ChartRenderer
            v-if="message.chartConfig && message.data?.length"
            :chart-config="message.chartConfig"
            :columns="message.columns"
            :display-columns="message.displayColumns"
            :data="message.data"
          />

          <!-- ========== 区块10: 操作按钮 ========== -->
          <div v-if="!message.loading && message.success && message.sql" class="action-bar">
            <el-button text size="small" @click="showTable = !showTable">
              <el-icon>
                <Grid />
              </el-icon>
              {{ showTable ? '收起表格' : '展开表格' }}
            </el-button>
            <el-button text size="small" type="success" @click="handleConfirm">
              <el-icon><Select /></el-icon> SQL 正确
            </el-button>
            <el-button text size="small" type="warning" @click="handleFeedback">
              <el-icon>
                <Warning />
              </el-icon>
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
            style="margin-top: 8px"
          />

          <!-- ========== 区块12: 澄清选项 ========== -->
          <ClarifyOptions
            v-if="!message.loading && message.clarification"
            :clarification="message.clarification"
            @select="$emit('askQuestion', $event)"
          />

          <!-- ========== 区块13: 推荐后续问题 ========== -->
          <div
            v-if="
              !message.loading &&
                message.suggestedQuestions?.length &&
                message.id === chatStore.messages[chatStore.messages.length - 1].id
            "
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
            <span /><span /><span />
            <span class="loading-text">正在连接服务...</span>
          </div>
        </div>

        <!-- ========== 区块10.5: 复制 / 重新回答 / 回答版本切换（悬浮出现） ========== -->
        <div v-if="canCopyAnswer || canRegenerate || hasVariants" class="lifecycle-bar">
          <button
            v-if="canCopyAnswer"
            class="action-btn"
            title="复制回答内容"
            @click="handleCopyAnswer"
          >
            <el-icon :size="15">
              <DocumentCopy />
            </el-icon>
          </button>

          <button
            v-if="canRegenerate"
            class="action-btn"
            title="重新回答"
            :disabled="streaming"
            @click="handleRegenerate"
          >
            <el-icon :size="15">
              <RefreshRight />
            </el-icon>
          </button>
        </div>

        <div v-if="hasVariants" class="lifecycle-bar">
          <button
            class="action-btn"
            title="上一版本"
            :disabled="!prevVariant || switching"
            @click="handleSwitchVariant(prevVariant)"
          >
            <el-icon :size="15">
              <ArrowLeft />
            </el-icon>
          </button>
          <span class="variant-label">{{ activeVariantPos + 1 }} / {{ variantList.length }}</span>
          <button
            class="action-btn"
            title="下一版本"
            :disabled="!nextVariant || switching"
            @click="handleSwitchVariant(nextVariant)"
          >
            <el-icon :size="15">
              <ArrowRight />
            </el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import { ElMessage } from 'element-plus';
import SqlBlock from './SqlBlock.vue';
import { useDataQueryStore } from '@/store';
import DataTable from './DataTable.vue';
import ChartRenderer from './ChartRenderer.vue';
import ClarifyOptions from './ClarifyOptions.vue';
const chatStore = useDataQueryStore();
const props = defineProps({
  message: { type: Object, required: true },
  /** 是否消息列表最后一条（仅最新一条允许发起重新回答） */
  isLast: { type: Boolean, default: false },
  /** 全局是否有生成进行中（进行中禁用重新回答/版本切换，防止并发轮次） */
  streaming: { type: Boolean, default: false },
});

const emit = defineEmits(['confirm', 'feedback', 'askQuestion', 'regenerate', 'switchVariant']);

const showTable = ref(true);

// ⭐ 关键判断：是否有任何阶段信息（有就展示时间线，没有才展示兜底loading）
const hasAnyStage = computed(() => {
  return (props.message.stages && props.message.stages.length > 0) || props.message.streamingStage;
});

// ⭐ 关键判断：是否有任何内容产物
const hasAnyContent = computed(() => {
  return (
    hasAnyStage.value ||
    props.message.sql ||
    props.message.answer ||
    props.message.data ||
    props.message.processedQuestion
  );
});

// SQL 策略标签
const strategyLabel = computed(() => {
  const s = props.message.sqlStrategy;
  if (s === 'MULTI_CANDIDATE') return '多候选投票';
  if (s === 'INCREMENTAL_MODIFY') return '增量修改';
  if (s === 'TRINO_FEDERATED') return 'Trino跨库';
  if (s === 'FEDERATED') return '联邦查询';
  if (s?.startsWith('FIX_ROUND')) return '已修复';
  return s;
});

// Markdown 渲染
const renderedAnswer = computed(() => {
  if (!props.message.answer) return '';
  try {
    return marked(props.message.answer, { breaks: true });
  } catch {
    return props.message.answer;
  }
});

// ==================== 复制 / 重新回答 / 版本切换 ====================

// 是否可复制回答：终态且已有回答文本
const canCopyAnswer = computed(() => {
  return !props.message.loading && !!props.message.answer;
});

// 是否可发起重新回答：终态（成功/失败/已停止）+ 单数据源链路 + 仅最新一条
// （历史轮次不允许再生成新版本，仅可切换已生成的回答版本）
const canRegenerate = computed(() => {
  const m = props.message;
  if (m.loading || m.federated) return false;
  if (!props.isLast) return false;

  // 终态判断：优先 success/stopped，同时兜底非 loading 且有实质内容的消息
  const isTerminal = m.success !== undefined || m.stopped || !!m.answer || !!m.sql || !!m.data;
  if (!isTerminal) return false;

  return true;
});

// 变体列表（按变体序号正序）；多于 1 个版本时展示切换器
const variantList = computed(() => {
  const list = Array.isArray(props.message.variants) ? [...props.message.variants] : [];
  return list.sort((a: any, b: any) => (a?.variantIndex || 0) - (b?.variantIndex || 0));
});

const hasVariants = computed(() => variantList.value.length > 1);

const switching = computed(() => !!props.message.variantSwitching);

// 当前生效变体在列表中的位置：优先 activeVariant 标记，回退匹配消息当前 variantIndex
const activeVariantPos = computed(() => {
  const list = variantList.value;
  if (list.length === 0) return 0;

  const activeIdx = list.findIndex((v: any) => v?.activeVariant);
  if (activeIdx >= 0) return activeIdx;

  const byIndex = list.findIndex(
    (v: any) => v?.variantIndex != null && v.variantIndex === props.message.variantIndex,
  );
  return byIndex >= 0 ? byIndex : 0;
});

const prevVariant = computed(() =>
  activeVariantPos.value > 0 ? variantList.value[activeVariantPos.value - 1] : null,
);

const nextVariant = computed(() =>
  activeVariantPos.value < variantList.value.length - 1
    ? variantList.value[activeVariantPos.value + 1]
    : null,
);

function fallbackCopyText(text: any) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    ElMessage.success('已复制');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  } finally {
    document.body.removeChild(textarea);
  }
}

async function handleCopyAnswer() {
  const text = props.message.answer || '';

  if (!text) {
    ElMessage.warning('暂无可复制内容');
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      ElMessage.success('已复制');
      return;
    }

    fallbackCopyText(text);
  } catch {
    fallbackCopyText(text);
  }
}

async function handleCopyQuestion() {
  const text = props.message.question || '';

  if (!text) {
    ElMessage.warning('暂无可复制内容');
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      ElMessage.success('已复制');
      return;
    }
    fallbackCopyText(text);
  } catch {
    fallbackCopyText(text);
  }
}

function handleRegenerate() {
  if (props.streaming || switching.value) return;
  emit('regenerate');
}

function handleSwitchVariant(variant: any) {
  if (!variant || switching.value || props.streaming) return;
  emit('switchVariant', variant.id);
}

function handleConfirm() {
  emit('confirm', { question: props.message.question, sql: props.message.sql });
  ElMessage.success('感谢反馈！此 SQL 已加入知识库');
}

function handleFeedback() {
  emit('feedback', { question: props.message.question, sql: props.message.sql });
  ElMessage.info('感谢反馈！我们会持续优化');
}

watch(
  () => props.message,
  (newVal) => {
    console.log(newVal);
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
// ==================== 设计变量 ====================
$success: #35c46a;
$warning: #f59e0b;
$danger: #ef4444;
$text-main: #1f2937;
$text-sub: #6b7280;
$text-light: #9ca3af;
$bg-soft: #f8fafc;
$card-shadow: 0 10px 30px rgb(15 23 42 / 8%);
$card-shadow-hover: 0 16px 40px rgb(15 23 42 / 12%);

// ==================== 整体布局 ====================
.message-bubble {
  padding: 0 4px;
  margin-bottom: 28px;
}

.msg-row {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  animation: fade-up 0.28s ease both;

  &.user-row {
    justify-content: flex-end;
  }

  &.ai-row {
    align-items: flex-start;
  }
}

// ==================== AI 整体区域：用于承载文本气泡和外部操作栏 ====================
.ai-message-wrap {
  width: 85%;

  .msg-content {
    width: 100%;
  }

  &:hover,
  &:focus-within {
    .answer-copy-actions,
    .lifecycle-bar {
      visibility: visible;
      pointer-events: auto;
      opacity: 1;
      transform: translateY(8px);
    }
  }
}

.user-message-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 75%;

  .msg-content {
    width: 100%;
    max-width: 100%;
  }

  &:hover,
  &:focus-within {
    .lifecycle-bar {
      pointer-events: auto;
      opacity: 1;
      transform: translateY(8px);
    }
  }
}

// ==================== 头像 ====================
.msg-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgb(15 23 42 / 8%);

  &.user-avatar {
    order: 1;
    color: #2563eb;
    background: linear-gradient(135deg, rgb(219 234 254 / 95%), rgb(239 246 255 / 95%));
    border: 1px solid rgb(147 197 253 / 45%);
  }

  &.ai-avatar {
    color: #fff;
    background:
      radial-gradient(circle at 30% 20%, rgb(255 255 255 / 35%), transparent 30%),
      linear-gradient(135deg, #5b7cfa 0%, #8b5cf6 52%, #ec4899 100%);
  }
}

// ==================== 消息内容 ====================
.msg-content {
  position: relative;
  font-size: 14px;
  line-height: 1.75;

  &.user-content {
    padding: 11px 16px;
    color: #fff;
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
    border-radius: 18px 18px 6px;
    box-shadow: 0 10px 24px rgb(59 130 246 / 22%);

    p {
      margin: 0;
      white-space: pre-wrap;
    }
  }

  &.ai-content {
    padding: 16px 18px;
    color: $text-main;
    background: linear-gradient(180deg, rgb(255 255 255 / 98%), rgb(248 250 252 / 92%));
    border: 1px solid rgb(226 232 240 / 85%);
    border-radius: 18px 18px 18px 6px;
    box-shadow: $card-shadow;
    transition:
      box-shadow 0.22s ease,
      transform 0.22s ease;

    &:hover {
      box-shadow: $card-shadow-hover;
      transform: translateY(-1px);
    }
  }
}

// ==================== AI 回答外部复制操作栏 ====================
.answer-copy-actions {
  display: flex;
  visibility: hidden;
  gap: 18px;
  align-items: center;
  width: 100%;
  min-height: 50px;
  padding: 0 26px;
  margin-top: 10px;
  pointer-events: none;
  background: #fff;
  border: 1px solid rgb(241 245 249 / 92%);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 7%);
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    visibility 0.18s ease,
    box-shadow 0.18s ease;
}

.copy-answer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: #6b7280;
  cursor: pointer;
  outline: none;
  background: transparent;
  border: none;
  transition:
    color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    color: #4f7cff;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }
}

// ==================== 阶段时间线 ====================
.stage-timeline {
  position: relative;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: linear-gradient(180deg, #f8fbff, #fff);
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 14px;

  .timeline-item {
    position: relative;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 5px 0;

    &:not(:last-child)::after {
      position: absolute;
      top: 25px;
      bottom: -5px;
      left: 9px;
      width: 2px;
      content: '';
      background: #dbeafe;
      border-radius: 99px;
    }

    &.done::after {
      background: linear-gradient(180deg, rgb(53 196 106 / 60%), rgb(79 124 255 / 20%));
    }

    &.active::after {
      display: none;
    }
  }

  .timeline-dot {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-top: 1px;
    border-radius: 999px;

    &.done-dot {
      color: $success;
      background: #ecfdf3;
      box-shadow: inset 0 0 0 1px rgb(53 196 106 / 18%);
    }

    &.active-dot {
      color: #4f7cff;
      background: #eef4ff;
      box-shadow:
        inset 0 0 0 1px rgb(79 124 255 / 20%),
        0 0 0 5px rgb(79 124 255 / 8%);
    }
  }

  .timeline-text {
    display: flex;
    flex: 1;
    gap: 8px;
    align-items: center;
    min-height: 22px;

    .timeline-label {
      font-size: 13px;
      font-weight: 500;
      color: #475569;
    }

    .timeline-cost {
      padding: 1px 6px;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      color: $text-light;
      background: #f1f5f9;
      border-radius: 999px;
    }

    .timeline-progress {
      padding: 1px 7px;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      color: #4f7cff;
      background: #eef4ff;
      border-radius: 999px;
    }
  }

  .timeline-progress-bar {
    position: absolute;
    right: 12px;
    bottom: 2px;
    left: 42px;
    height: 4px;
    overflow: hidden;
    background: #e5edff;
    border-radius: 999px;

    .timeline-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4f7cff, #22c55e);
      border-radius: inherit;
      transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    }
  }
}

// ==================== 问题改写提示 ====================
.understanding-tip {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #92400e;
  background: linear-gradient(135deg, #fff7ed, #fffbeb);
  border: 1px solid rgb(245 158 11 / 22%);
  border-radius: 12px;

  .el-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }
}

// ==================== SQL 折叠 ====================
.sql-collapse {
  margin: 10px 0 12px;
  overflow: hidden;
  background: #f8fafc;
  border: none;
  border-radius: 12px;

  .sql-collapse-title {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
  }

  :deep(.el-collapse-item__header) {
    height: 38px;
    padding: 0 12px;
    font-size: 13px;
    line-height: 38px;
    color: #64748b;
    background: #f8fafc;
    border-bottom: none;
  }

  :deep(.el-collapse-item__wrap) {
    background: #fff;
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 10px 12px 12px;
  }
}

// ==================== 修复提示 ====================
.fix-notice {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  margin: 10px 0;
  font-size: 13px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid rgb(245 158 11 / 24%);
  border-radius: 12px;
}

// ==================== AI 回答 ====================
.answer-text {
  font-size: 14px;
  line-height: 1.85;
  color: $text-main;
  word-break: break-word;

  :deep(p) {
    margin: 0 0 10px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(strong) {
    font-weight: 700;
    color: #111827;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 20px;
    margin: 8px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(a) {
    color: #4f7cff;
    text-decoration: none;
    border-bottom: 1px solid rgb(79 124 255 / 28%);

    &:hover {
      border-bottom-color: #4f7cff;
    }
  }

  :deep(blockquote) {
    padding: 8px 12px;
    margin: 10px 0;
    color: #475569;
    background: #f8fafc;
    border-left: 3px solid#4f7cff;
    border-radius: 8px;
  }

  :deep(code) {
    padding: 2px 6px;
    font-size: 13px;
    color: #be123c;
    background: #fff1f2;
    border: 1px solid rgb(244 63 94 / 12%);
    border-radius: 6px;
  }

  :deep(pre) {
    padding: 12px;
    margin: 10px 0;
    overflow: auto;
    color: #e5e7eb;
    background: #0f172a;
    border-radius: 12px;

    code {
      padding: 0;
      color: inherit;
      background: transparent;
      border: none;
    }
  }

  &.streaming-cursor::after {
    display: inline-block;
    margin-left: 2px;
    font-weight: 400;
    color: #4f7cff;
    content: '▍';
    animation: blink-cursor 0.85s infinite;
  }
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

// ==================== 状态标签 ====================
.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 8px;

  .el-tag {
    height: 26px;
    padding: 0 9px;
    font-weight: 500;
    border-radius: 999px;

    :deep(.el-tag__content) {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      white-space: nowrap;
    }
  }
}

// ==================== 操作按钮 ====================
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px dashed #e5e7eb;

  .el-button {
    padding: 6px 10px;
    border-radius: 999px;
    transition:
      transform 0.18s ease,
      background-color 0.18s ease,
      box-shadow 0.18s ease;

    &:hover {
      box-shadow: 0 6px 16px rgb(15 23 42 / 8%);
      transform: translateY(-1px);
    }
  }
}

// ==================== 复制 / 重新回答 & 版本切换（悬浮出现，与 MessageActions 同款） ====================
.lifecycle-bar {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px;
  pointer-events: none;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;

  & + .lifecycle-bar {
    margin-left: 8px;
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
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover:not(:disabled) {
    color: #374151;
    background: #f3f4f6;
  }

  &:disabled {
    color: #d1d5db;
    cursor: not-allowed;
  }
}

.variant-label {
  min-width: 40px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #6b7280;
  text-align: center;
  user-select: none;
}

// ==================== 推荐问题 ====================
.suggested-questions {
  padding-top: 14px;
  margin-top: 16px;
  border-top: 1px dashed #e5e7eb;

  .suggest-label {
    margin-bottom: 9px;
    font-size: 12px;
    font-weight: 500;
    color: $text-light;
  }

  .suggest-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .el-button {
      height: 30px;
      font-size: 12px;
      background: #fff;
      border-radius: 999px;
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease;

      &:hover {
        border-color: rgb(79 124 255 / 55%);
        box-shadow: 0 8px 20px rgb(79 124 255 / 14%);
        transform: translateY(-1px);
      }
    }
  }
}

// ==================== 兜底 loading ====================
.loading-dots {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 8px 0;

  span:not(.loading-text) {
    width: 7px;
    height: 7px;
    background: linear-gradient(135deg, #4f7cff, #8b5cf6);
    border-radius: 50%;
    animation: bounce 1.35s infinite ease-in-out both;

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

  .loading-text {
    margin-left: 8px;
    font-size: 13px;
    color: $text-light;
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

// ==================== 通用动画 ====================
.spinning {
  animation: spin 1s linear infinite;
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

// ==================== 移动端适配 ====================
@media (width <=768px) {
  .msg-row {
    gap: 8px;

    &.user-row .user-message-wrap,
    &.ai-row .ai-message-wrap {
      max-width: 95%;
    }
  }

  .ai-message-wrap {
    width: 95%;
  }

  .msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 12px;
  }

  .msg-content {
    &.user-content,
    &.ai-content {
      padding: 12px 14px;
      border-radius: 16px;
    }
  }

  .stage-timeline {
    padding: 9px 10px;
  }

  .action-bar {
    gap: 6px;
  }
}
</style>
