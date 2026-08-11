<template>
  <div class="organization-page">
    <el-card class="organization-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title-wrap">
            <div class="card-title">{{ t('organizationInfo.title') }}</div>
          </div>

          <div class="header-actions">
            <el-input
              v-model.trim="searchKeyword"
              class="search-input"
              clearable
              :placeholder="t('organizationInfo.searchPlaceholder')"
              :prefix-icon="Search"
              @keyup.enter="handleSearch"
              @clear="handleResetSearch"
            />

            <el-button class="search-btn" type="primary" @click="handleSearch">
              {{ t('organizationInfo.search') }}
            </el-button>

            <el-button
              class="sync-btn"
              type="primary"
              plain
              :icon="Refresh"
              :loading="syncLoading"
              :disabled="loading"
              @click="handleSync"
            >
              {{ t('organizationInfo.sync') }}
            </el-button>

            <el-button v-if="searchKeyword" class="reset-btn" @click="handleResetSearch">
              {{ t('organizationInfo.reset') }}
            </el-button>
          </div>
        </div>
      </template>

      <div class="table-area">
        <el-table
          v-loading="loading"
          :data="tableData"
          row-key="id"
          class="organization-table"
          height="100%"
          default-expand-all
          :tree-props="{ children: 'children' }"
        >
          <el-table-column :label="t('organizationInfo.organizationName')" min-width="360">
            <template #default="{ row }">
              <el-tooltip
                effect="dark"
                placement="top"
                popper-class="file-tooltip"
                :content="row.name || '-'"
                :disabled="!row.name"
              >
                <span class="name-text">{{ row.name || '-' }}</span>
              </el-tooltip>
            </template>
          </el-table-column>

          <template #empty>
            <el-empty :description="errorMessage || t('organizationInfo.empty')" />
          </template>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import api from '@/api';
import { Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

interface OrganizationTreeNode {
  id: string;
  name: string;
  parentId: string;
  children?: OrganizationTreeNode[];
}

const { t } = useI18n();

const loading = ref(false);
const syncLoading = ref(false);
const errorMessage = ref('');
const searchKeyword = ref('');
const tableData = ref<OrganizationTreeNode[]>([]);
const sourceTreeData = ref<OrganizationTreeNode[]>([]);

const getTreeData = (res: any): OrganizationTreeNode[] => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const cloneTree = (list: OrganizationTreeNode[] = []): OrganizationTreeNode[] => {
  return list.map((item) => ({
    ...item,
    children: cloneTree(item.children || []),
  }));
};

const filterTree = (list: OrganizationTreeNode[] = [], keyword: string): OrganizationTreeNode[] => {
  const searchText = keyword.trim().toLowerCase();

  if (!searchText) {
    return cloneTree(list);
  }

  return list.reduce<OrganizationTreeNode[]>((result, item) => {
    const children = filterTree(item.children || [], searchText);
    const isMatch = (item.name || '').toLowerCase().includes(searchText);

    if (isMatch) {
      result.push({
        ...item,
        children: cloneTree(item.children || []),
      });
    } else if (children.length) {
      result.push({
        ...item,
        children,
      });
    }

    return result;
  }, []);
};

const applyFrontendSearch = () => {
  tableData.value = filterTree(sourceTreeData.value, searchKeyword.value);
  errorMessage.value =
    searchKeyword.value && tableData.value.length === 0 ? t('organizationInfo.searchEmpty') : '';
};

const getGmsInfo = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const res = await api.organizationInfo.getGmsorgsTreeList();
    const code = res?.code ?? res?.data?.code;

    if (res?.success === false || (code && `${code}` !== '200')) {
      sourceTreeData.value = [];
      tableData.value = [];
      errorMessage.value = res?.message || res?.msg || t('organizationInfo.loadFailed');
      return;
    }

    sourceTreeData.value = getTreeData(res);
    applyFrontendSearch();
  } catch (error) {
    console.error(t('organizationInfo.loadFailed'), error);
    sourceTreeData.value = [];
    tableData.value = [];
    errorMessage.value = t('organizationInfo.loadFailed');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  applyFrontendSearch();
};

const handleResetSearch = () => {
  searchKeyword.value = '';
  applyFrontendSearch();
};

const handleSync = async () => {
  if (syncLoading.value) return;

  syncLoading.value = true;

  try {
    await api.organizationInfo.syncGmsInfo();

    ElMessage.success(t('organizationInfo.syncSuccess'));
    await getGmsInfo();
  } catch (error) {
    console.error(t('organizationInfo.syncFailed'), error);
  } finally {
    syncLoading.value = false;
  }
};

onMounted(() => {
  getGmsInfo();
});
</script>

<style scoped lang="scss">
.organization-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 10%), transparent 32%),
    linear-gradient(180deg, #fff9f3 0%, #fff4e9 100%);
}

.organization-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: rgb(255 255 255 / 97%);
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow:
    0 12px 32px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;
}

.card-header {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
}

.title-wrap {
  display: flex;
  align-items: center;
  min-width: 120px;
}

.card-title {
  position: relative;
  padding-left: 14px;
  font-size: 21px;
  font-weight: 700;
  line-height: 1;
  color: #4a382c;

  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 4px;
    height: 18px;
    content: '';
    background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
    border-radius: 8px;
    box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
    transform: translateY(-50%);
  }
}

.header-actions {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

.search-input {
  width: 320px;
}

.search-btn,
.sync-btn,
.reset-btn {
  height: 40px;
  padding: 0 22px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

/* 搜索按钮 */
.search-btn {
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border: 1px solid #ff8a26;
  box-shadow: 0 8px 18px rgb(249 115 22 / 22%);

  &:hover,
  &:focus {
    color: #fff;
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    border-color: #f97316;
    box-shadow: 0 10px 22px rgb(249 115 22 / 28%);
    transform: translateY(-1px);
  }

  &:active {
    box-shadow: 0 4px 12px rgb(249 115 22 / 16%);
    transform: translateY(0);
  }
}

/* 同步按钮 */
.sync-btn {
  color: #e86f0b;
  background: #fff7ef;
  border-color: #ffc995;

  &:hover,
  &:focus {
    color: #d95f06;
    background: #fff0e2;
    border-color: #ffad61;
    box-shadow: 0 7px 16px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }

  &.is-loading,
  &.is-disabled {
    color: #d99a68;
    background: #fff7ef;
    border-color: #f2d5bb;
    box-shadow: none;
  }
}

/* 重置按钮 */
.reset-btn {
  color: #806b5b;
  background: #fff;
  border-color: #ead8c8;

  &:hover,
  &:focus {
    color: #f97316;
    background: #fff7ef;
    border-color: #ffc58f;
    box-shadow: 0 6px 14px rgb(249 115 22 / 8%);
    transform: translateY(-1px);
  }
}

/* 表格外层 */
.table-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f1e1d2;
  border-radius: 16px;
  box-shadow:
    0 6px 20px rgb(126 72 24 / 4%),
    0 0 0 1px rgb(255 255 255 / 65%) inset;
}

.organization-table {
  width: 100%;
}

/* 名称 */
.name-text,
.ellipsis-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  vertical-align: middle;
  color: #4a382c;
  white-space: nowrap;
}

.ellipsis-text {
  font-weight: 400;
  color: #6f5b4c;
}

/* Card */
:deep(.el-card__header) {
  flex-shrink: 0;
  padding: 24px 24px 16px;
  background: linear-gradient(180deg, rgb(255 250 245 / 88%) 0%, transparent 100%);
  border-bottom: none;
}

:deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 8px 24px 24px;
  overflow: hidden;
}

/* 搜索框 */
:deep(.search-input .el-input__wrapper) {
  height: 40px;
  background: #fff7ef;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px #f0dfcf;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

:deep(.search-input .el-input__wrapper:hover) {
  background: #fff;
  box-shadow: inset 0 0 0 1px #ffc58f;
}

:deep(.search-input .el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow:
    inset 0 0 0 1px #ff8a26,
    0 0 0 3px rgb(255 138 38 / 10%);
}

:deep(.search-input .el-input__inner) {
  font-size: 14px;
  color: #4a382c;
}

:deep(.search-input .el-input__inner::placeholder) {
  color: #b09b8c;
}

:deep(.search-input .el-input__prefix) {
  color: #d98a49;
}

:deep(.search-input .el-input__clear) {
  color: #b09b8c;

  &:hover {
    color: #f97316;
  }
}

/* 表格 */
:deep(.el-table) {
  color: #5b4738;
  background: #fff;
}

:deep(.el-table th.el-table__cell) {
  height: 54px;
  font-weight: 700;
  color: #806b5b;
  background: linear-gradient(180deg, #fff7ef 0%, #fffaf5 100%);
  border-bottom-color: #f0dfcf;
}

:deep(.el-table td.el-table__cell) {
  height: 66px;
  border-bottom-color: #f3e4d6;
}

:deep(.el-table__row) {
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

:deep(.el-table__row:hover > td.el-table__cell) {
  background: #fffaf5;
}

:deep(.el-table__inner-wrapper) {
  border-radius: 16px;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

/* 树形展开图标 */
:deep(.el-table__expand-icon) {
  color: #f97316;
  transition:
    color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #e9680a;
  }
}

:deep(.el-table__expand-icon--expanded) {
  color: #ff8a26;
}

/* 空状态 */
:deep(.el-empty__description p) {
  color: #a18b7b;
}

:deep(.el-empty__image svg) {
  opacity: 0.8;
}

/* Tooltip */
:deep(.file-tooltip) {
  color: #fff;
  background: #5c3b25;
  border: 1px solid #6d4930;
  box-shadow: 0 8px 20px rgb(92 54 24 / 18%);
}

/* Tag */
:deep(.el-tag) {
  font-weight: 600;
  border-radius: 8px;
}

/* Loading */
:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 滚动条 */
:deep(.el-scrollbar__bar.is-vertical) {
  right: 2px;
}

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

/* 通用主按钮橙色 */
:deep(.el-button--primary:not(.is-plain)) {
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border-color: #ff8a26;

  &:hover:not(.is-disabled),
  &:focus:not(.is-disabled) {
    color: #fff;
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    border-color: #f97316;
  }
}

/* 响应式 */
@media (width <= 1200px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
    width: 100%;
  }

  .search-input {
    width: 280px;
  }
}

@media (width <= 768px) {
  .organization-page {
    padding: 12px;
  }

  .organization-card {
    border-radius: 14px;
  }

  .card-header {
    gap: 14px;
  }

  .card-title {
    font-size: 19px;
  }

  .header-actions {
    gap: 10px;
  }

  .search-input {
    width: 100%;
  }

  .search-btn,
  .sync-btn,
  .reset-btn {
    flex: 1;
    min-width: 90px;
    padding: 0 14px;
  }

  .table-area {
    border-radius: 12px;
  }

  :deep(.el-card__header) {
    padding: 18px 18px 10px;
  }

  :deep(.el-card__body) {
    padding: 8px 18px 18px;
  }

  :deep(.el-table th.el-table__cell) {
    height: 48px;
  }

  :deep(.el-table td.el-table__cell) {
    height: 58px;
  }
}
</style>
