import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
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
  resultData?: unknown[] | null;
  chartConfig?: unknown | null;
  costMs?: number;
  /** 状态: 0-失败 1-成功 2-中断(部分回答) 3-生成中占位 */
  status?: number | string | null;
  errorMsg?: string | null;
  /** 中断原因（仅 status=2 时有值） */
  stopReason?: string | null;
  /** 同一问题的变体组ID（重新回答产生的各版本共享） */
  questionGroupId?: string | null;
  /** 变体序号（1=首发回答，重新回答递增） */
  variantIndex?: number | null;
  /** 是否生效变体（历史列表仅返回生效变体） */
  activeVariant?: boolean | null;
  createdTime?: string;
}

/** 回答变体（同一问题的多版本回答，由重新回答产生） */
interface VariantItem {
  id: string | number;
  variantIndex?: number | null;
  activeVariant?: boolean | null;
  aiAnswer?: string | null;
  generatedSql?: string | null;
  resultColumns?: unknown[] | null;
  resultData?: unknown[] | null;
  chartConfig?: unknown | null;
  costMs?: number | null;
  status?: number | string | null;
  stopReason?: string | null;
  errorMsg?: string | null;
  createdTime?: string;
}

interface StageItem {
  stageId?: string;
  stageName?: string;
  message?: string;
  stepIndex?: number;
  totalSteps?: number;
  progress?: number;
  costMs?: number;
  /** 阶段耗时展示文本（mm:ss.SSS，后端下发，优先于 costMs 直显） */
  costText?: string;
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
  data: unknown[] | null;
  rowCount?: number;
  chartType?: string | null;
  chartConfig: unknown | null;
  costMs: number;
  /** 总耗时展示文本（mm:ss.SSS，done 事件 costText / 历史 costMs 换算） */
  costText?: string | null;
  status?: string;
  success?: boolean;
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

  // ==================== 流式生命周期（中断/重新回答/变体）扩展字段 ====================
  /** 后端历史行ID：流式生成过程中为 null，终态（done/stopped）后由历史回填 */
  historyId?: string | number | null;
  /** 是否已停止（中断终态，部分回答保留展示；成功后会被复位） */
  stopped?: boolean;
  stopReason?: string | null;
  stopReasonText?: string | null;
  /** 变体组ID（重新回答各版本共享；首发问题自成组） */
  questionGroupId?: string | null;
  /** 当前展示变体序号 */
  variantIndex?: number | null;
  /** 同组全部变体（懒加载；length>1 时前端渲染版本切换器） */
  variants?: VariantItem[];
  variantsLoaded?: boolean;
  /** 变体切换请求进行中（切换器防重复点击） */
  variantSwitching?: boolean;
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
  costText?: string;
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
  costText?: string;
}

interface StoppedEvent {
  reason?: string;
  partialLength?: number;
}

/** 中断原因 → 展示文案（与后端 DiGenerationTurn.StopReason 对齐） */
const STOP_REASON_TEXT: Record<string, string> = {
  USER_STOPPED: '手动停止',
  CLIENT_DISCONNECTED: '连接断开',
  NEW_REQUEST: '已被新提问替代',
  TIMEOUT: '生成超时',
  ORPHAN_RECOVERY: '异常中断已回收',
};

/** 会话重开后变体组预取上限（防长会话 N+1，超出部分在重新回答后仍会刷新） */
const VARIANT_PREFETCH_LIMIT = 50;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '未知错误';
}

/**
 * 耗时统一格式化（mm:ss.SSS）：与后端 SseEmitterWrapper.formatCost 口径一致，
 * 负值钳位 00:00.000；仅在后端未下发 costText 时兜底使用。
 */
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

/**
 * 由后端历史状态推导前端终态：
 * 0-失败 / 1-成功 / 2-中断(部分回答，非成功非失败独立呈现) / 3-生成中占位(视同未完成)
 */
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

/** 客户端请求ID（幂等键，后端 10 分钟窗口内防网络重试/双击重复受理） */
function genRequestId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
          data: item.resultData || null,
          chartConfig: item.chartConfig || null,
          costMs: item.costMs || 0,
          costText: item.costMs != null ? formatCostText(item.costMs) : null,
          status: item.status == null ? undefined : String(item.status),
          success: terminal.success,
          errorMsg: item.errorMsg || null,
          createdTime: item.createdTime,
          loading: false,

          // 历史行身份与变体信息（重新回答/版本切换的目标定位依据）
          historyId: item.id,
          stopped: terminal.stopped,
          stopReason: item.stopReason || null,
          stopReasonText: terminal.stopText,
          questionGroupId: item.questionGroupId || null,
          variantIndex: item.variantIndex ?? null,
          variants: [],
          variantsLoaded: false,
          variantSwitching: false,

          stages: [],
          streamingStage: null,
          answerStreaming: false,
        };
      });

      // 后台懒加载各问题组变体（多版本时渲染 1/N 切换器）；串行+容错，不阻塞列表
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

  /**
   * 构建流式回调集（stream 与 regenerate 两条链路共用同一份事件装配逻辑）。
   *
   * @param opts.isFederated        联邦链路（无服务端轮次登记/停止/重答/历史同步）
   * @param opts.datasourceId       单数据源ID（done 后刷新会话列表用）
   * @param opts.regenerate         重新回答轮次（终态后追加刷新变体列表）
   * @param opts.expectedMinVariants 本轮重答完成后变体组内应有最小版本数（落库时序重试依据）
   */
  function _buildStreamCallbacks(
    msg: ChatMessage,
    opts: {
      isFederated: boolean;
      datasourceId?: string | number;
      regenerate?: boolean;
      expectedMinVariants?: number;
      /**
       * 重答失败兜底快照：非空时 onError 先恢复旧版本回答内容再标注失败，
       * 避免「变体上限 409 / 重复提交守卫」等受理前拒绝把气泡清空
       */
      restoreSnapshot?: Record<string, unknown> | null;
    },
  ): Record<string, (data: any) => void> {
    return {
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
          costText: data.costText,
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

        // 服务端到达 done 终态即未中断（与用户点击停止的竞态以服务端为准）
        msg.stopped = false;
        msg.stopReason = null;
        msg.stopReasonText = null;

        msg.costMs = data.costMs || 0;
        msg.costText = data.costText || formatCostText(msg.costMs);
        msg.success = true;
        msg.loading = false;
        msg.streamingStage = null;
        msg.answerStreaming = false;
        loading.value = false;

        const primaryDsId = opts.isFederated ? selectedDsIds.value[0] : opts.datasourceId;

        if (primaryDsId !== undefined) {
          void fetchSessions(String(primaryDsId));
        }

        // 终态后回填后端行身份（historyId/变体组），重答轮次追加刷新变体列表；
        // 联邦链路无服务端持久化，跳过
        if (!opts.isFederated && sessionId.value) {
          void (async () => {
            await _syncIdentityAfterTerminal();
            if (opts.regenerate) {
              await _refreshVariants(msg, opts.expectedMinVariants || 0);
            }
          })();
        }
      },

      onStopped: (data: StoppedEvent): void => {
        // 服务端中断终态（含非本地触发场景：断连/新请求替代/超时/巡检回收）
        _markStopped(msg, data.reason, data.partialLength);
        loading.value = false;

        if (!opts.isFederated && sessionId.value) {
          void _syncIdentityAfterTerminal();
        }
      },

      onError: (errorMsg: string): void => {
        // 已标记中断的消息不再被迟到错误覆盖（服务端已按中断落盘）
        if (msg.stopped) return;

        if (opts.restoreSnapshot) {
          // 重新回答失败（上限/守卫拒绝或中途失败）：恢复旧版本回答内容，仅标注本轮失败
          Object.assign(msg, opts.restoreSnapshot);
          msg.success = false;
          msg.errorMsg = errorMsg;
        } else {
          _applyStreamFailure(msg, errorMsg);
        }
        loading.value = false;
      },
    };
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
      costText: null,
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

      historyId: null,
      stopped: false,
      stopReason: null,
      stopReasonText: null,
      questionGroupId: null,
      variantIndex: null,
      variants: [],
      variantsLoaded: false,
      variantSwitching: false,
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
    } else {
      if (datasourceId !== undefined) {
        request.datasourceId = datasourceId;
      }
      // 客户端幂等键：防网络重试/双击重复受理（联邦端点无此参数契约，不下发）
      request.requestId = genRequestId();
    }

    const callbacks = _buildStreamCallbacks(msg, { isFederated, datasourceId });

    try {
      if (isFederated) {
        await chatSSEClient.startFederated(request, callbacks);
      } else {
        await chatSSEClient.start(request, callbacks);
      }
    } catch (error: unknown) {
      _applyStreamFailure(msg, `请求失败: ${getErrorMessage(error)}`);
      loading.value = false;
    }
  }

  /**
   * 重新回答（生产级变体语义）：不新增用户问题，就地在原气泡内重新生成，
   * 同组产生新变体（旧版本保留，可通过版本切换器回溯）。
   *
   * 目标定位：优先按后端历史行ID（historyId）精确指定；
   * 首问尚未回填ID时仅允许对会话最后一条消息发起（后端默认定位最后一轮）。
   * 联邦查询链路无此接口，前端不支持。
   *
   * @returns true=已发起；false=当前不可重答（调用方据此提示用户）
   */
  async function regenerateMessage(message: ChatMessage): Promise<boolean> {
    if (loading.value || message.loading) return false;
    if (message.federated) return false;
    if (!sessionId.value) return false;

    const isLastMessage = messages.value[messages.value.length - 1] === message;
    if (message.historyId == null && !isLastMessage) return false;

    const knownVariantCount = Math.max(message.variants?.length || 0, message.variantIndex || 1);

    // 失败兜底快照：受理前拒绝（变体上限/重复提交）或中途失败时恢复旧版本展示
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

    const callbacks = _buildStreamCallbacks(message, {
      isFederated: false,
      regenerate: true,
      expectedMinVariants: knownVariantCount + 1,
      restoreSnapshot: snapshot,
    });

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

  /** 采集气泡当前展示内容快照（重答发起前调用，供失败兜底恢复） */
  function _takeContentSnapshot(msg: ChatMessage): Record<string, unknown> {
    return {
      answer: msg.answer,
      sql: msg.sql,
      columns: msg.columns,
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

  /**
   * 切换回答版本（变体回溯）：指定变体置为生效，同组其余变体下线。
   * 成功后用已加载的变体数据就地替换气泡内容（无需整会话刷新）；
   * 失败时回读服务端真实变体列表纠正本地状态并抛出（由页面提示）。
   */
  async function switchVariant(
    message: ChatMessage,
    historyId: string | number,
  ): Promise<void> {
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

  /**
   * 停止当前生成（中断聊天）：
   * 1) 调服务端停止接口（部分回答立即落盘 status=2，幂等）；
   * 2) 本地即时终态化（不等 stopped 事件回推，避免 abort 切断后事件丢失）；
   * 3) 切断本地流式连接。
   *
   * 说明：
   * - 联邦链路后端无轮次登记，仅本地断开；
   * - 新会话首问在 done 回传 sessionId 之前无法调用停止接口，本地断连后
   *   服务端 SSE 写失败回调会按 CLIENT_DISCONNECTED 落盘部分回答。
   */
  function cancelStreaming(): void {
    const loadingMsg = messages.value.find((message: ChatMessage) => message.loading);
    const activeSessionId = sessionId.value;

    if (loadingMsg && !loadingMsg.federated && activeSessionId) {
      void api.dataQueryQa.stopChat(activeSessionId).catch((error: unknown) => {
        // 停止接口为幂等语义，失败不影响本地终态化（服务端巡检会兜底回收）
        console.warn('调用停止接口失败（忽略，已本地中断）:', error);
      });
    }

    if (loadingMsg) {
      _markStopped(loadingMsg, 'USER_STOPPED');
    }

    chatSSEClient.abort();
    loading.value = false;
  }

  /**
   * 中断终态化（幂等）：部分回答保留展示，标记「已停止」。
   * success 保持 undefined —— 中断既非成功亦非失败，由「已停止」标签独立呈现。
   */
  function _markStopped(msg: ChatMessage, reason?: string | null, partialLength?: number): void {
    msg.loading = false;
    msg.streamingStage = null;
    msg.answerStreaming = false;
    msg.stopped = true;
    msg.stopReason = reason || 'USER_STOPPED';
    msg.stopReasonText = buildStopText(reason, partialLength);
  }

  function _applyStreamFailure(msg: ChatMessage, errorMsg: string): void {
    msg.success = false;
    msg.errorMsg = errorMsg;
    msg.loading = false;
    msg.streamingStage = null;
    msg.answerStreaming = false;
  }

  /**
   * 重答前就地重置气泡的 AI 侧内容：保留问题与变体组身份，
   * 清掉上一版回答/SQL/数据/图表等本次将重新生成的产物。
   */
  function _resetMessageForRegenerate(msg: ChatMessage): void {
    msg.answer = '';
    msg.sql = null;
    msg.columns = null;
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

  /**
   * 用变体数据就地替换气泡展示内容（版本切换成功后的本地生效）。
   * 注意：变体 VO 无 rowCount 字段，行数以返回数据长度近似。
   */
  function _applyVariantToMessage(msg: ChatMessage, variant: VariantItem): void {
    const terminal = deriveTerminal(variant.status, variant.stopReason);

    msg.historyId = variant.id;
    msg.variantIndex = variant.variantIndex ?? msg.variantIndex ?? null;

    msg.answer = variant.aiAnswer || '';
    msg.sql = variant.generatedSql || null;
    msg.columns = variant.resultColumns || null;
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

    // 历史变体无流式过程产物
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

  /**
   * 终态后从后端历史回填消息身份（不替换内容，避免闪烁与流式时间线丢失）：
   * 从尾部向前按问题文本逐条配对生效变体行，回填 historyId/变体组/序号。
   * 本地「零内容停止」行（后端已删占位、历史无对应行）跳过继续比对；失配即停防串位。
   */
  async function _syncIdentityAfterTerminal(): Promise<void> {
    if (!sessionId.value) return;

    try {
      const res = await api.dataQueryQa.getChatMessages(sessionId.value);
      const rows = (res.data || []) as HistoryMessageItem[];

      let i = messages.value.length - 1;
      let j = rows.length - 1;

      while (i >= 0 && j >= 0) {
        const msg = messages.value[i];
        const row = rows[j];

        if ((msg.question || '') === (row.userQuestion || '')) {
          msg.historyId = row.id;
          msg.questionGroupId = row.questionGroupId || null;
          msg.variantIndex = row.variantIndex ?? msg.variantIndex ?? null;
          i--;
          j--;
          continue;
        }

        // 本地零内容中断行：后端删除了占位（历史不留痕），跳过该本地行继续对齐
        if (msg.stopped && !msg.answer && !msg.sql) {
          i--;
          continue;
        }

        // 联邦消息不入历史：跳过该本地行继续对齐单数据源行
        if (msg.federated) {
          i--;
          continue;
        }

        break;
      }
    } catch (error: unknown) {
      console.error('回填消息身份失败（不影响本次展示）:', error);
    }
  }

  /**
   * 刷新某消息所属变体组的变体列表。
   * 重答完成时 done 事件先于服务端占位行终态入库，存在极短读写时序差：
   * 若组内版本数未达预期则延迟重试一次。
   */
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

  /**
   * 会话重开后后台预取各问题组的变体列表（同一组仅取一次）：
   * 多版本组渲染 1/N 版本切换器；串行执行+单组容错，不阻塞消息列表渲染。
   */
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
    regenerateMessage,
    switchVariant,
    cancelStreaming,
    deleteSession,
  };
});
