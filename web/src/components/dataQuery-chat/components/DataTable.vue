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
        v-for="(col, idx) in columns"
        :key="col"
        :prop="col"
        :label="columnLabel(col, idx)"
        :min-width="calcColumnWidth(columnLabel(col, idx))"
        show-overflow-tooltip
      >
        <!-- 表头：中文展示名为主，悬停提示原始字段名（展示治理：取值仍按原始列名） -->
        <template #header>
          <span class="col-header" :title="String(col)">{{ columnLabel(col, idx) }}</span>
        </template>
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
  /** 与 columns 同序的中文展示名（后端展示治理下发；缺省/不齐回退原始列名） */
  displayColumns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
});

const pageSize = 20;
const currentPage = ref(1);

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return props.data.slice(start, start + pageSize);
});

/** 列的中文展示名：与 columns 同序对齐，缺失回退原始列名（展示层永不缺标签） */
function columnLabel(col, index) {
  const aligned =
    Array.isArray(props.displayColumns) && props.displayColumns.length === props.columns.length;

  if (!aligned) return String(col ?? '');

  const label = props.displayColumns[index];
  const text = label == null ? '' : String(label).trim();

  return text || String(col ?? '');
}

function calcColumnWidth(label) {
  // 中文按双宽度估算（每字约 2 个半角宽）
  const visualLen = String(label ?? '').replace(/[一-鿿㐀-䶿]/g, '  ').length;
  if (visualLen > 20) return 200;
  if (visualLen > 10) return 150;
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

  // 导出表头同样使用中文展示名（与界面一致，便于直接使用）
  const header = props.columns
    .map((col, idx) => {
      const label = columnLabel(col, idx);
      // CSV 中含逗号/引号/换行的表头字段需要用双引号包裹
      return /[",\n]/.test(label) ? '"' + label.replace(/"/g, '""') + '"' : label;
    })
    .join(',');
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
