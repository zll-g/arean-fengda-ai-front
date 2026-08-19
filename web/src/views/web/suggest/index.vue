<template>
  <div class="recommend-page">
    <el-card class="recommend-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="card-title">{{ t('recommendPage.pageTitle') }}</div>

          <div class="filter-wrap">
            <span class="filter-label">
              {{ t('recommendPage.filter.type') }}
            </span>

            <el-select
              v-model="query.recommendType"
              class="type-select"
              clearable
              :placeholder="t('recommendPage.filter.typePlaceholder')"
              @change="handleTypeChange"
            >
              <el-option
                v-for="item in typeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>
      </template>

      <div class="content">
        <div class="table-wrap">
          <el-table
            v-loading="loading"
            :data="tableData"
            class="recommend-table"
            height="100%"
            row-key="id"
          >
            <el-table-column
              type="index"
              :label="t('recommendPage.table.index')"
              width="80"
              align="center"
            />

            <el-table-column :label="t('recommendPage.table.type')" width="150">
              <template #default="{ row }">
                <el-tag effect="light">
                  {{ getTypeName(row.recommendType) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              prop="recommendContent"
              :label="t('recommendPage.table.content')"
              min-width="260"
              show-overflow-tooltip
            />

            <el-table-column
              prop="nickname"
              :label="t('recommendPage.table.user')"
              width="160"
              show-overflow-tooltip
            />

            <el-table-column
              prop="createTime"
              :label="t('recommendPage.table.createTime')"
              width="190"
              show-overflow-tooltip
            />

            <template #empty>
              <el-empty :description="t('recommendPage.empty')" />
            </template>
          </el-table>
        </div>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="query.page"
            v-model:page-size="query.limit"
            background
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="getList"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api';

interface RecommendItem {
  id: string;
  recommendType: string;
  recommendContent: string;
  userId: string;
  nickname: string;
  createTime: string;
}

interface TypeOption {
  label: string;
  value: string;
}

interface ListParams {
  page: number;
  limit: number;
  recommendType?: string;
}

const { t, te } = useI18n();

const query = reactive({
  page: 1,
  limit: 20,
  recommendType: '',
});

const loading = ref(false);
const total = ref(0);
const tableData = ref<RecommendItem[]>([]);
const typeOptions = ref<TypeOption[]>([]);
const typeMap = ref<Record<string, string>>({});

/**
 * 获取推荐类型名称。
 * 优先使用接口返回的名称，兼容国际化配置作为兜底。
 */
const getTypeName = (type?: string) => {
  if (!type) return '-';

  if (typeMap.value[type]) {
    return typeMap.value[type];
  }

  const i18nKey = `recommendPage.type.${type}`;
  return te(i18nKey) ? t(i18nKey) : type;
};

const getTypes = async () => {
  try {
    const res = await api.suggest.getRecommendType();
    const data =
      res?.data && typeof res.data === 'object' && !Array.isArray(res.data)
        ? (res.data as Record<string, string>)
        : {};

    typeMap.value = data;

    typeOptions.value = Object.entries(data).map(([value, label]) => ({
      value,
      label,
    }));
  } catch (error) {
    console.error(t('recommendPage.message.loadTypeFailed'), error);
    typeMap.value = {};
    typeOptions.value = [];
  }
};

/**
 * 获取推荐列表。
 */
const getList = async () => {
  loading.value = true;

  try {
    const params: ListParams = {
      page: query.page,
      limit: query.limit,
    };

    if (query.recommendType) {
      params.recommendType = query.recommendType;
    }

    const res = await api.suggest.getRecommendList(params);
    const pageData = res?.data || {};

    tableData.value = Array.isArray(pageData.records) ? pageData.records : [];

    total.value = Number(pageData.total || 0);
  } catch (error) {
    console.error(t('recommendPage.message.loadListFailed'), error);
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const handleTypeChange = () => {
  query.page = 1;
  getList();
};

const handleSizeChange = () => {
  query.page = 1;
  getList();
};

onMounted(async () => {
  await getTypes();
  await getList();
});
</script>

<style scoped lang="scss">
.recommend-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 10%), transparent 32%),
    linear-gradient(180deg, #fff9f3 0%, #fff4e9 100%);
}

.recommend-card {
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
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  position: relative;
  padding-left: 14px;
  font-size: 21px;
  font-weight: 700;
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

.filter-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-label {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: #806b5b;
}

.type-select {
  width: 240px;
}

.content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f1e1d2;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgb(126 72 24 / 4%);
}

.recommend-table {
  width: 100%;
}

.pagination-wrap {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding-top: 18px;
}

:deep(.el-card__header) {
  flex-shrink: 0;
  padding: 24px 24px 18px;
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

:deep(.type-select .el-select__wrapper) {
  min-height: 40px;
  background: #fff7ef;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px #f0dfcf;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

:deep(.type-select .el-select__wrapper:hover) {
  background: #fff;
  box-shadow: inset 0 0 0 1px #ffc58f;
}

:deep(.type-select .el-select__wrapper.is-focused) {
  background: #fff;
  box-shadow:
    inset 0 0 0 1px #ff8a26,
    0 0 0 3px rgb(255 138 38 / 10%);
}

:deep(.type-select .el-select__placeholder) {
  color: #b09b8c;
}

:deep(.type-select .el-select__selected-item) {
  font-weight: 500;
  color: #4a382c;
}

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
  height: 64px;
  border-bottom-color: #f3e4d6;
}

:deep(.el-table__row) {
  transition: background 0.2s ease;
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

:deep(.el-tag) {
  font-weight: 600;
  color: #e86f0b;
  background: #fff4e9;
  border-color: #ffd3aa;
  border-radius: 8px;
}

:deep(.el-pagination) {
  color: #806b5b;
}

:deep(.el-pagination.is-background .el-pager li),
:deep(.el-pagination.is-background .btn-prev),
:deep(.el-pagination.is-background .btn-next) {
  color: #806b5b;
  background: #fff7ef;
  border: 1px solid #f0dfcf;
  border-radius: 8px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

:deep(.el-pagination.is-background .el-pager li:hover),
:deep(.el-pagination.is-background .btn-prev:hover),
:deep(.el-pagination.is-background .btn-next:hover) {
  color: #f97316;
  background: #fff0e2;
  border-color: #ffc58f;
  transform: translateY(-1px);
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border-color: #ff8a26;
  box-shadow: 0 5px 12px rgb(249 115 22 / 18%);
}

:deep(.el-pagination .el-select__wrapper),
:deep(.el-pagination .el-input__wrapper) {
  background: #fffaf5;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #f0dfcf inset;
}

:deep(.el-pagination .el-select__wrapper:hover),
:deep(.el-pagination .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #ffc58f inset;
}

:deep(.el-empty__description p) {
  color: #a18b7b;
}

:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
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

@media (width <= 768px) {
  .recommend-page {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-wrap {
    width: 100%;
  }

  .type-select {
    flex: 1;
    width: auto;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }

  :deep(.el-card__header) {
    padding: 18px 18px 12px;
  }

  :deep(.el-card__body) {
    padding: 8px 18px 18px;
  }
}
</style>
