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
  status?: string;
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

      messages.value = records.map(
        (item: HistoryMessageItem): ChatMessage => ({
          id: item.id,
          question: item.userQuestion || '',
          answer: item.aiAnswer || '',
          sql: item.generatedSql || null,
          columns: item.resultColumns || null,
          data: item.resultData || null,
          chartConfig: item.chartConfig || null,
          costMs: item.costMs || 0,
          status: item.status,
          errorMsg: item.errorMsg || null,
          createdTime: item.createdTime,
          loading: false,

          stages: [],
          streamingStage: null,
          answerStreaming: false,
        }),
      );

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
  };
});
