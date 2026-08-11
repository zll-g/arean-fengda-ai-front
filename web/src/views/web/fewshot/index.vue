<template>
  <div class="fewshot-view">
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select
            v-model="selectedDsId"
            :placeholder="t('fewshot.selectDatasource')"
            style="width: 200px"
            @change="fetchList"
          >
            <el-option v-for="ds in dsStore.list" :key="ds.id" :label="ds.name" :value="ds.id" />
          </el-select>

          <el-input
            v-model="keyword"
            :placeholder="t('fewshot.searchQuestion')"
            prefix-icon="Search"
            clearable
            style="width: 200px"
            @input="fetchList"
          />

          <el-select
            v-model="categoryFilter"
            :placeholder="t('fewshot.category')"
            clearable
            style="width: 140px"
            @change="fetchList"
          >
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </div>

        <div class="toolbar-right">
          <el-button icon="Refresh" @click="handleRebuildIndex">
            {{ t('fewshot.rebuildIndex') }}
          </el-button>

          <el-button type="primary" icon="Plus" @click="openDialog()">
            {{ t('fewshot.createQa') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-table :data="list" border stripe>
      <el-table-column
        prop="question"
        :label="t('fewshot.table.question')"
        min-width="200"
        show-overflow-tooltip
      />

      <el-table-column
        prop="sqlText"
        :label="t('fewshot.table.sql')"
        min-width="250"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <code class="mini-sql">{{ row.sqlText }}</code>
        </template>
      </el-table-column>

      <el-table-column prop="category" :label="t('fewshot.table.category')" width="100" />

      <el-table-column prop="source" :label="t('fewshot.table.source')" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.source === 'AUTO' ? 'success' : 'primary'" size="small">
            {{ row.source === 'AUTO' ? t('fewshot.source.auto') : t('fewshot.source.manual') }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        prop="useCount"
        :label="t('fewshot.table.useCount')"
        width="90"
        align="center"
        sortable
      />

      <el-table-column prop="status" :label="t('fewshot.table.status')" width="80" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 1"
            size="small"
            @change="(val: any) => handleToggleStatus(row, val)"
          />
        </template>
      </el-table-column>

      <el-table-column :label="t('fewshot.table.action')" width="140" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" type="primary" @click="openDialog(row)">
            {{ t('fewshot.action.edit') }}
          </el-button>

          <el-popconfirm
            :title="t('fewshot.action.deleteConfirm')"
            :confirm-button-text="t('fewshot.action.confirm')"
            :cancel-button-text="t('fewshot.action.cancel')"
            @confirm="handleDelete(row.id)"
          >
            <template #reference>
              <el-button text size="small" type="danger">
                {{ t('fewshot.action.delete') }}
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingItem ? t('fewshot.editQa') : t('fewshot.createQa')"
      width="640px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('fewshot.form.question')" prop="question">
          <el-input v-model="form.question" :placeholder="t('fewshot.form.questionPlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('fewshot.form.sql')" prop="sqlText">
          <el-input
            v-model="form.sqlText"
            type="textarea"
            :rows="4"
            :placeholder="t('fewshot.form.sqlPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('fewshot.form.answerTemplate')">
          <el-input
            v-model="form.answerTemplate"
            type="textarea"
            :rows="2"
            :placeholder="t('fewshot.form.answerTemplatePlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('fewshot.form.category')">
          <el-select
            v-model="form.category"
            filterable
            allow-create
            :placeholder="t('fewshot.form.categoryPlaceholder')"
            style="width: 100%"
          >
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('fewshot.form.tags')">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            :placeholder="t('fewshot.form.tagsPlaceholder')"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">
          {{ t('fewshot.action.cancel') }}
        </el-button>

        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ t('fewshot.action.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useDatasourceStore } from '@/store/datasource';
import api from '@/api';

const { t } = useI18n();

const route = useRoute();
const dsStore = useDatasourceStore();

const selectedDsId = ref(null as any);
const keyword = ref('');
const categoryFilter = ref('');
const list = ref([] as any[]);
const dialogVisible = ref(false);
const editingItem = ref(null as any);
const submitLoading = ref(false);
const formRef = ref(null as any);

const form = ref({
  question: '',
  sqlText: '',
  answerTemplate: '',
  category: '',
  tags: [],
});

const rules = computed(() => {
  return {
    question: [
      {
        required: true,
        message: t('fewshot.validate.question'),
        trigger: 'blur',
      },
    ],
    sqlText: [
      {
        required: true,
        message: t('fewshot.validate.sql'),
        trigger: 'blur',
      },
    ],
  };
});

const categories = computed(() => {
  const cats = new Set(list.value.map((i: any) => i.category).filter(Boolean));

  return Array.from(cats);
});

onMounted(() => {
  selectedDsId.value = route.params.datasourceId
    ? Number(route.params.datasourceId)
    : dsStore.currentId;

  if (selectedDsId.value) {
    fetchList();
  }
});

async function fetchList() {
  if (!selectedDsId.value) return;

  const res = await api.fewshot.getFewshotList(selectedDsId.value, {
    keyword: keyword.value,
    category: categoryFilter.value,
  });

  list.value = res.data || [];
}

function openDialog(item = null as any) {
  editingItem.value = item;

  if (item) {
    form.value = { ...item };
  } else {
    form.value = {
      question: '',
      sqlText: '',
      answerTemplate: '',
      category: '',
      tags: [],
    };
  }

  dialogVisible.value = true;
}

async function handleSubmit() {
  await formRef.value.validate();

  submitLoading.value = true;

  try {
    if (editingItem.value) {
      await api.fewshot.update({ id: editingItem.value.id, ...form.value });
      ElMessage.success(t('fewshot.message.updateSuccess'));
    } else {
      await api.fewshot.create({ datasourceId: selectedDsId.value, ...form.value });
      ElMessage.success(t('fewshot.message.createSuccess'));
    }

    dialogVisible.value = false;
    fetchList();
  } finally {
    submitLoading.value = false;
  }
}

async function handleDelete(id: string) {
  await api.fewshot.remove(id);
  ElMessage.success(t('fewshot.message.deleteSuccess'));
  fetchList();
}

async function handleToggleStatus(row: any, val: string) {
  await api.fewshot.update({ id: row.id, status: val ? 1 : 0 });
  row.status = val ? 1 : 0;
}

async function handleRebuildIndex() {
  if (!selectedDsId.value) return;

  await api.fewshot.rebuildIndex(selectedDsId.value);
  ElMessage.success(t('fewshot.message.rebuildSuccess'));
}
</script>

<style scoped lang="scss">
.fewshot-view {
  height: 100%;
  color: #4a382c;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 28%),
    linear-gradient(180deg, #fffaf5 0%, #fff 240px);

  /* 顶部工具栏 */
  .toolbar-card {
    margin-bottom: 16px;
    overflow: hidden;
    background: rgb(255 255 255 / 97%);
    border: 1px solid #f0dfcf;
    border-radius: 16px;
    box-shadow:
      0 8px 24px rgb(126 72 24 / 6%),
      0 0 0 1px rgb(255 255 255 / 70%) inset;

    :deep(.el-card__body) {
      padding: 16px 18px;
    }
  }

  .toolbar {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    .toolbar-left,
    .toolbar-right {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .toolbar-left {
      min-width: 0;
    }

    /* 下拉选择 */
    :deep(.el-select__wrapper) {
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

      &.is-focused {
        background: #fff;
        box-shadow:
          0 0 0 1px #ff8a26 inset,
          0 0 0 4px rgb(255 138 38 / 9%);
      }
    }

    :deep(.el-select__selected-item) {
      color: #4a382c;
    }

    :deep(.el-select__placeholder) {
      color: #b09b8c;
    }

    /* 搜索框 */
    :deep(.el-input__wrapper) {
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

      &.is-focus {
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

    :deep(.el-input__prefix) {
      color: #d98a49;
    }

    :deep(.el-input__clear) {
      color: #b09b8c;

      &:hover {
        color: #f97316;
      }
    }

    /* 重建索引 */
    .toolbar-right {
      :deep(.el-button:not(.el-button--primary)) {
        min-height: 40px;
        padding: 0 18px;
        font-weight: 600;
        color: #806b5b;
        background: #fff;
        border-color: #ead8c8;
        border-radius: 10px;
        transition:
          color 0.2s ease,
          background 0.2s ease,
          border-color 0.2s ease,
          box-shadow 0.2s ease,
          transform 0.2s ease;

        &:hover {
          color: #f97316;
          background: #fff7ef;
          border-color: #ffc58f;
          box-shadow: 0 6px 14px rgb(249 115 22 / 8%);
          transform: translateY(-1px);
        }
      }
    }

    /* 新建按钮 */
    :deep(.el-button--primary) {
      min-height: 40px;
      padding: 0 18px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      border-radius: 10px;
      box-shadow: 0 7px 16px rgb(249 115 22 / 20%);
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;

      &:hover:not(.is-disabled) {
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
        box-shadow: 0 9px 20px rgb(249 115 22 / 26%);
        transform: translateY(-1px);
      }

      &:active:not(.is-disabled) {
        box-shadow: 0 4px 12px rgb(249 115 22 / 16%);
        transform: translateY(0);
      }
    }
  }

  /* 表格整体 */
  > :deep(.el-table) {
    overflow: hidden;
    color: #5b4738;
    background: #fff;
    border: 1px solid #f0dfcf;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgb(126 72 24 / 5%);
  }

  :deep(.el-table th.el-table__cell) {
    height: 50px;
    font-weight: 700;
    color: #806b5b;
    background: linear-gradient(180deg, #fff7ef 0%, #fffaf5 100%);
    border-color: #f0dfcf;
  }

  :deep(.el-table td.el-table__cell) {
    min-height: 50px;
    border-color: #f3e4d6;
  }

  :deep(.el-table--border .el-table__cell) {
    border-right-color: #f0dfcf;
  }

  :deep(.el-table__row) {
    transition: background 0.18s ease;
  }

  :deep(.el-table__row:hover > td.el-table__cell) {
    background: #fffaf5;
  }

  :deep(.el-table__body tr.el-table__row--striped td.el-table__cell) {
    background: #fffdf9;
  }

  :deep(.el-table__body tr.el-table__row--striped:hover td.el-table__cell) {
    background: #fff7ef;
  }

  :deep(.el-table__inner-wrapper::before) {
    background: #f0dfcf;
  }

  /* SQL 样式 */
  .mini-sql {
    display: inline-block;
    max-width: 100%;
    padding: 4px 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 12px;
    color: #c45c08;
    white-space: nowrap;
    background: #fff1e5;
    border: 1px solid #ffd8b5;
    border-radius: 6px;
  }

  /* 标签 */
  :deep(.el-tag) {
    font-weight: 600;
    border-radius: 7px;
  }

  :deep(.el-tag:not(.el-tag--success, .el-tag--info)) {
    color: #e86f0b;
    background: #fff4e9;
    border-color: #ffd3aa;
  }

  :deep(.el-tag--info) {
    color: #b85b0a;
    background: #fff7ed;
    border-color: #fed7aa;
  }

  :deep(.el-tag--success) {
    color: #15803d;
    background: #f0fdf4;
    border-color: #bbf7d0;
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

  /* 操作按钮 */
  :deep(.el-button.is-text.el-button--primary) {
    color: #e86f0b;
    border-radius: 7px;
    transition:
      color 0.18s ease,
      background 0.18s ease,
      transform 0.18s ease;

    &:hover {
      color: #f97316;
      background: #fff0e2;
      transform: translateY(-1px);
    }
  }

  :deep(.el-button.is-text.el-button--danger) {
    color: #ef4444;
    border-radius: 7px;
    transition:
      color 0.18s ease,
      background 0.18s ease,
      transform 0.18s ease;

    &:hover {
      color: #dc2626;
      background: #fef2f2;
      transform: translateY(-1px);
    }
  }

  /* 固定列 */
  :deep(.el-table__fixed-right),
  :deep(.el-table__fixed) {
    box-shadow: none;
  }

  /* 表格滚动条 */
  :deep(.el-scrollbar__thumb) {
    background: #e7b889;

    &:hover {
      background: #d99a5d;
    }
  }

  :deep(.el-table__body-wrapper) {
    scrollbar-color: #e7b889 transparent;
    scrollbar-width: thin;
  }

  :deep(.el-table__body-wrapper::-webkit-scrollbar) {
    width: 7px;
    height: 7px;
  }

  :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
    background: #e7b889;
    border-radius: 999px;
  }

  :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb:hover) {
    background: #d99a5d;
  }

  :deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
    background: transparent;
  }

  /* 弹窗 */
  :deep(.el-dialog) {
    overflow: hidden;
    background: #fff;
    border: 1px solid #f0dfcf;
    border-radius: 18px;
    box-shadow:
      0 24px 60px rgb(92 54 24 / 18%),
      0 0 0 1px rgb(255 255 255 / 70%) inset;
  }

  :deep(.el-dialog__header) {
    padding: 20px 22px 16px;
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
    padding: 22px 24px 12px;
  }

  :deep(.el-dialog__footer) {
    padding: 14px 22px 20px;
    background: #fffaf5;
    border-top: 1px solid #f3e4d6;
  }

  /* 表单 */
  :deep(.el-form-item__label) {
    font-weight: 600;
    color: #6b5545;
  }

  :deep(.el-dialog .el-input__wrapper),
  :deep(.el-dialog .el-select__wrapper) {
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

  :deep(.el-dialog .el-input__inner),
  :deep(.el-dialog .el-select__selected-item) {
    color: #4a382c;
  }

  :deep(.el-dialog .el-input__inner::placeholder),
  :deep(.el-dialog .el-select__placeholder) {
    color: #b09b8c;
  }

  /* 文本域 */
  :deep(.el-dialog .el-textarea__inner) {
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

  /* 多选标签 */
  :deep(.el-dialog .el-select__selection .el-tag) {
    color: #b85b0a;
    background: #fff1e5;
    border-color: #ffd3aa;
  }

  :deep(.el-dialog .el-tag__close) {
    color: #d97722;

    &:hover {
      color: #fff;
      background: #f97316;
    }
  }

  /* 表单错误状态 */
  :deep(.el-form-item.is-error) {
    .el-input__wrapper,
    .el-select__wrapper,
    .el-textarea__inner {
      box-shadow: 0 0 0 1px #ef4444 inset;
    }
  }

  /* 弹窗底部按钮 */
  :deep(.el-dialog__footer .el-button) {
    min-height: 38px;
    padding: 0 18px;
    border-radius: 10px;
  }

  :deep(.el-dialog__footer .el-button:not(.el-button--primary)) {
    color: #806b5b;
    background: #fff;
    border-color: #ead8c8;

    &:hover {
      color: #f97316;
      background: #fff7ef;
      border-color: #ffc58f;
    }
  }

  :deep(.el-dialog__footer .el-button--primary) {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    border-color: #ff8a26;
    box-shadow: 0 6px 16px rgb(249 115 22 / 18%);

    &:hover {
      background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
      border-color: #f97316;
      box-shadow: 0 8px 20px rgb(249 115 22 / 24%);
    }
  }

  /* Loading */
  :deep(.el-loading-spinner .path) {
    stroke: #ff8a26;
  }

  :deep(.el-loading-spinner .el-loading-text) {
    color: #f97316;
  }

  /* 响应式 */
  @media (width <= 1100px) {
    .toolbar {
      flex-direction: column;
      align-items: stretch;

      .toolbar-left,
      .toolbar-right {
        flex-wrap: wrap;
        width: 100%;
      }

      .toolbar-left {
        :deep(.el-select),
        :deep(.el-input) {
          flex: 1;
          width: auto !important;
          min-width: 160px;
        }
      }

      .toolbar-right {
        justify-content: flex-end;
      }
    }
  }

  @media (width <= 640px) {
    padding: 12px;

    .toolbar {
      .toolbar-left {
        flex-direction: column;
        align-items: stretch;

        :deep(.el-select),
        :deep(.el-input) {
          width: 100% !important;
        }
      }

      .toolbar-right {
        :deep(.el-button) {
          flex: 1;
          min-width: 120px;
        }
      }
    }

    :deep(.el-dialog) {
      width: 94% !important;
    }
  }
}
</style>
