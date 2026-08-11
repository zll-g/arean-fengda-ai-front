// API 端点定义（固定）
const API_ENDPOINTS = {
  // 发送消息（流式）
  CHAT_STREAM: '/api/chat/rag/stream',
  // 发送消息（非流式）
  CHAT: '/api/chat-ui/chat',
  // 获取对话历史
  CONVERSATIONS: '/api/chat/sessions',
  // 获取单个对话
  CONVERSATION: '/api/chat/sessions/{sessionId}/messages',
  // 删除对话
  DELETE_CONVERSATION: '/api/chat/sessions/{sessionId}',
  // 上传文件
  UPLOAD: '/api/chat-ui/upload',
  // 获取模型列表
  MODELS: '/api/chat-ui/models',
  // 停止生成
  STOP: '/api/chat/rag/stop',
};

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
      },
    });
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
