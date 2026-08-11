// 消息类型枚举
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  MULTI_VIDEO = 'multi_video',
  FILE = 'file',
  CODE = 'code',
  SUGGESTION = 'suggestion',
  THINKING = 'thinking',
}

// 消息角色
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

// 附件类型
export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'video';
  url: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
}

// 推荐选项
export interface Suggestion {
  id: string;
  text: string;
  icon?: string;
}

// 视频信息
export interface VideoInfo {
  id: string;
  url: string;
  poster?: string;
  title?: string;
  duration?: number;
}

// 消息内容
export interface MessageContent {
  type: MessageType;
  text?: string;
  images?: Attachment[];
  videos?: VideoInfo[];
  files?: Attachment[];
  suggestions?: Suggestion[];
  codeLanguage?: string;
}

// 消息反馈
export interface MessageFeedback {
  liked?: boolean;
  disliked?: boolean;
  copied?: boolean;
}

// 单条消息
export interface Message {
  id: string;
  role: MessageRole;
  reference?: any;
  content: string;
  createdAt: string;
  timestamp?: number;
  feedback?: MessageFeedback;
  isStreaming?: boolean;
  isError?: boolean;
  isEnd?: boolean;
  isBreak?: boolean;
  errorMessage?: string;
  messageId?: string;
  imageList?: any;
  fileList?: any;
}

// 对话设置
export interface ConversationSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableMemory: boolean;
  memoryLength: number;
}

// 对话
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  sessionId?: string;
  updatedTime?: string;
  knowledgeBaseId?: string;
  createdAt: number;
  lastMessageAt: number;
  pinned?: boolean;
  archived?: boolean;
  settings?: ConversationSettings;
}

// 输入框状态
export interface InputState {
  text: string;
  attachments: Attachment[];
  isDeepSearch: boolean;
  isWebSearch: boolean;
}

// 应用设置
export interface AppSettings {
  // 外观设置
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: 'small' | 'medium' | 'large';

  // 对话设置
  sendOnEnter: boolean;
  showTimestamp: boolean;
  compactMode: boolean;

  // AI 默认设置
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultSystemPrompt: string;

  // 功能设置
  enableSound: boolean;
  enableNotification: boolean;
  autoSaveInterval: number;

  // 隐私设置
  saveHistory: boolean;
  shareAnalytics: boolean;
}

// AI 模型配置
export interface AIModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  provider: string;
  icon?: string;
}
