import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TemplateDetail, FormData as FormDataType, ValidationWarning } from '@/types';
import api from '@/api/index';
import { cloneDeep } from 'lodash-es';
import { useDebounceFn } from '@vueuse/core';

export const useFormStore = defineStore('form', () => {
  // 状态
  const template = ref<TemplateDetail | null>(null);
  const formData = ref<FormDataType | null>(null);
  const formValues = ref<Record<string, any>>({});
  const fieldVisibility = ref<Record<string, boolean>>({});
  const validationWarnings = ref<ValidationWarning[]>([]);
  const isLoading = ref(false);
  const isDirty = ref(false);

  // 撤销/重做
  const undoRedoInfo = ref({ canUndo: false, canRedo: false, total: 0, pointer: 0 });

  // 历史快照栈（本地即时撤销）
  const historyStack = ref<Record<string, any>[]>([]);
  const historyPointer = ref(-1);
  const maxHistory = 50;

  // 计算属性
  const visibleFields = computed(() => {
    if (!template.value?.fields) return [];
    return template.value.fields.filter((f) => fieldVisibility.value[f.fieldCode] !== false);
  });

  const requiredFields = computed(() => {
    return visibleFields.value.filter((f) => f.required === 1);
  });

  const missingRequiredFields = computed(() => {
    return requiredFields.value.filter((f) => {
      const val = formValues.value[f.fieldCode];
      return val === undefined || val === null || val === '';
    });
  });

  const completionRate = computed(() => {
    if (requiredFields.value.length === 0) return 100;
    const filled = requiredFields.value.length - missingRequiredFields.value.length;
    return Math.round((filled / requiredFields.value.length) * 100);
  });

  const debouncedSync = useDebounceFn(async () => {
    if (!formData.value || !isDirty.value) return;
    try {
      await api.voiceForm.updateForm(formData.value.id, { formValues: formValues.value });
      isDirty.value = false;
    } catch (e) {
      console.error('自动同步失败', e);
    }
  }, 2000);

  // 加载模板
  async function loadTemplate(templateId: number) {
    isLoading.value = true;
    try {
      const res: any = await api.voiceForm.getTemplateDetail(templateId);
      template.value = res.data;
      console.log(template.value, 22222);
      // 初始化字段可见性
      const vis: Record<string, boolean> = {};
      template.value!.fields.forEach((f) => {
        vis[f.fieldCode] = f.visible !== 0;
      });
      fieldVisibility.value = vis;

      // 初始化默认值
      const defaults: Record<string, any> = {};
      template.value!.fields.forEach((f) => {
        if (f.defaultValue) {
          defaults[f.fieldCode] = f.defaultValue;
        }
      });
      formValues.value = defaults;

      // 重置历史
      historyStack.value = [cloneDeep(defaults)];
      historyPointer.value = 0;
    } finally {
      isLoading.value = false;
    }
  }

  // 创建表单
  async function initFormData() {
    if (!template.value) return null;
    try {
      const res: any = await api.voiceForm.createForm({
        templateId: template.value.id,
        formValues: formValues.value,
        source: 'voice',
      });
      console.log(formData.value, 7777);
      formData.value = res.data;
      return res.data;
    } catch (e) {
      console.error('创建表单失败', e);
      return null;
    }
  }

  // 更新字段值（手动输入或语音填充）
  function setFieldValue(fieldCode: string, value: any) {
    formValues.value[fieldCode] = value;
    isDirty.value = true;
    executeRules(fieldCode);
    executeCalculations(fieldCode);
    pushHistory();

    // 自动同步到后端（防抖2秒）
    if (formData.value?.id) {
      debouncedSync();
    }
  }

  // 批量更新字段值
  function setFieldValues(updates: Record<string, any>) {
    Object.assign(formValues.value, updates);
    isDirty.value = true;

    // 对每个更新的字段执行联动
    Object.keys(updates).forEach((fieldCode) => {
      executeRules(fieldCode);
      executeCalculations(fieldCode);
    });

    pushHistory();
  }

  // 删除字段值
  function clearFieldValue(fieldCode: string) {
    delete formValues.value[fieldCode];
    isDirty.value = true;
    pushHistory();
  }

  // 执行显隐联动规则
  function executeRules(triggerFieldCode: string) {
    if (!template.value?.rules) return;

    const rules = template.value.rules.filter((r) => r.triggerField === triggerFieldCode);
    for (const rule of rules) {
      if (rule.ruleType === 'visibility') {
        const triggerValue = formValues.value[triggerFieldCode];
        const condition = rule.triggerCondition;

        let match = false;
        if (condition.operator === 'eq') {
          match = triggerValue === condition.value;
        } else if (condition.operator === 'neq') {
          match = triggerValue !== condition.value;
        } else if (condition.operator === 'in') {
          match = Array.isArray(condition.value) && condition.value.includes(triggerValue);
        }

        const action = rule.action;
        if (match) {
          fieldVisibility.value[rule.targetField] = action.type === 'show';
        } else {
          // 条件不满足时反向操作
          fieldVisibility.value[rule.targetField] = action.type !== 'show';
        }
      }
    }
  }

  // 执行计算联动规则
  function executeCalculations(triggerFieldCode: string) {
    if (!template.value?.rules) return;

    const rules = template.value.rules.filter(
      (r) => r.ruleType === 'calculation' && r.triggerField === triggerFieldCode,
    );

    for (const rule of rules) {
      const expression = rule.action?.expression;
      if (!expression) continue;

      try {
        // 简易表达式求值：支持 field1 * field2 / field1 + field2
        let result = evaluateExpression(expression, formValues.value);
        if (result !== null && !isNaN(result)) {
          formValues.value[rule.targetField] = Math.round(result * 100) / 100;
        }
      } catch (e) {
        console.warn('计算规则执行失败:', expression, e);
      }
    }
  }

  // 简易表达式计算
  function evaluateExpression(expr: string, values: Record<string, any>): number {
    // 将字段名替换为实际值
    let evalStr = expr;
    const fieldPattern = /[a-zA-Z_]\w*/g;
    const matches = expr.match(fieldPattern) || [];

    for (const fieldCode of matches) {
      const val = values[fieldCode];
      if (val === undefined || val === null || val === '') {
        return NaN;
      }
      evalStr = evalStr.replace(new RegExp(`\\b${fieldCode}\\b`, 'g'), String(Number(val)));
    }

    // 安全计算（只允许数字和基本运算符）
    if (/^[\d\s+\-*/().]+$/.test(evalStr)) {
      return new Function(`return ${evalStr}`)() as number;
    }
    return NaN;
  }

  // 历史快照管理
  function pushHistory() {
    const snapshot = cloneDeep(formValues.value);

    // 截断重做历史
    if (historyPointer.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyPointer.value + 1);
    }

    historyStack.value.push(snapshot);
    if (historyStack.value.length > maxHistory) {
      historyStack.value.shift();
    }
    historyPointer.value = historyStack.value.length - 1;
  }

  // 本地撤销
  function localUndo() {
    if (historyPointer.value <= 0) return false;
    historyPointer.value--;
    formValues.value = cloneDeep(historyStack.value[historyPointer.value]);
    return true;
  }

  // 本地重做
  function localRedo() {
    if (historyPointer.value >= historyStack.value.length - 1) return false;
    historyPointer.value++;
    formValues.value = cloneDeep(historyStack.value[historyPointer.value]);
    return true;
  }

  // 远程撤销
  async function remoteUndo() {
    if (!formData.value) return localUndo();
    try {
      const res: any = await api.voiceForm.undoForm(formData.value.id);
      formValues.value = res.data.formValues || {};
      return true;
    } catch {
      return false;
    }
  }

  // 远程重做
  async function remoteRedo() {
    if (!formData.value) return localRedo();
    try {
      const res: any = await api.voiceForm.redoForm(formData.value.id);
      formValues.value = res.data.formValues || {};
      return true;
    } catch {
      return false;
    }
  }

  // 同步表单到后端
  async function syncToBackend() {
    if (!formData.value || !isDirty.value) return;
    await api.voiceForm.updateForm(formData.value.id, {
      formValues: formValues.value,
    });
    isDirty.value = false;
  }

  // 重置
  function $reset() {
    template.value = null;
    formData.value = null;
    formValues.value = {};
    fieldVisibility.value = {};
    validationWarnings.value = [];
    isLoading.value = false;
    isDirty.value = false;
    historyStack.value = [];
    historyPointer.value = -1;
  }

  return {
    template,
    formData,
    formValues,
    fieldVisibility,
    validationWarnings,
    isLoading,
    isDirty,
    undoRedoInfo,
    visibleFields,
    requiredFields,
    missingRequiredFields,
    completionRate,
    historyPointer,
    historyStack,
    loadTemplate,
    initFormData,
    setFieldValue,
    setFieldValues,
    clearFieldValue,
    executeRules,
    executeCalculations,
    localUndo,
    localRedo,
    remoteUndo,
    remoteRedo,
    syncToBackend,
    $reset,
  };
});
