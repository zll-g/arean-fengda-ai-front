<template>
  <div class="master-data-page">
    <div class="data-container">
      <!-- 数据源选择 -->
      <div class="source-tabs">
        <div
          v-for="source in dataSources"
          :key="source.code"
          class="source-tab"
          :class="{ active: activeSource === source.code }"
          @click="handleSwitchSource(source.code)"
        >
          <el-icon :size="20">
            <component :is="source.icon" />
          </el-icon>
          <span>{{ source.name }}</span>
          <el-badge :value="source.count" :max="999" class="tab-badge" />
        </div>
      </div>

      <!-- 搜索 -->
      <div class="search-area">
        <div class="search-area" style="display: flex; gap: 12px">
          <el-input
            v-model="searchKeyword"
            :placeholder="t('masterData.searchPlaceholder', { source: activeSourceName })"
            :prefix-icon="Search"
            clearable
            style="flex: 1"
            @input="handleSearch"
          />

          <el-button type="primary" @click="openAddDialog">
            <el-icon>
              <Plus />
            </el-icon>
            {{ t('masterData.add') }}
          </el-button>
        </div>
      </div>

      <!-- 数据列表 -->
      <div v-loading="loading" class="data-list">
        <el-table :data="dataList" stripe class="data-table">
          <el-table-column :label="t('masterData.table.code')" prop="dataCode" width="120">
            <template #default="{ row }">
              <span class="data-code">{{ row.dataCode }}</span>
            </template>
          </el-table-column>

          <el-table-column :label="t('masterData.table.name')" prop="dataName" min-width="200">
            <template #default="{ row }">
              <div>
                <span class="data-name">{{ row.dataName }}</span>

                <div v-if="row.quote || row.filed" class="data-aliases">
                  <el-tag size="small" type="info"> {{ row.quote }} ({{ row.field }}) </el-tag>
                </div>

                <div v-if="row.aliases" class="data-aliases">
                  <el-tag
                    v-for="alias in row.aliases.split(',').slice(0, 3)"
                    :key="alias"
                    size="small"
                    type="info"
                  >
                    {{ alias.trim() }}
                  </el-tag>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column :label="t('masterData.table.detail')" min-width="300">
            <template #default="{ row }">
              <div v-if="row.dataValues" class="data-values">
                <el-descriptions :column="2" size="small" border>
                  <el-descriptions-item
                    v-for="(val, key) in row.dataValues"
                    :key="key"
                    :label="formatKey(String(key))"
                  >
                    {{ val }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column
            :label="t('masterData.table.action')"
            width="160"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditDialog(row)">
                {{ t('masterData.action.edit') }}
              </el-button>

              <el-button
                link
                type="danger"
                :loading="deletingId === String(row.id)"
                @click="handleDelete(row)"
              >
                {{ t('masterData.action.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 移动端卡片 -->
        <div v-if="isMobile" class="mobile-data-list">
          <div v-for="item in dataList" :key="item.id" class="data-card">
            <div class="card-header-row">
              <span class="data-code-tag">{{ item.dataCode }}</span>
              <span class="data-name-text">{{ item.dataName }}</span>
            </div>

            <div v-if="item.aliases" class="card-aliases">
              {{ t('masterData.mobile.aliases') }}：{{ item.aliases }}
            </div>

            <div v-if="item.dataValues" class="card-values">
              <div v-for="(val, key) in item.dataValues" :key="key" class="value-row">
                <span class="value-key">{{ formatKey(String(key)) }}:</span>
                <span class="value-val">{{ val }}</span>
              </div>
            </div>

            <div class="card-actions">
              <el-button link type="primary" @click="openEditDialog(item)">
                {{ t('masterData.action.edit') }}
              </el-button>

              <el-button
                link
                type="danger"
                :loading="deletingId === String(item.id)"
                @click="handleDelete(item)"
              >
                {{ t('masterData.action.delete') }}
              </el-button>
            </div>
          </div>
        </div>

        <el-empty v-if="!loading && dataList.length === 0" :description="t('masterData.noData')" />
      </div>
    </div>

    <!-- 匹配测试 -->
    <!-- <div class="match-test-section">
      <h3 class="section-title">
        <el-icon>
          <Search />
        </el-icon>
        {{ t('masterData.matchTest.title') }}
      </h3>

      <p class="section-desc">
        {{ t('masterData.matchTest.desc') }}
      </p>

      <div class="match-input-row">
        <el-input
          v-model="matchInput"
          :placeholder="t('masterData.matchTest.placeholder')"
          size="large"
        />

        <el-button type="primary" size="large" :loading="matching" @click="handleMatch">
          {{ t('masterData.matchTest.button') }}
        </el-button>
      </div>

      <div v-if="matchResult" class="match-result">
        <el-result
          :icon="matchResult._matchedName ? 'success' : 'warning'"
          :title="
            matchResult._matchedName
              ? t('masterData.matchTest.success')
              : t('masterData.matchTest.notFound')
          "
          :sub-title="matchResult._matchedName || t('masterData.matchTest.notFoundTip')"
        >
          <template v-if="matchResult._matchedName" #extra>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item :label="t('masterData.matchTest.matchedName')">
                {{ matchResult._matchedName }}
              </el-descriptions-item>

              <el-descriptions-item :label="t('masterData.matchTest.code')">
                {{ matchResult._matchedCode }}
              </el-descriptions-item>

              <el-descriptions-item
                v-for="(val, key) in matchResult"
                v-show="!String(key).startsWith('_')"
                :key="key"
                :label="formatKey(String(key))"
              >
                {{ val }}
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </el-result>
      </div>
    </div> -->

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingId ? t('masterData.dialog.editTitle') : t('masterData.dialog.title')"
      width="600px"
      @closed="resetForm"
    >
      <el-form ref="addFormRef" :model="addForm" label-width="100px" :rules="addRules">
        <el-form-item :label="t('masterData.dialog.source')" prop="sourceCode">
          <el-select v-model="addForm.sourceCode" class="w-full">
            <el-option :label="t('masterData.source.product')" value="product" />
            <el-option :label="t('masterData.source.supplier')" value="supplier" />
            <el-option :label="t('masterData.source.gms')" value="gms" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('masterData.dialog.dataCode')" prop="dataCode">
          <el-input
            v-model="addForm.dataCode"
            :placeholder="t('masterData.dialog.codePlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('masterData.dialog.dataName')" prop="dataName">
          <el-input
            v-model="addForm.dataName"
            :placeholder="
              activeSource !== 'gms' ? t('masterData.dialog.namePlaceholder') : 'kks_code'
            "
          />
        </el-form-item>

        <el-form-item
          v-if="activeSource === 'gms'"
          :label="t('masterData.dialog.tableName')"
          prop="quote"
        >
          <el-input v-model="addForm.quote" placeholder="equ_kks_code" />
        </el-form-item>

        <el-form-item
          v-if="activeSource === 'gms'"
          :label="t('masterData.dialog.fieldName')"
          prop="field"
        >
          <el-input v-model="addForm.field" placeholder="kks_code" />
        </el-form-item>

        <el-form-item v-if="activeSource !== 'gms'" :label="t('masterData.dialog.aliases')">
          <el-input
            v-model="addForm.aliases"
            :placeholder="t('masterData.dialog.aliasesPlaceholder')"
          />
        </el-form-item>

        <el-divider content-position="left">
          {{ t('masterData.dialog.extAttrs') }}
        </el-divider>

        <div v-for="(_, key, i) in addForm.dataValues" :key="i" class="ext-row">
          <el-input :model-value="key" disabled class="ext-key" />

          <el-input v-model="addForm.dataValues[key as string]" class="ext-val" />

          <el-button text type="danger" @click="delete addForm.dataValues[key as string]">
            <el-icon>
              <Delete />
            </el-icon>
          </el-button>
        </div>

        <div class="ext-add-row">
          <el-input
            v-model="newExtKey"
            :placeholder="t('masterData.dialog.extKey')"
            class="ext-key"
          />

          <el-input
            v-model="newExtVal"
            :placeholder="t('masterData.dialog.field')"
            class="ext-val"
          />

          <el-button :disabled="!newExtKey" @click="addExtProp">
            {{ t('masterData.dialog.addExt') }}
          </el-button>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">
          {{ t('masterData.dialog.cancel') }}
        </el-button>

        <el-button type="primary" :loading="submitting" @click="handleSubmitMasterData">
          {{ editingId ? t('masterData.dialog.save') : t('masterData.dialog.create') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Delete, Plus, Search } from '@element-plus/icons-vue';
import { useDebounceFn, useMediaQuery } from '@vueuse/core';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api';
import type { MasterDataItem } from '@/types';

const { t } = useI18n();

const isMobile = useMediaQuery('(max-width: 768px)');

const loading = ref(false);

const submitting = ref(false);
const deletingId = ref('');

const activeSource = ref('product');
const searchKeyword = ref('');
const dataList = ref<MasterDataItem[]>([]);

const matchResult = ref<Record<string, any> | null>(null);

const showAddDialog = ref(false);
const editingId = ref<string | number | null>(null);
const addFormRef = ref();

const newExtKey = ref('');
const newExtVal = ref('');

const sourceCount = ref({
  product: 0,
  supplier: 0,
  gms: 0,
});

const addForm = reactive({
  sourceCode: 'product',
  dataCode: '',
  dataName: '',
  aliases: '',
  field: '',
  quote: '',
  dataValues: {} as Record<string, any>,
});

const dataSources = computed(() => [
  {
    code: 'product',
    name: t('masterData.source.product'),
    icon: 'Box',
    count: sourceCount.value.product,
  },
  {
    code: 'supplier',
    name: t('masterData.source.supplier'),
    icon: 'OfficeBuilding',
    count: sourceCount.value.supplier,
  },
  {
    code: 'gms',
    name: t('masterData.source.gms'),
    icon: 'OfficeBuilding',
    count: sourceCount.value.gms,
  },
]);

const activeSourceName = computed(() => {
  return dataSources.value.find((source) => source.code === activeSource.value)?.name || '';
});

const addRules = computed(() => ({
  sourceCode: [
    {
      required: true,
      message: t('masterData.validate.source'),
    },
  ],
  dataCode: [
    {
      required: true,
      message: t('masterData.validate.code'),
    },
  ],
  dataName: [
    {
      required: true,
      message: t('masterData.validate.name'),
    },
  ],
}));

const handleSearch = useDebounceFn(() => {
  loadData();
}, 300);

/**
 * 重置表单
 */
function resetForm() {
  editingId.value = null;

  addForm.sourceCode = activeSource.value;
  addForm.dataCode = '';
  addForm.dataName = '';
  addForm.aliases = '';
  addForm.field = '';
  addForm.quote = '';
  addForm.dataValues = {};

  newExtKey.value = '';
  newExtVal.value = '';

  addFormRef.value?.clearValidate();
}

/**
 * 打开新增弹窗
 */
function openAddDialog() {
  resetForm();
  addForm.sourceCode = activeSource.value;
  showAddDialog.value = true;
}

/**
 * 打开编辑弹窗
 */
function openEditDialog(row: MasterDataItem) {
  editingId.value = row.id;

  addForm.sourceCode =
    (row as MasterDataItem & { sourceCode?: string }).sourceCode || activeSource.value;

  addForm.dataCode = row.dataCode || '';
  addForm.dataName = row.dataName || '';
  addForm.aliases = row.aliases || '';
  addForm.field = row.field || '';
  addForm.quote = row.quote || '';
  addForm.dataValues = {
    ...(row.dataValues || {}),
  };

  showAddDialog.value = true;
}

/**
 * 添加扩展属性
 */
function addExtProp() {
  const key = newExtKey.value.trim();

  if (!key) return;

  addForm.dataValues[key] = newExtVal.value;

  newExtKey.value = '';
  newExtVal.value = '';
}

/**
 * 新增 / 编辑提交
 */
async function handleSubmitMasterData() {
  await addFormRef.value?.validate();

  submitting.value = true;

  try {
    const data = {
      sourceCode: addForm.sourceCode,
      dataCode: addForm.dataCode,
      dataName: addForm.dataName,
      field: addForm.field,
      quote: addForm.quote,
      aliases: addForm.aliases || undefined,
      dataValues: Object.keys(addForm.dataValues).length > 0 ? addForm.dataValues : undefined,
    };

    if (editingId.value) {
      await api.master.updateMasterData({
        id: editingId.value,
        ...data,
      });

      ElMessage.success(t('masterData.message.updateSuccess'));
    } else {
      await api.master.createMasterData(data);

      ElMessage.success(t('masterData.message.createSuccess'));
    }

    showAddDialog.value = false;

    await refreshData();
  } finally {
    submitting.value = false;
  }
}

/**
 * 删除
 */
async function handleDelete(row: MasterDataItem) {
  try {
    await ElMessageBox.confirm(
      t('masterData.message.deleteConfirm', { name: row.dataName }),
      t('masterData.message.deleteTitle'),
      {
        confirmButtonText: t('masterData.message.confirm'),
        cancelButtonText: t('masterData.message.cancel'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  deletingId.value = String(row.id);

  try {
    await api.master.removeMasterData({ id: row.id });

    ElMessage.success(t('masterData.message.deleteSuccess'));

    await refreshData();
  } finally {
    deletingId.value = '';
  }
}

/**
 * 加载当前列表
 */
async function loadData() {
  loading.value = true;

  try {
    const res: any = await api.master.searchMasterData({
      sourceCode: activeSource.value,
      keyword: searchKeyword.value || undefined,
      limit: 100,
    });

    dataList.value = res.data || [];
  } finally {
    loading.value = false;
  }
}

/**
 * 加载数据源数量
 */
async function loadSourceCount() {
  const codes = Object.keys(sourceCount.value) as Array<keyof typeof sourceCount.value>;

  const results = await Promise.all(
    codes.map((code) =>
      api.master.searchMasterData({
        sourceCode: code,
        keyword: undefined,
        limit: 100,
      }),
    ),
  );

  results.forEach((res, index) => {
    sourceCount.value[codes[index]] = (res.data || []).length;
  });
}

/**
 * 刷新列表和数量
 */
async function refreshData() {
  await Promise.all([loadData(), loadSourceCount()]);
}

/**
 * 切换数据源
 */
function handleSwitchSource(code: string) {
  activeSource.value = code;
  searchKeyword.value = '';
  matchResult.value = null;

  loadData();
}

/**
 * 匹配测试
 */
// async function handleMatch() {
//   if (!matchInput.value.trim()) return;

//   matching.value = true;

//   try {
//     const res = await api.master.matchMasterData({
//       sourceCode: activeSource.value,
//       name: matchInput.value.trim(),
//     });

//     matchResult.value = res.data || {};
//   } finally {
//     matching.value = false;
//   }
// }

/**
 * 格式化扩展属性名称
 */
function formatKey(key: string): string {
  const map: Record<string, string> = {
    unit: t('masterData.field.unit'),
    unitPrice: t('masterData.field.unitPrice'),
    spec: t('masterData.field.spec'),
    category: t('masterData.field.category'),
    contact: t('masterData.field.contact'),
    phone: t('masterData.field.phone'),
    address: t('masterData.field.address'),
    _matchedName: t('masterData.field.matchedName'),
    _matchedCode: t('masterData.field.matchedCode'),
  };

  return map[key] || key;
}

onMounted(() => {
  refreshData();
});
</script>

<style lang="scss" scoped>
.master-data-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 22px;
  margin: 0 auto;
  overflow-y: auto;
  color: #4a382c;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 10%) 0%, transparent 30%),
    linear-gradient(180deg, #fff9f3 0%, #fff4e9 100%);

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

/* 页面标题 */
.page-header {
  margin-bottom: 24px;

  .page-title {
    position: relative;
    padding-left: 14px;
    font-size: 22px;
    font-weight: 700;
    color: #4a382c;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 20px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
      transform: translateY(-50%);
    }
  }

  .page-desc {
    margin-top: 5px;
    font-size: 14px;
    color: #a18b7b;
  }
}

/* 主数据内容 */
.data-container {
  padding: 24px;
  margin-bottom: 24px;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 5%) 0%, transparent 26%),
    rgb(255 255 255 / 97%);
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow:
    0 10px 28px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;
}

/* 数据源切换 */
.source-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  .source-tab {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 44px;
    padding: 12px 20px;
    overflow: hidden;
    font-size: 14px;
    font-weight: 500;
    color: #806b5b;
    cursor: pointer;
    background: #fff7ef;
    border: 1px solid #f0dfcf;
    border-radius: 10px;
    transition:
      color 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &::before {
      position: absolute;
      top: 0;
      right: 14px;
      left: 14px;
      height: 2px;
      content: '';
      background: linear-gradient(90deg, transparent, #ff9a3d, transparent);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .el-icon {
      color: #d98a49;
      transition:
        color 0.2s ease,
        transform 0.2s ease;
    }

    &:hover {
      color: #e86f0b;
      background: #fff1e5;
      border-color: #ffc58f;
      box-shadow: 0 7px 16px rgb(249 115 22 / 8%);
      transform: translateY(-1px);

      .el-icon {
        color: #f97316;
        transform: scale(1.05);
      }
    }

    &.active {
      font-weight: 600;
      color: #d95f06;
      background: linear-gradient(135deg, #fff0e2 0%, #fff8f1 100%);
      border-color: #ffad61;
      box-shadow:
        inset 3px 0 0 #ff8a26,
        0 8px 18px rgb(249 115 22 / 10%);

      &::before {
        opacity: 1;
      }

      .el-icon {
        color: #f97316;
      }
    }

    :deep(.el-badge__content) {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #fff;
      box-shadow: 0 3px 8px rgb(249 115 22 / 18%);
    }
  }

  @media (width <= 768px) {
    flex-direction: column;
    gap: 8px;
  }
}

/* 搜索区域 */
.search-area {
  margin-bottom: 16px;

  :deep(.el-input__wrapper) {
    min-height: 40px;
    background: #fff7ef;
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

    &:hover {
      background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
      border-color: #f97316;
      box-shadow: 0 9px 20px rgb(249 115 22 / 26%);
      transform: translateY(-1px);
    }

    &:active {
      box-shadow: 0 4px 12px rgb(249 115 22 / 16%);
      transform: translateY(0);
    }
  }
}

/* 数据列表 */
.data-list {
  overflow: hidden;
  background: #fff;
  border: 1px solid #f1e1d2;
  border-radius: 14px;
}

/* PC 表格 */
.data-table {
  :deep(.el-table) {
    color: #5b4738;
    background: #fff;
  }

  :deep(.el-table th.el-table__cell) {
    height: 50px;
    font-weight: 700;
    color: #806b5b;
    background: linear-gradient(180deg, #fff7ef 0%, #fffaf5 100%);
    border-bottom-color: #f0dfcf;
  }

  :deep(.el-table td.el-table__cell) {
    border-bottom-color: #f3e4d6;
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
    display: none;
  }

  .data-code {
    padding: 3px 8px;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-weight: 700;
    color: #d95f06;
    background: #fff1e5;
    border: 1px solid #ffd3aa;
    border-radius: 6px;
  }

  .data-name {
    font-weight: 600;
    color: #4a382c;
  }

  .data-aliases {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;

    :deep(.el-tag) {
      color: #b85b0a;
      background: #fff7ef;
      border-color: #ffd8b5;
      border-radius: 6px;
    }
  }

  :deep(.el-button--primary.is-link) {
    color: #f97316;

    &:hover {
      color: #d95f06;
    }
  }
}

/* 详情描述 */
:deep(.el-descriptions) {
  overflow: hidden;
  border-radius: 10px;
}

:deep(.el-descriptions__label.el-descriptions__cell.is-bordered-label) {
  font-weight: 600;
  color: #806b5b;
  background: #fff7ef;
}

:deep(.el-descriptions__content.el-descriptions__cell.is-bordered-content) {
  color: #5b4738;
  background: #fff;
}

:deep(.el-descriptions__cell) {
  border-color: #f0dfcf !important;
}

/* 标签 */
:deep(.el-tag) {
  font-weight: 600;
  border-radius: 7px;
}

:deep(.el-tag--info) {
  color: #b85b0a;
  background: #fff7ed;
  border-color: #fed7aa;
}

/* 移动端数据卡片 */
.mobile-data-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.data-card {
  padding: 14px;
  background: linear-gradient(135deg, #fffaf5 0%, #fff 100%);
  border: 1px solid #f0dfcf;
  border-radius: 12px;
  box-shadow: 0 5px 14px rgb(126 72 24 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #ffc58f;
    box-shadow: 0 8px 18px rgb(249 115 22 / 9%);
    transform: translateY(-1px);
  }

  .card-header-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;

    .data-code-tag {
      padding: 3px 8px;
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #d95f06;
      background: #fff0e2;
      border: 1px solid #ffd3aa;
      border-radius: 6px;
    }

    .data-name-text {
      font-weight: 600;
      color: #4a382c;
    }
  }

  .card-aliases {
    margin-bottom: 8px;
    font-size: 12px;
    color: #a18b7b;
  }

  .card-values {
    padding: 8px 10px;
    background: #fffaf5;
    border: 1px solid #f3e4d6;
    border-radius: 9px;

    .value-row {
      display: flex;
      gap: 8px;
      padding: 4px 0;
      font-size: 13px;

      .value-key {
        min-width: 60px;
        color: #a18b7b;
      }

      .value-val {
        color: #5b4738;
      }
    }
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 10px;
    margin-top: 10px;
    border-top: 1px solid #f3e4d6;

    :deep(.el-button--primary.is-link) {
      color: #f97316;

      &:hover {
        color: #d95f06;
      }
    }
  }
}

/* 匹配测试 */
.match-test-section {
  padding: 24px;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 6%) 0%, transparent 30%),
    rgb(255 255 255 / 97%);
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow:
    0 10px 28px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;

  .section-title {
    position: relative;
    display: flex;
    gap: 7px;
    align-items: center;
    padding-left: 13px;
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: #4a382c;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 3px;
      height: 16px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      transform: translateY(-50%);
    }

    .el-icon {
      color: #f97316;
    }
  }

  .section-desc {
    margin-bottom: 16px;
    font-size: 13px;
    color: #a18b7b;
  }

  .match-input-row {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;

    :deep(.el-input__wrapper) {
      background: #fff7ef;
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

    :deep(.el-button--primary) {
      min-width: 110px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      border-radius: 10px;
      box-shadow: 0 7px 16px rgb(249 115 22 / 20%);

      &:hover {
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
        box-shadow: 0 9px 20px rgb(249 115 22 / 26%);
      }
    }

    @media (width <= 768px) {
      flex-direction: column;
    }
  }

  .match-result {
    padding: 12px;
    background: #fffaf5;
    border: 1px solid #f0dfcf;
    border-radius: 12px;
  }

  :deep(.el-result__title p) {
    color: #4a382c;
  }

  :deep(.el-result__subtitle p) {
    color: #a18b7b;
  }
}

/* 扩展属性 */
.ext-row,
.ext-add-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;

  .ext-key {
    flex-shrink: 0;
    width: 120px;
  }

  .ext-val {
    flex: 1;
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

/* 新增 / 编辑弹窗 */
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

/* 弹窗表单 */
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

/* Divider */
:deep(.el-divider) {
  border-color: #f0dfcf;
}

:deep(.el-divider__text) {
  font-weight: 600;
  color: #806b5b;
  background: #fff;
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

/* 空状态 */
:deep(.el-empty__description p) {
  color: #a18b7b;
}

/* Loading */
:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 响应式 */
@media (width <= 768px) {
  .master-data-page {
    padding: 12px;
  }

  .data-container,
  .match-test-section {
    padding: 16px;
    border-radius: 14px;
  }

  .source-tabs {
    .source-tab {
      width: 100%;
    }
  }

  .search-area {
    > .search-area {
      flex-direction: column;
    }

    :deep(.el-button) {
      width: 100%;
    }
  }

  :deep(.data-table) {
    display: none;
  }

  .mobile-data-list {
    display: flex;
  }

  :deep(.el-dialog) {
    width: 94% !important;
  }

  .ext-row,
  .ext-add-row {
    flex-wrap: wrap;

    .ext-key {
      width: 100%;
    }

    .ext-val {
      min-width: calc(100% - 50px);
    }
  }
}

@media (width > 768px) {
  .mobile-data-list {
    display: none;
  }
}
</style>
