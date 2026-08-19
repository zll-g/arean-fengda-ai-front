import { getToken } from '@/utils/device';
import { aiPrefix } from '@/api/http';

/**
 * SSE 客户端 — TypeScript 修复版
 *
 * 修复点：
 * 1. 正确处理 Spring SseEmitter 的 SSE 格式
 * 2. 支持多行 data 字段拼接
 * 3. 支持 event 和 data 跨行
 * 4. 健壮的错误处理
 * 5. 补充 TypeScript 类型定义
 */

export interface StageEventData {
  stageId?: string;
  stageName?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface QuestionRewrittenData {
  originalQuestion?: string;
  rewrittenQuestion?: string;
  [key: string]: unknown;
}

export interface SqlGeneratedData {
  sql?: string;
  explanation?: string;
  [key: string]: unknown;
}

export interface SqlFixingData {
  sql?: string;
  error?: string;
  fixedSql?: string;
  [key: string]: unknown;
}

export interface DataReadyData {
  columns?: unknown[];
  rows?: unknown[];
  total?: number;
  [key: string]: unknown;
}

export interface AnswerTokenData {
  token?: string;
  content?: string;
  [key: string]: unknown;
}

export interface AnswerCompleteData {
  answer?: string;
  content?: string;
  [key: string]: unknown;
}

export interface ChartReadyData {
  chartType?: string;
  chartData?: unknown;
  [key: string]: unknown;
}

export interface SuggestionsReadyData {
  suggestions?: string[];
  [key: string]: unknown;
}

export interface DoneData {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface ErrorEventData {
  errorMsg?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ChatSSECallbacks {
  onStageStart?: (data: StageEventData) => void;
  onStageComplete?: (data: StageEventData) => void;
  onQuestionRewritten?: (data: QuestionRewrittenData) => void;
  onSqlGenerated?: (data: SqlGeneratedData) => void;
  onSqlFixing?: (data: SqlFixingData) => void;
  onDataReady?: (data: DataReadyData) => void;
  onAnswerToken?: (data: AnswerTokenData) => void;
  onAnswerComplete?: (data: AnswerCompleteData) => void;
  onChartReady?: (data: ChartReadyData) => void;
  onSuggestionsReady?: (data: SuggestionsReadyData) => void;
  onDone?: (data: DoneData) => void;
  onError?: (message: string) => void;
}

export type ChatSSERequest = Record<string, unknown>;

type SSEEventName =
  | 'stage_start'
  | 'stage_complete'
  | 'question_rewritten'
  | 'sql_generated'
  | 'sql_fixing'
  | 'data_ready'
  | 'answer_token'
  | 'answer_complete'
  | 'chart_ready'
  | 'suggestions_ready'
  | 'done'
  | 'error'
  | string;

export class ChatSSEClient {
  private abortController: AbortController | null = null;

  /**
   * 发起单数据源流式对话
   */
  async start(request: ChatSSERequest, callbacks: ChatSSECallbacks = {}): Promise<void> {
    return this._doRequest(`${aiPrefix}/data-chat/stream`, request, callbacks);
  }

  /**
   * 发起联邦查询流式对话
   */
  async startFederated(request: ChatSSERequest, callbacks: ChatSSECallbacks = {}): Promise<void> {
    return this._doRequest(`${aiPrefix}/chat/federated/stream`, request, callbacks);
  }

  /**
   * 重新回答（生产级变体语义）：
   * 对同一问题发起新一轮回答，旧版本保留在 variants 中可切换回溯。
   */
  async regenerate(request: ChatSSERequest, callbacks: ChatSSECallbacks = {}): Promise<void> {
    return this._doRequest(`${aiPrefix}/data-chat/regenerate`, request, callbacks);
  }

  /**
   * 核心请求方法
   */
  private async _doRequest(
    url: string,
    request: ChatSSERequest,
    callbacks: ChatSSECallbacks,
  ): Promise<void> {
    this.abort();
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('当前环境不支持 ReadableStream，response.body 为空');
      }

      await this._readStream(response, callbacks);
    } catch (error: unknown) {
      if (this._isAbortError(error)) {
        console.log('SSE 请求已取消');
        return;
      }

      const message = this._getErrorMessage(error);
      console.error('SSE 连接异常:', error);
      callbacks.onError?.(`连接异常: ${message}`);
    } finally {
      this.abortController = null;
    }
  }

  /**
   * 读取 SSE 流并解析
   *
   * Spring SseEmitter 输出格式：
   *   event:stage_start
   *   data:{"stageId":"preprocess",...}
   *
   *   event:sql_generated
   *   data:{"sql":"SELECT ..."}
   */
  private async _readStream(response: Response, callbacks: ChatSSECallbacks): Promise<void> {
    if (!response.body) {
      throw new Error('response.body 为空，无法读取 SSE 流');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // flush TextDecoder 内部残留
          buffer += decoder.decode();

          // 流结束，处理缓冲区中剩余数据
          if (buffer.trim()) {
            this._processBuffer(buffer, callbacks);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 兼容 Windows 换行
        buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // SSE 协议：每个事件以空行分隔
        const eventBlocks = buffer.split('\n\n');

        // 最后一个可能不完整，保留在 buffer 中
        buffer = eventBlocks.pop() ?? '';

        for (const block of eventBlocks) {
          if (block.trim()) {
            this._processEventBlock(block, callbacks);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 处理缓冲区，通常在流结束时调用
   */
  private _processBuffer(buffer: string, callbacks: ChatSSECallbacks): void {
    const normalizedBuffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalizedBuffer.split('\n\n');

    for (const block of blocks) {
      if (block.trim()) {
        this._processEventBlock(block, callbacks);
      }
    }
  }

  /**
   * 解析单个 SSE 事件块
   *
   * 一个事件块的格式：
   *   event:xxx
   *   data:yyy
   *   data:zzz
   *
   * SSE 规范中，多行 data 应使用 "\n" 拼接。
   */
  private _processEventBlock(block: string, callbacks: ChatSSECallbacks): void {
    let eventName: SSEEventName | null = null;
    const dataLines: string[] = [];

    const lines = block.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      // 注释行，忽略
      if (line.startsWith(':')) {
        continue;
      }

      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        // data: 后如果有一个空格，按 SSE 习惯去掉这个空格
        const value = line.slice('data:'.length);
        dataLines.push(value.startsWith(' ') ? value.slice(1) : value);
      } else if (line.startsWith('id:') || line.startsWith('retry:')) {
        // 忽略 id 和 retry 字段
      }
    }

    if (!eventName || dataLines.length === 0) {
      return;
    }

    // SSE 规范：多行 data 用换行符拼接
    const dataStr = dataLines.join('');

    try {
      const data = JSON.parse(dataStr) as unknown;
      this._dispatch(eventName, data, callbacks);
    } catch (error: unknown) {
      console.warn(`SSE JSON 解析失败: event=${eventName}, data=${dataStr.slice(0, 100)}`, error);
    }
  }

  /**
   * 分发事件到回调
   */
  private _dispatch(event: SSEEventName, data: unknown, callbacks: ChatSSECallbacks): void {
    switch (event) {
      case 'stage_start':
        callbacks.onStageStart?.(data as StageEventData);
        break;

      case 'stage_complete':
        callbacks.onStageComplete?.(data as StageEventData);
        break;

      case 'question_rewritten':
        callbacks.onQuestionRewritten?.(data as QuestionRewrittenData);
        break;

      case 'sql_generated':
        callbacks.onSqlGenerated?.(data as SqlGeneratedData);
        break;

      case 'sql_fixing':
        callbacks.onSqlFixing?.(data as SqlFixingData);
        break;

      case 'data_ready':
        callbacks.onDataReady?.(data as DataReadyData);
        break;

      case 'answer_token':
        callbacks.onAnswerToken?.(data as AnswerTokenData);
        break;

      case 'answer_complete':
        callbacks.onAnswerComplete?.(data as AnswerCompleteData);
        break;

      case 'chart_ready':
        callbacks.onChartReady?.(data as ChartReadyData);
        break;

      case 'suggestions_ready':
        callbacks.onSuggestionsReady?.(data as SuggestionsReadyData);
        break;

      case 'done':
        callbacks.onDone?.(data as DoneData);
        break;

      case 'error': {
        const errorData = data as ErrorEventData;
        callbacks.onError?.(errorData.errorMsg || errorData.message || '未知错误');
        break;
      }

      default:
        console.debug('未知 SSE 事件:', event, data);
    }
  }

  /**
   * 取消请求
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private _isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }

  private _getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return '未知错误';
  }
}

export const chatSSEClient = new ChatSSEClient();
