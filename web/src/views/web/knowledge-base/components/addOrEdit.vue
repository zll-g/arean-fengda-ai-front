<template>
  <el-dialog
    v-model="state.visible"
    :title="
      state.isEdit ? t('knowledgeBase.dialog.editTitle') : t('knowledgeBase.dialog.createTitle')
    "
    :width="isDepartmentKb ? '920px' : '600px'"
    :align-center="true"
    :close-on-click-modal="false"
    destroy-on-close
    class="kb-dialog"
    @closed="resetForm"
  >
    <div class="dialog-scroll-wrapper">
      <div class="dialog-content">
        <el-form :model="state.form" label-position="top" class="custom-form">
          <el-form-item class="form-item-normal" :label="t('knowledgeBase.dialog.name')" required>
            <el-input
              v-model="state.form.name"
              :placeholder="t('knowledgeBase.dialog.namePlaceholder')"
              maxlength="50"
              show-word-limit
            />
            <div class="form-tip">{{ t('knowledgeBase.dialog.nameTip') }}</div>
          </el-form-item>

          <el-form-item class="form-item-normal" :label="t('knowledgeBase.dialog.dimensionRange')">
            <div class="slider-container">
              <div class="slider-labels">
                <span>0</span>
                <span>5000</span>
              </div>
              <el-slider v-model="state.dimensions" :min="1" :max="5000" disabled />
              <div class="form-tip">
                {{ t('knowledgeBase.dialog.dimension') }}:{{ state.dimensions }}
              </div>
            </div>
          </el-form-item>

          <el-form-item class="form-item-normal" :label="t('knowledgeBase.dialog.embeddingModel')">
            <el-select v-model="state.model" class="full-width" :disabled="state.isEdit">
              <template #prefix>
                <el-tag size="small" effect="dark" type="primary" class="model-tag">
                  {{ t('knowledgeBase.dialog.modelTag') }}
                </el-tag>
              </template>
              <el-option label="Qwen3-Embedding-8B" value="v2" />
            </el-select>
            <div class="form-tip">
              {{
                t(
                  state.isEdit
                    ? 'knowledgeBase.dialog.modelEditTip'
                    : 'knowledgeBase.dialog.modelCreateTip',
                )
              }}
            </div>
          </el-form-item>

          <div class="number-row form-item-normal">
            <el-form-item :label="t('knowledgeBase.dialog.chunkSize')" required>
              <el-input-number v-model="state.form.chunkSize" :min="1" :max="999999" />
            </el-form-item>

            <el-form-item :label="t('knowledgeBase.dialog.chunkOverlap')" required>
              <el-input-number v-model="state.form.chunkOverlap" :min="1" :max="99999" />
            </el-form-item>
          </div>

          <el-form-item
            class="form-item-normal"
            :label="t('knowledgeBase.dialog.splitStrategy')"
            required
          >
            <div class="card-radio-group">
              <div
                v-for="item in splitOptions"
                :key="item.value"
                :class="['radio-card', { active: state.form.splitStrategy === item.value }]"
                @click="state.form.splitStrategy = item.value"
              >
                <el-icon class="card-icon">
                  <component :is="item.iconComponent" />
                </el-icon>

                <div class="card-content">
                  <div class="card-title">
                    {{ item.label }}
                    <el-icon v-if="state.form.splitStrategy === item.value" class="check-icon">
                      <Check />
                    </el-icon>
                  </div>
                  <div class="card-desc">{{ item.desc }}</div>
                </div>
              </div>
            </div>
          </el-form-item>

          <el-form-item
            class="access-level-item"
            :label="t('knowledgeBase.dialog.accessLevel')"
            required
          >
            <div class="access-setting-wrap" :class="{ 'has-department': isDepartmentKb }">
              <div class="card-radio-group access-card-list">
                <div
                  v-for="item in authOptions"
                  :key="item.value"
                  :class="['radio-card', { active: state.accessType === item.value }]"
                  @click="handleAccessLevelChange(item.value)"
                >
                  <el-icon class="card-icon">
                    <component :is="item.iconComponent" />
                  </el-icon>

                  <div class="card-content">
                    <div class="card-title">
                      {{ item.label }}
                      <el-icon v-if="state.accessType === item.value" class="check-icon">
                        <Check />
                      </el-icon>
                    </div>
                    <div class="card-desc">{{ item.desc }}</div>
                  </div>
                </div>
              </div>

              <Transition name="department-drawer">
                <div v-if="isDepartmentKb" class="department-drawer">
                  <div class="department-header">
                    <div>
                      <div class="department-title">选择部门</div>
                      <div class="department-subtitle">部门知识库将绑定到所选部门</div>
                    </div>
                  </div>

                  <div class="department-search">
                    <el-input
                      v-model.trim="departmentKeyword"
                      clearable
                      placeholder="搜索部门名称"
                      :prefix-icon="Search"
                      @input="handleDepartmentSearch"
                      @keyup.enter="handleDepartmentSearch"
                      @clear="handleDepartmentReset"
                    />
                    <el-button type="primary" @click="handleDepartmentSearch">搜索</el-button>
                  </div>

                  <div v-loading="departmentLoading" class="department-tree-wrap">
                    <el-tree
                      ref="departmentTreeRef"
                      :data="filteredDepartmentTreeData"
                      node-key="id"
                      highlight-current
                      default-expand-all
                      :expand-on-click-node="false"
                      :current-node-key="state.selectedDepartmentId || undefined"
                      :props="{ label: 'name', children: 'children' }"
                      :empty-text="departmentEmptyText"
                      @node-click="handleDepartmentNodeClick"
                    >
                      <template #default="{ data }">
                        <div
                          :class="[
                            'department-node',
                            { active: state.selectedDepartmentId === data.id },
                          ]"
                        >
                          <span class="department-node-name">{{ data.name }}</span>
                          <el-icon
                            v-if="state.selectedDepartmentId === data.id"
                            class="department-check"
                          >
                            <Check />
                          </el-icon>
                        </div>
                      </template>
                    </el-tree>
                  </div>

                  <div class="department-footer">
                    当前选择：
                    <span>{{
                      selectedDepartmentName || state.selectedDepartmentId || '未选择'
                    }}</span>
                  </div>
                </div>
              </Transition>
            </div>
          </el-form-item>

          <el-form-item class="form-item-normal" :label="t('knowledgeBase.dialog.description')">
            <el-input
              v-model="state.form.description"
              type="textarea"
              :placeholder="t('knowledgeBase.dialog.descriptionPlaceholder')"
              rows="3"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="state.visible = false">
          {{ t('knowledgeBase.dialog.cancel') }}
        </el-button>

        <el-button type="primary" @click="handleSubmit">
          {{ state.isEdit ? t('knowledgeBase.dialog.save') : t('knowledgeBase.dialog.create') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import api from '@/api';
import {
  Check,
  Document,
  Lightning,
  Lock,
  MagicStick,
  Operation,
  Search,
  Unlock,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, markRaw, nextTick, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

interface OrganizationTreeNode {
  id: string;
  name: string;
  parentId: string;
  children?: OrganizationTreeNode[];
}

const { t } = useI18n();

const PUBLIC_ACCESS_LEVEL = 'PUBLIC';
const PRIVATE_ACCESS_LEVEL = 'PRIVATE';
const DEPARTMENT_ACCESS_LEVEL = 'DEPARTMENT';
const NORMAL_ACCESS_LEVELS = [PUBLIC_ACCESS_LEVEL, PRIVATE_ACCESS_LEVEL, DEPARTMENT_ACCESS_LEVEL];

const defaultForm = () => ({
  chunkSize: 1024,
  name: '',
  description: '',
  chunkOverlap: 500,
  splitStrategy: 'custom',
  accessLevel: PUBLIC_ACCESS_LEVEL,
});

const state = reactive({
  form: defaultForm() as any,
  visible: false,
  model: 'v2',
  isEdit: false,
  dimensions: 4096,
  accessType: PUBLIC_ACCESS_LEVEL,
  selectedDepartmentId: '',
});

const departmentTreeRef = ref();
const departmentLoading = ref(false);
const departmentKeyword = ref('');
const departmentError = ref('');
const allDepartmentTreeData = ref<OrganizationTreeNode[]>([]);

const isDepartmentKb = computed(() => state.accessType === DEPARTMENT_ACCESS_LEVEL);

const splitOptions = computed(() => [
  {
    label: t('knowledgeBase.dialog.splitOptions.custom.label'),
    value: 'custom',
    iconComponent: markRaw(MagicStick),
    desc: t('knowledgeBase.dialog.splitOptions.custom.desc'),
  },
  {
    label: t('knowledgeBase.dialog.splitOptions.recursive.label'),
    value: 'recursive',
    iconComponent: markRaw(Lightning),
    desc: t('knowledgeBase.dialog.splitOptions.recursive.desc'),
  },
  {
    label: t('knowledgeBase.dialog.splitOptions.paragraph.label'),
    value: 'paragraph',
    iconComponent: markRaw(Document),
    desc: t('knowledgeBase.dialog.splitOptions.paragraph.desc'),
  },
  {
    label: t('knowledgeBase.dialog.splitOptions.sentence.label'),
    value: 'sentence',
    iconComponent: markRaw(Document),
    desc: t('knowledgeBase.dialog.splitOptions.sentence.desc'),
  },
  {
    label: t('knowledgeBase.dialog.splitOptions.semantic.label'),
    value: 'semantic',
    iconComponent: markRaw(Document),
    desc: t('knowledgeBase.dialog.splitOptions.semantic.desc'),
  },
  {
    label: t('knowledgeBase.dialog.splitOptions.fixed.label'),
    value: 'fixed',
    iconComponent: markRaw(Operation),
    desc: t('knowledgeBase.dialog.splitOptions.fixed.desc'),
  },
]);

const authOptions = computed(() => [
  {
    label: t('knowledgeBase.dialog.authOptions.public.label'),
    value: PUBLIC_ACCESS_LEVEL,
    iconComponent: markRaw(Unlock),
    desc: t('knowledgeBase.dialog.authOptions.public.desc'),
  },
  {
    label: t('knowledgeBase.dialog.authOptions.department.label'),
    value: DEPARTMENT_ACCESS_LEVEL,
    iconComponent: markRaw(Lock),
    desc: t('knowledgeBase.dialog.authOptions.department.desc'),
  },
  {
    label: t('knowledgeBase.dialog.authOptions.internal.label'),
    value: PRIVATE_ACCESS_LEVEL,
    iconComponent: markRaw(Lock),
    desc: t('knowledgeBase.dialog.authOptions.internal.desc'),
  },
]);

const emit = defineEmits(['refresh']);

const getTreeData = (res: any): OrganizationTreeNode[] => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const findDepartmentNode = (
  list: OrganizationTreeNode[],
  id?: string,
): OrganizationTreeNode | null => {
  if (!id) return null;

  for (const item of list) {
    if (item.id === id) return item;

    const child = findDepartmentNode(item.children || [], id);
    if (child) return child;
  }

  return null;
};

const filterDepartmentTree = (
  list: OrganizationTreeNode[],
  keyword: string,
): OrganizationTreeNode[] => {
  const text = keyword.trim().toLowerCase();
  if (!text) return list;

  return list.reduce<OrganizationTreeNode[]>((result, item) => {
    const children = filterDepartmentTree(item.children || [], text);
    const nameMatched = item.name?.toLowerCase().includes(text);
    const idMatched = item.id?.includes(text);

    if (nameMatched || idMatched || children.length) {
      result.push({
        ...item,
        children,
      });
    }

    return result;
  }, []);
};

const filteredDepartmentTreeData = computed(() =>
  filterDepartmentTree(allDepartmentTreeData.value, departmentKeyword.value),
);

const selectedDepartmentName = computed(() => {
  const node = findDepartmentNode(allDepartmentTreeData.value, state.selectedDepartmentId);
  return node?.name || '';
});

const departmentEmptyText = computed(() => {
  if (departmentError.value) return departmentError.value;
  if (departmentKeyword.value) return '未搜索到相关部门';
  return '暂无部门数据';
});

const syncDepartmentSelected = () => {
  nextTick(() => {
    departmentTreeRef.value?.setCurrentKey?.(state.selectedDepartmentId || null);
  });
};

const getDepartmentTree = async () => {
  if (allDepartmentTreeData.value.length) {
    syncDepartmentSelected();
    return;
  }

  departmentLoading.value = true;
  departmentError.value = '';

  try {
    const res = await api.organizationInfo.getGmsTreeList({});

    const code = res?.code ?? res?.data?.code;
    if (res?.success === false || (code !== undefined && `${code}` !== '200')) {
      allDepartmentTreeData.value = [];
      departmentError.value = res?.msg || res?.data?.msg || '获取部门信息失败';
      return;
    }

    allDepartmentTreeData.value = getTreeData(res);
    syncDepartmentSelected();
  } catch (error) {
    console.error('获取部门信息失败：', error);
    allDepartmentTreeData.value = [];
    departmentError.value = '获取部门信息失败';
    ElMessage.error('获取部门信息失败');
  } finally {
    departmentLoading.value = false;
  }
};

const handleDepartmentSearch = () => {
  syncDepartmentSelected();
};

const handleDepartmentReset = () => {
  departmentKeyword.value = '';
  syncDepartmentSelected();
};

const handleDepartmentNodeClick = (data: OrganizationTreeNode) => {
  state.selectedDepartmentId = data.id;
  state.form.accessLevel = data.id;
  syncDepartmentSelected();
};

const handleAccessLevelChange = (value: string) => {
  state.accessType = value;

  if (value === DEPARTMENT_ACCESS_LEVEL) {
    state.form.accessLevel = state.selectedDepartmentId || '';
    getDepartmentTree();
    return;
  }

  state.selectedDepartmentId = '';
  departmentKeyword.value = '';
  state.form.accessLevel = value;
};

const getDepartmentId = (data: any) => {
  const ids =
    data?.departmentIds || data?.orgIds || data?.organizationIds || data?.departmentIdList;

  if (data?.departmentId) return data.departmentId;
  if (data?.orgId) return data.orgId;
  if (data?.organizationId) return data.organizationId;
  if (Array.isArray(ids)) return ids[0] || '';

  if (data?.accessLevel && !NORMAL_ACCESS_LEVELS.includes(`${data.accessLevel}`)) {
    return data.accessLevel;
  }

  return '';
};

const getAccessType = (data: any) => {
  const accessLevel = data?.accessLevel ? `${data.accessLevel}` : '';

  if (accessLevel === PUBLIC_ACCESS_LEVEL || accessLevel === PRIVATE_ACCESS_LEVEL) {
    return accessLevel;
  }

  if (accessLevel === DEPARTMENT_ACCESS_LEVEL || getDepartmentId(data)) {
    return DEPARTMENT_ACCESS_LEVEL;
  }

  return PUBLIC_ACCESS_LEVEL;
};

const resetForm = () => {
  state.form = defaultForm();
  state.accessType = PUBLIC_ACCESS_LEVEL;
  state.selectedDepartmentId = '';
  departmentKeyword.value = '';
  departmentError.value = '';
  allDepartmentTreeData.value = [];
};

const open = (data?: any) => {
  state.visible = true;
  state.isEdit = !!data;
  resetForm();

  nextTick(() => {
    if (data) {
      const accessType = getAccessType(data);
      const departmentId = accessType === DEPARTMENT_ACCESS_LEVEL ? getDepartmentId(data) : '';

      Object.assign(state.form, {
        ...data,
        accessLevel: departmentId || accessType,
      });

      state.accessType = accessType;
      state.selectedDepartmentId = departmentId;
    }

    if (isDepartmentKb.value) {
      getDepartmentTree();
    }
  });
};

const handleSubmit = () => {
  if (!state.form.name?.trim()) {
    ElMessage.warning('请输入知识库名称');
    return;
  }

  if (isDepartmentKb.value && !state.selectedDepartmentId) {
    ElMessage.warning('请选择部门');
    return;
  }

  const payload = {
    ...state.form,
    accessLevel: isDepartmentKb.value ? state.selectedDepartmentId : state.accessType,
  };

  delete payload.departmentId;
  delete payload.departmentIds;
  delete payload.departmentIdList;
  delete payload.orgId;
  delete payload.orgIds;
  delete payload.organizationId;
  delete payload.organizationIds;

  const request = state.isEdit ? api.base.update(payload) : api.base.create(payload);

  request.then(() => {
    ElMessage.success(
      state.isEdit
        ? t('knowledgeBase.dialog.message.updateSuccess')
        : t('knowledgeBase.dialog.message.createSuccess'),
    );

    state.visible = false;
    emit('refresh');
    resetForm();
  });
};

watch(
  () => state.visible,
  (visible) => {
    if (visible && isDepartmentKb.value) {
      getDepartmentTree();
    }
  },
);

watch(
  () => isDepartmentKb.value,
  (visible) => {
    if (!state.visible) return;

    if (visible) {
      getDepartmentTree();
      return;
    }

    state.selectedDepartmentId = '';
    departmentKeyword.value = '';
  },
);

watch(departmentKeyword, () => {
  syncDepartmentSelected();
});

defineExpose({ open });
</script>

<style scoped lang="scss">
/* 弹窗整体 */
:deep(.el-dialog) {
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow:
    0 24px 60px rgb(92 54 24 / 18%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;
  transition: width 0.24s ease;
}

:deep(.el-dialog__header) {
  padding: 17px 20px;
  margin-right: 0;
  background: linear-gradient(180deg, #fffaf5 0%, #fff 100%);
  border-bottom: 1px solid #f3e4d6;
}

:deep(.el-dialog__title) {
  font-size: 17px;
  font-weight: 700;
  color: #4a382c;
}

:deep(.el-dialog__headerbtn) {
  top: 12px;
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
  padding: 0;
}

/* 滚动区域 */
.dialog-scroll-wrapper {
  max-height: 65vh;
  padding: 20px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
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

.dialog-content {
  width: 100%;
}

.custom-form {
  width: 100%;
}

.form-item-normal {
  width: 100%;
  max-width: 560px;
}

.access-level-item {
  width: 100%;
}

/* 表单标题 */
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #5b4738;
}

/* 输入框统一橙色 */
:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-input-number .el-input__wrapper) {
  min-height: 40px;
  background: #fffaf5;
  border-radius: 10px;
  box-shadow: 0 0 0 1px #f0dfcf inset;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: #fff;
    box-shadow: 0 0 0 1px #ffc58f inset;
  }

  &.is-focus,
  &.is-focused {
    background: #fff;
    box-shadow:
      0 0 0 1px #ff8a26 inset,
      0 0 0 4px rgb(255 138 38 / 9%);
  }
}

:deep(.el-input__inner) {
  color: #4a382c;

  &::placeholder {
    color: #b09b8c;
  }
}

:deep(.el-select__selected-item) {
  color: #4a382c;
}

:deep(.el-select__placeholder) {
  color: #b09b8c;
}

/* 文本域 */
:deep(.el-textarea__inner) {
  color: #4a382c;
  background: #fffaf5;
  border-radius: 10px;
  box-shadow: 0 0 0 1px #f0dfcf inset;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: #fff;
    box-shadow: 0 0 0 1px #ffc58f inset;
  }

  &:focus {
    background: #fff;
    box-shadow:
      0 0 0 1px #ff8a26 inset,
      0 0 0 4px rgb(255 138 38 / 9%);
  }

  &::placeholder {
    color: #b09b8c;
  }
}

/* 数字输入框按钮 */
:deep(.el-input-number__increase),
:deep(.el-input-number__decrease) {
  color: #9b806c;
  background: #fff6ed;
  border-color: #f0dfcf;

  &:hover {
    color: #f97316;
  }
}

/* 字数统计 */
:deep(.el-input__count),
:deep(.el-textarea .el-input__count) {
  color: #b09b8c;
  background: transparent;
}

/* Slider */
.slider-container {
  width: 100%;
  max-width: 500px;
  padding: 0 10px;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: -10px;
  font-size: 12px;
  color: #a18b7b;
}

:deep(.el-slider__runway) {
  background: #f3e4d6;
}

:deep(.el-slider__bar) {
  background: linear-gradient(90deg, #ffb36b, #ff8a26);
}

:deep(.el-slider__button) {
  background: #fff;
  border-color: #ff8a26;
  box-shadow: 0 3px 10px rgb(249 115 22 / 18%);
}

:deep(.el-slider.is-disabled) {
  .el-slider__bar {
    background: linear-gradient(90deg, #ffd1a6, #f2a969);
  }

  .el-slider__button {
    border-color: #e9a96d;
  }
}

/* 数字行 */
.number-row {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  width: 70%;

  :deep(.el-form-item) {
    flex: 1;
    min-width: 0;
  }

  :deep(.el-input-number) {
    width: 100%;
  }
}

/* 卡片单选组 */
.card-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-card {
  display: flex;
  padding: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgb(126 72 24 / 3%);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #fff8f1;
    border-color: #ffc58f;
    box-shadow: 0 6px 16px rgb(249 115 22 / 8%);
    transform: translateY(-1px);

    .card-icon {
      color: #f97316;
      background: #ffead7;
    }
  }

  &.active {
    background: linear-gradient(135deg, #fff0e2 0%, #fff8f1 100%);
    border-color: #ff9a3d;
    box-shadow:
      inset 3px 0 0 #ff8a26,
      0 7px 18px rgb(249 115 22 / 10%);

    .card-icon {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      box-shadow: 0 5px 12px rgb(249 115 22 / 18%);
    }

    .card-title {
      color: #d95f06;
    }
  }
}

.card-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-top: 0;
  margin-right: 12px;
  font-size: 18px;
  color: #8d7868;
  background: #fff7ef;
  border-radius: 9px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #4a382c;
  transition: color 0.2s ease;
}

.card-desc {
  font-size: 12px;
  line-height: 1.5;
  color: #a18b7b;
}

.check-icon {
  flex-shrink: 0;
  color: #f97316;
}

/* 提示文字 */
.form-tip {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.4;
  color: #a18b7b;
}

.full-width {
  width: 100%;
}

/* 模型标签 */
.model-tag {
  margin-right: 4px;
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%) !important;
  border: none;
  border-radius: 6px;
}

/* 权限区域 */
.access-setting-wrap {
  display: flex;
  gap: 20px;
  align-items: stretch;
  width: 100%;
}

.access-card-list {
  flex-shrink: 0;
  width: 100%;
  max-width: 392px;
}

.access-setting-wrap.has-department .access-card-list {
  width: 392px;
}

/* 部门抽屉动画 */
.department-drawer-enter-active,
.department-drawer-leave-active {
  overflow: hidden;
  transition:
    opacity 0.26s ease,
    transform 0.26s ease,
    max-width 0.26s ease;
}

.department-drawer-enter-from,
.department-drawer-leave-to {
  max-width: 0;
  opacity: 0;
  transform: translateX(28px);
}

.department-drawer-enter-to,
.department-drawer-leave-from {
  max-width: 490px;
  opacity: 1;
  transform: translateX(0);
}

/* 部门选择抽屉 */
.department-drawer {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  max-width: 490px;
  height: 318px;
  padding: 14px 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 8%) 0%, transparent 34%),
    linear-gradient(180deg, #fff 0%, #fff9f3 100%);
  border: 1px solid #f0d4bb;
  border-radius: 12px;
  box-shadow:
    -8px 0 24px rgb(249 115 22 / 8%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

.department-drawer::before {
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 0;
  width: 3px;
  content: '';
  background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
  border-radius: 0 6px 6px 0;
}

.department-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-left: 2px;
  margin-bottom: 12px;
}

.department-title {
  font-size: 15px;
  font-weight: 700;
  color: #4a382c;
}

.department-subtitle {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #a18b7b;
}

/* 部门搜索 */
.department-search {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.department-search :deep(.el-input) {
  flex: 1;
}

.department-search :deep(.el-input__wrapper) {
  min-height: 36px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #f0dfcf inset;

  &:hover {
    box-shadow: 0 0 0 1px #ffc58f inset;
  }

  &.is-focus {
    box-shadow:
      0 0 0 1px #ff8a26 inset,
      0 0 0 3px rgb(255 138 38 / 8%);
  }
}

.department-search :deep(.el-button) {
  flex-shrink: 0;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border-color: #ff8a26;
  border-radius: 8px;
  box-shadow: 0 5px 12px rgb(249 115 22 / 16%);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    border-color: #f97316;
    box-shadow: 0 7px 16px rgb(249 115 22 / 22%);
    transform: translateY(-1px);
  }
}

/* 部门树 */
.department-tree-wrap {
  flex: 1;
  min-height: 0;
  padding: 8px;
  overflow: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background: rgb(255 255 255 / 92%);
  border: 1px solid #f2e2d4;
  border-radius: 10px;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 10px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.department-footer {
  padding-top: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #a18b7b;
  white-space: nowrap;
}

.department-footer span {
  font-weight: 700;
  color: #e86f0b;
}

.department-node {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding-right: 6px;
}

.department-node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #6b5545;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.department-node.active .department-node-name {
  font-weight: 700;
  color: #e86f0b;
}

.department-check {
  flex-shrink: 0;
  font-size: 15px;
  color: #f97316;
}

:deep(.el-tree) {
  color: #5b4738;
  background: transparent;
}

:deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 7px;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

:deep(.el-tree-node__content:hover) {
  background: #fff1e5;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: linear-gradient(90deg, #fff0e2 0%, #fff7ef 100%);
  box-shadow: inset 2px 0 0 #ff8a26;
}

:deep(.el-tree-node__expand-icon) {
  color: #b58f70;

  &.expanded {
    color: #f97316;
  }
}

/* 加载状态 */
:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 主按钮 */
:deep(.el-button--primary) {
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
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    border-color: #f97316;
    box-shadow: 0 8px 18px rgb(249 115 22 / 24%);
    transform: translateY(-1px);
  }

  &:active:not(.is-disabled) {
    box-shadow: 0 4px 10px rgb(249 115 22 / 15%);
    transform: translateY(0);
  }
}

/* 底部按钮区域 */
.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 12px 20px 20px;
  background: linear-gradient(180deg, #fff 0%, #fffaf5 100%);
  border-top: 1px solid #f3e4d6;

  :deep(.el-button) {
    min-width: 82px;
    height: 38px;
    padding: 0 18px;
    border-radius: 10px;
  }

  :deep(.el-button:not(.el-button--primary)) {
    color: #806b5b;
    background: #fff;
    border-color: #ead8c8;

    &:hover {
      color: #f97316;
      background: #fff7ef;
      border-color: #ffc58f;
    }
  }
}

/* 响应式 */
@media (width <=920px) {
  :deep(.el-dialog) {
    width: 95% !important;
  }

  .form-item-normal {
    max-width: 100%;
  }

  .access-setting-wrap {
    flex-direction: column;
  }

  .access-card-list,
  .access-setting-wrap.has-department .access-card-list,
  .department-drawer {
    width: 100%;
    max-width: 100%;
  }

  .department-drawer {
    height: 420px;
  }

  .department-drawer-enter-to,
  .department-drawer-leave-from {
    max-width: 100%;
  }

  .number-row {
    width: 100%;
  }
}

@media (width <=640px) {
  .dialog-scroll-wrapper {
    padding: 16px;
  }

  .number-row {
    flex-direction: column;
    gap: 0;
  }

  .access-setting-wrap {
    gap: 14px;
  }

  .department-drawer {
    height: 380px;
    padding: 12px;
  }

  .department-search {
    gap: 6px;
  }

  .dialog-footer {
    padding: 12px 16px 16px;
  }
}
</style>
