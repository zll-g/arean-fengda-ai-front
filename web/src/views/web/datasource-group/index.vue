<template>
  <div class="group-view">
    <!-- 操作栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <span class="toolbar-title">{{ t('datasourceGroup.title') }}</span>

        <el-button type="primary" icon="Plus" @click="openDialog()">
          {{ t('datasourceGroup.createGroup') }}
        </el-button>
      </div>
    </el-card>

    <!-- 分组卡片列表 -->
    <el-row :gutter="16" class="card-grid">
      <el-col v-for="group in groups" :key="group.id" :xs="24" :sm="12" :lg="8">
        <el-card shadow="hover" class="group-card">
          <!-- 头部 -->
          <div class="group-header">
            <div class="group-icon">
              <el-icon :size="24">
                <Files />
              </el-icon>
            </div>

            <div class="group-info">
              <h3>{{ group.groupName }}</h3>
              <p>{{ group.description || t('datasourceGroup.noDescription') }}</p>
            </div>
          </div>

          <!-- 数据源列表 -->
          <div class="group-items">
            <div v-for="item in group.items" :key="item.datasourceId" class="group-item">
              <div class="item-left">
                <el-icon color="#409eff">
                  <Coin />
                </el-icon>
                <span class="item-alias">{{ item.alias || item.datasourceName }}</span>
              </div>

              <div class="item-right">
                <el-tag size="small" type="info">{{ item.dbType }}</el-tag>
                <el-tag size="small">
                  {{ item.tableCount || 0 }} {{ t('datasourceGroup.tableUnit') }}
                </el-tag>
              </div>
            </div>

            <el-empty
              v-if="!group.items || group.items.length === 0"
              :description="t('datasourceGroup.noDatasource')"
              :image-size="40"
            />
          </div>

          <!-- 操作栏 -->
          <div class="group-footer">
            <el-button text type="primary" size="small" @click="openDialog(group)">
              {{ t('datasourceGroup.edit') }}
            </el-button>

            <el-popconfirm
              :title="t('datasourceGroup.deleteConfirm')"
              :confirm-button-text="t('datasourceGroup.confirm')"
              :cancel-button-text="t('datasourceGroup.cancel')"
              @confirm="handleDelete(group.id)"
            >
              <template #reference>
                <el-button text type="danger" size="small">
                  {{ t('datasourceGroup.delete') }}
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </el-col>

      <el-col v-if="groups.length === 0" :span="24">
        <el-empty :description="t('datasourceGroup.noGroup')">
          <el-button type="primary" @click="openDialog()">
            {{ t('datasourceGroup.createGroup') }}
          </el-button>
        </el-empty>
      </el-col>
    </el-row>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? t('datasourceGroup.editGroup') : t('datasourceGroup.createGroup')"
      width="700px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('datasourceGroup.form.groupName')" prop="name">
          <el-input
            v-model="form.name"
            :placeholder="t('datasourceGroup.form.groupNamePlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('datasourceGroup.form.description')">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            :placeholder="t('datasourceGroup.form.descriptionPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('datasourceGroup.form.datasource')">
          <div class="ds-selector">
            <!-- 已选数据源列表（可拖拽排序） -->
            <div class="selected-ds-list">
              <div
                v-for="(item, idx) in form.items"
                :key="item.datasourceId"
                class="selected-ds-item"
              >
                <div class="ds-item-left">
                  <span class="ds-order">{{ Number(idx) + 1 }}</span>
                  <el-icon color="#409eff">
                    <Coin />
                  </el-icon>
                  <span class="ds-name">{{ getDsName(item.datasourceId) }}</span>
                </div>

                <div class="ds-item-right">
                  <el-input
                    v-model="item.alias"
                    size="small"
                    :placeholder="t('datasourceGroup.form.aliasPlaceholder')"
                    style="width: 120px"
                  />

                  <el-button text type="danger" size="small" icon="Delete" @click="removeDs(idx)" />
                </div>
              </div>

              <el-empty
                v-if="form.items.length === 0"
                :description="t('datasourceGroup.form.emptyDatasourceTip')"
                :image-size="40"
              />
            </div>

            <!-- 添加数据源 -->
            <div class="add-ds-bar">
              <el-select
                v-model="addDsId"
                :placeholder="t('datasourceGroup.form.addDatasourcePlaceholder')"
                filterable
                style="flex: 1"
              >
                <el-option v-for="ds in availableDs" :key="ds.id" :label="ds.name" :value="ds.id">
                  <div style="display: flex; gap: 8px; align-items: center">
                    <el-icon>
                      <Coin />
                    </el-icon>
                    <span>{{ ds.name }}</span>
                    <el-tag size="small" type="info">{{ ds.dbType }}</el-tag>
                  </div>
                </el-option>
              </el-select>

              <el-button type="primary" icon="Plus" @click="addDs">
                {{ t('datasourceGroup.add') }}
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">
          {{ t('datasourceGroup.cancel') }}
        </el-button>

        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ t('datasourceGroup.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Coin, Files } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useDatasourceStore } from '@/store/datasource';
import api from '@/api';

const { t } = useI18n();

const dsStore = useDatasourceStore();

const groups = ref([] as any);
const dialogVisible = ref(false);
const editing = ref(null as any);
const submitLoading = ref(false);
const formRef = ref(null as any);
const addDsId = ref(null);

const form = ref({
  name: '',
  description: '',
  items: [],
} as any);

const rules = computed(() => {
  return {
    name: [
      {
        required: true,
        message: t('datasourceGroup.validate.groupName'),
        trigger: 'blur',
      },
    ],
  };
});

// 可添加的数据源（排除已选的）
const availableDs = computed(() => {
  const selectedIds = new Set(form.value.items.map((i: any) => i.datasourceId));

  return dsStore.list.filter((ds) => !selectedIds.has(ds.id));
});

onMounted(async () => {
  await dsStore.fetchList();
  await fetchGroups();
});

async function fetchGroups() {
  try {
    const res = await api.federated.listGroups();

    groups.value = res.data || [];
  } catch (e) {
    console.error(t('datasourceGroup.message.loadFailed'), e);
  }
}

function openDialog(group = null as any) {
  editing.value = group;

  if (group) {
    form.value = {
      name: group.groupName,
      description: group.description,
      items: (group.items || []).map((i: any) => ({
        datasourceId: i.datasourceId,
        alias: i.alias || i.datasourceName,
        priority: i.priority || 0,
      })),
    };
  } else {
    form.value = { name: '', description: '', items: [] };
  }

  addDsId.value = null;
  dialogVisible.value = true;
}

function getDsName(dsId: any) {
  const ds = dsStore.list.find((d) => d.id === dsId);

  return ds ? ds.name : `DS-${dsId}`;
}

function addDs() {
  if (!addDsId.value) return;

  const ds = dsStore.list.find((d) => d.id === addDsId.value);

  form.value.items.push({
    datasourceId: addDsId.value,
    alias: ds ? ds.name : '',
    priority: form.value.items.length,
  });

  addDsId.value = null;
}

function removeDs(idx: any) {
  form.value.items.splice(idx, 1);
}

async function handleSubmit() {
  await formRef.value.validate();

  if (form.value.items.length < 2) {
    ElMessage.warning(t('datasourceGroup.message.minDatasource'));
    return;
  }

  submitLoading.value = true;

  try {
    const payload: any = {
      name: form.value.name,
      description: form.value.description,
      items: form.value.items.map((item: any, idx: any) => ({
        datasourceId: item.datasourceId,
        alias: item.alias,
        priority: idx,
      })),
    };

    if (editing.value) {
      await api.federated.update(editing.value.id, payload);
      ElMessage.success(t('datasourceGroup.message.updateSuccess'));
    } else {
      await api.federated.create(payload);
      ElMessage.success(t('datasourceGroup.message.createSuccess'));
    }

    dialogVisible.value = false;
    await fetchGroups();
  } finally {
    submitLoading.value = false;
  }
}

async function handleDelete(id: string) {
  await api.federated.remove(id);
  ElMessage.success(t('datasourceGroup.message.deleteSuccess'));
  await fetchGroups();
}
</script>

<style scoped lang="scss">
.group-view {
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
  color: #4a382c;
  color: #4a382c;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
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

    .toolbar-title {
      position: relative;
      padding-left: 13px;
      font-size: 16px;
      font-weight: 700;
      color: #4a382c;

      &::before {
        position: absolute;
        top: 50%;
        left: 0;
        width: 4px;
        height: 17px;
        content: '';
        background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
        border-radius: 999px;
        box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
        transform: translateY(-50%);
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

  /* 分组卡片区域 */
  .card-grid {
    padding: 2px;

    :deep(.el-col) {
      .el-empty {
        padding: 42px 0;
        background: rgb(255 250 245 / 78%);
        border: 1px dashed #e8c6a8;
        border-radius: 18px;
      }
    }
  }

  .group-card {
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

      .group-icon {
        box-shadow:
          0 10px 20px rgb(249 115 22 / 24%),
          0 0 0 5px rgb(255 138 38 / 7%);
        transform: translateY(-1px) scale(1.03);
      }
    }

    :deep(.el-card__body) {
      padding: 20px;
    }

    .group-header {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;

      .group-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        color: #fff;
        background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
        border: 1px solid rgb(255 255 255 / 22%);
        border-radius: 12px;
        box-shadow:
          0 8px 18px rgb(249 115 22 / 22%),
          0 0 0 4px rgb(255 138 38 / 6%);
        transition:
          box-shadow 0.22s ease,
          transform 0.22s ease;
      }

      .group-info {
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
          line-height: 1.5;
          color: #a18b7b;
          white-space: nowrap;
        }
      }
    }

    /* 数据源列表 */
    .group-items {
      padding: 8px 12px;
      margin-bottom: 12px;
      background: #fffaf5;
      border: 1px solid #f3e4d6;
      border-radius: 12px;

      .group-item {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        min-height: 42px;
        padding: 8px 0;
        border-bottom: 1px dashed #efdcca;
        transition:
          background 0.18s ease,
          transform 0.18s ease;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: #fff4e9;
          border-radius: 8px;
          transform: translateX(2px);
        }

        .item-left {
          display: flex;
          gap: 7px;
          align-items: center;
          min-width: 0;

          .el-icon {
            flex-shrink: 0;
            color: #f97316 !important;
          }

          .item-alias {
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 13px;
            font-weight: 500;
            color: #5b4738;
            white-space: nowrap;
          }
        }

        .item-right {
          display: flex;
          flex-shrink: 0;
          gap: 4px;
          align-items: center;
        }
      }

      :deep(.el-empty) {
        padding: 16px 0;
      }

      :deep(.el-empty__description p) {
        color: #a18b7b;
      }
    }

    /* 卡片底部操作 */
    .group-footer {
      display: flex;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid #f3e4d6;

      :deep(.el-button) {
        padding: 6px 10px;
        margin-left: 0;
        font-weight: 600;
        border-radius: 8px;
        transition:
          color 0.18s ease,
          background 0.18s ease,
          transform 0.18s ease;
      }

      :deep(.el-button.is-text.el-button--primary) {
        color: #e86f0b;

        &:hover {
          color: #f97316;
          background: #fff0e2;
          transform: translateY(-1px);
        }
      }

      :deep(.el-button.is-text.el-button--danger) {
        color: #ef4444;

        &:hover {
          color: #dc2626;
          background: #fef2f2;
          transform: translateY(-1px);
        }
      }
    }
  }

  /* 标签 */
  :deep(.el-tag) {
    font-weight: 600;
    border-radius: 7px;
  }

  :deep(.el-tag:not(.el-tag--info)) {
    color: #e86f0b;
    background: #fff4e9;
    border-color: #ffd3aa;
  }

  :deep(.el-tag--info) {
    color: #b85b0a;
    background: #fff7ed;
    border-color: #fed7aa;
  }

  /* 空分组状态 */

  :deep(.el-empty__description p) {
    color: #a18b7b;
  }

  :deep(.el-empty .el-button--primary) {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    border-color: #ff8a26;
    border-radius: 10px;
    box-shadow: 0 6px 14px rgb(249 115 22 / 18%);

    &:hover {
      background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
      border-color: #f97316;
    }
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

  /* 数据源选择器 */
  .ds-selector {
    width: 100%;

    .selected-ds-list {
      min-height: 80px;
      padding: 8px;
      margin-bottom: 10px;
      background: #fffaf5;
      border: 1px solid #f0dfcf;
      border-radius: 10px;

      .selected-ds-item {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        padding: 9px 10px;
        margin-bottom: 6px;
        background: #fff;
        border: 1px solid #f3e4d6;
        border-radius: 9px;
        transition:
          background 0.18s ease,
          border-color 0.18s ease,
          box-shadow 0.18s ease,
          transform 0.18s ease;

        &:last-child {
          margin-bottom: 0;
        }

        &:hover {
          background: #fff7ef;
          border-color: #ffc58f;
          box-shadow: 0 5px 14px rgb(249 115 22 / 7%);
          transform: translateY(-1px);
        }

        .ds-item-left {
          display: flex;
          gap: 8px;
          align-items: center;
          min-width: 0;

          .ds-order {
            display: flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            font-size: 11px;
            font-weight: 700;
            color: #fff;
            background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
            border-radius: 50%;
            box-shadow: 0 4px 10px rgb(249 115 22 / 18%);
          }

          .el-icon {
            flex-shrink: 0;
            color: #f97316 !important;
          }

          .ds-name {
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 13px;
            font-weight: 600;
            color: #5b4738;
            white-space: nowrap;
          }
        }

        .ds-item-right {
          display: flex;
          flex-shrink: 0;
          gap: 8px;
          align-items: center;

          :deep(.el-input__wrapper) {
            min-height: 32px;
            background: #fffaf5;
          }

          :deep(.el-button.is-text.el-button--danger) {
            color: #ef4444;
            border-radius: 7px;

            &:hover {
              color: #dc2626;
              background: #fef2f2;
            }
          }
        }
      }

      :deep(.el-empty) {
        padding: 14px 0;
      }
    }

    /* 添加数据源 */
    .add-ds-bar {
      display: flex;
      gap: 8px;

      :deep(.el-select) {
        min-width: 0;
      }

      :deep(.el-button--primary) {
        flex-shrink: 0;
        color: #fff;
        background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
        border-color: #ff8a26;
        border-radius: 10px;
        box-shadow: 0 6px 14px rgb(249 115 22 / 17%);

        &:hover {
          background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
          border-color: #f97316;
          box-shadow: 0 8px 18px rgb(249 115 22 / 22%);
        }
      }
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
  @media (width <=768px) {
    padding: 12px;

    .toolbar {
      align-items: stretch;

      .toolbar-title {
        font-size: 15px;
      }

      :deep(.el-button) {
        flex-shrink: 0;
      }
    }

    :deep(.el-dialog) {
      width: 94% !important;
    }

    .ds-selector {
      .selected-ds-list {
        .selected-ds-item {
          flex-direction: column;
          align-items: stretch;

          .ds-item-right {
            justify-content: space-between;

            :deep(.el-input) {
              flex: 1;
            }
          }
        }
      }

      .add-ds-bar {
        flex-direction: column;

        :deep(.el-button) {
          width: 100%;
        }
      }
    }
  }
}
</style>
