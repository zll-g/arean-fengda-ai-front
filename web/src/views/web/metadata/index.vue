<template>
  <div class="metadata-view">
    <!-- 顶部操作栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select
            v-model="selectedDsId"
            :placeholder="t('metadataManage.selectDatasource')"
            style="width: 200px"
            @change="handleDsChange"
          >
            <el-option v-for="ds in dsStore.list" :key="ds.id" :label="ds.name" :value="ds.id" />
          </el-select>

          <el-tag v-if="tables.length" type="info">
            {{ tables.length }} {{ t('metadataManage.tableUnit') }}
          </el-tag>
        </div>

        <div class="toolbar-right">
          <el-button type="primary" icon="Refresh" :loading="syncing" @click="handleSync">
            {{ syncing ? t('metadataManage.syncing') : t('metadataManage.syncAll') }}
          </el-button>

          <el-button icon="Check" @click="handleBatchSave">
            {{ t('metadataManage.saveSelection') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 表列表 -->
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="never" class="table-list-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('metadataManage.tableList') }}</span>

              <el-checkbox v-model="selectAll" @change="handleSelectAll">
                {{ t('metadataManage.selectAll') }}
              </el-checkbox>
            </div>
          </template>

          <el-input
            v-model="tableKeyword"
            :placeholder="t('metadataManage.searchTable')"
            prefix-icon="Search"
            clearable
            size="small"
            style="margin-bottom: 8px"
          />

          <el-scrollbar height="500px">
            <div
              v-for="table in filteredTables"
              :key="table.tableName"
              class="table-item"
              :class="{ active: activeTable === table.tableName }"
              @click="handleGetTableInfo(table)"
            >
              <el-checkbox
                :model-value="table.selected === 1"
                @change="(val: any) => handleTableSelect(table, val)"
                @click.stop
              />

              <div class="table-info">
                <div class="table-name">{{ table.tableName }}</div>

                <div class="table-comment">
                  {{ table.tableComment || t('metadataManage.noComment') }}
                  <span class="row-count">
                    · {{ table.rowCount || '?' }} {{ t('metadataManage.rowUnit') }}
                  </span>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </el-card>
      </el-col>

      <!-- 右侧：字段详情 -->
      <el-col :span="16">
        <el-card v-if="activeTableDetail" shadow="never">
          <template #header>
            <div class="card-header">
              <span>
                <strong>{{ activeTableDetail.tableName }}</strong>
                <span style="margin-left: 8px; color: #999">
                  {{ activeTableDetail.tableComment }}
                </span>
              </span>

              <el-button
                text
                size="small"
                icon="Refresh"
                @click="handleSyncTable(activeTableDetail.tableName)"
              >
                {{ t('metadataManage.refreshTable') }}
              </el-button>
            </div>
          </template>

          <el-table
            :data="activeTableDetail.columns"
            border
            stripe
            size="small"
            style="max-height: 780px; overflow-y: auto"
          >
            <el-table-column
              prop="columnName"
              :label="t('metadataManage.table.columnName')"
              min-width="140"
            />

            <el-table-column
              prop="columnType"
              :label="t('metadataManage.table.columnType')"
              width="120"
            />

            <el-table-column
              prop="columnComment"
              :label="t('metadataManage.table.columnComment')"
              min-width="160"
              show-overflow-tooltip
            />

            <el-table-column
              :label="t('metadataManage.table.primaryKey')"
              width="90"
              align="center"
            >
              <template #default="{ row }">
                <el-icon v-if="row.isPrimaryKey" color="#e6a23c"><Key /></el-icon>
              </template>
            </el-table-column>

            <el-table-column :label="t('metadataManage.table.nullable')" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isNullable ? 'info' : 'warning'" size="small">
                  {{ row.isNullable ? 'YES' : 'NO' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column :label="t('metadataManage.table.sampleValue')" min-width="200">
              <template #default="{ row }">
                <div class="sample-values">
                  <el-tag
                    v-for="(val, idx) in (row.sampleValues || []).slice(0, 3)"
                    :key="idx"
                    size="small"
                    type="info"
                    effect="plain"
                  >
                    {{ val }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-empty v-else :description="t('metadataManage.emptySelectTable')" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Key } from '@element-plus/icons-vue';
import { useDatasourceStore } from '@/store/datasource';
import api from '@/api';

const { t } = useI18n();

const route = useRoute();
const dsStore = useDatasourceStore();

const selectedDsId = ref(null as any);
const tables = ref([] as any[]);
const activeTable = ref(null as any);
const tableKeyword = ref('');
const syncing = ref(false);
const selectAll = ref(false);

// 初始化
onMounted(() => {
  const dsId = route.params.datasourceId;

  selectedDsId.value = dsId ? Number(dsId) : dsStore.currentId;

  if (selectedDsId.value) {
    fetchTables();
  }
});

// 过滤表
const filteredTables = computed(() => {
  if (!tableKeyword.value) return tables.value;

  const kw = tableKeyword.value.toLowerCase();

  return tables.value.filter(
    (table) =>
      table.tableName.toLowerCase().includes(kw) ||
      (table.tableComment || '').toLowerCase().includes(kw),
  );
});

// 当前选中表的详情
const activeTableDetail = ref(null as any);

async function handleDsChange(id: string) {
  selectedDsId.value = id;
  activeTable.value = null;

  await fetchTables();
}

async function fetchTables() {
  if (!selectedDsId.value) return;

  const res = await api.metadata.getTableList(selectedDsId.value);

  tables.value = res.data || [];
  selectAll.value = tables.value.length > 0 && tables.value.every((table) => table.selected === 1);
}

async function handleGetTableInfo(table: { datasourceId: string; tableName: string }) {
  api.metadata.getTablesInfo(table.datasourceId, table.tableName).then((res) => {
    activeTableDetail.value = res.data;
  });
}
async function handleSync() {
  if (!selectedDsId.value) {
    ElMessage.warning(t('metadataManage.message.selectDatasourceFirst'));
    return;
  }

  syncing.value = true;

  try {
    const res = await api.metadata.syncAll(selectedDsId.value);
    const result = res.data;

    if (result.success) {
      ElMessage.success(
        t('metadataManage.message.syncSuccess', {
          tableCount: result.tableCount,
          columnCount: result.columnCount,
          costMs: result.costMs,
        }),
      );

      await fetchTables();
    } else {
      ElMessage.error(
        t('metadataManage.message.syncFailed', {
          message: result.errorMsg,
        }),
      );
    }
  } finally {
    syncing.value = false;
  }
}

async function handleSyncTable(tableName: string) {
  await api.metadata.syncTable(selectedDsId.value, tableName);

  ElMessage.success(
    t('metadataManage.message.tableRefreshSuccess', {
      tableName,
    }),
  );

  await fetchTables();
}

function handleTableSelect(table: any, val: number) {
  table.selected = val ? 1 : 0;
  selectAll.value = tables.value.length > 0 && tables.value.every((item) => item.selected === 1);
}

function handleSelectAll(val: number) {
  tables.value.forEach((table) => {
    table.selected = val ? 1 : 0;
  });
}

async function handleBatchSave() {
  const selectedNames = tables.value
    .filter((table) => table.selected === 1)
    .map((table) => table.tableName);

  await api.metadata.batchUpdateSelected(selectedDsId.value, selectedNames);

  ElMessage.success(
    t('metadataManage.message.saveSuccess', {
      count: selectedNames.length,
    }),
  );
}
</script>

<style scoped lang="scss">
.metadata-view {
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

    /* 数据源选择器 */
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

    /* 表数量标签 */
    :deep(.el-tag--info) {
      color: #e86f0b;
      background: #fff4e9;
      border-color: #ffd3aa;
      border-radius: 999px;
    }

    /* 同步按钮 */
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

    /* 保存选择按钮 */
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
  }

  /* 卡片 */
  :deep(.el-card) {
    background: #fff;
    border: 1px solid #f0dfcf;
    border-radius: 16px;
    box-shadow: 0 6px 20px rgb(126 72 24 / 5%);
  }

  :deep(.el-card__header) {
    padding: 16px 18px;
    background: linear-gradient(180deg, #fffaf5 0%, #fff 100%);
    border-bottom: 1px solid #f3e4d6;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }

  .card-header {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    font-size: 15px;
    font-weight: 700;
    color: #4a382c;

    > span:first-child {
      position: relative;
      padding-left: 12px;

      &::before {
        position: absolute;
        top: 50%;
        left: 0;
        width: 3px;
        height: 15px;
        content: '';
        background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
        border-radius: 999px;
        transform: translateY(-50%);
      }
    }

    :deep(.el-checkbox__label) {
      font-size: 13px;
      font-weight: 500;
      color: #806b5b;
    }

    :deep(.el-button.is-text) {
      color: #f97316;
      border-radius: 8px;

      &:hover {
        color: #e9680a;
        background: #fff0e2;
      }
    }
  }

  /* 表列表卡片 */
  .table-list-card {
    overflow: hidden;

    /* 搜索框 */
    :deep(.el-input__wrapper) {
      min-height: 36px;
      background: #fff7ef;
      border-radius: 9px;
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
          0 0 0 3px rgb(255 138 38 / 8%);
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

    .table-item {
      position: relative;
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 10px 8px;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 9px;
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;

      &:hover {
        background: #fff7ef;
        border-color: #ffe0c2;
        box-shadow: 0 4px 12px rgb(249 115 22 / 6%);
        transform: translateY(-1px);
      }

      &.active {
        background: linear-gradient(135deg, #fff0e2 0%, #fff8f1 100%);
        border-color: #ffc58f;
        box-shadow:
          inset 3px 0 0 #ff8a26,
          0 6px 16px rgb(249 115 22 / 8%);

        .table-name {
          font-weight: 700;
          color: #d95f06;
        }

        .table-comment {
          color: #b47d52;
        }
      }

      .table-info {
        flex: 1;
        min-width: 0;

        .table-name {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
          font-weight: 600;
          color: #4a382c;
          white-space: nowrap;
          transition: color 0.2s ease;
        }

        .table-comment {
          margin-top: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          color: #a18b7b;
          white-space: nowrap;
          transition: color 0.2s ease;

          .row-count {
            color: #c2a794;
          }
        }
      }
    }
  }

  /* Checkbox */
  :deep(.el-checkbox__inner) {
    border-color: #d9b797;
    border-radius: 4px;
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease;

    &:hover {
      border-color: #ff8a26;
    }
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
  :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
    background: #ff8a26;
    border-color: #ff8a26;
    box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
  }

  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #e86f0b;
  }

  /* 左侧滚动条 */
  :deep(.el-scrollbar__thumb) {
    background: #e7b889;

    &:hover {
      background: #d99a5d;
    }
  }

  /* 右侧详情卡片标题 */
  :deep(.el-card:not(.toolbar-card) .el-card__header strong) {
    color: #4a382c;
  }

  /* 字段详情表格 */
  :deep(.el-table) {
    color: #5b4738;
    background: #fff;
    border-radius: 12px;
  }

  :deep(.el-table th.el-table__cell) {
    height: 44px;
    font-weight: 700;
    color: #806b5b;
    background: linear-gradient(180deg, #fff7ef 0%, #fffaf5 100%);
    border-color: #f0dfcf;
  }

  :deep(.el-table td.el-table__cell) {
    height: 42px;
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

  /* 主键图标 */
  :deep(.el-table .el-icon) {
    color: #f59e0b;
  }

  /* 状态标签 */
  :deep(.el-tag) {
    font-weight: 600;
    border-radius: 8px;
  }

  :deep(.el-tag--info) {
    color: #c25f05;
    background: #fff7ed;
    border-color: #fed7aa;
  }

  :deep(.el-tag--warning) {
    color: #e86f0b;
    background: #fff4e9;
    border-color: #ffd3aa;
  }

  /* 示例值 */
  .sample-values {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    :deep(.el-tag) {
      color: #b85b0a;
      background: #fff8f1;
      border-color: #ffd8b5;
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
  @media (width <= 1000px) {
    .toolbar {
      flex-direction: column;
      align-items: stretch;

      .toolbar-left,
      .toolbar-right {
        flex-wrap: wrap;
      }

      .toolbar-right {
        justify-content: flex-end;
      }
    }
  }

  @media (width <= 768px) {
    padding: 12px;

    .toolbar {
      .toolbar-left,
      .toolbar-right {
        width: 100%;
      }

      .toolbar-left {
        :deep(.el-select) {
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

    :deep(.el-row) {
      margin-right: 0 !important;
      margin-left: 0 !important;
    }

    :deep(.el-col) {
      flex: 0 0 100%;
      width: 100%;
      max-width: 100%;
      margin-bottom: 16px;
    }
  }
}
</style>
