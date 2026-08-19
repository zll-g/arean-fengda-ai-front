import { aiPrefix, filePrefix } from '../http';

// API 端点定义（固定）
const API_ENDPOINTS = {
  // 发送消息（流式）
  CHAT_STREAM: `${aiPrefix}/chat/rag/stream`,
  // 发送消息（非流式）
  CHAT: `${aiPrefix}/chat-ui/chat`,
  // 获取对话历史
  CONVERSATIONS: `${aiPrefix}/chat/sessions`,
  // 获取单个对话
  CONVERSATION: `${aiPrefix}/chat/sessions/{sessionId}/messages`,
  // 删除对话
  DELETE_CONVERSATION: `${aiPrefix}/chat/sessions/{sessionId}`,
  // 上传文件
  UPLOAD: `${filePrefix}/chat-ui/upload`,
  // 获取模型列表
  MODELS: `${aiPrefix}/chat-ui/models`,
  // 停止生成
  STOP: `${aiPrefix}/chat/rag/stop`,
  // 重新生成
  REGENERATE: `${aiPrefix}/chat/rag/regenerate`,
};
import { getToken } from '@/utils/device';
// 请求类型定义
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  files?: string[];
}

export interface ChatRequest {
  sessionId?: string;
  userId?: string;
  message?: string;
  knowledgeBaseIds?: string[];
  mode?: string;
  enableRerank?: boolean;
  enableHyde?: boolean;
  enableExpansion?: boolean;
  topK?: number;
  minScore?: number;
  conversationId?: string;
  images?: string[];
  files?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
  // 扩展选项
  deepSearch?: boolean;
  webSearch?: boolean;
  deepThinking?: boolean;
}

export interface RegenerateRequest {
  sessionId: string;
  userId?: string;
  assistantMessageId?: string;
  knowledgeBaseIds?: string[];
  mode?: string;
  maxOutputTokens?: number;
  customPrompt?: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  imageList: string[];
  fileList: string[];
  reference: string | null;
  inputTokenCount: number | null;
  outputTokenCount: number | null;
  latency: number | null;
  rating: string | null;
  status: string;
  stopReason: string | null;
  userMessageId: string | null;
  variantIndex: number | null;
  variantCount: number | null;
  activeVariant: boolean;
  createdAt: string;
}

export interface ChatResponse {
  id: string;
  conversationId: string;
  content: string;
  model: string;
  createdAt: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  provider: string;
}

export interface UploadResult {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

// API 调用类
class ChatApi {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * 流式对话
   */
  async *streamChat(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.CHAT_STREAM}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    // let i = 0;
    // let buffer = ''
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const match = text.match(/data:\s*(\{.*\})/);
      if (match) {
        yield JSON.parse(match[1])['message'];
      }
    }
  }

  /**
   * 非流式对话
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.CHAT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * 停止对话
   */
  async stopChat(userId?: string, sessionId?: string) {
    await fetch(`${this.baseUrl}${API_ENDPOINTS.STOP}/${userId}/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
  }

  /**
   * 重新生成（流式）
   * @param request 重新生成请求参数
   * @param signal 可选的 AbortSignal 用于取消请求
   * @description assistantMessageId 为空时对最后一个问题重新生成
   */
  async *regenerateChat(request: RegenerateRequest, signal?: AbortSignal): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.REGENERATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const match = text.match(/data:\s*(\{.*\})/);
      if (match) {
        yield JSON.parse(match[1])['message'];
      }
    }
  }

  /**
   * 获取会话消息列表
   * @param sessionId 会话ID
   */
  async getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
    const url = `${this.baseUrl}${API_ENDPOINTS.CONVERSATION.replace('{sessionId}', sessionId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const res = await response.json();
    return res.data || [];
  }

  /**
   * 获取模型列表
   */
  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: '最强大的模型',
        maxTokens: 8192,
        provider: 'OpenAI',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: '快速高效',
        maxTokens: 16384,
        provider: 'OpenAI',
      },
    ];
    // const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.MODELS}`);
    // if (!response.ok) {
    //   // 返回默认模型列表
    //   return [
    //     {
    //       id: "gpt-4",
    //       name: "GPT-4",
    //       description: "最强大的模型",
    //       maxTokens: 8192,
    //       provider: "OpenAI",
    //     },
    //     {
    //       id: "gpt-3.5-turbo",
    //       name: "GPT-3.5 Turbo",
    //       description: "快速高效",
    //       maxTokens: 16384,
    //       provider: "OpenAI",
    //     },
    //   ];
    // }
    // return response.json();
  }

  /**
   * 上传文件
   */
  async uploadFile(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.UPLOAD}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败: HTTP ${response.status}`);
    }

    return response.json();
  }
}

// 导出单例
export const chatApi = new ChatApi();

// 导出类用于自定义配置
export { ChatApi, API_ENDPOINTS };

// 导出端点常量（供调试使用）
// export {API_ENDPOINTS}
