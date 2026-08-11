<template>
  <div class="data-table-wrapper">
    <div class="table-header">
      <span class="table-label">
        <el-icon><Grid /></el-icon>
        查询结果（共 {{ data.length }} 行）
      </span>
      <el-button text size="small" @click="exportCSV">
        <el-icon><Download /></el-icon> 导出 CSV
      </el-button>
    </div>

    <el-table
      :data="pagedData"
      border
      stripe
      size="small"
      max-height="400"
      style="width: 100%"
      :header-cell-style="{ background: '#f5f7fa', fontWeight: 600 }"
    >
      <el-table-column
        v-for="col in columns"
        :key="col"
        :prop="col"
        :label="col"
        :min-width="calcColumnWidth(col)"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span :class="getValueClass(row[col])">{{ formatValue(row[col]) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div v-if="data.length > pageSize" class="table-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="data.length"
        layout="total, prev, pager, next"
        small
        background
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  columns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
});

const pageSize = 20;
const currentPage = ref(1);

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return props.data.slice(start, start + pageSize);
});

function calcColumnWidth(col) {
  const len = col.length;
  if (len > 20) return 200;
  if (len > 10) return 150;
  return 120;
}

function formatValue(val) {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    // 数字格式化：千分位
    if (Number.isInteger(val) && Math.abs(val) >= 1000) {
      return val.toLocaleString();
    }
    if (!Number.isInteger(val)) {
      return parseFloat(val.toFixed(2)).toLocaleString();
    }
  }
  return String(val);
}

function getValueClass(val) {
  if (val === null || val === undefined) return 'null-value';
  if (typeof val === 'number') return 'number-value';
  return '';
}

function exportCSV() {
  if (!props.columns.length || !props.data.length) {
    ElMessage.warning('没有可导出的数据');
    return;
  }

  const header = props.columns.join(',');
  const rows = props.data.map((row) =>
    props.columns
      .map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // CSV 中含逗号/引号/换行的字段需要用双引号包裹
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      })
      .join(','),
  );

  const csv = '\uFEFF' + header + '\n' + rows.join('\n'); // BOM for Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `data_export_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  ElMessage.success('导出成功');
}
</script>

<style scoped lang="scss">
.data-table-wrapper {
  margin: 8px 0;

  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    color: #666;

    .table-label {
      display: flex;
      gap: 4px;
      align-items: center;
      font-weight: 500;
    }
  }

  .table-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .null-value {
    font-style: italic;
    color: #c0c4cc;
  }

  .number-value {
    font-variant-numeric: tabular-nums;
    color: #409eff;
  }
}
</style>
