<template>
  <div class="datasource-view">
    <!-- 操作栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          :placeholder="t('datasourceManage.searchPlaceholder')"
          prefix-icon="Search"
          clearable
          style="width: 280px"
          @input="fetchList"
        />

        <el-button type="primary" icon="Plus" @click="openDialog()">
          {{ t('datasourceManage.createDatasource') }}
        </el-button>
      </div>
    </el-card>

    <!-- 数据源卡片列表 -->
    <el-row :gutter="16" class="card-grid">
      <el-col v-for="ds in list" :key="ds.id" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card shadow="hover" class="ds-card" :body-style="{ padding: '20px' }">
          <div class="ds-card-header">
            <div class="ds-icon" :class="ds.status === 1 ? 'active' : 'inactive'">
              <el-icon :size="24"><Coin /></el-icon>
            </div>

            <div class="ds-info">
              <h3>{{ ds.name }}</h3>
              <p>{{ ds.dbType }} · {{ ds.host }}:{{ ds.port }}</p>
            </div>

            <el-button
              class="refresh-button"
              text
              type="primary"
              circle
              :icon="Refresh"
              title="刷新"
              aria-label="刷新"
              @click.stop="refreshData(ds.id)"
            />
          </div>

          <div class="ds-card-body">
            <div class="ds-detail">
              <span>{{ t('datasourceManage.database') }}:</span>
              <span>{{ ds.dbName }}</span>
            </div>

            <div class="ds-detail">
              <span>{{ t('datasourceManage.status') }}:</span>
              <el-tag :type="ds.status === 1 ? 'success' : 'danger'" size="small">
                {{
                  ds.status === 1 ? t('datasourceManage.enabled') : t('datasourceManage.disabled')
                }}
              </el-tag>
            </div>

            <div class="ds-detail">
              <span>{{ t('datasourceManage.lastTest') }}:</span>

              <el-tag v-if="ds.lastTestResult === 1" type="success" size="small">
                {{ t('datasourceManage.success') }}
              </el-tag>

              <el-tag v-else-if="ds.lastTestResult === 0" type="danger" size="small">
                {{ t('datasourceManage.failed') }}
              </el-tag>

              <span v-else style="color: #999">
                {{ t('datasourceManage.untested') }}
              </span>
            </div>
          </div>

          <div class="ds-card-footer">
            <el-button text type="primary" size="small" @click="testConnection(ds)">
              {{ t('datasourceManage.testConnection') }}
            </el-button>

            <el-button text type="primary" size="small" @click="openDialog(ds)">
              {{ t('datasourceManage.edit') }}
            </el-button>

            <el-button
              text
              type="primary"
              size="small"
              :class="{ 'is-building': ds.dbType !== 'mysql' && isBuilding(ds.id) }"
              :disabled="ds.dbType !== 'mysql' && isBuilding(ds.id)"
              @click="hanldeDbtype(ds)"
            >
              {{
                ds.dbType === 'mysql'
                  ? t('datasourceManage.manageTables')
                  : isBuilding(ds.id)
                    ? t('datasourceManage.underConstruction')
                    : t('datasourceManage.buildingIndex')
              }}
            </el-button>

            <el-popconfirm
              :title="t('datasourceManage.deleteConfirm')"
              :confirm-button-text="t('datasourceManage.confirm')"
              :cancel-button-text="t('datasourceManage.cancel')"
              @confirm="handleDelete(ds.id)"
            >
              <template #reference>
                <el-button text type="danger" size="small">
                  {{ t('datasourceManage.delete') }}
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="
        editingDs ? t('datasourceManage.editDatasource') : t('datasourceManage.createDatasource')
      "
      width="600px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item :label="t('datasourceManage.form.name')" prop="name">
          <el-input v-model="form.name" :placeholder="t('datasourceManage.form.namePlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('datasourceManage.form.dbType')" prop="dbType">
          <el-select v-model="form.dbType" style="width: 100%" @change="handleDbTypeChange">
            <el-option label="MySQL" value="mysql" />
            <el-option label="TDengine" value="tdengine" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('datasourceManage.form.host')" prop="host">
          <el-input v-model="form.host" :placeholder="t('datasourceManage.form.hostPlaceholder')" />
        </el-form-item>

        <el-form-item :label="t('datasourceManage.form.port')" prop="port">
          <el-input-number v-model="form.port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>

        <el-form-item :label="t('datasourceManage.form.dbName')" prop="dbName">
          <el-input
            v-model="form.dbName"
            :placeholder="t('datasourceManage.form.dbNamePlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('datasourceManage.form.username')" prop="username">
          <el-input
            v-model="form.username"
            :placeholder="t('datasourceManage.form.usernamePlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('datasourceManage.form.password')" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="
              editingDs
                ? t('datasourceManage.form.passwordEditPlaceholder')
                : t('datasourceManage.form.passwordPlaceholder')
            "
          />
        </el-form-item>

        <el-form-item
          label-width="110px"
          :label="t('datasourceManage.form.connectTimeout')"
          prop="connectTimeout"
        >
          <el-input-number v-model="form.connectTimeout" :min="5" :max="180" style="width: 100%" />
        </el-form-item>

        <el-form-item :label="t('datasourceManage.form.description')">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            :placeholder="t('datasourceManage.form.descriptionPlaceholder')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">
          {{ t('datasourceManage.cancel') }}
        </el-button>

        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ t('datasourceManage.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Coin, Refresh } from '@element-plus/icons-vue';
import api from '@/api';
import { useDatasourceStore } from '@/store/datasource';

const { t } = useI18n();

const router = useRouter();
const dsStore = useDatasourceStore();

const keyword = ref('');
const list = ref([] as any[]);
const dialogVisible = ref(false);
const editingDs = ref(null as any);
const submitLoading = ref(false);
const formRef = ref(null as any);

/**
 * 所有正在构建索引的数据源 ID
 * 支持多个数据源同时构建
 */
const buildingIds = reactive(new Set<string>());

/**
 * 每个数据源独立保存自己的轮询定时器
 * key: ds.id
 * value: timer
 */
const rebuildTimers = new Map<string, ReturnType<typeof setInterval>>();

const form = ref({
  name: '',
  dbType: 'mysql',
  host: 'localhost',
  port: 3306,
  dbName: '',
  username: '',
  connectTimeout: 120,
  password: '',
  description: '',
});

const rules = computed(() => {
  return {
    name: [{ required: true, message: t('datasourceManage.validate.name'), trigger: 'blur' }],
    dbType: [{ required: true, message: t('datasourceManage.validate.dbType'), trigger: 'change' }],
    host: [{ required: true, message: t('datasourceManage.validate.host'), trigger: 'blur' }],
    port: [{ required: true, message: t('datasourceManage.validate.port'), trigger: 'blur' }],
    dbName: [{ required: true, message: t('datasourceManage.validate.dbName'), trigger: 'blur' }],
    username: [
      { required: true, message: t('datasourceManage.validate.username'), trigger: 'blur' },
    ],
  };
});

/**
 * 判断指定数据源是否正在构建
 */
function isBuilding(id: string) {
  return buildingIds.has(id);
}

/**
 * 停止指定数据源的轮询
 */
function stopRebuildPolling(id: string) {
  const timer = rebuildTimers.get(id);

  if (timer) {
    clearInterval(timer);
    rebuildTimers.delete(id);
  }
}

/**
 * 停止全部数据源轮询
 */
function stopAllRebuildPolling() {
  rebuildTimers.forEach((timer) => {
    clearInterval(timer);
  });

  rebuildTimers.clear();
  buildingIds.clear();
}

/**
 * 开始指定数据源的独立轮询
 */
function startRebuildPolling(id: string) {
  // 防止同一个数据源重复创建定时器
  if (rebuildTimers.has(id)) return;

  const timer = setInterval(async () => {
    try {
      const res = await api.datasource.getrebuildStatus(id);

      // 有值表示当前数据源构建完成
      if (res.data) {
        buildingIds.delete(id);
        stopRebuildPolling(id);
      }
    } catch (error) {
      console.error(`获取数据源 ${id} 索引构建状态失败：`, error);
    }
  }, 2000);

  rebuildTimers.set(id, timer);
}

/**
 * MySQL 跳转管理表
 * 非 MySQL 构建索引
 */
async function hanldeDbtype(ds: any) {
  if (ds.dbType === 'mysql') {
    router.push(`/web/dataQuery-management/metadata/${ds.id}`);
    return;
  }

  // 当前数据源正在构建时，禁止重复请求
  // 只影响当前 ds，不影响其他数据源
  if (isBuilding(ds.id)) return;

  try {
    const res = await api.datasource.rebuildIndex(ds.id);

    if (res.data) {
      buildingIds.add(ds.id);

      startRebuildPolling(ds.id);
    }
  } catch (error) {
    console.error(`数据源 ${ds.id} 构建索引失败：`, error);
  }
}

onMounted(() => {
  fetchList();
  dsStore.fetchList();
});

/**
 * 离开页面时清除全部轮询
 */
onBeforeUnmount(() => {
  stopAllRebuildPolling();
});

async function fetchList() {
  const res = await api.datasource.getDatasourceList({
    keyword: keyword.value,
  });

  list.value = res.data || [];
}

async function refreshData(id: string) {
  api.datasource.refreshDataSource(id).then(() => {
    ElMessage.success('刷新成功');
  });
}

function openDialog(ds = null as any) {
  editingDs.value = ds;

  if (ds) {
    form.value = {
      ...ds,
      password: '',
    };
  } else {
    form.value = {
      name: '',
      dbType: 'mysql',
      host: 'localhost',
      port: 3306,
      dbName: '',
      connectTimeout: 120,
      username: '',
      password: '',
      description: '',
    };
  }

  dialogVisible.value = true;
}

async function handleSubmit() {
  await formRef.value.validate();
  submitLoading.value = true;

  try {
    if (editingDs.value) {
      await api.datasource.update({
        id: editingDs.value.id,
        ...form.value,
      });

      ElMessage.success(t('datasourceManage.message.updateSuccess'));
    } else {
      await api.datasource.create(form.value);

      ElMessage.success(t('datasourceManage.message.createSuccess'));
    }

    dialogVisible.value = false;

    fetchList();
    await dsStore.fetchList();
  } finally {
    submitLoading.value = false;
  }
}

async function handleDelete(id: string) {
  // 如果当前数据源正在轮询，删除前先停止它自己的轮询
  stopRebuildPolling(id);
  buildingIds.delete(id);

  await api.datasource.removeDatasource(id);

  ElMessage.success(t('datasourceManage.message.deleteSuccess'));

  fetchList();
  await dsStore.fetchList();
}

async function testConnection(ds: any) {
  const loading = ElMessage({
    message: t('datasourceManage.message.testing'),
    type: 'info',
    duration: 0,
  });

  try {
    const res = await api.datasource.testConnection({
      id: ds.id,
    });

    loading.close();

    if (res.data.success) {
      ElMessage.success(
        t('datasourceManage.message.connectionSuccess', {
          version: res.data.dbVersion,
          cost: res.data.costMs,
        }),
      );
    } else {
      ElMessage.error(
        t('datasourceManage.message.connectionFailed', {
          message: res.data.errorMsg,
        }),
      );
    }

    fetchList();
  } catch (e) {
    console.log(e);
    loading.close();
  }
}

function handleDbTypeChange(val: string) {
  if (val === 'mysql') form.value.port = 3306;
  else if (val === 'postgresql') form.value.port = 5432;
  else if (val === 'clickhouse') form.value.port = 8123;
  else if (val === 'trino') form.value.port = 8080;
}
</script>

<style scoped lang="scss">
.datasource-view {
  height: 100%;
  color: #4a382c;
  background:
    radial-gradient(circle at 92% 0%, rgb(255 138 38 / 7%) 0%, transparent 26%),
    linear-gradient(180deg, #fffaf5 0%, #fff 220px);

  /* 顶部操作栏 */
  .toolbar-card {
    margin-bottom: 16px;
    overflow: hidden;
    background: rgb(255 255 255 / 96%);
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

    :deep(.el-input__wrapper) {
      min-height: 40px;
      background: #fffaf5;
      border-radius: 11px;
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

    :deep(.el-button--primary) {
      min-height: 40px;
      padding: 0 18px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      border-radius: 11px;
      box-shadow: 0 7px 16px rgb(249 115 22 / 20%);
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
        box-shadow: 0 9px 20px rgb(249 115 22 / 27%);
        transform: translateY(-1px);
      }

      &:active {
        box-shadow: 0 4px 12px rgb(249 115 22 / 16%);
        transform: translateY(0);
      }
    }
  }

  /* 卡片列表 */
  .card-grid {
    max-height: 900px;
    padding: 2px 2px 12px;
    margin-top: 0;
    overflow: hidden auto;
    scrollbar-color: #e7b889 transparent;
    scrollbar-width: thin;

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

  /* 数据源卡片 */
  .ds-card {
    position: relative;
    margin-bottom: 16px;
    overflow: hidden;
    background: rgb(255 255 255 / 97%);
    border: 1px solid #f0dfcf;
    border-radius: 16px;
    box-shadow:
      0 6px 18px rgb(126 72 24 / 5%),
      0 0 0 1px rgb(255 255 255 / 70%) inset;
    transition:
      background 0.25s ease,
      border-color 0.25s ease,
      box-shadow 0.25s ease,
      transform 0.25s ease;

    &::before {
      position: absolute;
      top: 0;
      right: 18px;
      left: 18px;
      height: 2px;
      content: '';
      background: linear-gradient(90deg, transparent, #ff9a3d, transparent);
      opacity: 0;
      transition: opacity 0.25s ease;
    }

    &:hover {
      background: #fffaf5;
      border-color: #ffc58f;
      box-shadow:
        0 14px 30px rgb(249 115 22 / 12%),
        0 0 0 1px rgb(255 138 38 / 5%);
      transform: translateY(-3px);

      &::before {
        opacity: 1;
      }

      .ds-icon {
        transform: translateY(-1px) scale(1.03);
      }
    }

    :deep(.el-card__body) {
      padding: 20px !important;
    }

    .ds-card-header {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;

      .ds-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        color: #fff;
        border-radius: 12px;
        transition:
          box-shadow 0.2s ease,
          transform 0.2s ease;

        &.active {
          background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
          box-shadow:
            0 8px 18px rgb(249 115 22 / 24%),
            0 0 0 4px rgb(255 138 38 / 7%);
        }

        &.inactive {
          color: #b57e50;
          background: linear-gradient(135deg, #fff0e2 0%, #f2dfcf 100%);
          border: 1px solid #ecd3bc;
          box-shadow: 0 6px 14px rgb(126 72 24 / 7%);
        }
      }

      .ds-info {
        flex: 1;
        min-width: 0;

        h3 {
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 16px;
          font-weight: 700;
          color: #4a382c;
          white-space: nowrap;
        }

        p {
          margin: 5px 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          color: #a18b7b;
          white-space: nowrap;
        }
      }

      .refresh-button {
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        color: #f97316;
        background: #fff3e7;
        border-radius: 10px;
        transition:
          color 0.2s ease,
          background 0.2s ease,
          box-shadow 0.2s ease,
          transform 0.2s ease;

        &:hover {
          color: #fff;
          background: #ff8a26;
          box-shadow: 0 6px 14px rgb(249 115 22 / 18%);
          transform: rotate(18deg);
        }
      }
    }

    .ds-card-body {
      padding: 12px 14px;
      background: #fffaf5;
      border: 1px solid #f3e4d6;
      border-radius: 12px;

      .ds-detail {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        min-height: 36px;
        padding: 6px 0;
        font-size: 13px;
        color: #806b5b;
        border-bottom: 1px dashed #efdcca;

        &:last-child {
          border-bottom: none;
        }

        > span:first-child {
          flex-shrink: 0;
          color: #9c8676;
        }

        > span:last-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
          color: #5b4738;
          white-space: nowrap;
        }
      }
    }

    .ds-card-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: space-between;
      padding-top: 12px;
      margin-top: 12px;
      border-top: 1px solid #f3e4d6;

      :deep(.el-button) {
        padding: 6px 8px;
        margin-left: 0;
        font-size: 12px;
        border-radius: 8px;
        transition:
          color 0.18s ease,
          background 0.18s ease,
          transform 0.18s ease;
      }

      :deep(.el-button--primary.is-text) {
        color: #e86f0b;

        &:hover {
          color: #d95f06;
          background: #fff0e2;
          transform: translateY(-1px);
        }
      }

      /* 构建中状态 */
      :deep(.el-button.is-building),
      :deep(.el-button.is-building.is-disabled) {
        font-weight: 600;
        color: #2563eb;
        cursor: not-allowed;
        background: rgb(37 99 235 / 8%);
        opacity: 1;

        &:hover {
          color: #2563eb;
          background: rgb(37 99 235 / 8%);
          transform: none;
        }
      }

      :deep(.el-button--danger.is-text) {
        color: #ef4444;

        &:hover {
          color: #dc2626;
          background: #fef2f2;
          transform: translateY(-1px);
        }
      }
    }
  }

  /* Element Plus 标签 */
  :deep(.el-tag) {
    font-weight: 600;
    border-radius: 999px;
  }

  :deep(.el-tag--success) {
    color: #15803d;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  :deep(.el-tag--danger) {
    color: #dc2626;
    background: #fef2f2;
    border-color: #fecaca;
  }

  /* 弹窗 */
  :deep(.el-dialog) {
    overflow: hidden;
    background: #fff;
    border: 1px solid #f0dfcf;
    border-radius: 18px;
    box-shadow: 0 24px 60px rgb(92 54 24 / 18%);
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
    top: 14px;
    right: 14px;
    width: 34px;
    height: 34px;
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
    padding: 22px 24px 10px;
  }

  :deep(.el-dialog__footer) {
    padding: 14px 22px 18px;
    background: #fffaf5;
    border-top: 1px solid #f3e4d6;
  }

  /* 表单 */
  :deep(.el-form-item__label) {
    font-weight: 600;
    color: #6b5545;
  }

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

  :deep(.el-input__inner) {
    color: #4a382c;

    &::placeholder {
      color: #b09b8c;
    }
  }

  :deep(.el-select__placeholder) {
    color: #b09b8c;
  }

  :deep(.el-form-item.is-error) {
    .el-input__wrapper,
    .el-select__wrapper,
    .el-input-number .el-input__wrapper,
    .el-textarea__inner {
      box-shadow: 0 0 0 1px #ef4444 inset;
    }
  }

  /* 弹窗按钮 */
  :deep(.el-dialog__footer .el-button) {
    min-height: 38px;
    padding: 0 18px;
    border-radius: 10px;
  }

  :deep(.el-dialog__footer .el-button:not(.el-button--primary)) {
    color: #7c6656;
    background: #fff;
    border-color: #e8d5c4;

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

  /* 加载状态 */
  :deep(.el-loading-spinner .path) {
    stroke: #ff8a26;
  }

  :deep(.el-loading-spinner .el-loading-text) {
    color: #f97316;
  }

  /* 深色模式 */
  .dark & {
    color: #f4e9e0;
    background:
      radial-gradient(circle at 92% 0%, rgb(249 115 22 / 7%) 0%, transparent 26%), #1b1512;

    .toolbar-card,
    .ds-card {
      background: #251d18;
      border-color: #49382e;
      box-shadow: none;
    }

    .toolbar {
      :deep(.el-input__wrapper) {
        background: #30251f;
        box-shadow: 0 0 0 1px #49382e inset;

        &:hover {
          box-shadow: 0 0 0 1px rgb(255 138 38 / 28%) inset;
        }

        &.is-focus {
          box-shadow:
            0 0 0 1px #ff8a26 inset,
            0 0 0 4px rgb(255 138 38 / 9%);
        }
      }

      :deep(.el-input__inner) {
        color: #f4e9e0;
      }
    }

    .ds-card {
      &:hover {
        background: #2d231d;
        border-color: rgb(255 138 38 / 30%);
      }

      .ds-card-header {
        .ds-info {
          h3 {
            color: #f4e9e0;
          }

          p {
            color: #9b8576;
          }
        }
      }

      .ds-card-body {
        background: #2a211c;
        border-color: #44342b;

        .ds-detail {
          color: #a58f80;
          border-bottom-color: #49382e;

          > span:first-child {
            color: #917a6b;
          }

          > span:last-child {
            color: #eadfd6;
          }
        }
      }

      .ds-card-footer {
        border-top-color: #49382e;
      }
    }

    :deep(.el-dialog) {
      background: #251d18;
      border-color: #49382e;
      box-shadow: 0 24px 60px rgb(0 0 0 / 40%);
    }

    :deep(.el-dialog__header),
    :deep(.el-dialog__footer) {
      background: #2a211c;
      border-color: #49382e;
    }

    :deep(.el-dialog__title) {
      color: #f4e9e0;
    }

    :deep(.el-form-item__label) {
      color: #c9b6a8;
    }

    :deep(.el-input__wrapper),
    :deep(.el-select__wrapper),
    :deep(.el-input-number .el-input__wrapper),
    :deep(.el-textarea__inner) {
      color: #f4e9e0;
      background: #30251f;
      box-shadow: 0 0 0 1px #49382e inset;

      &:hover {
        background: #352922;
        box-shadow: 0 0 0 1px rgb(255 138 38 / 28%) inset;
      }
    }

    :deep(.el-input__inner),
    :deep(.el-textarea__inner),
    :deep(.el-select__selected-item) {
      color: #f4e9e0;
    }
  }
}

@media (width <= 768px) {
  .datasource-view {
    .toolbar {
      flex-direction: column;
      align-items: stretch;

      :deep(.el-input) {
        width: 100% !important;
      }

      :deep(.el-button) {
        width: 100%;
      }
    }

    .ds-card {
      .ds-card-footer {
        justify-content: flex-start;
      }
    }
  }
}
</style>
