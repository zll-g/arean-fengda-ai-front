import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import api from '@/api';
import { chatSSEClient } from '@/utils/sseClient';
import { useRouter } from 'vue-router';

type QueryMode = 'single' | 'multi';

interface ChatSession {
  sessionId: string;
  [key: string]: any;
}

interface HistoryMessageItem {
  id: string | number;
  userQuestion?: string;
  aiAnswer?: string;
  generatedSql?: string | null;
  resultColumns?: unknown[] | null;
  resultColumnLabels?: unknown[] | null;
  resultData?: unknown[] | null;
  chartConfig?: unknown | null;
  costMs?: number;
  status?: number | string | null;
  stopReason?: string | null;
  errorMsg?: string | null;
  createdTime?: string;
  questionGroupId?: string | null;
  variantIndex?: number | null;
}

interface StageItem {
  stageId?: string;
  stageName?: string;
  message?: string;
  stepIndex?: number;
  totalSteps?: number;
  progress?: number;
  costMs?: number;
}

interface StreamingStage {
  stageId?: string;
  stageName?: string;
  stepIndex?: number;
  totalSteps?: number;
  progress?: number;
}

interface ChatMessage {
  id: string | number;
  question: string;
  answer: string;
  sql: string | null;
  columns: unknown[] | null;
  displayColumns?: unknown[] | null;
  data: unknown[] | null;
  rowCount?: number;
  chartType?: string | null;
  chartConfig: unknown | null;
  costMs: number;
  costText?: string | null;
  status?: string;
  success?: boolean;
  stopped?: boolean;
  stopReason?: string | null;
  stopReasonText?: string | null;
  errorMsg: string | null;
  createdTime?: string;
  loading: boolean;
  processedQuestion?: string | null;
  sqlStrategy?: string | null;
  sqlWarning?: string | null;
  fixRounds?: number;
  suggestedQuestions?: string[];
  clarification?: string | null;
  stages: StageItem[];
  streamingStage: StreamingStage | null;
  answerStreaming: boolean;
  federated?: boolean;
  datasourceCount?: number;
  /** 重新回答相关 */
  historyId?: string | number | null;
  questionGroupId?: string | null;
  variantIndex?: number | null;
  variants?: any[];
  variantSwitching?: boolean;
  variantsLoaded?: boolean;
}

interface VariantItem {
  id: string | number;
  variantIndex?: number | null;
  activeVariant?: boolean | null;
  aiAnswer?: string | null;
  generatedSql?: string | null;
  resultColumns?: unknown[] | null;
  resultColumnLabels?: unknown[] | null;
  resultData?: unknown[] | null;
  chartConfig?: unknown | null;
  costMs?: number | null;
  status?: number | string | null;
  stopReason?: string | null;
  errorMsg?: string | null;
  createdTime?: string;
}

const STOP_REASON_TEXT: Record<string, string> = {
  USER_STOPPED: '手动停止',
  CLIENT_DISCONNECTED: '连接断开',
  NEW_REQUEST: '已被新提问替代',
  TIMEOUT: '生成超时',
  ORPHAN_RECOVERY: '异常中断已回收',
};

const VARIANT_PREFETCH_LIMIT = 50;

function formatCostText(costMs?: number | null): string {
  const ms = Math.max(0, Number(costMs) || 0);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  const pad = (n: number, len: number) => String(n).padStart(len, '0');
  return `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`;
}

function buildStopText(reason?: string | null, partialLength?: number | null): string {
  const base = (reason && STOP_REASON_TEXT[reason]) || '已停止';
  return partialLength && partialLength > 0 ? `${base}，已生成 ${partialLength} 字` : base;
}

function deriveTerminal(
  status?: number | string | null,
  stopReason?: string | null,
): { success: boolean | undefined; stopped: boolean; stopText: string | null } {
  const s = status === null || status === undefined ? NaN : Number(status);
  if (s === 1) return { success: true, stopped: false, stopText: null };
  if (s === 0) return { success: false, stopped: false, stopText: null };
  if (s === 2) return { success: undefined, stopped: true, stopText: buildStopText(stopReason) };
  return { success: undefined, stopped: false, stopText: null };
}

function alignDisplayColumns(
  labels?: unknown[] | null,
  columns?: unknown[] | null,
): string[] | null {
  if (!Array.isArray(columns) || !columns.length) return null;
  const aligned = Array.isArray(labels) && labels.length === columns.length;
  return columns.map((col, i) => {
    const raw = String(col ?? '');
    if (!aligned) return raw;
    const label = labels?.[i];
    const text = label == null ? '' : String(label).trim();
    return text || raw;
  });
}

function genRequestId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  // 兜底：不支持 crypto 的环境用时间戳 + 随机数
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface StageStartEvent {
  stageId?: string;
  stageName?: string;
  stepIndex?: number;
  totalSteps?: number;
  progress?: number;
}

interface StageCompleteEvent {
  stageId?: string;
  message?: string;
  costMs?: number;
}

interface QuestionRewrittenEvent {
  rewritten?: string;
}

interface SqlGeneratedEvent {
  sql?: string;
  strategy?: string;
}

interface SqlFixingEvent {
  round?: number;
  errorType?: string;
}

interface DataReadyEvent {
  columns?: unknown[];
  /** 结果列中文展示名（与 columns 同序；后端展示治理下发） */
  displayColumns?: unknown[];
  data?: unknown[];
  rowCount?: number;
}

interface AnswerTokenEvent {
  token?: string;
}

interface AnswerCompleteEvent {
  answer?: string;
}

interface ChartReadyEvent {
  chartType?: string;
  chartConfig?: unknown;
}

interface SuggestionsReadyEvent {
  suggestions?: string[];
}

interface DoneEvent {
  sessionId?: string;
  costMs?: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '未知错误';
}

export const useDataQueryStore = defineStore('dataQueryChat', () => {
  const router = useRouter();

  const sessionId = ref('');
  const sessions = ref<ChatSession[]>([]);
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);

  const queryMode = ref<QueryMode>('single');
  const selectedDsIds = ref<Array<string | number>>([]);
  const selectedGroupId = ref<string | number | null>(null);

  async function fetchSessions(datasourceId: string): Promise<void> {
    try {
      const res = await api.dataQueryQa.getChatHistory({ datasourceId });
      sessions.value = (res.data?.records || []) as ChatSession[];
    } catch (error: unknown) {
      console.error('加载会话列表失败:', error);
    }
  }

  async function selectSession(id: string, type?: string): Promise<void> {
    sessionId.value = id;

    try {
      const res = await api.dataQueryQa.getChatMessages(id);
      const records = (res.data || []) as HistoryMessageItem[];

      messages.value = records.map((item: HistoryMessageItem): ChatMessage => {
        const terminal = deriveTerminal(item.status, item.stopReason);

        return {
          id: item.id,
          question: item.userQuestion || '',
          answer: item.aiAnswer || '',
          sql: item.generatedSql || null,
          columns: item.resultColumns || null,
          displayColumns: alignDisplayColumns(item.resultColumnLabels, item.resultColumns),
          data: item.resultData || null,
          chartConfig: item.chartConfig || null,
          costMs: item.costMs || 0,
          costText: item.costMs != null ? formatCostText(item.costMs) : null,
          status: item.status == null ? undefined : String(item.status),
          success: terminal.success,
          errorMsg: item.errorMsg || null,
          createdTime: item.createdTime,
          loading: false,

          historyId: item.id,
          stopped: terminal.stopped,
          stopReason: item.stopReason || null,
          stopReasonText: terminal.stopText,
          questionGroupId: item.questionGroupId || null,
          variantIndex: item.variantIndex ?? null,
          variants: [],

          stages: [],
          streamingStage: null,
          answerStreaming: false,
        };
      });

      // 后台预取各问题组的变体列表
      _prefetchVariantGroups();

      if (type === 'h5') {
        router.push('/h5/dataQuery-qa');
      }
    } catch (error: unknown) {
      console.error('加载会话消息失败:', error);
      messages.value = [];
    }
  }

  function newSession(): void {
    sessionId.value = '';
    messages.value = [];
  }

  async function sendMessage(datasourceId: string, question: string): Promise<void> {
    if (queryMode.value === 'multi' && selectedDsIds.value.length > 1) {
      return _sendStreaming(question, true);
    }

    return _sendStreaming(question, false, datasourceId);
  }

  async function _sendStreaming(
    question: string,
    isFederated: boolean,
    datasourceId?: string | number,
  ): Promise<void> {
    loading.value = true;

    const msg = reactive<ChatMessage>({
      id: Date.now(),
      question,
      answer: '',
      sql: null,
      columns: null,
      data: null,
      rowCount: 0,
      chartType: null,
      chartConfig: null,
      costMs: 0,
      success: undefined,
      errorMsg: null,
      loading: true,

      processedQuestion: null,
      sqlStrategy: null,
      sqlWarning: null,
      fixRounds: 0,
      suggestedQuestions: [],
      clarification: null,

      stages: [],
      streamingStage: null,
      answerStreaming: false,

      federated: isFederated,
      datasourceCount: isFederated ? selectedDsIds.value.length : 1,
    });

    messages.value.push(msg);

    const request: any = {
      sessionId: sessionId.value,
      question,
    };

    if (isFederated) {
      request.datasourceIds = [...selectedDsIds.value];

      if (selectedGroupId.value !== null) {
        request.groupId = selectedGroupId.value;
      }
    } else if (datasourceId !== undefined) {
      request.datasourceId = datasourceId;
    }

    const callbacks: any = {
      onStageStart: (data: StageStartEvent): void => {
        msg.streamingStage = {
          stageId: data.stageId,
          stageName: data.stageName,
          stepIndex: data.stepIndex,
          totalSteps: data.totalSteps,
          progress: data.progress,
        };
      },

      onStageComplete: (data: StageCompleteEvent): void => {
        msg.stages.push({
          stageId: data.stageId,
          message: data.message,
          costMs: data.costMs,
        });
      },

      onQuestionRewritten: (data: QuestionRewrittenEvent): void => {
        msg.processedQuestion = data.rewritten || null;
      },

      onSqlGenerated: (data: SqlGeneratedEvent): void => {
        msg.sql = data.sql || null;
        msg.sqlStrategy = data.strategy || null;
      },

      onSqlFixing: (data: SqlFixingEvent): void => {
        const round = data.round || 0;
        msg.fixRounds = round;

        msg.stages.push({
          stageId: `fix_round_${round}`,
          message: `🔧 第${round}轮修复: ${data.errorType || '未知错误类型'}`,
          costMs: 0,
        });
      },

      onDataReady: (data: DataReadyEvent): void => {
        msg.columns = data.columns || [];
        msg.displayColumns = alignDisplayColumns(data.displayColumns, data.columns);
        msg.data = data.data || [];
        msg.rowCount = data.rowCount || 0;
      },

      onAnswerToken: (data: AnswerTokenEvent): void => {
        msg.answerStreaming = true;
        msg.answer += data.token || '';
      },

      onAnswerComplete: (data: AnswerCompleteEvent): void => {
        msg.answer = data.answer || msg.answer;
        msg.answerStreaming = false;
      },

      onChartReady: (data: ChartReadyEvent): void => {
        msg.chartType = data.chartType || null;
        msg.chartConfig = data.chartConfig || null;
      },

      onSuggestionsReady: (data: SuggestionsReadyEvent): void => {
        msg.suggestedQuestions = data.suggestions || [];
      },

      onDone: (data: DoneEvent): void => {
        if (data.sessionId !== undefined) {
          sessionId.value = data.sessionId;
        }

        msg.costMs = data.costMs || 0;
        msg.success = true;
        msg.loading = false;
        msg.streamingStage = null;
        msg.answerStreaming = false;
        loading.value = false;

        const primaryDsId = isFederated ? selectedDsIds.value[0] : datasourceId;

        if (primaryDsId !== undefined) {
          void fetchSessions(String(primaryDsId));
        }
      },

      onError: (errorMsg: string): void => {
        msg.success = false;
        msg.errorMsg = errorMsg;
        msg.loading = false;
        msg.streamingStage = null;
        msg.answerStreaming = false;
        loading.value = false;
      },
    };

    try {
      if (isFederated) {
        await chatSSEClient.startFederated(request, callbacks);
      } else {
        await chatSSEClient.start(request, callbacks);
      }
    } catch (error: unknown) {
      msg.success = false;
      msg.errorMsg = `请求失败: ${getErrorMessage(error)}`;
      msg.loading = false;
      msg.streamingStage = null;
      msg.answerStreaming = false;
      loading.value = false;
    }
  }

  function cancelStreaming(): void {
    chatSSEClient.abort();

    const loadingMsg = messages.value.find((message: ChatMessage) => message.loading);

    if (loadingMsg) {
      loadingMsg.loading = false;
      loadingMsg.streamingStage = null;
      loadingMsg.answerStreaming = false;
      loadingMsg.success = false;
      loadingMsg.errorMsg = '用户取消';
    }

    loading.value = false;
  }

  // ==================== 重新回答 / 版本切换 ====================

  /** 采集气泡当前展示内容快照（重答发起前调用，供失败兜底恢复） */
  function _takeContentSnapshot(msg: ChatMessage): Record<string, unknown> {
    return {
      answer: msg.answer,
      sql: msg.sql,
      columns: msg.columns,
      displayColumns: msg.displayColumns,
      data: msg.data,
      rowCount: msg.rowCount,
      chartType: msg.chartType,
      chartConfig: msg.chartConfig,
      costMs: msg.costMs,
      costText: msg.costText,
      success: msg.success,
      errorMsg: msg.errorMsg,
      stopped: msg.stopped,
      stopReason: msg.stopReason,
      stopReasonText: msg.stopReasonText,
      processedQuestion: msg.processedQuestion,
      sqlStrategy: msg.sqlStrategy,
      sqlWarning: msg.sqlWarning,
      fixRounds: msg.fixRounds,
      suggestedQuestions: msg.suggestedQuestions ? [...msg.suggestedQuestions] : [],
      clarification: msg.clarification,
      stages: [...msg.stages],
      streamingStage: null,
      answerStreaming: false,
      loading: false,
    };
  }

  /** 重答前就地重置气泡的 AI 侧内容 */
  function _resetMessageForRegenerate(msg: ChatMessage): void {
    msg.answer = '';
    msg.sql = null;
    msg.columns = null;
    msg.displayColumns = null;
    msg.data = null;
    msg.rowCount = 0;
    msg.chartType = null;
    msg.chartConfig = null;
    msg.costMs = 0;
    msg.costText = null;
    msg.success = undefined;
    msg.errorMsg = null;
    msg.stopped = false;
    msg.stopReason = null;
    msg.stopReasonText = null;
    msg.processedQuestion = null;
    msg.sqlStrategy = null;
    msg.sqlWarning = null;
    msg.fixRounds = 0;
    msg.suggestedQuestions = [];
    msg.clarification = null;
    msg.stages = [];
    msg.streamingStage = null;
    msg.answerStreaming = false;
    msg.loading = true;
  }

  async function regenerateMessage(message: ChatMessage): Promise<boolean> {
    if (loading.value || message.loading) return false;
    if (message.federated) return false;
    if (!sessionId.value) return false;

    const isLastMessage = messages.value[messages.value.length - 1] === message;
    if (!isLastMessage) return false;

    // 变体数量上限：同一问题最多生成 5 个版本（含原始版本）
    const knownVariantCount = Math.max(message.variants?.length || 0, message.variantIndex || 1);
    if (knownVariantCount >= 5) {
      ElMessage.warning('重新生成次数已达上限（5次），无法继续生成');
      return false;
    }

    // 失败兜底快照：受理前拒绝或中途失败时恢复旧版本展示
    const snapshot = _takeContentSnapshot(message);

    _resetMessageForRegenerate(message);
    loading.value = true;

    const request: any = {
      sessionId: sessionId.value,
      requestId: genRequestId(),
    };
    if (message.historyId != null) {
      request.historyId = Number(message.historyId);
    }

    // 构建回调（复用 _sendStreaming 的回调结构 + 重答特有失败恢复）
    const callbacks: any = {
      onStageStart: (data: any): void => {
        message.streamingStage = {
          stageId: data.stageId,
          stageName: data.stageName,
          stepIndex: data.stepIndex,
          totalSteps: data.totalSteps,
          progress: data.progress,
        };
      },
      onStageComplete: (data: any): void => {
        message.stages.push({
          stageId: data.stageId,
          message: data.message,
          costMs: data.costMs,
        });
      },
      onQuestionRewritten: (data: any): void => {
        message.processedQuestion = data.rewritten || null;
      },
      onSqlGenerated: (data: any): void => {
        message.sql = data.sql || null;
        message.sqlStrategy = data.strategy || null;
      },
      onDataReady: (data: any): void => {
        message.columns = data.columns || [];
        message.displayColumns = alignDisplayColumns(data.displayColumns, data.columns);
        message.data = data.data || [];
        message.rowCount = data.rowCount || 0;
      },
      onAnswerToken: (data: any): void => {
        message.answerStreaming = true;
        message.answer += data.token || '';
      },
      onAnswerComplete: (data: any): void => {
        message.answer = data.answer || message.answer;
        message.answerStreaming = false;
      },
      onChartReady: (data: any): void => {
        message.chartType = data.chartType || null;
        message.chartConfig = data.chartConfig || null;
      },
      onSuggestionsReady: (data: any): void => {
        message.suggestedQuestions = data.suggestions || [];
      },
      onDone: (data: any): void => {
        if (data.sessionId !== undefined) {
          sessionId.value = data.sessionId;
        }
        message.stopped = false;
        message.stopReason = null;
        message.stopReasonText = null;
        message.costMs = data.costMs || 0;
        message.costText = data.costText || formatCostText(message.costMs);
        message.success = true;
        message.loading = false;
        message.streamingStage = null;
        message.answerStreaming = false;
        loading.value = false;

        // 重答完成后刷新变体列表
        if (sessionId.value) {
          void _refreshVariants(message, 0);
        }
      },
      onError: (errorMsg: string): void => {
        // 重答失败：恢复旧版本内容
        Object.assign(message, snapshot);
        message.success = false;
        message.errorMsg = errorMsg;
        loading.value = false;
      },
    };

    try {
      await chatSSEClient.regenerate(request, callbacks);
      return true;
    } catch (error: unknown) {
      Object.assign(message, snapshot);
      message.success = false;
      message.errorMsg = `请求失败: ${getErrorMessage(error)}`;
      loading.value = false;
      return false;
    }
  }

  /** 用变体数据就地替换气泡展示内容（版本切换成功后的本地生效） */
  function _applyVariantToMessage(msg: ChatMessage, variant: VariantItem): void {
    const terminal = deriveTerminal(variant.status, variant.stopReason);

    msg.historyId = variant.id;
    msg.variantIndex = variant.variantIndex ?? msg.variantIndex ?? null;

    msg.answer = variant.aiAnswer || '';
    msg.sql = variant.generatedSql || null;
    msg.columns = variant.resultColumns || null;
    msg.displayColumns = alignDisplayColumns(variant.resultColumnLabels, variant.resultColumns);
    msg.data = variant.resultData || null;
    msg.rowCount = Array.isArray(variant.resultData) ? variant.resultData.length : 0;
    msg.chartType = null;
    msg.chartConfig = variant.chartConfig || null;
    msg.costMs = variant.costMs || 0;
    msg.costText = variant.costMs != null ? formatCostText(variant.costMs) : null;

    msg.success = terminal.success;
    msg.stopped = terminal.stopped;
    msg.stopReason = variant.stopReason || null;
    msg.stopReasonText = terminal.stopText;
    msg.errorMsg = variant.errorMsg || null;

    msg.processedQuestion = null;
    msg.sqlStrategy = null;
    msg.sqlWarning = null;
    msg.fixRounds = 0;
    msg.suggestedQuestions = [];
    msg.clarification = null;
    msg.stages = [];
    msg.streamingStage = null;
    msg.answerStreaming = false;
    msg.loading = false;
  }

  /** 刷新某消息所属变体组的变体列表 */
  async function _refreshVariants(
    msg: ChatMessage,
    expectedMinCount = 0,
    attempt = 0,
  ): Promise<void> {
    if (msg.historyId == null) return;

    try {
      const res = await api.dataQueryQa.listVariants(msg.historyId);
      const list = ((res.data || []) as VariantItem[]).slice();

      if (expectedMinCount > 0 && list.length < expectedMinCount && attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return _refreshVariants(msg, expectedMinCount, attempt + 1);
      }

      list.sort((a, b) => (a.variantIndex || 0) - (b.variantIndex || 0));
      msg.variants = list;
      msg.variantsLoaded = true;
    } catch (error: unknown) {
      console.error('加载回答版本失败:', error);
    }
  }

  /** 会话重开后后台预取各问题组的变体列表 */
  function _prefetchVariantGroups(): void {
    const seenGroups = new Set<string>();
    const targets: ChatMessage[] = [];

    for (const msg of messages.value) {
      if (msg.historyId == null || !msg.questionGroupId || seenGroups.has(msg.questionGroupId)) {
        continue;
      }
      seenGroups.add(msg.questionGroupId);
      targets.push(msg);
    }

    void (async () => {
      for (const msg of targets.slice(0, VARIANT_PREFETCH_LIMIT)) {
        await _refreshVariants(msg);
      }
    })();
  }

  async function switchVariant(message: ChatMessage, historyId: string | number): Promise<void> {
    if (message.variantSwitching || loading.value || message.loading) return;

    const target = (message.variants || []).find((v) => String(v.id) === String(historyId));
    if (!target || target.activeVariant) return;

    message.variantSwitching = true;

    try {
      await api.dataQueryQa.activateVariant(historyId);
      _applyVariantToMessage(message, target);

      (message.variants || []).forEach((v) => {
        v.activeVariant = String(v.id) === String(historyId);
      });
    } catch (error: unknown) {
      console.error('切换回答版本失败:', error);
      await _refreshVariants(message);
      throw error;
    } finally {
      message.variantSwitching = false;
    }
  }

  async function deleteSession(id: string): Promise<void> {
    await api.dataQueryQa.romoveChatMessages(id);

    sessions.value = sessions.value.filter((session: ChatSession) => session.sessionId !== id);

    if (sessionId.value === id) {
      newSession();
    }
  }

  return {
    sessionId,
    sessions,
    messages,
    loading,

    queryMode,
    selectedDsIds,
    selectedGroupId,

    fetchSessions,
    selectSession,
    newSession,
    sendMessage,
    cancelStreaming,
    deleteSession,
    regenerateMessage,
    switchVariant,
  };
});
