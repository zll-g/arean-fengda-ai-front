<template>
  <div class="template-editor-page">
    <div class="editor-header">
      <div class="header-left">
        <el-button text @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
          {{ t('templateEditor.back') }}
        </el-button>

        <h2>{{ isEdit ? t('templateEditor.editTitle') : t('templateEditor.createTitle') }}</h2>
      </div>

      <div class="header-right">
        <el-button @click="handlePreview">
          <el-icon><View /></el-icon>
          {{ t('templateEditor.preview') }}
        </el-button>

        <el-button type="primary" :loading="saving" @click="handleSave">
          <el-icon><Check /></el-icon>
          {{ isEdit ? t('templateEditor.saveUpdate') : t('templateEditor.createTemplate') }}
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="editor-body">
      <el-tabs v-model="activeTab" type="border-card" class="editor-tabs">
        <!-- Tab1: 基本信息 -->
        <el-tab-pane :label="t('templateEditor.tab.basic')" name="basic">
          <el-form
            ref="basicFormRef"
            :model="form"
            :rules="rules"
            label-width="120px"
            class="basic-form"
          >
            <el-row :gutter="24">
              <el-col :span="12" :xs="24">
                <el-form-item :label="t('templateEditor.basic.templateCode')" prop="templateCode">
                  <el-input
                    v-model="form.templateCode"
                    :placeholder="t('templateEditor.basic.templateCodePlaceholder')"
                    :disabled="isEdit"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="12" :xs="24">
                <el-form-item :label="t('templateEditor.basic.templateName')" prop="templateName">
                  <el-input
                    v-model="form.templateName"
                    :placeholder="t('templateEditor.basic.templateNamePlaceholder')"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="24">
              <el-col :span="12" :xs="24">
                <el-form-item :label="t('templateEditor.basic.category')">
                  <el-select
                    v-model="form.category"
                    :placeholder="t('templateEditor.basic.categoryPlaceholder')"
                    allow-create
                    filterable
                    class="w-full"
                  >
                    <el-option
                      v-for="item in categories"
                      :key="item.code"
                      :disabled="!item.enabled"
                      :label="item.name"
                      :value="item.code"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="12" :xs="24">
                <el-form-item :label="t('templateEditor.basic.themeColor')">
                  <el-color-picker v-model="form.color" show-alpha :predefine="presetColors" />
                  <span class="color-hex">{{ form.color }}</span>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item :label="t('templateEditor.basic.description')">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                :placeholder="t('templateEditor.basic.descriptionPlaceholder')"
              />
            </el-form-item>

            <el-form-item :label="t('templateEditor.basic.sampleSpeech')">
              <el-input
                v-model="form.sampleSpeech"
                type="textarea"
                :rows="2"
                :placeholder="t('templateEditor.basic.sampleSpeechPlaceholder')"
              />
            </el-form-item>

            <el-form-item :label="t('templateEditor.basic.guideScript')">
              <el-input
                v-model="form.guideScript"
                type="textarea"
                :rows="2"
                :placeholder="t('templateEditor.basic.guideScriptPlaceholder')"
              />
            </el-form-item>

            <el-form-item v-if="isEdit" :label="t('templateEditor.basic.changeLog')">
              <el-input
                v-model="form.changeLog"
                :placeholder="t('templateEditor.basic.changeLogPlaceholder')"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab2: 字段管理 -->
        <el-tab-pane :label="t('templateEditor.tab.fields')" name="fields">
          <div class="fields-toolbar">
            <el-button type="primary" @click="addField">
              <el-icon><Plus /></el-icon>
              {{ t('templateEditor.fields.addField') }}
            </el-button>

            <el-button @click="addFieldBatch">
              <el-icon><DocumentAdd /></el-icon>
              {{ t('templateEditor.fields.batchAdd') }}
            </el-button>

            <span class="field-count">
              {{ t('templateEditor.fields.count', { count: form.fields.length }) }}
            </span>
          </div>

          <div class="fields-list">
            <div
              v-for="(field, index) in form.fields"
              :key="index"
              class="field-card"
              :class="{ 'field-expanded': expandedField === index }"
            >
              <div class="field-card-header" @click="toggleField(index)">
                <div class="field-drag-handle">
                  <el-icon><Rank /></el-icon>
                </div>

                <div class="field-summary">
                  <span class="field-order">{{ index + 1 }}</span>

                  <el-tag size="small" :type="getFieldTypeTag(field.fieldType)">
                    {{ getFieldTypeLabel(field.fieldType) }}
                  </el-tag>

                  <span class="field-code">
                    {{ field.fieldCode || t('templateEditor.fields.unnamed') }}
                  </span>

                  <span class="field-name-preview">{{ field.fieldName || '' }}</span>

                  <el-tag v-if="field.required === 1" size="small" type="danger">
                    {{ t('templateEditor.fields.required') }}
                  </el-tag>

                  <el-tag v-if="field.sensitive === 1" size="small" type="warning">
                    {{ t('templateEditor.fields.sensitive') }}
                  </el-tag>
                </div>

                <div class="field-card-actions">
                  <el-button
                    text
                    size="small"
                    :disabled="index === 0"
                    @click.stop="moveFieldUp(index)"
                  >
                    <el-icon><Top /></el-icon>
                  </el-button>

                  <el-button
                    text
                    size="small"
                    :disabled="index === form.fields.length - 1"
                    @click.stop="moveFieldDown(index)"
                  >
                    <el-icon><Bottom /></el-icon>
                  </el-button>

                  <el-button text size="small" type="primary" @click.stop="duplicateField(index)">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>

                  <el-button text size="small" type="danger" @click.stop="removeField(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>

              <div v-show="expandedField === index" class="field-card-body">
                <el-form label-width="110px" size="default">
                  <el-row :gutter="16">
                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.fieldCode')" required>
                        <el-input
                          v-model="field.fieldCode"
                          :placeholder="t('templateEditor.fields.fieldCodePlaceholder')"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.fieldName')" required>
                        <el-input
                          v-model="field.fieldName"
                          :placeholder="t('templateEditor.fields.fieldNamePlaceholder')"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.fieldType')" required>
                        <el-select v-model="field.fieldType" class="w-full">
                          <el-option :label="t('templateEditor.fieldType.text')" value="text" />
                          <el-option :label="t('templateEditor.fieldType.number')" value="number" />
                          <el-option :label="t('templateEditor.fieldType.date')" value="date" />
                          <el-option :label="t('templateEditor.fieldType.select')" value="select" />
                          <el-option
                            :label="t('templateEditor.fieldType.textarea')"
                            value="textarea"
                          />
                          <el-option :label="t('templateEditor.fieldType.phone')" value="phone" />
                          <el-option :label="t('templateEditor.fieldType.idcard')" value="idcard" />
                          <el-option :label="t('templateEditor.fieldType.amount')" value="amount" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :span="8" :xs="12">
                      <el-form-item :label="t('templateEditor.fields.isRequired')">
                        <el-switch v-model="field.required" :active-value="1" :inactive-value="0" />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="12">
                      <el-form-item :label="t('templateEditor.fields.isSensitive')">
                        <el-switch
                          v-model="field.sensitive"
                          :active-value="1"
                          :inactive-value="0"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col v-if="field.sensitive === 1" :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.sensitiveType')">
                        <el-select v-model="field.sensitiveType" class="w-full">
                          <el-option :label="t('templateEditor.fieldType.phone')" value="phone" />
                          <el-option :label="t('templateEditor.fieldType.idcard')" value="idcard" />
                          <el-option :label="t('templateEditor.fieldType.amount')" value="amount" />
                          <el-option :label="t('templateEditor.fieldType.name')" value="name" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.placeholder')">
                        <el-input
                          v-model="field.placeholder"
                          :placeholder="t('templateEditor.fields.placeholderPlaceholder')"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.defaultValue')">
                        <el-input
                          v-model="field.defaultValue"
                          :placeholder="t('templateEditor.fields.defaultValuePlaceholder')"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.unit')">
                        <el-input
                          v-model="field.unit"
                          :placeholder="t('templateEditor.fields.unitPlaceholder')"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row :gutter="16">
                    <el-col :span="12" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.voiceAlias')">
                        <el-input
                          v-model="field.voiceAlias"
                          :placeholder="t('templateEditor.fields.voiceAliasPlaceholder')"
                        />
                        <div class="form-tip">{{ t('templateEditor.fields.voiceAliasTip') }}</div>
                      </el-form-item>
                    </el-col>

                    <el-col :span="12" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.masterData')">
                        <el-select
                          v-model="field.masterDataCode"
                          clearable
                          :placeholder="t('templateEditor.fields.masterDataPlaceholder')"
                          class="w-full"
                        >
                          <el-option
                            :label="t('templateEditor.fields.productMasterData')"
                            value="product"
                          />
                          <el-option
                            :label="t('templateEditor.fields.supplierMasterData')"
                            value="supplier"
                          />
                          <el-option :label="t('masterData.source.gms')" value="gms" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-row v-if="field.fieldType === 'number'" :gutter="16">
                    <el-col :span="12" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.minValue')">
                        <el-input-number
                          v-model="field.minValue"
                          class="w-full"
                          controls-position="right"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="12" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.maxValue')">
                        <el-input-number
                          v-model="field.maxValue"
                          class="w-full"
                          controls-position="right"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <div v-if="field.fieldType === 'select'" class="options-editor">
                    <el-form-item :label="t('templateEditor.fields.options')">
                      <div class="options-list">
                        <div v-for="(opt, oi) in field.options || []" :key="oi" class="option-row">
                          <el-input
                            v-model="opt.value"
                            :placeholder="t('templateEditor.fields.optionValue')"
                            class="opt-input"
                          />
                          <el-input
                            v-model="opt.label"
                            :placeholder="t('templateEditor.fields.optionLabel')"
                            class="opt-input"
                          />
                          <el-button text type="danger" @click="removeOption(field, oi)">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>

                        <el-button size="small" @click="addOption(field)">
                          <el-icon><Plus /></el-icon>
                          {{ t('templateEditor.fields.addOption') }}
                        </el-button>
                      </div>
                    </el-form-item>
                  </div>

                  <el-row :gutter="16">
                    <el-col :span="8" :xs="12">
                      <el-form-item :label="t('templateEditor.fields.wizardStep')">
                        <el-input-number
                          v-model="field.wizardStep"
                          :min="1"
                          class="w-full"
                          controls-position="right"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="16" :xs="24">
                      <el-form-item :label="t('templateEditor.fields.wizardPrompt')">
                        <el-input
                          v-model="field.wizardPrompt"
                          :placeholder="t('templateEditor.fields.wizardPromptPlaceholder')"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </div>
            </div>

            <el-empty
              v-if="form.fields.length === 0"
              :description="t('templateEditor.fields.empty')"
            />
          </div>
        </el-tab-pane>

        <!-- Tab3: 联动规则 -->
        <el-tab-pane :label="t('templateEditor.tab.rules')" name="rules">
          <div class="rules-toolbar">
            <el-button type="primary" @click="addRule">
              <el-icon><Plus /></el-icon>
              {{ t('templateEditor.rules.addRule') }}
            </el-button>

            <span class="rule-count">
              {{ t('templateEditor.rules.count', { count: form.rules.length }) }}
            </span>
          </div>

          <div class="rules-list">
            <el-card
              v-for="(rule, index) in form.rules"
              :key="index"
              shadow="hover"
              class="rule-card"
            >
              <template #header>
                <div class="rule-card-header">
                  <span class="rule-name">
                    {{
                      rule.ruleName || t('templateEditor.rules.defaultName', { index: index + 1 })
                    }}
                  </span>

                  <el-button text type="danger" @click="removeRule(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </template>

              <el-form label-width="100px" size="default">
                <el-row :gutter="16">
                  <el-col :span="12" :xs="24">
                    <el-form-item :label="t('templateEditor.rules.ruleName')">
                      <el-input
                        v-model="rule.ruleName"
                        :placeholder="t('templateEditor.rules.ruleNamePlaceholder')"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12" :xs="24">
                    <el-form-item :label="t('templateEditor.rules.ruleType')">
                      <el-select v-model="rule.ruleType" class="w-full">
                        <el-option
                          :label="t('templateEditor.rules.visibility')"
                          value="visibility"
                        />
                        <el-option
                          :label="t('templateEditor.rules.calculation')"
                          value="calculation"
                        />
                        <el-option :label="t('templateEditor.rules.linkage')" value="linkage" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="16">
                  <el-col :span="12" :xs="24">
                    <el-form-item :label="t('templateEditor.rules.triggerField')">
                      <el-select v-model="rule.triggerField" class="w-full" filterable>
                        <el-option
                          v-for="field in form.fields"
                          :key="field.fieldCode"
                          :label="`${field.fieldName} (${field.fieldCode})`"
                          :value="field.fieldCode"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>

                  <el-col :span="12" :xs="24">
                    <el-form-item :label="t('templateEditor.rules.targetField')">
                      <el-select v-model="rule.targetField" class="w-full" filterable>
                        <el-option
                          v-for="field in form.fields"
                          :key="field.fieldCode"
                          :label="`${field.fieldName} (${field.fieldCode})`"
                          :value="field.fieldCode"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <template v-if="rule.ruleType === 'visibility'">
                  <el-row :gutter="16">
                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.rules.conditionOperator')">
                        <el-select v-model="rule.conditionOperator" class="w-full">
                          <el-option :label="t('templateEditor.rules.eq')" value="eq" />
                          <el-option :label="t('templateEditor.rules.neq')" value="neq" />
                          <el-option :label="t('templateEditor.rules.in')" value="in" />
                        </el-select>
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.rules.conditionValue')">
                        <el-input
                          v-model="rule.conditionValue"
                          :placeholder="t('templateEditor.rules.conditionValuePlaceholder')"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="8" :xs="24">
                      <el-form-item :label="t('templateEditor.rules.action')">
                        <el-select v-model="rule.actionType" class="w-full">
                          <el-option :label="t('templateEditor.rules.show')" value="show" />
                          <el-option :label="t('templateEditor.rules.hide')" value="hide" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </template>

                <template v-if="rule.ruleType === 'calculation'">
                  <el-form-item :label="t('templateEditor.rules.expression')">
                    <el-input
                      v-model="rule.expression"
                      :placeholder="t('templateEditor.rules.expressionPlaceholder')"
                    />
                    <div class="form-tip">{{ t('templateEditor.rules.expressionTip') }}</div>
                  </el-form-item>
                </template>

                <el-form-item :label="t('templateEditor.rules.priority')">
                  <el-input-number v-model="rule.priority" :min="0" :max="100" />
                </el-form-item>
              </el-form>
            </el-card>

            <el-empty
              v-if="form.rules.length === 0"
              :description="t('templateEditor.rules.empty')"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="showPreview"
      :title="t('templateEditor.previewDialog.title')"
      width="700px"
      :fullscreen="isMobile"
    >
      <div class="preview-form">
        <h3>{{ form.templateName || t('templateEditor.previewDialog.unnamedTemplate') }}</h3>

        <p class="preview-desc">{{ form.description }}</p>

        <div v-if="form.sampleSpeech" class="preview-speech">
          <el-icon><Microphone /></el-icon>
          {{ form.sampleSpeech }}
        </div>

        <el-divider />

        <div v-for="field in form.fields" :key="field.fieldCode" class="preview-field">
          <label>
            {{ field.fieldName }}
            <span v-if="field.required === 1" class="required-mark">*</span>
            <span v-if="field.unit" class="unit-mark">（{{ field.unit }}）</span>
          </label>

          <el-input
            v-if="
              field.fieldType === 'text' ||
                field.fieldType === 'phone' ||
                field.fieldType === 'idcard'
            "
            :placeholder="
              field.placeholder ||
                t('templateEditor.previewDialog.inputPlaceholder', { fieldName: field.fieldName })
            "
            disabled
          />

          <el-input-number
            v-else-if="field.fieldType === 'number' || field.fieldType === 'amount'"
            :placeholder="field.placeholder"
            disabled
            class="w-full"
            controls-position="right"
          />

          <el-date-picker
            v-else-if="field.fieldType === 'date'"
            disabled
            class="w-full"
            :placeholder="field.placeholder"
          />

          <el-select
            v-else-if="field.fieldType === 'select'"
            disabled
            class="w-full"
            :placeholder="field.placeholder"
          >
            <el-option
              v-for="opt in field.options || []"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <el-input
            v-else-if="field.fieldType === 'textarea'"
            type="textarea"
            :rows="2"
            disabled
            :placeholder="field.placeholder"
          />

          <el-input v-else disabled :placeholder="field.placeholder" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft,
  Bottom,
  Check,
  CopyDocument,
  Delete,
  DocumentAdd,
  Microphone,
  Plus,
  Rank,
  Top,
  View,
} from '@element-plus/icons-vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/api';
import { computed, onMounted, reactive, ref } from 'vue';

const { t } = useI18n();

const router = useRouter();
const route = useRoute();
const isMobile = useMediaQuery('(max-width: 768px)');

const isEdit = computed(() => !!route.params.id);
const templateId = computed(() => (route.params.id ? Number(route.params.id) : null));

const loading = ref(false);
const saving = ref(false);
const activeTab = ref('basic');
const expandedField = ref<number | null>(0);
const showPreview = ref(false);
const basicFormRef = ref();

const presetColors = [
  '#4F46E5',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#2563EB',
  '#DB2777',
  '#0891B2',
];

interface FieldForm {
  fieldCode: string;
  fieldName: string;
  fieldType: string;
  fieldGroup?: string;
  placeholder?: string;
  defaultValue?: string;
  required: number;
  sensitive: number;
  sensitiveType?: string;
  voiceAlias?: string;
  masterDataCode?: string;
  options?: Array<{ value: string; label: string }>;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  sortOrder?: number;
  visible?: number;
  wizardStep?: number;
  wizardPrompt?: string;
}

interface RuleForm {
  ruleName: string;
  ruleType: string;
  triggerField: string;
  targetField: string;
  conditionOperator?: string;
  conditionValue?: string;
  actionType?: string;
  expression?: string;
  priority: number;
  enabled: number;
}

const form = reactive({
  templateCode: '',
  templateName: '',
  category: '',
  description: '',
  color: '#4F46E5',
  sampleSpeech: '',
  guideScript: '',
  changeLog: '',
  fields: [] as FieldForm[],
  rules: [] as RuleForm[],
});

const categories = ref([] as any);

const rules = computed(() => {
  return {
    templateCode: [
      {
        required: true,
        message: t('templateEditor.validate.templateCode'),
        trigger: 'blur',
      },
    ],
    templateName: [
      {
        required: true,
        message: t('templateEditor.validate.templateName'),
        trigger: 'blur',
      },
    ],
  };
});

// 加载已有模板
onMounted(async () => {
  if (isEdit.value && templateId.value) {
    loading.value = true;

    try {
      const res = await api.form.getTemplateDetail(templateId.value);
      const data = res.data;

      form.templateCode = data.templateCode;
      form.templateName = data.templateName;
      form.category = data.category || '';
      form.description = data.description || '';
      form.color = data.color || '#4F46E5';
      form.sampleSpeech = data.sampleSpeech || '';
      form.guideScript = data.guideScript || '';

      form.fields = (data.fields || []).map((field: any) => ({
        ...field,
        required: field.required ?? 0,
        sensitive: field.sensitive ?? 0,
        visible: field.visible ?? 1,
      }));

      form.rules = (data.rules || []).map((rule: any) => ({
        ruleName: rule.ruleName || '',
        ruleType: rule.ruleType,
        triggerField: rule.triggerField,
        targetField: rule.targetField,
        conditionOperator: rule.triggerCondition?.operator || 'eq',
        conditionValue: rule.triggerCondition?.value || '',
        actionType: rule.action?.type || 'hide',
        expression: rule.action?.expression || '',
        priority: rule.priority || 0,
        enabled: rule.enabled ?? 1,
      }));
    } finally {
      loading.value = false;
    }
  }

  api.voiceForm.getFormType().then((res) => {
    categories.value = res.data;
  });
});

function addField() {
  form.fields.push({
    fieldCode: '',
    fieldName: '',
    fieldType: 'text',
    required: 0,
    sensitive: 0,
    visible: 1,
    sortOrder: form.fields.length,
  });

  expandedField.value = form.fields.length - 1;
}

function createCommonFields(): FieldForm[] {
  return [
    {
      fieldCode: 'productName',
      fieldName: t('templateEditor.commonFields.productName'),
      fieldType: 'text',
      required: 1,
      sensitive: 0,
      voiceAlias: t('templateEditor.commonFields.productAlias'),
      masterDataCode: 'product',
    },
    {
      fieldCode: 'quantity',
      fieldName: t('templateEditor.commonFields.quantity'),
      fieldType: 'number',
      required: 1,
      sensitive: 0,
      unit: t('templateEditor.commonFields.boxUnit'),
      voiceAlias: t('templateEditor.commonFields.quantityAlias'),
    },
    {
      fieldCode: 'unitPrice',
      fieldName: t('templateEditor.commonFields.unitPrice'),
      fieldType: 'number',
      required: 0,
      sensitive: 1,
      sensitiveType: 'amount',
      unit: t('templateEditor.commonFields.yuanUnit'),
      voiceAlias: t('templateEditor.commonFields.unitPriceAlias'),
    },
    {
      fieldCode: 'remark',
      fieldName: t('templateEditor.commonFields.remark'),
      fieldType: 'textarea',
      required: 0,
      sensitive: 0,
      voiceAlias: t('templateEditor.commonFields.remarkAlias'),
    },
  ];
}

function addFieldBatch() {
  const commonFields = createCommonFields();

  form.fields.push(...commonFields);

  ElMessage.success(
    t('templateEditor.message.batchAdded', {
      count: commonFields.length,
    }),
  );
}

function removeField(index: number) {
  form.fields.splice(index, 1);

  if (expandedField.value === index) {
    expandedField.value = null;
  }
}

function duplicateField(index: number) {
  const copy = {
    ...form.fields[index],
    fieldCode: `${form.fields[index].fieldCode}_copy`,
  };

  form.fields.splice(index + 1, 0, copy);
}

function moveFieldUp(index: number) {
  if (index <= 0) return;

  const tmp = form.fields[index];

  form.fields[index] = form.fields[index - 1];
  form.fields[index - 1] = tmp;
}

function moveFieldDown(index: number) {
  if (index >= form.fields.length - 1) return;

  const tmp = form.fields[index];

  form.fields[index] = form.fields[index + 1];
  form.fields[index + 1] = tmp;
}

function toggleField(index: number) {
  expandedField.value = expandedField.value === index ? null : index;
}

function addOption(field: FieldForm) {
  if (!field.options) {
    field.options = [];
  }

  field.options.push({ value: '', label: '' });
}

function removeOption(field: FieldForm, optionIndex: number) {
  field.options?.splice(optionIndex, 1);
}

function addRule() {
  form.rules.push({
    ruleName: '',
    ruleType: 'visibility',
    triggerField: '',
    targetField: '',
    conditionOperator: 'eq',
    conditionValue: '',
    actionType: 'hide',
    expression: '',
    priority: 0,
    enabled: 1,
  });
}

function removeRule(index: number) {
  form.rules.splice(index, 1);
}

function handlePreview() {
  showPreview.value = true;
}

function getFieldTypeLabel(type: string) {
  const keyMap: Record<string, string> = {
    text: 'templateEditor.fieldType.text',
    number: 'templateEditor.fieldType.number',
    date: 'templateEditor.fieldType.date',
    select: 'templateEditor.fieldType.select',
    textarea: 'templateEditor.fieldType.textarea',
    phone: 'templateEditor.fieldType.phone',
    idcard: 'templateEditor.fieldType.idcard',
    amount: 'templateEditor.fieldType.amount',
  };

  const key = keyMap[type];

  return key ? t(key) : type;
}

function getFieldTypeTag(type: string) {
  const map: Record<string, string> = {
    text: '',
    number: 'success',
    date: 'warning',
    select: 'info',
    textarea: '',
  };

  return (map[type] || '') as any;
}

// 构建提交数据
function buildSubmitData() {
  const fields = form.fields.map((field, index) => ({
    ...field,
    sortOrder: index,
  }));

  const rules = form.rules.map((rule) => ({
    ruleName: rule.ruleName,
    ruleType: rule.ruleType,
    triggerField: rule.triggerField,
    targetField: rule.targetField,
    triggerCondition:
      rule.ruleType === 'visibility'
        ? { operator: rule.conditionOperator, value: rule.conditionValue }
        : { operator: 'change' },
    action:
      rule.ruleType === 'calculation'
        ? { type: 'calculate', expression: rule.expression }
        : { type: rule.actionType || 'hide' },
    priority: rule.priority,
    enabled: rule.enabled,
  }));

  return {
    templateCode: form.templateCode,
    templateName: form.templateName,
    category: form.category,
    description: form.description,
    color: form.color,
    sampleSpeech: form.sampleSpeech,
    guideScript: form.guideScript,
    changeLog: form.changeLog,
    fields,
    rules,
  };
}

async function handleSave() {
  try {
    await basicFormRef.value?.validate();
  } catch {
    activeTab.value = 'basic';
    return;
  }

  if (form.fields.length === 0) {
    ElMessage.warning(t('templateEditor.validate.atLeastOneField'));
    activeTab.value = 'fields';
    return;
  }

  const hasEmptyField = form.fields.some(
    (field) => !field.fieldCode || !field.fieldName || !field.fieldType,
  );

  if (hasEmptyField) {
    ElMessage.warning(t('templateEditor.validate.completeFields'));
    activeTab.value = 'fields';
    return;
  }

  saving.value = true;

  try {
    const data = buildSubmitData();

    if (isEdit.value && templateId.value) {
      await api.form.updateTemplate(templateId.value, data);
      ElMessage.success(t('templateEditor.message.updateSuccess'));
    } else {
      await api.form.createTemplate(data);
      ElMessage.success(t('templateEditor.message.createSuccess'));
    }

    router.push('/web/voice-management/templates');
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
.template-editor-page {
  width: 100%;
  min-height: 100%;
  padding: 4px;
  margin: 0 auto;
  color: #4a382c;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 30%),
    linear-gradient(180deg, #fffaf5 0%, #fff 280px);
}

/* 顶部操作栏 */
.editor-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  margin-bottom: 22px;
  background:
    radial-gradient(circle at top left, rgb(255 138 38 / 10%), transparent 34%),
    linear-gradient(135deg, rgb(255 255 255 / 97%), rgb(255 250 245 / 95%));
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 16px 38px rgb(126 72 24 / 8%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
  backdrop-filter: blur(10px);

  .header-left {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 0;

    :deep(.el-button) {
      height: 34px;
      padding: 0 10px;
      font-weight: 700;
      color: #806b5b;
      border-radius: 999px;
      transition:
        color 0.22s ease,
        background 0.22s ease,
        transform 0.22s ease;
    }

    :deep(.el-button:hover) {
      color: #f97316;
      background: #fff0e2;
      transform: translateX(-1px);
    }
  }

  h2 {
    position: relative;
    padding-left: 13px;
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    line-height: 1.3;
    color: #4a382c;
    letter-spacing: -0.02em;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 19px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
      transform: translateY(-50%);
    }
  }

  .header-right {
    display: flex;
    gap: 10px;
    align-items: center;

    :deep(.el-button) {
      height: 38px;
      padding: 0 16px;
      font-weight: 700;
      border-radius: 12px;
      transition:
        color 0.22s ease,
        background 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease,
        transform 0.22s ease;
    }

    :deep(.el-button:not(.el-button--primary)) {
      color: #806b5b;
      background: #fff;
      border-color: #ead8c8;

      &:hover {
        color: #f97316;
        background: #fff7ef;
        border-color: #ffc58f;
        box-shadow: 0 8px 18px rgb(249 115 22 / 9%);
        transform: translateY(-1px);
      }
    }

    :deep(.el-button--primary) {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      box-shadow: 0 12px 24px rgb(249 115 22 / 22%);

      &:hover:not(.is-disabled) {
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
        box-shadow: 0 14px 28px rgb(249 115 22 / 28%);
        transform: translateY(-1px);
      }

      &:active:not(.is-disabled) {
        box-shadow: 0 6px 14px rgb(249 115 22 / 16%);
        transform: translateY(0);
      }
    }
  }
}

.editor-body {
  position: relative;
}

/* Tabs 容器 */
.editor-tabs {
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf !important;
  border-radius: 22px !important;
  box-shadow:
    0 16px 42px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;

  :deep(.el-tabs__header) {
    background:
      radial-gradient(circle at top right, rgb(255 138 38 / 8%), transparent 32%),
      linear-gradient(180deg, #fff7ef 0%, #fff 100%);
    border-bottom: 1px solid #f0dfcf;
  }

  :deep(.el-tabs__nav) {
    border: none !important;
  }

  :deep(.el-tabs__item) {
    height: 50px;
    padding: 0 24px !important;
    font-weight: 700;
    color: #8d7868;
    border: none !important;
    transition:
      color 0.22s ease,
      background 0.22s ease;
  }

  :deep(.el-tabs__item:hover) {
    color: #f97316;
  }

  :deep(.el-tabs__item.is-active) {
    position: relative;
    color: #e86f0b;
    background: #fff;
  }

  :deep(.el-tabs__item.is-active::after) {
    position: absolute;
    right: 22px;
    bottom: 0;
    left: 22px;
    height: 3px;
    content: '';
    background: linear-gradient(90deg, #ff9a3d 0%, #f97316 100%);
    border-radius: 999px 999px 0 0;
  }

  :deep(.el-tabs__content) {
    padding: 28px;
    background:
      radial-gradient(circle at bottom left, rgb(255 138 38 / 5%), transparent 36%),
      linear-gradient(180deg, #fff 0%, #fffaf5 100%);
  }
}

/* 基本表单 */
.basic-form {
  max-width: 920px;

  :deep(.el-form-item__label) {
    font-weight: 700;
    color: #5b4738;
  }
}

/* 表单输入控件统一橙色 */
:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select__wrapper),
:deep(.el-input-number .el-input__wrapper) {
  background: #fffaf5;
  border-radius: 12px;
  box-shadow: 0 0 0 1px #f0dfcf inset;
  transition:
    background 0.22s ease,
    box-shadow 0.22s ease;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover),
:deep(.el-select__wrapper:hover),
:deep(.el-input-number .el-input__wrapper:hover) {
  background: #fff;
  box-shadow: 0 0 0 1px #ffc58f inset;
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus),
:deep(.el-select__wrapper.is-focused),
:deep(.el-input-number .el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow:
    0 0 0 1px #ff8a26 inset,
    0 0 0 4px rgb(255 138 38 / 9%);
}

:deep(.el-input__inner),
:deep(.el-textarea__inner),
:deep(.el-select__selected-item) {
  color: #4a382c;
}

:deep(.el-input__inner::placeholder),
:deep(.el-textarea__inner::placeholder),
:deep(.el-select__placeholder) {
  color: #b09b8c;
}

/* 禁用输入框 */
:deep(.el-input.is-disabled .el-input__wrapper),
:deep(.el-select.is-disabled .el-select__wrapper) {
  background: #fff7f2;
  box-shadow: 0 0 0 1px #f0dfcf inset;
}

:deep(.el-input.is-disabled .el-input__inner) {
  color: #b09b8c;
}

/* 数字输入框按钮 */
:deep(.el-input-number__increase),
:deep(.el-input-number__decrease) {
  color: #9b806c;
  background: #fff7ef;
  border-color: #f0dfcf;

  &:hover {
    color: #f97316;
  }
}

/* 颜色选择器 */
:deep(.el-color-picker__trigger) {
  border-color: #f0dfcf;
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: #ffb36b;
    box-shadow: 0 0 0 3px rgb(255 138 38 / 7%);
  }
}

.color-hex {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  margin-left: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  color: #b85b0a;
  background: #fff7ef;
  border: 1px solid #ffd8b5;
  border-radius: 999px;
}

/* 字段与规则工具栏 */
.fields-toolbar,
.rules-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 18px;
  background:
    radial-gradient(circle at top left, rgb(255 138 38 / 9%), transparent 34%),
    linear-gradient(135deg, #fff 0%, #fffaf5 100%);
  border: 1px solid #f0dfcf;
  border-radius: 18px;

  :deep(.el-button) {
    height: 36px;
    font-weight: 700;
    border-radius: 12px;
    transition:
      color 0.22s ease,
      background 0.22s ease,
      border-color 0.22s ease,
      box-shadow 0.22s ease,
      transform 0.22s ease;
  }

  :deep(.el-button:not(.el-button--primary)) {
    color: #806b5b;
    background: #fff;
    border-color: #ead8c8;

    &:hover {
      color: #f97316;
      background: #fff7ef;
      border-color: #ffc58f;
      box-shadow: 0 8px 18px rgb(249 115 22 / 8%);
      transform: translateY(-1px);
    }
  }

  :deep(.el-button--primary) {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    border-color: #ff8a26;
    box-shadow: 0 10px 20px rgb(249 115 22 / 20%);

    &:hover {
      background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
      border-color: #f97316;
      box-shadow: 0 12px 24px rgb(249 115 22 / 25%);
      transform: translateY(-1px);
    }
  }

  .field-count,
  .rule-count {
    padding: 5px 10px;
    margin-left: auto;
    font-size: 12px;
    font-weight: 700;
    color: #e86f0b;
    background: #fff0e2;
    border: 1px solid #ffd3aa;
    border-radius: 999px;
  }
}

/* 字段列表 */
.fields-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 660px;
  overflow: hidden auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

/* 字段卡片 */
.field-card {
  flex: 0 0 auto;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow: 0 10px 26px rgb(126 72 24 / 5%);
  transition:
    transform 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;

  &:hover {
    border-color: #ffc58f;
    box-shadow: 0 16px 34px rgb(249 115 22 / 10%);
    transform: translateY(-2px);
  }

  &.field-expanded {
    border-color: #ffad61;
    box-shadow:
      0 18px 38px rgb(249 115 22 / 12%),
      0 0 0 3px rgb(255 138 38 / 4%);

    .field-card-header {
      background:
        radial-gradient(circle at top right, rgb(255 138 38 / 10%), transparent 36%),
        linear-gradient(135deg, #fff0e2 0%, #fffaf5 100%);
    }

    .field-order {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      box-shadow: 0 8px 16px rgb(249 115 22 / 22%);
    }

    .field-drag-handle {
      color: #f97316;
      background: #fff0e2;
      border-color: #ffd3aa;
    }
  }
}

.field-card-header {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 58px;
  padding: 13px 16px;
  cursor: pointer;
  background: linear-gradient(135deg, #fff 0%, #fffaf5 100%);
  transition: background 0.22s ease;

  .field-drag-handle {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: #b09b8c;
    cursor: grab;
    background: #fff7ef;
    border: 1px solid #f0dfcf;
    border-radius: 9px;
    transition:
      color 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease;

    &:active {
      cursor: grabbing;
    }
  }

  .field-summary {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .field-order {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 8px;
    font-size: 12px;
    font-weight: 800;
    color: #806b5b;
    background: #fff3e7;
    border: 1px solid #ffe0c2;
    border-radius: 999px;
    transition:
      color 0.22s ease,
      background 0.22s ease,
      box-shadow 0.22s ease;
  }

  .field-code {
    padding: 3px 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    font-weight: 700;
    color: #d95f06;
    background: #fff0e2;
    border: 1px solid #ffd3aa;
    border-radius: 999px;
  }

  .field-name-preview {
    font-size: 14px;
    font-weight: 700;
    color: #5b4738;
  }

  .field-card-actions {
    display: flex;
    gap: 2px;
    align-items: center;

    :deep(.el-button) {
      width: 30px;
      height: 30px;
      margin-left: 0;
      color: #8d7868;
      border-radius: 10px;
      transition:
        color 0.2s ease,
        background 0.2s ease,
        transform 0.2s ease;
    }

    :deep(.el-button:hover:not(.is-disabled)) {
      color: #f97316;
      background: #fff0e2;
      transform: translateY(-1px);
    }

    :deep(.el-button.is-text.el-button--primary) {
      color: #e86f0b;

      &:hover {
        color: #f97316;
        background: #fff0e2;
      }
    }

    :deep(.el-button.is-text.el-button--danger) {
      color: #ef4444;

      &:hover {
        color: #dc2626;
        background: #fef2f2;
      }
    }
  }

  :deep(.el-tag) {
    font-weight: 700;
    border-radius: 999px;
  }
}

/* 字段标签 */
:deep(.field-card .el-tag:not(.el-tag--success, .el-tag--warning, .el-tag--danger, .el-tag--info)) {
  color: #e86f0b;
  background: #fff4e9;
  border-color: #ffd3aa;
}

:deep(.field-card .el-tag--success) {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

:deep(.field-card .el-tag--warning) {
  color: #d97706;
  background: #fff7ed;
  border-color: #fed7aa;
}

:deep(.field-card .el-tag--danger) {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

:deep(.field-card .el-tag--info) {
  color: #b85b0a;
  background: #fff7ed;
  border-color: #fed7aa;
}

/* 字段展开区域 */
.field-card-body {
  padding: 20px;
  background:
    radial-gradient(circle at bottom right, rgb(255 138 38 / 5%), transparent 32%),
    linear-gradient(180deg, #fffaf5 0%, #fff 100%);
  border-top: 1px solid #f3e4d6;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-form-item__label) {
    font-weight: 700;
    color: #6b5545;
  }
}

/* Switch */
:deep(.el-switch__core) {
  background: #ead8c8;
  border-color: #ead8c8;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background: #ff8a26;
  border-color: #ff8a26;
  box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
}

/* 选项编辑 */
.options-editor {
  margin-bottom: 4px;

  .options-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .option-row {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px;
    background: #fff;
    border: 1px solid #f0dfcf;
    border-radius: 14px;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      background: #fffaf5;
      border-color: #ffc58f;
      box-shadow: 0 5px 14px rgb(249 115 22 / 7%);
    }

    :deep(.el-button.is-text.el-button--danger) {
      color: #ef4444;
      border-radius: 8px;

      &:hover {
        color: #dc2626;
        background: #fef2f2;
      }
    }
  }

  .opt-input {
    flex: 1;
  }

  :deep(.el-button:not(.el-button--danger)) {
    color: #806b5b;
    background: #fff;
    border-color: #ead8c8;
    border-radius: 9px;

    &:hover {
      color: #f97316;
      background: #fff7ef;
      border-color: #ffc58f;
    }
  }
}

.form-tip {
  width: 100%;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #a18b7b;
}

/* 联动规则 */
.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 660px;
  overflow: hidden auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.rule-card {
  flex: 0 0 auto;
  margin-top: 10px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow: 0 10px 28px rgb(126 72 24 / 5%);
  transition:
    border-color 0.24s ease,
    box-shadow 0.24s ease,
    transform 0.24s ease;

  &:hover {
    border-color: #ffc58f;
    box-shadow: 0 18px 36px rgb(249 115 22 / 10%);
    transform: translateY(-2px);
  }

  :deep(.el-card__header) {
    padding: 14px 18px;
    background:
      radial-gradient(circle at top right, rgb(255 138 38 / 8%), transparent 30%),
      linear-gradient(135deg, #fff 0%, #fffaf5 100%);
    border-bottom: 1px solid #f3e4d6;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }

  :deep(.el-form-item__label) {
    font-weight: 700;
    color: #6b5545;
  }
}

.rule-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  :deep(.el-button.is-text.el-button--danger) {
    color: #ef4444;
    border-radius: 8px;

    &:hover {
      color: #dc2626;
      background: #fef2f2;
    }
  }
}

.rule-name {
  position: relative;
  padding-left: 11px;
  font-size: 15px;
  font-weight: 800;
  color: #4a382c;

  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 3px;
    height: 14px;
    content: '';
    background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
    border-radius: 999px;
    transform: translateY(-50%);
  }
}

/* 主按钮统一橙色 */
:deep(.el-button--primary:not(.is-link, .is-text)) {
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border-color: #ff8a26;
  box-shadow: 0 6px 14px rgb(249 115 22 / 17%);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover:not(.is-disabled),
  &:focus:not(.is-disabled) {
    color: #fff;
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    border-color: #f97316;
    box-shadow: 0 8px 18px rgb(249 115 22 / 24%);
    transform: translateY(-1px);
  }
}

/* 空状态 */
:deep(.el-empty) {
  padding: 42px 0;
  margin-top: 28px;
  background: rgb(255 250 245 / 78%);
  border: 1px dashed #e8c6a8;
  border-radius: 20px;
}

:deep(.el-empty__description p) {
  color: #a18b7b;
}

/* Loading */
:deep(.el-loading-mask) {
  background: rgb(255 250 245 / 76%);
  backdrop-filter: blur(2px);
}

:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 预览弹窗 */
:deep(.el-dialog) {
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 24px 70px rgb(92 54 24 / 20%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

:deep(.el-dialog__header) {
  padding: 20px 24px 14px;
  margin-right: 0;
  background:
    radial-gradient(circle at top right, rgb(255 138 38 / 8%), transparent 32%),
    linear-gradient(135deg, #fff 0%, #fffaf5 100%);
  border-bottom: 1px solid #f3e4d6;
}

:deep(.el-dialog__title) {
  font-weight: 800;
  color: #4a382c;
}

:deep(.el-dialog__headerbtn) {
  top: 13px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #fff0e2;
    transform: rotate(90deg);

    .el-dialog__close {
      color: #f97316;
    }
  }
}

:deep(.el-dialog__body) {
  padding: 24px;
}

/* 预览内容 */
.preview-form {
  h3 {
    position: relative;
    padding-left: 13px;
    margin: 0 0 8px;
    font-size: 21px;
    font-weight: 800;
    color: #4a382c;
    letter-spacing: -0.02em;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 19px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      transform: translateY(-50%);
    }
  }

  .preview-desc {
    margin: 0 0 14px;
    font-size: 14px;
    line-height: 1.7;
    color: #806b5b;
  }

  .preview-speech {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 13px 14px;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.6;
    color: #d95f06;
    background:
      radial-gradient(circle at top right, rgb(255 138 38 / 10%), transparent 34%),
      linear-gradient(135deg, #fff0e2 0%, #fff7ef 100%);
    border: 1px solid #ffd3aa;
    border-radius: 16px;

    .el-icon {
      flex-shrink: 0;
      margin-top: 2px;
      color: #f97316;
    }
  }

  .preview-field {
    padding: 14px;
    margin-bottom: 18px;
    background: #fffaf5;
    border: 1px solid #f0dfcf;
    border-radius: 16px;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      background: #fff7ef;
      border-color: #ffc58f;
      box-shadow: 0 6px 16px rgb(249 115 22 / 7%);
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 700;
      color: #5b4738;
    }

    .required-mark {
      margin-left: 3px;
      font-weight: 900;
      color: #ef4444;
    }

    .unit-mark {
      font-size: 12px;
      font-weight: 500;
      color: #a18b7b;
    }
  }
}

/* Divider */
:deep(.el-divider) {
  border-color: #f0dfcf;
}

.w-full {
  width: 100%;
}

/* 表单错误 */
:deep(.el-form-item.is-error) {
  .el-input__wrapper,
  .el-textarea__inner,
  .el-select__wrapper {
    box-shadow: 0 0 0 1px #ef4444 inset;
  }
}

/* 移动端适配 */
@media (width <= 768px) {
  .template-editor-page {
    padding: 0;
  }

  .editor-header {
    position: static;
    flex-direction: column;
    gap: 14px;
    align-items: stretch;
    padding: 16px;
    border-radius: 18px;

    .header-left {
      justify-content: space-between;
    }

    .header-right {
      flex-wrap: wrap;
      justify-content: flex-end;

      :deep(.el-button) {
        flex: 1;
      }
    }

    h2 {
      font-size: 18px;
    }
  }

  .editor-tabs {
    border-radius: 18px !important;

    :deep(.el-tabs__item) {
      height: 46px;
      padding: 0 16px !important;
    }

    :deep(.el-tabs__content) {
      padding: 18px;
    }
  }

  .fields-toolbar,
  .rules-toolbar {
    flex-wrap: wrap;
    align-items: stretch;

    .field-count,
    .rule-count {
      margin-left: 0;
    }
  }

  .field-card-header {
    flex-wrap: wrap;
    align-items: flex-start;

    .field-summary {
      gap: 7px;
    }

    .field-card-actions {
      justify-content: flex-end;
      width: 100%;
      margin-top: 6px;
    }
  }

  .option-row {
    flex-direction: column;
    align-items: stretch !important;
  }

  .preview-form {
    .preview-field {
      padding: 12px;
    }
  }
}

@media (width <= 480px) {
  .editor-header {
    .header-right {
      flex-direction: column;

      :deep(.el-button) {
        width: 100%;
        margin-left: 0;
      }
    }
  }

  .fields-toolbar,
  .rules-toolbar {
    :deep(.el-button) {
      flex: 1;
    }

    .field-count,
    .rule-count {
      width: 100%;
      text-align: center;
    }
  }

  .field-card-body {
    padding: 16px;
  }

  :deep(.el-dialog) {
    width: 94% !important;
  }
}
</style>
