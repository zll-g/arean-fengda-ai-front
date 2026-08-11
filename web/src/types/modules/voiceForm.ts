// 模板
export interface Template {
  id: number;
  templateCode: string;
  templateName: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  currentVersion: number;
  guideScript: string;
  sampleSpeech: string;
  status: number;
  sortOrder: number;
  favorited: boolean;
  pinned: boolean;
  fieldCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  id: number;
  roundNo: number;
  role: string;
  contentType: string;
  content: string;
  audioUrl: string;
  nluResult: any;
  fieldUpdates: any;
  duration: number;
  createdAt: string;
}

// 主数据
export interface MasterDataItem {
  id: number;
  sourceCode: string;
  dataCode: string;
  dataName: string;
  field: string;
  quote: string;
  aliases: string;
  dataValues: Record<string, any>;
  score?: number;
}

// 模板字段
export interface TemplateField {
  id: number;
  fieldCode: string;
  fieldName: string;
  fieldType: string;
  fieldGroup: string;
  placeholder: string;
  defaultValue: string;
  required: number;
  sensitive: number;
  sensitiveType: string;
  validationRule: string;
  voiceAlias: string;
  masterDataCode: string;
  options: Array<{ value: string; label: string }>;
  unit: string;
  minValue: number;
  maxValue: number;
  sortOrder: number;
  visible: number;
  wizardStep: number;
  wizardPrompt: string;
}

// 模板详情
export interface TemplateDetail extends Template {
  fields: TemplateField[];
  rules: FieldRule[];
}

// 填单记录
export interface FormFillRecord {
  id: number;
  formDataId: number;
  action: string;
  actionLabel: string;
  beforeSnapshot: Record<string, any>;
  afterSnapshot: Record<string, any>;
  changeFields: string[];
  source: string;
  remark: string;
  createdAt: string;
}

// 字段联动规则
export interface FieldRule {
  id: number;
  ruleName: string;
  ruleType: string;
  triggerField: string;
  triggerCondition: any;
  targetField: string;
  action: any;
  priority: number;
  enabled: number;
}

// 表单数据
export interface FormData {
  id: number;
  formNo: string;
  templateId: number;
  templateName: string;
  categoryName: string;
  templateVersion: number;
  title: string;
  formValues: Record<string, any>;
  status: string;
  statusLabel: string;
  source: string;
  parentFormId: number;
  confirmedAt: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

// 校验警告
export interface ValidationWarning {
  fieldCode: string;
  fieldName: string;
  value: any;
  warningMessage: string;
  severity: string;
}
