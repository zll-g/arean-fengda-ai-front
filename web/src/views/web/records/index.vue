<template>
  <div class="record-list-page">
    <!-- 搜索过滤 -->
    <div class="filter-bar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索表单编号或标题..."
        :prefix-icon="Search"
        clearable
        class="filter-input"
        @input="handleSearch"
        @clear="handleSearch"
      />
      <div class="filter-row">
        <el-select v-model="query.templateId" placeholder="全部模板" clearable @change="loadData">
          <el-option v-for="t in templates" :key="t.id" :label="t.templateName" :value="t.id" />
        </el-select>
        <el-select v-model="query.status" placeholder="全部状态" clearable @change="loadData">
          <el-option label="草稿" value="draft" />
          <el-option label="已确认" value="confirmed" />
          <el-option label="已提交" value="submitted" />
        </el-select>
      </div>
    </div>

    <!-- 列表 -->
    <div v-loading="loading" class="record-list">
      <!-- 桌面端表格 -->
      <el-table
        v-if="!isMobile"
        :data="records"
        stripe
        class="record-table"
        row-class-name="clickable-row"
        @row-click="handleRowClick"
      >
        <el-table-column label="表单编号" prop="formNo" width="180">
          <template #default="{ row }">
            <span class="form-no-link">{{ row.formNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="模板" prop="templateName" width="160" />
        <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" prop="statusLabel" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" round>
              {{ row.statusLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" prop="source" width="80">
          <template #default="{ row }">
            <el-icon v-if="row.source === 'voice'" color="#6366f1"><Microphone /></el-icon>
            <el-icon v-else-if="row.source === 'inherit'" color="#10b981"><CopyDocument /></el-icon>
            <el-icon v-else color="#9ca3af"><Edit /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click.stop="handleView(row)">
              查看
            </el-button>
            <el-button
              text
              type="danger"
              size="small"
              :disabled="row.status === 'submitted'"
              @click.stop="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 移动端卡片列表 -->
      <div v-else class="mobile-card-list">
        <div
          v-for="record in records"
          :key="record.id"
          class="mobile-record-card"
          @click="handleView(record)"
        >
          <div class="card-top-row">
            <span class="card-form-no">{{ record.formNo }}</span>
            <el-tag :type="getStatusType(record.status)" size="small" round>
              {{ record.statusLabel }}
            </el-tag>
          </div>
          <h4 class="card-title">{{ record.title || record.templateName }}</h4>
          <div class="card-bottom-row">
            <span class="card-template">
              <el-icon><Document /></el-icon> {{ record.templateName }}
            </span>
            <span class="card-time">{{ formatDate(record.updatedAt) }}</span>
          </div>
          <div class="card-source">
            <!-- <el-icon v-if="record.source === 'voice'"><Microphone /></el-icon>
            <span v-if="record.source === 'voice'">语音填单</span>
            <el-icon v-else-if="record.source === 'inherit'"><CopyDocument /></el-icon>
            <span v-else-if="record.source === 'inherit'">继承创建</span>
            <el-icon v-else><Edit /></el-icon>
            <span>手动填写</span> -->

            <template v-if="record.source === 'voice'">
              <el-icon><Microphone /></el-icon>
              <span>语音填单</span>
            </template>

            <template v-else-if="record.source === 'inherit'">
              <el-icon><CopyDocument /></el-icon>
              <span>继承创建</span>
            </template>

            <template v-else>
              <el-icon><Edit /></el-icon>
              <span>手动填写</span>
            </template>
          </div>
        </div>

        <el-empty v-if="records.length === 0 && !loading" description="暂无填单记录" />
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          :small="isMobile"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
import { useDebounceFn, useMediaQuery } from '@vueuse/core';
import { ElMessage, ElMessageBox } from 'element-plus';

import type { FormData as FormDataType, Template } from '@/types';
import api from '@/api';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';

const router = useRouter();
const isMobile = useMediaQuery('(max-width: 768px)');

const loading = ref(false);
const records = ref<FormDataType[]>([]);
const templates = ref<Template[]>([]);
const total = ref(0);

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  templateId: null as number | null,
  status: '',
  keyword: '',
});

const handleSearch = useDebounceFn(() => {
  query.pageNum = 1;
  loadData();
}, 300);

async function loadData() {
  loading.value = true;
  try {
    const res = await api.records.getFormPage(query as any);
    records.value = res.data?.records || [];
    total.value = res.data?.total || 0;
  } finally {
    loading.value = false;
  }
}

async function loadTemplates() {
  const res = await api.form.getFormList();
  templates.value = res.data || [];
}

function handleRowClick(row: FormDataType) {
  handleView(row);
}

function handleView(row: FormDataType) {
  router.push(`/web/form-data/${row.id}`);
}

async function handleDelete(row: FormDataType) {
  await ElMessageBox.confirm('确定删除此表单？', '删除', { type: 'warning' });
  await api.records.deleteForm(row.id);
  ElMessage.success('已删除');
  loadData();
}

function getStatusType(status: string) {
  switch (status) {
    case 'draft':
      return 'warning';
    case 'confirmed':
      return 'success';
    case 'submitted':
      return 'info';
    default:
      return 'info';
  }
}

function formatDate(d: string) {
  return d ? dayjs(d).format('MM-DD HH:mm') : '-';
}

onMounted(() => {
  loadData();
  loadTemplates();
});
</script>

<style lang="scss" scoped>
.record-list-page {
  width: 100%;
  height: 100%;
  padding: 4px;
  margin: 0 auto;
  overflow-y: auto;
  color: #4a382c;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 8%), transparent 30%),
    linear-gradient(180deg, #fffaf5 0%, #fff 260px);

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

/* 搜索过滤区 */
.filter-bar {
  position: sticky;
  top: 0;
  z-index: 9;
  padding: 20px 24px;
  margin-bottom: 22px;
  background:
    radial-gradient(circle at top left, rgb(255 138 38 / 10%), transparent 34%),
    radial-gradient(circle at bottom right, rgb(249 115 22 / 6%), transparent 30%),
    linear-gradient(135deg, rgb(255 255 255 / 97%), rgb(255 250 245 / 95%));
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 16px 40px rgb(126 72 24 / 8%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
  backdrop-filter: blur(10px);

  .filter-input {
    margin-bottom: 14px;

    :deep(.el-input__wrapper) {
      min-height: 44px;
      background: rgb(255 255 255 / 96%);
      border-radius: 14px;
      box-shadow: 0 0 0 1px #f0dfcf inset;
      transition:
        background 0.22s ease,
        box-shadow 0.22s ease;
    }

    :deep(.el-input__wrapper:hover) {
      background: #fffaf5;
      box-shadow: 0 0 0 1px #ffc58f inset;
    }

    :deep(.el-input__wrapper.is-focus) {
      background: #fff;
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 10%);
    }

    :deep(.el-input__inner) {
      font-size: 14px;
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
  }

  .filter-row {
    display: flex;
    gap: 12px;

    :deep(.el-select) {
      min-width: 180px;
    }

    :deep(.el-select__wrapper) {
      min-height: 38px;
      background: #fff;
      border-radius: 13px;
      box-shadow: 0 0 0 1px #f0dfcf inset;
      transition:
        background 0.22s ease,
        box-shadow 0.22s ease;
    }

    :deep(.el-select__wrapper:hover) {
      background: #fffaf5;
      box-shadow: 0 0 0 1px #ffc58f inset;
    }

    :deep(.el-select__wrapper.is-focused) {
      background: #fff;
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 9%);
    }

    :deep(.el-select__selected-item) {
      color: #5b4738;
    }

    :deep(.el-select__placeholder) {
      color: #b09b8c;
    }

    @media (width <= 768px) {
      flex-direction: column;

      :deep(.el-select) {
        width: 100%;
        min-width: 0;
      }
    }
  }
}

/* 列表容器 */
.record-list {
  padding: 22px 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at bottom left, rgb(255 138 38 / 5%), transparent 36%),
    linear-gradient(180deg, #fff 0%, #fffaf5 100%);
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 16px 42px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;

  @media (width <= 768px) {
    padding: 16px;
    border-radius: 18px;
  }
}

/* 桌面端表格 */
.record-table {
  overflow: hidden;
  border: 1px solid #f1e1d2;
  border-radius: 18px;
  box-shadow: 0 6px 20px rgb(126 72 24 / 4%);

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  :deep(.el-table .el-icon) {
    color: #f97316 !important;
  }

  :deep(.el-table__header-wrapper th) {
    height: 48px;
    font-size: 13px;
    font-weight: 700;
    color: #806b5b;
    background:
      radial-gradient(circle at top right, rgb(255 138 38 / 6%), transparent 30%),
      linear-gradient(180deg, #fff7ef 0%, #fffaf5 100%);
    border-bottom: 1px solid #f0dfcf;
  }

  :deep(.el-table__row) {
    transition: background-color 0.22s ease;
  }

  :deep(.el-table__body td) {
    height: 54px;
    font-size: 13px;
    color: #5b4738;
    border-bottom: 1px solid #f3e4d6;
  }

  :deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
    background: #fffdf9;
  }

  :deep(.clickable-row) {
    cursor: pointer;

    &:hover > td.el-table__cell {
      background: #fff4e9 !important;
    }
  }

  :deep(.el-tag) {
    font-weight: 700;
    border-radius: 999px;
  }

  :deep(.el-tag--warning) {
    color: #d97706;
    background: #fff7ed;
    border-color: #fed7aa;
  }

  :deep(.el-tag--success) {
    color: #15803d;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  :deep(.el-tag--info) {
    color: #c25f05;
    background: #fff4e9;
    border-color: #ffd3aa;
  }

  :deep(.el-button) {
    font-weight: 600;
    border-radius: 10px;
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

  .form-no-link {
    display: inline-flex;
    align-items: center;
    padding: 4px 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    font-weight: 700;
    color: #d95f06;
    background: #fff0e2;
    border: 1px solid #ffd3aa;
    border-radius: 999px;
  }
}

/* 移动端卡片 */
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mobile-record-card {
  position: relative;
  padding: 16px;
  overflow: hidden;
  cursor: pointer;
  background:
    radial-gradient(circle at top right, rgb(255 138 38 / 7%), transparent 32%),
    linear-gradient(135deg, #fff 0%, #fffaf5 100%);
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow: 0 10px 26px rgb(126 72 24 / 6%);
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    content: '';
    background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
    opacity: 0;
    transition: opacity 0.22s ease;
  }

  &:active {
    transform: scale(0.985);
  }

  &:hover {
    border-color: #ffc58f;
    box-shadow: 0 16px 34px rgb(249 115 22 / 11%);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }
  }

  .card-top-row {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;

    .card-form-no {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      padding: 4px 9px;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      color: #d95f06;
      white-space: nowrap;
      background: #fff0e2;
      border: 1px solid #ffd3aa;
      border-radius: 999px;
    }

    :deep(.el-tag) {
      flex-shrink: 0;
      font-weight: 700;
      border-radius: 999px;
    }

    :deep(.el-tag--warning) {
      color: #d97706;
      background: #fff7ed;
      border-color: #fed7aa;
    }

    :deep(.el-tag--success) {
      color: #15803d;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    :deep(.el-tag--info) {
      color: #c25f05;
      background: #fff4e9;
      border-color: #ffd3aa;
    }
  }

  .card-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.45;
    color: #4a382c;
    letter-spacing: -0.01em;
  }

  .card-bottom-row {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .card-template,
    .card-time {
      display: inline-flex;
      gap: 5px;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: #8d7868;
    }

    .card-template {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      .el-icon {
        flex-shrink: 0;
        color: #f97316;
      }
    }

    .card-time {
      flex-shrink: 0;
      color: #b09b8c;
    }
  }

  .card-source {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    padding: 5px 9px;
    font-size: 12px;
    font-weight: 600;
    color: #806b5b;
    background: #fff3e7;
    border: 1px solid #ffe0c2;
    border-radius: 999px;

    .el-icon {
      color: #f97316;
    }
  }
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 18px;
  margin-top: 22px;
  border-top: 1px solid #f0dfcf;

  :deep(.el-pagination.is-background .el-pager li),
  :deep(.el-pagination.is-background button) {
    font-weight: 600;
    color: #806b5b;
    background: #fff7ef;
    border: 1px solid #f0dfcf;
    border-radius: 10px;
    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  :deep(.el-pagination.is-background .el-pager li:hover),
  :deep(.el-pagination.is-background button:hover) {
    color: #f97316;
    background: #fff0e2;
    border-color: #ffc58f;
    transform: translateY(-1px);
  }

  :deep(.el-pagination.is-background .el-pager li.is-active) {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    border-color: #ff8a26;
    box-shadow: 0 8px 16px rgb(249 115 22 / 22%);
  }

  :deep(.el-pagination__total),
  :deep(.el-pagination__sizes) {
    font-weight: 600;
    color: #8d7868;
  }

  :deep(.el-select__wrapper),
  :deep(.el-input__wrapper) {
    background: #fffaf5;
    border-radius: 8px;
    box-shadow: 0 0 0 1px #f0dfcf inset;

    &:hover {
      box-shadow: 0 0 0 1px #ffc58f inset;
    }

    &.is-focused,
    &.is-focus {
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 3px rgb(255 138 38 / 8%);
    }
  }
}

/* 空状态 */
:deep(.el-empty) {
  padding: 42px 0;
  margin-top: 28px;
  background: rgb(255 250 245 / 76%);
  border: 1px dashed #e8c6a8;
  border-radius: 20px;
}

:deep(.el-empty__description p) {
  color: #a18b7b;
}

/* 下拉控件 */
:deep(.el-select-dropdown__item) {
  font-weight: 600;
}

/* Loading */
:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 移动端细节 */
@media (width <= 768px) {
  .record-list-page {
    padding: 0;
  }

  .filter-bar {
    position: static;
    padding: 16px;
    border-radius: 18px;
  }

  .pagination-wrapper {
    justify-content: flex-start;
    padding-bottom: 4px;
    overflow-x: auto;
  }

  .mobile-record-card {
    border-radius: 16px;

    .card-bottom-row {
      flex-direction: column;
      gap: 6px;
      align-items: flex-start;
    }
  }
}
</style>
