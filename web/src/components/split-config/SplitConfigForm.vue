<template>
  <div class="split-config-form">
    <!-- 自定义开关：关闭=跟随知识库/全局默认（不落任何文档级覆盖） -->
    <div class="form-header">
      <span class="header-title">{{ t('splitConfigForm.enable') }}</span>
      <el-switch v-model="customEnabled" :disabled="disabled" />
    </div>

    <p class="header-tip">
      {{ customEnabled ? t('splitConfigForm.scopeTip') : t('splitConfigForm.followDefaultTip') }}
    </p>

    <el-form
      v-show="customEnabled"
      ref="formRef"
      :model="form"
      label-position="top"
      :disabled="disabled"
      class="config-form"
      size="small"
    >
      <!-- 分片策略（默认 custom 火电公文优先，与新建知识库默认口径一致） -->
      <el-form-item :label="t('splitManagement.strategy')" prop="strategy">
        <el-select v-model="form.strategy" class="full-width">
          <el-option
            v-for="opt in strategyOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          >
            <div class="strategy-option">
              <span class="strategy-label">{{ opt.label }}</span>
              <span class="strategy-desc">{{ opt.desc }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <div class="field-row">
        <!-- 切块尺寸 -->
        <el-form-item :label="t('splitManagement.chunkSize')" prop="chunkSize" class="field-col">
          <el-input-number
            v-model="form.chunkSize"
            :min="50"
            :max="100000"
            :step="64"
            class="full-width"
            controls-position="right"
          />
        </el-form-item>

        <!-- 尺寸单位 -->
        <el-form-item :label="t('splitManagement.sizeUnit')" prop="sizeUnit" class="field-col">
          <el-select v-model="form.sizeUnit" class="full-width">
            <el-option value="char" :label="t('splitManagement.sizeUnitChar')" />
            <el-option value="token" :label="t('splitManagement.sizeUnitToken')" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 重叠尺寸（必须 < 切块尺寸，与后端校验同口径） -->
      <el-form-item :label="t('splitManagement.chunkOverlap')" prop="chunkOverlap">
        <el-input-number
          v-model="form.chunkOverlap"
          :min="0"
          :max="Math.max((form.chunkSize || 1) - 1, 0)"
          :step="32"
          class="full-width"
          controls-position="right"
        />
        <p v-if="overlapError" class="field-error">{{ t('splitConfigForm.overlapRule') }}</p>
      </el-form-item>

      <!-- 表格按行拆分 -->
      <div class="field-row table-row">
        <el-form-item
          :label="t('splitManagement.tableRowSplitEnabled')"
          class="field-col switch-col"
        >
          <el-switch v-model="form.tableRowSplitEnabled" />
        </el-form-item>

        <el-form-item
          v-if="form.tableRowSplitEnabled"
          :label="t('splitManagement.tableRowBatchSize')"
          prop="tableRowBatchSize"
          class="field-col"
        >
          <el-input-number
            v-model="form.tableRowBatchSize"
            :min="1"
            :max="500"
            :step="5"
            class="full-width"
            controls-position="right"
          />
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance } from 'element-plus';
import type { SplitConfigDto } from '@/api/modules/split';

/**
 * 文档级分片配置表单（上传场景共享组件：知识库管理 / 文件管理）。
 *
 * 语义契约（与后端 UploadFileDto/UploadFilesDto/SplitConfigDto 对齐）：
 * - 开关关闭 → v-model = null：不携带任何分片字段，跟随知识库级/全局默认；
 * - 开关打开 → v-model = 全量 6 字段（所见即所得的文档级覆盖，上传即随参落库，
 *   先于分片/向量化生效）。
 */
const props = withDefaults(
  defineProps<{
    modelValue: SplitConfigDto | null;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: SplitConfigDto | null];
}>();

const { t } = useI18n();

const formRef = ref<FormInstance>();

/** 开关态：外部值非空即视为自定义（支持外部预填同步展开） */
const customEnabled = ref(!!props.modelValue);

/** 表单默认值：custom(火电公文) 策略与新建知识库默认推荐口径一致 */
const DEFAULT_FORM: Required<Omit<SplitConfigDto, never>> = {
  strategy: 'custom',
  chunkSize: 1024,
  chunkOverlap: 500,
  sizeUnit: 'char',
  tableRowSplitEnabled: true,
  tableRowBatchSize: 10,
};

const form = reactive<SplitConfigDto>({ ...DEFAULT_FORM, ...(props.modelValue || {}) });

const strategyOptions = computed(() => {
  const names = ['custom', 'recursive', 'paragraph', 'sentence', 'semantic', 'fixed'] as const;

  return names.map((name) => ({
    value: name,
    label: t(`splitManagement.strategyName.${name}`),
    desc: t(`splitManagement.strategyDesc.${name}`),
  }));
});

/** overlap >= chunkSize 的交叉校验（后端同口径闸） */
const overlapError = computed(
  () =>
    form.chunkOverlap != null &&
    form.chunkSize != null &&
    Number(form.chunkOverlap) >= Number(form.chunkSize),
);

/** 输出归一化：仅组装非空字段，禁止把 null/非法值下发 */
function normalizePayload(): SplitConfigDto | null {
  if (!customEnabled.value || overlapError.value) return null;

  const payload: SplitConfigDto = {};
  if (form.strategy) payload.strategy = String(form.strategy);
  if (form.chunkSize != null) payload.chunkSize = Number(form.chunkSize);
  if (form.chunkOverlap != null) payload.chunkOverlap = Number(form.chunkOverlap);
  if (form.sizeUnit) payload.sizeUnit = String(form.sizeUnit);
  payload.tableRowSplitEnabled = !!form.tableRowSplitEnabled;
  if (form.tableRowSplitEnabled && form.tableRowBatchSize != null) {
    payload.tableRowBatchSize = Number(form.tableRowBatchSize);
  }

  return payload;
}

watch(customEnabled, (enabled) => {
  emit('update:modelValue', enabled ? normalizePayload() : null);
});

watch(
  form,
  () => {
    if (customEnabled.value) emit('update:modelValue', normalizePayload());
  },
  { deep: true },
);

// 外部置空（清除配置）时同步收起开关
watch(
  () => props.modelValue,
  (value) => {
    if (value == null && customEnabled.value) customEnabled.value = false;
  },
);

/** 供提交前调用：false=存在非法输入（当前仅 overlap 交叉项） */
function validate(): boolean {
  return !customEnabled.value || !overlapError.value;
}

defineExpose({ validate });
</script>

<style scoped lang="scss">
.split-config-form {
  .form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .header-title {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
  }

  .header-tip {
    margin: 6px 0 12px;
    font-size: 12px;
    line-height: 1.5;
    color: #9ca3af;
  }

  .config-form {
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #eef0f3;
    border-radius: 10px;

    :deep(.el-form-item) {
      margin-bottom: 14px;
    }

    :deep(.el-form-item__label) {
      padding-bottom: 4px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
      color: #6b7280;
    }
  }

  .full-width {
    width: 100%;
  }

  .field-row {
    display: flex;
    gap: 12px;

    .field-col {
      flex: 1;
      min-width: 0;
    }

    &.table-row {
      align-items: flex-start;
    }

    .switch-col {
      flex: 0 0 auto;
    }
  }

  .field-error {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--el-color-danger);
  }

  .strategy-option {
    display: flex;
    flex-direction: column;
    padding: 2px 0;
    line-height: 1.4;

    .strategy-label {
      font-size: 13px;
      color: #374151;
    }

    .strategy-desc {
      font-size: 11px;
      color: #9ca3af;
      white-space: normal;
    }
  }
}
</style>
