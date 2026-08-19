<template>
  <div class="knowledge-app">
    <div class="mobile-navbar hidden-lg-and-up">
      <el-button :icon="Menu" link />
      <span class="navbar-title">{{ t('knowledgeBase.pageTitle') }}</span>
      <el-button :icon="Plus" type="primary" circle size="small" @click="handleAddClick" />
    </div>

    <el-container class="app-container">
      <el-aside width="300px" class="side-nav hidden-md-and-down">
        <div class="nav-header">{{ t('knowledgeBase.listTitle') }}</div>

        <div class="menu-search">
          <el-input
            v-model="searchQuery"
            :placeholder="t('knowledgeBase.searchPlaceholder')"
            :prefix-icon="Search"
          />
        </div>

        <div class="menu-items">
          <div
            v-for="item in filteredMenuData"
            :key="item.id"
            :class="['menu-item', { active: state.knowledgeBaseId === item.id }]"
            @click="getDetail(item.id)"
          >
            <div
              class="menu-icon"
              :style="{
                backgroundColor: item.bgColor || '#f0f7ff',
                color: item.iconColor || '#3471ff',
              }"
            >
              <span v-if="!item.icon" class="fallback-icon">{{ item.name.charAt(0) }}</span>
              <el-icon v-else>
                <component :is="item.icon" />
              </el-icon>
            </div>

            <div class="menu-info">
              <div class="menu-name">{{ item.name }}</div>
              <div class="menu-count">
                {{ item.documentCount }} {{ t('knowledgeBase.documentUnit') }}
              </div>
            </div>

            <div v-if="item.isEdit" class="custom-badge">{{ t('knowledgeBase.edit') }}</div>

            <div class="op-actions" @click.stop>
              <el-icon class="op-icon-delete" @click.stop="removeKnowledge(item.id)">
                <Delete />
              </el-icon>
              <el-icon class="op-icon" @click.stop="editKnowledge(item)">
                <Edit />
              </el-icon>
            </div>
          </div>

          <div class="add-kb-btn" @click="handleAddClick">
            <el-icon>
              <Plus />
            </el-icon>
            {{ t('knowledgeBase.addKnowledgeBase') }}
          </div>
        </div>
      </el-aside>

      <el-main class="main-content">
        <div class="content-card">
          <header class="content-header">
            <div class="header-text">
              <h2>{{ state.statisticalInfo.name || t('knowledgeBase.pageTitle') }}</h2>
              <p>{{ currentKnowledgeRemark || t('knowledgeBase.pageDesc') }}</p>
            </div>
          </header>

          <el-row :gutter="12" class="stat-row">
            <el-col :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-top">
                  <span>{{ t('knowledgeBase.stats.totalDocuments') }}</span>
                  <div class="icon-dot" />
                </div>
                <div class="stat-value">{{ state.statisticalInfo.totalDocuments }}</div>
              </el-card>
            </el-col>

            <el-col :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-top">
                  <span>{{ t('knowledgeBase.stats.completedDocuments') }}</span>
                  <div class="icon-dot" />
                </div>
                <div class="stat-value">{{ state.statisticalInfo.completedDocuments }}</div>
              </el-card>
            </el-col>

            <el-col :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-top">
                  <span>{{ t('knowledgeBase.stats.failedDocuments') }}</span>
                  <div class="icon-dot" />
                </div>
                <div class="stat-value">{{ state.statisticalInfo.failedDocuments }}</div>
              </el-card>
            </el-col>

            <el-col :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-top">
                  <span>{{ t('knowledgeBase.stats.processingDocuments') }}</span>
                  <div class="icon-dot" />
                </div>
                <div class="stat-value">{{ state.statisticalInfo.processingDocuments }}</div>
              </el-card>
            </el-col>

            <el-col :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-top">
                  <span>{{ t('knowledgeBase.stats.splitStrategy') }}</span>
                  <div class="icon-dot" />
                </div>
                <div class="stat-value">
                  {{ getSplitStrategyLabel(state.statisticalInfo.splitStrategy) }}
                </div>
              </el-card>
            </el-col>

            <el-col :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-top">
                  <span>{{ t('knowledgeBase.stats.chunkSize') }}</span>
                  <div class="icon-dot" />
                </div>
                <div class="stat-value">{{ state.statisticalInfo.chunkSize }}</div>
              </el-card>
            </el-col>

            <el-col :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="stat-card">
                <div class="stat-top">
                  <span>{{ t('knowledgeBase.stats.chunkOverlap') }}</span>
                  <div class="icon-dot" />
                </div>
                <div class="stat-value">{{ state.statisticalInfo.chunkOverlap }}</div>
              </el-card>
            </el-col>
          </el-row>

          <el-card shadow="never" class="table-box">
            <div class="document-manager">
              <div class="document-manager-header">
                <div class="document-manager-title">
                  <el-icon>
                    <Document />
                  </el-icon>
                  <span>{{ t('knowledgeBase.documentManage') }}</span>
                </div>

                <div class="upload-actions">
                  <!-- 文档级分片配置（可选，随上传随参生效；不配置=跟随知识库/全局默认） -->
                  <el-popover
                    v-model:visible="splitConfigPopoverVisible"
                    placement="bottom-end"
                    trigger="click"
                    :width="460"
                    popper-class="kb-upload-split-popover"
                  >
                    <template #reference>
                      <el-button
                        class="split-config-btn"
                        :class="{ 'has-config': !!uploadSplitConfig }"
                        :disabled="!state.knowledgeBaseId"
                      >
                        <el-icon>
                          <Setting />
                        </el-icon>
                        {{ t('splitConfigForm.configButton') }}
                      </el-button>
                    </template>

                    <SplitConfigForm ref="splitConfigFormRef" v-model="uploadSplitConfig" />
                  </el-popover>

                  <el-tag
                    v-if="uploadSplitConfig"
                    class="split-config-tag"
                    type="warning"
                    effect="plain"
                    closable
                    @close="uploadSplitConfig = null"
                  >
                    {{ t('splitConfigForm.configuredTag') }} · {{ uploadStrategyLabel }}
                  </el-tag>

                  <el-button
                    class="refresh-doc-btn"
                    :icon="Refresh"
                    :loading="refreshing"
                    :disabled="!state.knowledgeBaseId"
                    title="刷新"
                    aria-label="刷新"
                    @click="handleManualRefresh"
                  />

                  <el-button
                    type="primary"
                    class="upload-doc-btn"
                    :disabled="!state.knowledgeBaseId"
                    @click="triggerSingleUpload"
                  >
                    {{ t('knowledgeBase.uploadDocument') }}
                  </el-button>
                </div>
              </div>

              <el-upload
                ref="singleUploadRef"
                class="single-upload-hidden"
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                :multiple="false"
                :limit="1"
                :disabled="!state.knowledgeBaseId"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.html,.txt,.md"
                :on-change="handleSingleUploadChange"
                :on-exceed="handleSingleUploadExceed"
              >
                <span />
              </el-upload>

              <el-upload
                ref="dragUploadRef"
                class="document-upload"
                drag
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                :multiple="true"
                :disabled="!state.knowledgeBaseId"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.html,.txt,.md"
                :on-change="handleDragUploadChange"
              >
                <div class="upload-drop-content">
                  <div class="upload-icon-box">
                    <el-icon>
                      <UploadFilled />
                    </el-icon>
                  </div>

                  <div class="upload-main-text">{{ t('knowledgeBase.dragUploadText') }}</div>

                  <div class="upload-sub-text">
                    {{ t('knowledgeBase.supportedFormatsText', { formats: supportedFormats }) }}
                  </div>
                </div>
              </el-upload>
            </div>

            <div class="document-search">
              <el-input
                v-model="documentSearchQuery"
                clearable
                :prefix-icon="Search"
                placeholder="搜索文档名称"
              />
            </div>

            <div class="table-scroll-wrapper">
              <el-table
                :data="filteredTableData"
                row-key="__rowKey"
                :tree-props="{ children: 'children' }"
                :row-class-name="getVersionRowClassName"
                height="100%"
                style="width: 100%"
                class="responsive-table"
              >
                <el-table-column :label="t('knowledgeBase.table.documentName')" min-width="200">
                  <template #default="scope">
                    <div
                      class="doc-cell"
                      :class="{ 'history-version-cell': scope.row.__isHistory }"
                      :style="getVersionIndentStyle(scope.row)"
                    >
                      <div class="doc-icon">
                        {{ fileIcons[scope.row.fileType] || '📄' }}
                      </div>

                      <div class="doc-info">
                        <el-tooltip
                          effect="dark"
                          placement="top"
                          :content="scope.row.originalName || '-'"
                          :disabled="!scope.row.originalName"
                        >
                          <div class="name">{{ scope.row.originalName }}</div>
                        </el-tooltip>
                        <div class="meta">
                          {{ formatFileSize(scope.row.fileSize) }} · {{ scope.row.segmentCount }}
                          {{ t('knowledgeBase.table.segmentUnit') }}
                          {{ formatDate(scope.row.createdAt) }}
                        </div>
                      </div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column
                  :label="t('knowledgeBase.table.versionNumber')"
                  min-width="200"
                  align="center"
                >
                  <template #default="scope">
                    <div>v{{ scope.row.version }}</div>
                  </template>
                </el-table-column>

                <el-table-column
                  :label="t('knowledgeBase.table.versionUsed')"
                  min-width="200"
                  align="center"
                >
                  <template #default="scope">
                    <el-switch
                      :model-value="scope.row.isApply"
                      active-value="1"
                      inactive-value="0"
                      @click.stop="handleApplySwitchClick(scope.row)"
                    />
                  </template>
                </el-table-column>

                <el-table-column
                  :label="t('knowledgeBase.table.status')"
                  width="100"
                  align="center"
                >
                  <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.status)" size="small" round>
                      {{ getStatusName(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column
                  :label="t('knowledgeBase.table.action')"
                  width="310"
                  align="center"
                  fixed="right"
                >
                  <template #default="scope">
                    <div style="display: flex; justify-content: space-around">
                      <div
                        style="color: #409eff; cursor: pointer"
                        @click="handlePreviewFile(scope.row)"
                      >
                        {{ t('knowledgeBase.table.preview') }}
                      </div>

                      <div
                        v-if="!scope.row.__isHistory"
                        style="color: #409eff; cursor: pointer"
                        @click="triggerVersionUpdate(scope.row)"
                      >
                        {{ t('knowledgeBase.table.versionUpdate') }}
                      </div>

                      <!-- 分片管理:仅当前生效版本开放(历史版本随蓝绿切换已下线) -->
                      <div
                        v-if="!scope.row.__isHistory"
                        style="color: #7c3aed; cursor: pointer"
                        @click="goSplitManagement(scope.row)"
                      >
                        {{ t('splitManagement.pageTitle') }}
                      </div>

                      <div
                        :style="{
                          color: isBuilding(scope.row.id) ? '#2563eb' : '#ff9a3d',
                          cursor: isBuilding(scope.row.id) ? 'not-allowed' : 'pointer',
                          fontWeight: isBuilding(scope.row.id) ? '600' : 'normal',
                        }"
                        @click="handleRebuildIndex(scope.row)"
                      >
                        {{
                          isBuilding(scope.row.id)
                            ? t('knowledgeBase.table.underReconstruction')
                            : t('knowledgeBase.table.rebuildIndex')
                        }}
                      </div>

                      <div
                        style="color: #f56c6c; cursor: pointer"
                        @click="removeDocument(scope.row.id)"
                      >
                        {{ t('knowledgeBase.table.delete') }}
                      </div>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-card>
        </div>
      </el-main>
    </el-container>

    <AddOrEdit ref="kbDialogRef" @refresh="handleKnowledgeRefresh" />

    <FilePreviewDialog ref="filePreviewDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Delete,
  Document,
  Edit,
  Menu,
  Plus,
  Refresh,
  Search,
  Setting,
} from '@element-plus/icons-vue';
import api from '@/api';
import 'element-plus/theme-chalk/display.css';
import AddOrEdit from './components/addOrEdit.vue';
import FilePreviewDialog from '@/components/filePreviewDialog/index.vue';
import SplitConfigForm from '@/components/split-config/SplitConfigForm.vue';
import type { SplitConfigDto } from '@/api/modules/split';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
const router = useRouter();

type SplitStrategy = 'recursive' | 'paragraph' | 'sentence' | 'semantic' | 'fixed' | 'custom';

const { t, locale } = useI18n();
/** 跳转分片管理工作台(独立路由页,支持直达链接与浏览器前进后退;name 用于页面头展示文档名) */
const goSplitManagement = (row: any) => {
  if (!row?.id) return;

  router.push({
    name: 'SplitManagement',
    params: { documentId: String(row.id) },
    query: { name: row.originalName || '' },
  });
};
const splitStrategyKeyMap: Record<SplitStrategy, string> = {
  custom: 'knowledgeBase.splitStrategy.custom',
  recursive: 'knowledgeBase.splitStrategy.recursive',
  paragraph: 'knowledgeBase.splitStrategy.paragraph',
  sentence: 'knowledgeBase.splitStrategy.sentence',
  semantic: 'knowledgeBase.splitStrategy.semantic',
  fixed: 'knowledgeBase.splitStrategy.fixed',
};

const getSplitStrategyLabel = (value?: string) => {
  if (!value) return '-';

  const key = splitStrategyKeyMap[value as SplitStrategy];

  return key ? t(key) : value;
};

const searchQuery = ref('');
const documentSearchQuery = ref('');
const singleUploadRef = ref();
const dragUploadRef = ref();
const dragUploadTimer = ref<number | null>(null);
const supportedFormats = ref('');

// 当前版本更新对应的文档 uuid
const versionUpdateUuid = ref('');

// ==================== 文档级分片配置（上传可选） ====================
/** 本次上传随参的文档级分片配置；null=跟随知识库级/全局默认（不携带任何分片字段） */
const uploadSplitConfig = ref<SplitConfigDto | null>(null);
const splitConfigPopoverVisible = ref(false);
const splitConfigFormRef = ref();

/** 已配置徽标上的策略可读名 */
const uploadStrategyLabel = computed(() => {
  const strategy = uploadSplitConfig.value?.strategy;

  return strategy ? t(`splitManagement.strategyName.${strategy}`) : '';
});

/** SplitConfigDto(前端 strategy 命名) → 上传 DTO 字段(splitStrategy 命名)，仅带非空字段 */
const buildUploadSplitPayload = (): Record<string, any> => {
  const cfg = uploadSplitConfig.value;

  if (!cfg) return {};

  const payload: Record<string, any> = {};

  if (cfg.strategy) payload.splitStrategy = cfg.strategy;
  if (cfg.chunkSize != null) payload.chunkSize = cfg.chunkSize;
  if (cfg.chunkOverlap != null) payload.chunkOverlap = cfg.chunkOverlap;
  if (cfg.sizeUnit) payload.sizeUnit = cfg.sizeUnit;
  if (cfg.tableRowSplitEnabled != null) payload.tableRowSplitEnabled = cfg.tableRowSplitEnabled;
  if (cfg.tableRowBatchSize != null) payload.tableRowBatchSize = cfg.tableRowBatchSize;

  return payload;
};

const statusKeyMap: Record<string, string> = {
  PENDING: 'knowledgeBase.status.pending',
  PARSING: 'knowledgeBase.status.parsing',
  SPLITTING: 'knowledgeBase.status.splitting',
  EMBEDDING: 'knowledgeBase.status.embedding',
  COMPLETED: 'knowledgeBase.status.completed',
  FAILED: 'knowledgeBase.status.failed',
};

const processingStatusSet = new Set(['PENDING', 'PARSING', 'SPLITTING', 'EMBEDDING']);

const fileIcons: Record<string, string> = {
  pdf: '📕',
  doc: '📘',
  docx: '📘',
  xls: '📗',
  xlsx: '📗',
  ppt: '📙',
  pptx: '📙',
  txt: '📝',
  md: '📝',
  html: '🌐',
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
  dxf: '📐',
  dwg: '📐',
};

const state = reactive({
  menuData: [] as any[],
  tableData: [] as any[],
  statisticalInfo: {} as any,
  knowledgeBaseId: '',
});

// ==================== 状态缓存：返回页面时避免空白闪现 ====================
const CACHE_KEY = 'knowledgeBase_cache';

const saveCacheState = () => {
  sessionStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      menuData: state.menuData,
      knowledgeBaseId: state.knowledgeBaseId,
      tableData: state.tableData,
      statisticalInfo: state.statisticalInfo,
    }),
  );
};

const restoreCacheState = () => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      state.menuData = data.menuData || [];
      state.knowledgeBaseId = data.knowledgeBaseId || '';
      state.tableData = data.tableData || [];
      state.statisticalInfo = data.statisticalInfo || {};
      return true;
    }
  } catch {
    // 缓存数据损坏，忽略
  }
  return false;
};

const kbDialogRef = ref<any>(null);
const filePreviewDialogRef = ref<InstanceType<typeof FilePreviewDialog>>();
const refreshing = ref(false);

// ==================== 详情自动轮询（上传后文档处理中时自动刷新） ====================
const POLLING_INTERVAL = 3000;
const detailPollingTimer = ref<number | null>(null);
const isDetailPollingRequesting = ref(false);

/**
 * 所有正在重建索引的文档 ID。
 * 使用 Set 支持多个文档同时重建。
 */
const buildingIds = reactive(new Set<string>());

/**
 * 每个文档独立保存自己的索引状态轮询定时器。
 */
const rebuildTimers = new Map<string, ReturnType<typeof setInterval>>();

const filteredMenuData = computed(() => {
  if (!searchQuery.value) {
    return state.menuData;
  }

  const query = searchQuery.value.toLowerCase();

  return state.menuData.filter((item: any) => {
    return item.name.toLowerCase()?.includes(query);
  });
});

/**
 * 版本号倒序比较。
 * numeric: true 可以正确处理 2 / 10、1.2 / 1.10 这类版本号。
 */
const compareVersionDesc = (a: any, b: any) => {
  return String(b?.version ?? '').localeCompare(String(a?.version ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

/**
 * 相同 uuid 的文档组成版本折叠组：
 * 1. version 最大的版本作为一级行；
 * 2. 其余版本按 version 从大到小作为折叠子项；
 * 3. 没有 uuid 的数据保持独立展示。
 */
const createVersionTableRow = (item: any, rowKey: string) => {
  const row = {
    ...item,
    __rowKey: rowKey,
  } as any;

  // 保持原有 el-switch 的 v-model 行为，修改折叠行时同步回 state.tableData 原数据
  Object.defineProperty(row, 'isApply', {
    enumerable: true,
    configurable: true,
    get: () => item.isApply,
    set: (value) => {
      item.isApply = value;
    },
  });

  delete row.children;

  return row;
};

const buildVersionTreeData = (data: any[]) => {
  const uuidGroups = new Map<string, Array<{ item: any; index: number }>>();
  const rootOrder: Array<
    { type: 'group'; key: string } | { type: 'single'; item: any; index: number }
  > = [];

  data.forEach((item, index) => {
    const uuid = String(item?.uuid ?? '').trim();

    if (!uuid) {
      rootOrder.push({ type: 'single', item, index });
      return;
    }

    if (!uuidGroups.has(uuid)) {
      uuidGroups.set(uuid, []);
      rootOrder.push({ type: 'group', key: uuid });
    }

    uuidGroups.get(uuid)?.push({ item, index });
  });

  return rootOrder
    .map((entry) => {
      if (entry.type === 'single') {
        return createVersionTableRow(entry.item, `single-${entry.item?.id ?? entry.index}`);
      }

      const versions = [...(uuidGroups.get(entry.key) || [])].sort((a, b) => {
        const versionResult = compareVersionDesc(a.item, b.item);

        return versionResult || a.index - b.index;
      });

      const [latest, ...history] = versions;

      if (!latest) {
        return null;
      }

      const parent = createVersionTableRow(
        latest.item,
        `version-${entry.key}-${latest.item?.id ?? latest.index}`,
      );

      if (history.length) {
        // 最新版本作为主行；历史版本越旧，缩进层级越深，视觉上更容易区分版本顺序
        parent.__isLatestVersion = true;
        parent.__versionCount = versions.length;
        parent.children = history.map(({ item, index }, historyIndex) => {
          const child = createVersionTableRow(item, `version-${entry.key}-${item?.id ?? index}`);

          child.__isHistory = true;
          child.__historyLevel = historyIndex + 1;

          return child;
        });
      }

      return parent;
    })
    .filter(Boolean);
};

/**
 * 历史版本缩进：
 * 第一条旧版本先向后缩进，版本越旧继续增加缩进；
 * 为避免版本过多时挤压文档名称，最多按 5 级视觉缩进。
 */
const getVersionIndentStyle = (row: any) => {
  if (!row?.__isHistory) return undefined;

  const level = Math.min(Math.max(Number(row.__historyLevel) || 1, 1), 5);

  return {
    marginLeft: `${18 + (level - 1) * 14}px`,
  };
};

/**
 * 仅添加版本行样式类，不改变表格原有数据和交互逻辑。
 */
const getVersionRowClassName = ({ row }: { row: any }) => {
  if (row?.__isHistory) return 'version-history-row';
  if (row?.__isLatestVersion) return 'version-latest-row';

  return '';
};

const filteredTableData = computed(() => {
  const query = documentSearchQuery.value.trim().toLowerCase();
  const versionTreeData = buildVersionTreeData(state.tableData);

  if (!query) {
    return versionTreeData;
  }

  return versionTreeData.filter((item: any) => {
    const currentMatched = String(item.originalName || '')
      .toLowerCase()
      .includes(query);

    const childMatched = item.children?.some((child: any) => {
      return String(child.originalName || '')
        .toLowerCase()
        .includes(query);
    });

    return currentMatched || childMatched;
  });
});

const currentKnowledgeRemark = computed(() => {
  return state.menuData.find((i) => i.id === state.knowledgeBaseId)?.description;
});

/**
 * 切换文档应用状态。
 * 接口参数：knowledgeBaseId、documentId、uuid、apply。
 * 接口调用结束后重新获取当前知识库详情，保证开关状态与后端一致。
 */
/**
 * 切换文档应用状态。
 * 只有 handleApplySwitchClick 主动调用此方法。
 */
const handleApplyStatusChange = async (
  row: any,
  value: string | number | boolean,
  oldValue?: string,
) => {
  const currentKnowledgeBaseId = state.knowledgeBaseId;

  if (!currentKnowledgeBaseId) return;

  try {
    await api.base.updateApplyFileStatus({
      knowledgeBaseId: row.knowledgeBaseId || currentKnowledgeBaseId,
      documentId: row.documentId || row.id,
      uuid: row.uuid,
      apply: String(value),
    });
  } catch (error) {
    console.log(error);

    // 接口失败时恢复原来的开关状态
    if (oldValue !== undefined) {
      row.isApply = oldValue;
    }
  } finally {
    // 请求期间如果用户已切换知识库，不要刷新旧知识库
    if (state.knowledgeBaseId === currentKnowledgeBaseId) {
      await getDetail(currentKnowledgeBaseId, {
        refreshList: true,
      });
    }
  }
};
/**
 * 只有用户主动点击开关时才切换状态并调用接口
 */
const handleApplySwitchClick = (row: any) => {
  const newValue = String(row.isApply) === '1' ? '0' : '1';

  // 开启时，先将同 uuid 的其他版本全部关闭，确保只有一个版本被应用
  if (newValue === '1' && row.uuid) {
    state.tableData.forEach((item: any) => {
      if (item.uuid === row.uuid && item !== row && String(item.isApply) === '1') {
        item.isApply = '0';
      }
    });
  }

  row.isApply = newValue;

  handleApplyStatusChange(row, newValue);
};

const getStatusName = (status: string) => {
  const key = statusKeyMap[status];

  return key ? t(key) : t('knowledgeBase.status.unknown');
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'PENDING':
      return 'info';
    default:
      return 'warning';
  }
};

const hasProcessingDocument = () => {
  return state.tableData.some((item: any) => processingStatusSet.has(item.status));
};

const clearDetailPolling = () => {
  if (detailPollingTimer.value) {
    window.clearTimeout(detailPollingTimer.value);
    detailPollingTimer.value = null;
  }
};

const scheduleDetailPolling = (id: string) => {
  clearDetailPolling();

  if (!id) return;

  detailPollingTimer.value = window.setTimeout(() => {
    getDetail(id, {
      refreshList: false,
      fromPolling: true,
    });
  }, POLLING_INTERVAL);
};

/**
 * 获取单文件上传组件内部的原生 input。
 * Element Plus 的 clearFiles 只清内部 fileList，
 * 浏览器原生 input 的 value 不一定会被清掉。
 */
const getSingleUploadInput = () => {
  const uploadEl = singleUploadRef.value?.$el as HTMLElement | undefined;

  return uploadEl?.querySelector('input[type="file"]') as HTMLInputElement | null;
};

/**
 * 重置单文件上传。
 * 关键：清空原生 input.value，允许用户再次选择同一个文件时触发 change。
 */
const resetSingleUploadInput = () => {
  singleUploadRef.value?.clearFiles?.();

  const input = getSingleUploadInput();

  if (input) {
    input.value = '';
  }
};

/**
 * 普通上传文档
 */
const triggerSingleUpload = () => {
  if (!state.knowledgeBaseId) {
    ElMessage.warning(t('knowledgeBase.message.selectKnowledgeBaseFirst'));
    return;
  }

  // 普通上传不携带版本 uuid
  versionUpdateUuid.value = '';

  // 点击前先清空，否则重复选择同一个文件不会触发 change
  resetSingleUploadInput();

  const input = getSingleUploadInput();

  input?.click();
};

/**
 * 更新文档版本
 * 完全复用单文件上传逻辑，仅记录当前行 uuid
 */
const triggerVersionUpdate = (row: any) => {
  if (!state.knowledgeBaseId) {
    ElMessage.warning(t('knowledgeBase.message.selectKnowledgeBaseFirst'));
    return;
  }

  // 保存当前需要更新版本的文档 uuid
  versionUpdateUuid.value = row.uuid;

  // 清空上一次选择，允许再次选择相同文件
  resetSingleUploadInput();

  const input = getSingleUploadInput();

  input?.click();
};

/**
 * 判断指定文档是否正在重建索引。
 */
const isBuilding = (id: string | number) => {
  return buildingIds.has(String(id));
};

/**
 * 停止指定文档的索引状态轮询。
 */
const stopRebuildPolling = (id: string | number) => {
  const key = String(id);
  const timer = rebuildTimers.get(key);

  if (timer) {
    clearInterval(timer);
    rebuildTimers.delete(key);
  }
};

/**
 * 停止全部文档的索引状态轮询。
 */
const stopAllRebuildPolling = () => {
  rebuildTimers.forEach((timer) => {
    clearInterval(timer);
  });

  rebuildTimers.clear();
  buildingIds.clear();
};

/**
 * 每 2 秒查询一次索引重建状态。
 * getrebuildStatus 返回 res.data 有值时，表示当前文档构建完成。
 */
const startRebuildPolling = (id: string) => {
  const key = String(id);

  // 防止同一个文档重复创建轮询
  if (rebuildTimers.has(key)) return;

  const timer = setInterval(async () => {
    try {
      const res = await api.base.getKnowledgeDocument(state.knowledgeBaseId);
      state.tableData = res.data;

      if (!hasProcessingDocument()) {
        buildingIds.delete(key);
        stopRebuildPolling(key);
      }
    } catch (error) {
      console.error(`获取文档 ${key} 索引构建状态失败：`, error);
    }
  }, 2000);

  rebuildTimers.set(key, timer);
};

/**
 * 重建索引。
 * rebuildIndex 返回 res.data 有值后进入“构建中”，
 * 并开始轮询 getrebuildStatus。
 */
const handleRebuildIndex = async (row: any) => {
  const id = row?.id;

  if (id === undefined || id === null || id === '' || isBuilding(id)) return;

  try {
    const res = await api.base.rebuildIndex(id);

    if (res.data) {
      buildingIds.add(String(id));
      startRebuildPolling(id);
    }
  } catch (error) {
    console.error(`文档 ${id} 重建索引失败：`, error);
  }
};
const handleSingleUploadChange = async (file: any) => {
  if (!state.knowledgeBaseId) {
    ElMessage.warning(t('knowledgeBase.message.selectKnowledgeBaseFirst'));
    versionUpdateUuid.value = '';
    resetSingleUploadInput();
    return;
  }

  const rawFile = file.raw as File | undefined;

  if (!rawFile) {
    versionUpdateUuid.value = '';
    resetSingleUploadInput();
    return;
  }

  try {
    if (splitConfigFormRef.value && !splitConfigFormRef.value.validate()) {
      ElMessage.warning(t('splitConfigForm.overlapRule'));
      resetSingleUploadInput();
      versionUpdateUuid.value = '';
      return;
    }

    const { data } = await api.base.getoDssUpload('fengda-file', rawFile);

    const params: any = {
      knowledgeBaseId: state.knowledgeBaseId,
      fileUrl: data.filePolicyUrl,
      originalName: data.fileOriginalName,
      savedFileName: data.fileName,
      fileSize: data.fileSize,
      bucketName: data.bucketName,
      // 可选：文档级分片配置随参（先于分片/向量化生效；NULL=跟随知识库/全局）
      ...buildUploadSplitPayload(),
    };

    // 只有点击”更新版本”时才额外携带 uuid
    if (versionUpdateUuid.value) {
      params.uuid = versionUpdateUuid.value;
    }

    await api.base.createDocByFile(params);

    ElMessage.success(t('knowledgeBase.message.uploadSuccess'));

    // 上传成功后立即拉一次详情，并进入轮询
    getDetail(state.knowledgeBaseId, {
      refreshList: true,
    });

    // 版本更新后，确保同 uuid 只有一个版本被应用（最新版本）
    if (versionUpdateUuid.value) {
      const uuid = versionUpdateUuid.value;
      const appliedDocs = state.tableData
        .filter((item: any) => String(item.uuid || '') === uuid && String(item.isApply) === '1')
        .sort((a, b) => compareVersionDesc(a, b));

      // 保留最新版本（排序后第一个），关闭其余旧版本的应用状态
      for (let i = 1; i < appliedDocs.length; i++) {
        const doc = appliedDocs[i];
        doc.isApply = '0';
        try {
          await api.base.updateApplyFileStatus({
            knowledgeBaseId: state.knowledgeBaseId,
            documentId: doc.documentId || doc.id,
            uuid: doc.uuid,
            apply: '0',
          });
        } catch {
          // 单个接口失败不影响其他处理
        }
      }
    }
  } finally {
    // 上传结束后清空版本更新状态
    versionUpdateUuid.value = '';

    // 上传结束后再次清空，保证下次上传同一个文件也会触发 change
    resetSingleUploadInput();
  }
};

/**
 * limit=1 的兜底。
 * 某些情况下如果内部 fileList 没清干净，重复选择文件会触发 exceed 而不是 change。
 */
const handleSingleUploadExceed = (files: File[]) => {
  resetSingleUploadInput();

  const file = files[0];

  if (!file) return;

  handleSingleUploadChange({
    raw: file,
  });
};

const handleDragUploadChange = (_file: any, fileList: any[]) => {
  if (dragUploadTimer.value) {
    window.clearTimeout(dragUploadTimer.value);
  }

  dragUploadTimer.value = window.setTimeout(async () => {
    if (!state.knowledgeBaseId) {
      ElMessage.warning(t('knowledgeBase.message.selectKnowledgeBaseFirst'));
      dragUploadTimer.value = null;
      dragUploadRef.value?.clearFiles?.();
      return;
    }

    const files = fileList.map((item) => item.raw).filter(Boolean) as File[];

    if (!files.length) {
      dragUploadTimer.value = null;
      dragUploadRef.value?.clearFiles?.();
      return;
    }

    try {
      if (splitConfigFormRef.value && !splitConfigFormRef.value.validate()) {
        ElMessage.warning(t('splitConfigForm.overlapRule'));
        return;
      }

      const { data } = await api.base.getoDssUploads('fengda-file', files);

      const docFiles = Object.values(data).map((item: any) => ({
        fileUrl: item.filePolicyUrl,
        originalName: item.fileOriginalName,
        savedFileName: item.fileName,
        fileSize: item.fileSize,
        bucketName: item.bucketName,
      }));

      await api.base.createDocByFiles({
        knowledgeBaseId: state.knowledgeBaseId,
        files: docFiles,
        // 批级分片配置：整批文档统一应用（可选，NULL=跟随知识库/全局）
        ...buildUploadSplitPayload(),
      });

      ElMessage.success(t('knowledgeBase.message.batchUploadSuccess'));

      getDetail(state.knowledgeBaseId, {
        refreshList: true,
      });
    } finally {
      dragUploadTimer.value = null;
      dragUploadRef.value?.clearFiles?.();
    }
  }, 100);
};

const getKnowledgeSupportedFormats = () => {
  api.base.getKnowledgeSupportedFormats().then((res) => {
    supportedFormats.value = res.data.formats.join(locale.value === 'en-US' ? ', ' : '，');
  });
};

const handleAddClick = () => {
  kbDialogRef.value?.open();
};

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString(locale.value === 'en-US' ? 'en-US' : 'zh-CN');
};

const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 B';

  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;

  const index = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, index);

  return `${parseFloat(size.toFixed(decimals))} ${units[index]}`;
};

const handleKnowledgeRefresh = () => {
  getKnowledgeList();

  if (state.knowledgeBaseId) {
    getDetail(state.knowledgeBaseId);
  }
};

const getKnowledgeList = (fromCache = false) => {
  api.base.getKnowledgeList({ page: 1, limit: 9999 }).then((res) => {
    state.menuData = res.data;
    saveCacheState();

    if (res.data.length > 0 && !state.knowledgeBaseId) {
      const firstId = res.data[0].id;

      getDetail(firstId, {
        refreshList: false,
      });
    } else if (fromCache && state.knowledgeBaseId) {
      // 从缓存恢复后，后台刷新当前知识库详情（静默更新，避免空白闪现）
      getDetail(state.knowledgeBaseId, {
        refreshList: false,
      });
    }
  });
};

const getDetail = async (
  id: string,
  options: {
    refreshList?: boolean;
    fromPolling?: boolean;
  } = {},
) => {
  if (!id) return;

  // 避免轮询请求还没回来，又发下一次
  if (options.fromPolling && isDetailPollingRequesting.value) {
    return;
  }

  clearDetailPolling();

  state.knowledgeBaseId = id;
  saveCacheState();
  isDetailPollingRequesting.value = true;

  try {
    const [documentRes, statsRes] = await Promise.all([
      api.base.getKnowledgeDocument(id),
      api.base.getKnowledgeDocumentStats(id),
    ]);

    // 如果用户在请求过程中切换了知识库，就丢弃旧请求结果
    if (state.knowledgeBaseId !== id) {
      return;
    }

    state.tableData = documentRes.data;
    state.statisticalInfo = statsRes.data;
    saveCacheState();

    if (options.refreshList) {
      getKnowledgeList();
    } else {
      documentSearchQuery.value = '';
    }

    // 只要还有处理中状态，就继续轮询当前知识库详情
    if (hasProcessingDocument()) {
      scheduleDetailPolling(id);
    } else {
      clearDetailPolling();
    }
  } catch (error) {
    console.log(error);

    // 轮询失败时不要疯狂重试，这里延迟下一次即可
    if (state.knowledgeBaseId === id) {
      scheduleDetailPolling(id);
    }
  } finally {
    isDetailPollingRequesting.value = false;
  }
};

/**
 * 手动刷新当前知识库详情。
 * 仅替代 getDetail 原有的自动轮询，不影响重建索引的独立轮询。
 */
const handleManualRefresh = async () => {
  const id = state.knowledgeBaseId;

  if (!id || refreshing.value) return;

  refreshing.value = true;

  try {
    await getDetail(id, {
      refreshList: true,
    });
  } finally {
    refreshing.value = false;
  }
};

const removeKnowledge = (id: string) => {
  ElMessageBox.confirm(
    t('knowledgeBase.message.deleteKnowledgeConfirm'),
    t('knowledgeBase.message.tips'),
    {
      confirmButtonText: t('knowledgeBase.message.confirm'),
      cancelButtonText: t('knowledgeBase.message.cancel'),
      type: 'warning',
      confirmButtonClass: 'confirmButton',
    },
  ).then(() => {
    api.base.removeKnowledge(id).then(() => {
      ElMessage.success(t('knowledgeBase.message.deleteSuccess'));

      if (state.knowledgeBaseId === id) {
        clearDetailPolling();
      }

      state.knowledgeBaseId = '';
      state.tableData = [];
      state.statisticalInfo = {};
      sessionStorage.removeItem(CACHE_KEY);

      getKnowledgeList();
    });
  });
};

const removeDocument = (id: string) => {
  ElMessageBox.confirm(
    t('knowledgeBase.message.deleteDocumentConfirm'),
    t('knowledgeBase.message.tips'),
    {
      confirmButtonText: t('knowledgeBase.message.confirm'),
      cancelButtonText: t('knowledgeBase.message.cancel'),
      type: 'warning',
      confirmButtonClass: 'confirmButton',
    },
  ).then(() => {
    api.base.removeKnowledgeDocument(id).then(() => {
      ElMessage.success(t('knowledgeBase.message.deleteSuccess'));

      getDetail(state.knowledgeBaseId, {
        refreshList: true,
      });
    });
  });
};

const editKnowledge = (item: any) => {
  kbDialogRef.value?.open(item);
};

const handlePreviewFile = (row: any) => {
  filePreviewDialogRef.value?.open(row);
};

onMounted(() => {
  // 先从缓存恢复，避免返回页面时出现空白闪现
  const hasCache = restoreCacheState();
  // 后台拉取最新数据（有缓存时静默更新）
  getKnowledgeList(hasCache);
  getKnowledgeSupportedFormats();
});

onBeforeUnmount(() => {
  clearDetailPolling();
  stopAllRebuildPolling();

  if (dragUploadTimer.value) {
    window.clearTimeout(dragUploadTimer.value);
    dragUploadTimer.value = null;
  }
});
</script>

<style scoped lang="scss">
.knowledge-app {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #4a382c;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 28%),
    linear-gradient(180deg, #fff9f3 0%, #fdf8f3 100%);

  /* 移动端顶部导航 */
  .mobile-navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    padding: 0 15px;
    background: rgb(255 255 255 / 96%);
    border-bottom: 1px solid #f0dfcf;
    box-shadow: 0 4px 14px rgb(126 72 24 / 5%);

    .navbar-title {
      font-size: 15px;
      font-weight: 700;
      color: #4a382c;
    }

    :deep(.el-button--primary) {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      box-shadow: 0 5px 12px rgb(249 115 22 / 20%);

      &:hover {
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
      }
    }

    :deep(.el-button.is-link) {
      color: #8d7868;

      &:hover {
        color: #f97316;
      }
    }
  }

  .app-container {
    flex: 1;
    overflow: hidden;
  }
}

/* 左侧知识库导航 */
.side-nav {
  display: flex;
  flex-direction: column;
  padding: 10px;
  margin: 22px;
  margin-right: 0;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 250 245 / 96%) 0%, #fff 180px), #fff;
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow:
    0 10px 28px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;

  .nav-header {
    position: relative;
    flex-shrink: 0;
    padding: 20px 16px;
    font-size: 16px;
    font-weight: 700;
    color: #4a382c;

    &::after {
      position: absolute;
      right: 16px;
      bottom: 7px;
      left: 16px;
      height: 1px;
      content: '';
      background: linear-gradient(90deg, #ffd4ad, transparent);
    }
  }

  /* 左侧搜索 */
  .menu-search {
    padding: 4px 16px 12px;

    :deep(.el-input__wrapper) {
      min-height: 40px;
      background: #fff7ef;
      border-radius: 11px;
      box-shadow: 0 0 0 1px #f1dfcf inset;
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
        color: #b19b8b;
      }
    }

    :deep(.el-input__prefix) {
      color: #d88a4b;
    }
  }

  .menu-items {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    padding: 0 8px;
    overflow-y: auto;
    scrollbar-color: #e7b889 transparent;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 6px;
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

    /* 知识库菜单项 */
    .menu-item {
      position: relative;
      display: flex;
      align-items: center;
      padding: 12px;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 12px;
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;

      &:hover {
        background: #fff7ef;
        border-color: #ffe0c2;
        box-shadow: 0 5px 14px rgb(249 115 22 / 6%);
        transform: translateY(-1px);

        .menu-icon {
          box-shadow: 0 5px 12px rgb(249 115 22 / 14%);
          transform: scale(1.03);
        }

        .op-actions {
          opacity: 1;
        }
      }

      &.active {
        background: linear-gradient(135deg, #fff1e5 0%, #fff7ef 100%);
        border-color: #ffc995;
        box-shadow:
          inset 3px 0 0 #ff8a26,
          0 6px 16px rgb(249 115 22 / 8%);

        .menu-icon {
          color: #fff !important;
          background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%) !important;
          box-shadow: 0 6px 14px rgb(249 115 22 / 20%);
        }

        .menu-name {
          font-weight: 600 !important;
          color: #d95f06 !important;
        }

        .menu-count {
          color: #c88752 !important;
        }
      }

      /* 覆盖 template 中内联颜色，统一橙色 */
      .menu-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        margin-right: 12px;
        font-size: 18px;
        color: #e86f0b !important;
        background: #fff0e2 !important;
        border: 1px solid #ffd8b5;
        border-radius: 10px;
        transition:
          color 0.2s ease,
          background 0.2s ease,
          box-shadow 0.2s ease,
          transform 0.2s ease;

        .fallback-icon {
          font-size: 16px;
          font-weight: 700;
        }
      }

      .menu-info {
        flex: 1;
        min-width: 0;

        .menu-name {
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
          font-weight: 500;
          color: #4a382c;
          white-space: nowrap;
          transition: color 0.2s ease;
        }

        .menu-count {
          font-size: 12px;
          color: #a28c7c;
          transition: color 0.2s ease;
        }
      }

      .custom-badge {
        flex-shrink: 0;
        padding: 2px 8px;
        margin-left: 8px;
        font-size: 11px;
        color: #fff;
        background: linear-gradient(135deg, #ff9a3d, #f97316);
        border: 1px solid rgb(255 255 255 / 30%);
        border-radius: 12px;
        box-shadow: 0 3px 8px rgb(249 115 22 / 18%);
        transform: scale(0.9);
      }

      .op-actions {
        position: absolute;
        right: 10px;
        display: flex;
        gap: 6px;
        align-items: center;
        padding: 5px 6px;
        background: rgb(255 255 255 / 94%);
        border: 1px solid #f3e1d1;
        border-radius: 9px;
        box-shadow: 0 5px 14px rgb(126 72 24 / 8%);
        opacity: 0;
        transition: opacity 0.2s ease;

        .op-icon {
          padding: 3px;
          font-size: 16px;
          color: #9b8474;
          cursor: pointer;
          border-radius: 6px;
          transition:
            color 0.18s ease,
            background 0.18s ease,
            transform 0.18s ease;

          &:hover {
            color: #f97316;
            background: #ffead7;
            transform: translateY(-1px);
          }
        }

        .op-icon-delete {
          padding: 3px;
          margin-right: 0;
          font-size: 16px;
          color: #ef4444;
          cursor: pointer;
          border-radius: 6px;
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
      }
    }
  }

  /* 添加知识库 */
  .add-kb-btn {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding: 14px;
    margin: 6px 8px 4px;
    font-size: 14px;
    font-weight: 500;
    color: #d96a0d;
    cursor: pointer;
    background: #fff8f1;
    border: 1px dashed #f1b77f;
    border-radius: 10px;
    transition:
      color 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      box-shadow: 0 8px 18px rgb(249 115 22 / 18%);
      transform: translateY(-1px);
    }

    .el-icon {
      margin-right: 8px;
      font-size: 16px;
    }
  }
}

/* 主体内容 */
.main-content {
  padding: 22px;

  .content-card {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 32px;
    overflow: hidden;
    background: radial-gradient(circle at 100% 0%, rgb(255 138 38 / 5%) 0%, transparent 26%), #fff;
    border: 1px solid #f0dfcf;
    border-radius: 16px;
    box-shadow:
      0 10px 30px rgb(126 72 24 / 7%),
      0 0 0 1px rgb(255 255 255 / 72%) inset;

    /* 标题区域 */
    .content-header {
      display: flex;
      flex-shrink: 0;
      justify-content: space-between;
      margin-bottom: 24px;

      .header-text {
        h2 {
          position: relative;
          padding-left: 13px;
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #4a382c;

          &::before {
            position: absolute;
            top: 50%;
            left: 0;
            width: 4px;
            height: 20px;
            content: '';
            background: linear-gradient(180deg, #ff9a3d, #f97316);
            border-radius: 999px;
            transform: translateY(-50%);
          }
        }

        p {
          margin: 7px 0 0 13px;
          font-size: 13px;
          color: #a18b7b;
        }
      }
    }

    /* 统计卡片 */
    .stat-row {
      display: flex;
      flex-shrink: 0;
      flex-wrap: wrap;
      align-items: stretch;
      margin-bottom: 12px;

      .el-col {
        display: flex;
        margin-bottom: 10px;
      }

      .stat-card {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        overflow: hidden;
        background: linear-gradient(135deg, #fffaf5 0%, #fff 100%);
        border: 1px solid #f0dfcf;
        border-radius: 12px;
        box-shadow: 0 5px 16px rgb(126 72 24 / 4%);
        transition:
          border-color 0.22s ease,
          box-shadow 0.22s ease,
          transform 0.22s ease;

        &::before {
          position: absolute;
          top: 0;
          right: 18px;
          left: 18px;
          height: 2px;
          content: '';
          background: linear-gradient(90deg, transparent, #ff9a3d, transparent);
          opacity: 0;
          transition: opacity 0.22s ease;
        }

        &:hover {
          border-color: #ffc58f;
          box-shadow: 0 10px 24px rgb(249 115 22 / 10%);
          transform: translateY(-2px);

          &::before {
            opacity: 1;
          }

          .icon-dot {
            box-shadow: 0 0 0 5px rgb(255 138 38 / 9%);
            transform: scale(1.12);
          }
        }

        :deep(.el-card__body) {
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: space-between;
          padding: 12px 14px;
        }

        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 12px;
          color: #806b5b;

          .icon-dot {
            width: 8px;
            height: 8px;
            background: #ff8a26;
            border-radius: 50%;
            box-shadow: 0 0 0 3px rgb(255 138 38 / 10%);
            transition:
              box-shadow 0.2s ease,
              transform 0.2s ease;
          }
        }

        .stat-value {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 21px;
          font-weight: 700;
          line-height: 1.15;
          color: #4a382c;
          white-space: nowrap;
        }

        .progress-middle {
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: center;
          margin: 12px 0;
        }

        .stat-footer {
          margin-top: 12px;
          font-size: 12px;
          color: #e86f0b;
        }

        .progress-txt {
          display: flex;
          justify-content: space-between;
          color: #a18b7b;
        }
      }
    }

    /* 文档管理区域 */
    .table-box {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      background: #fff;
      border: 1px solid #f0dfcf;
      border-radius: 14px;
      box-shadow: 0 6px 20px rgb(126 72 24 / 5%);

      :deep(.el-card__body) {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
        padding: 20px;
        overflow: visible;
      }

      .document-manager {
        flex-shrink: 0;
      }

      .document-manager-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
      }

      .document-manager-title {
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 18px;
        font-weight: 700;
        color: #4a382c;

        .el-icon {
          font-size: 18px;
          color: #f97316;
        }
      }

      /* 上传动作区：分片配置(可选) + 刷新 + 上传按钮 */
      .upload-actions {
        display: flex;
        gap: 10px;
        align-items: center;

        .split-config-btn {
          height: 38px;
          padding: 0 20px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
          border: 1px solid #ff8a26;
          border-radius: 10px;
          box-shadow: 0 6px 16px rgb(249 115 22 / 20%);
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.2s ease;

          .el-icon {
            margin-right: 4px;
          }

          &:hover:not(.is-disabled) {
            background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
            box-shadow: 0 8px 20px rgb(249 115 22 / 26%);
            transform: translateY(-1px);
          }

          &.is-disabled {
            color: #fff;
            background: #ffc89a;
            border-color: #ffc89a;
            box-shadow: none;
          }
        }
      }

      /* 手动刷新按钮 */
      .refresh-doc-btn {
        width: 38px;
        height: 38px;
        padding: 0;
        color: #f97316;
        background: #fff7ef;
        border: 1px solid #ffc58f;
        border-radius: 10px;
        box-shadow: 0 5px 14px rgb(249 115 22 / 10%);
        transition:
          color 0.2s ease,
          background 0.2s ease,
          border-color 0.2s ease,
          box-shadow 0.2s ease,
          transform 0.2s ease;

        &:hover:not(.is-disabled) {
          color: #fff;
          background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
          border-color: #ff8a26;
          box-shadow: 0 7px 18px rgb(249 115 22 / 22%);
          transform: translateY(-1px);
        }

        &.is-disabled {
          color: #d8b89d;
          background: #fffaf5;
          border-color: #f0dfcf;
          box-shadow: none;
        }
      }

      /* 上传按钮 */
      .upload-doc-btn {
        height: 38px;
        padding: 0 20px;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
        border: 1px solid #ff8a26;
        border-radius: 10px;
        box-shadow: 0 6px 16px rgb(249 115 22 / 20%);
        transition:
          background 0.2s ease,
          box-shadow 0.2s ease,
          transform 0.2s ease;

        &:hover:not(.is-disabled) {
          background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
          box-shadow: 0 8px 20px rgb(249 115 22 / 26%);
          transform: translateY(-1px);
        }

        &.is-disabled {
          color: #fff;
          background: #ffc89a;
          border-color: #ffc89a;
          box-shadow: none;
        }
      }

      .single-upload-hidden {
        display: none;
      }

      /* 拖拽上传 */
      .document-upload {
        width: 100%;

        :deep(.el-upload) {
          width: 100%;
        }

        :deep(.el-upload-dragger) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 150px;
          padding: 0;
          background:
            radial-gradient(circle at 50% 20%, rgb(255 138 38 / 7%), transparent 44%), #fffaf5;
          border: 1px dashed #e9a96d;
          border-radius: 12px;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.2s ease;

          &:hover {
            background:
              radial-gradient(circle at 50% 20%, rgb(255 138 38 / 10%), transparent 46%), #fff7ef;
            border-color: #ff8a26;
            box-shadow:
              0 0 0 4px rgb(255 138 38 / 6%),
              0 10px 24px rgb(249 115 22 / 8%);
            transform: translateY(-1px);
          }
        }
      }

      .upload-drop-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .upload-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        margin-bottom: 16px;
        font-size: 30px;
        color: #fff;
        background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
        border-radius: 15px;
        box-shadow:
          0 8px 18px rgb(249 115 22 / 22%),
          0 0 0 5px rgb(255 138 38 / 6%);
      }

      .upload-main-text {
        margin-bottom: 10px;
        font-size: 15px;
        font-weight: 600;
        color: #5b4738;
      }

      .upload-sub-text {
        max-width: 760px;
        font-size: 13px;
        line-height: 1.6;
        color: #a18b7b;
        text-align: center;
      }

      /* 文档搜索 */
      .document-search {
        flex-shrink: 0;
        margin: 14px 0 12px;

        :deep(.el-input) {
          width: 100%;
        }

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
      }

      .table-scroll-wrapper {
        flex: 1;
        min-height: 220px;
        overflow: hidden;
        border: 1px solid #f1e1d2;
        border-radius: 12px;
      }

      .responsive-table {
        height: 100%;
      }

      /* 表格 */
      :deep(.el-table) {
        color: #5b4738;
        background: #fff;

        --el-table-border-color: #f2e2d4;
        --el-table-header-bg-color: #fff7ef;
        --el-table-row-hover-bg-color: #fffaf5;
        --el-table-current-row-bg-color: #fff4e9;
      }

      :deep(.el-table th.el-table__cell) {
        height: 46px;
        font-weight: 600;
        color: #6b5545;
        background: #fff7ef;
      }

      :deep(.el-table td.el-table__cell) {
        border-bottom-color: #f3e4d6;
      }

      :deep(.el-table__body tr:hover > td.el-table__cell) {
        background: #fffaf5;
      }

      /* ==================== 版本折叠层级优化 ==================== */

      /* 最新版本主行：轻微橙色强调，和普通独立文档保持克制区分 */
      :deep(.el-table__body tr.version-latest-row > td.el-table__cell) {
        background: linear-gradient(90deg, #fff8f1 0%, #fffdfb 72%, #fff 100%);
        border-bottom-color: #f2d9c3;
      }

      :deep(.el-table__body tr.version-latest-row > td.el-table__cell:first-child) {
        box-shadow: inset 3px 0 0 #ff8a26;
      }

      :deep(.el-table__body tr.version-latest-row:hover > td.el-table__cell) {
        background: linear-gradient(90deg, #fff3e8 0%, #fff9f3 72%, #fffaf6 100%);
      }

      /* 历史版本行：弱化背景与文字，让它明显从属于最新版本 */
      :deep(.el-table__body tr.version-history-row > td.el-table__cell) {
        color: #7f6d60;
        background: #fcfaf8;
        border-bottom-color: #f1e8e1;
      }

      :deep(.el-table__body tr.version-history-row:hover > td.el-table__cell) {
        background: #fff7ef;
      }

      :deep(.el-table__body tr.version-history-row .doc-icon) {
        width: 30px;
        height: 30px;
        font-size: 16px;
        background: #f8f2ed;
        border-color: #eadbd0;
        opacity: 0.88;
      }

      :deep(.el-table__body tr.version-history-row .doc-info .name) {
        font-size: 13px;
        font-weight: 500;
        color: #74645a;
      }

      :deep(.el-table__body tr.version-history-row .doc-info .meta) {
        color: #ae9b8d;
      }

      /* 历史版本文档内容：额外缩进由脚本按新旧程度动态计算 */
      .history-version-cell {
        position: relative;
        transition: margin-left 0.2s ease;

        &::before {
          position: absolute;
          top: 50%;
          left: -16px;
          width: 11px;
          height: 1px;
          content: '';
          background: #dfb993;
          border-radius: 999px;
          transform: translateY(-50%);
        }

        &::after {
          position: absolute;
          top: 50%;
          left: -18px;
          width: 5px;
          height: 5px;
          content: '';
          background: #d9a16e;
          border: 2px solid #fcfaf8;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
      }

      /* 折叠箭头改为高识别度按钮，展开/收起状态仍沿用 Element Plus 原逻辑 */
      :deep(.el-table__expand-icon) {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        margin-right: 9px;
        color: #fff;
        cursor: pointer;
        background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
        border: 1px solid #f97316;
        border-radius: 8px;
        box-shadow:
          0 4px 10px rgb(249 115 22 / 22%),
          0 0 0 3px rgb(255 138 38 / 7%);
        transition:
          transform 0.2s ease,
          background 0.2s ease,
          border-color 0.2s ease,
          box-shadow 0.2s ease;
      }

      :deep(.el-table__expand-icon .el-icon) {
        width: 18px;
        height: 18px;
        font-size: 18px;
        font-weight: 700;
      }

      :deep(.el-table__expand-icon svg) {
        width: 18px;
        height: 18px;
        stroke-width: 2.4;
      }

      :deep(.el-table__expand-icon:hover) {
        color: #fff;
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #e9680a;
        box-shadow:
          0 6px 14px rgb(249 115 22 / 30%),
          0 0 0 4px rgb(255 138 38 / 10%);
      }

      :deep(.el-table__expand-icon--expanded) {
        background: linear-gradient(135deg, #f97316 0%, #dc5f08 100%);
        border-color: #dc5f08;
        box-shadow:
          0 5px 12px rgb(249 115 22 / 28%),
          0 0 0 3px rgb(255 138 38 / 10%);
      }

      /* 没有子版本的普通行占位保持原尺寸，避免影响原表格对齐 */
      :deep(.el-table__placeholder) {
        width: 28px;
        margin-right: 9px;
      }

      :deep(.el-table__body-wrapper) {
        overflow-y: auto;
        scrollbar-color: #e7b889 transparent;
        scrollbar-width: thin;
      }

      :deep(.el-table__body-wrapper::-webkit-scrollbar) {
        width: 8px;
        height: 8px;
      }

      :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
        background: #e7b889;
        border-radius: 8px;
      }

      :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb:hover) {
        background: #d99a5d;
      }

      :deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
        background: transparent;
      }

      /* 状态标签 */
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

      .doc-cell {
        display: flex;
        gap: 12px;
        align-items: center;

        .doc-icon {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          font-size: 18px;
          background: #fff0e2;
          border: 1px solid #ffdfc1;
          border-radius: 9px;
          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        &:hover .doc-icon {
          background: #ffead7;
          transform: scale(1.04);
        }

        .doc-info {
          min-width: 0;

          .name {
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 14px;
            font-weight: 500;
            color: #4a382c;
            white-space: nowrap;
          }

          .meta {
            margin-top: 3px;
            font-size: 12px;
            color: #a18b7b;
          }
        }
      }
    }
  }
}

/* 全局 Element Plus 主按钮橙色 */
:deep(.el-button--primary) {
  color: #fff;
  background: #ff8a26;
  border-color: #ff8a26;

  &:hover:not(.is-disabled),
  &:focus:not(.is-disabled) {
    background: #f97316;
    border-color: #f97316;
  }

  &:active:not(.is-disabled) {
    background: #e9680a;
    border-color: #e9680a;
  }
}

/* 加载状态 */
:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 大屏统计卡片改为单行 7 列，释放更多空间给文档列表 */
@media (width >=1200px) {
  .main-content {
    .content-card {
      .stat-row {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 12px;
        margin-right: 0 !important;
        margin-bottom: 14px;
        margin-left: 0 !important;

        > .el-col {
          width: 100%;
          max-width: none;
          padding-right: 0 !important;
          padding-left: 0 !important;
          margin-bottom: 0;
        }

        .stat-card {
          min-width: 0;

          .stat-value {
            font-size: 20px;
          }
        }
      }
    }
  }
}

/* 移动端 */
@media (width <=768px) {
  .knowledge-app {
    background: #fff9f3;
  }

  .main-content {
    padding: 16px;
    overflow-y: auto;

    .content-card {
      height: auto;
      min-height: 100%;
      padding: 20px;
      border-radius: 14px;
    }

    .content-header {
      .header-text {
        h2 {
          font-size: 18px;
        }
      }
    }

    .stat-row {
      .stat-card {
        .stat-value {
          font-size: 22px;
        }
      }
    }

    .table-box {
      min-height: 420px;

      .document-manager-header {
        gap: 12px;
      }

      .upload-actions {
        gap: 8px;
      }

      .refresh-doc-btn {
        flex-shrink: 0;
      }

      .upload-doc-btn {
        flex-shrink: 0;
        padding: 0 14px;
      }

      .document-upload {
        :deep(.el-upload-dragger) {
          height: 190px;
        }
      }

      .table-scroll-wrapper {
        min-height: 260px;
      }
    }
  }
}

@media (width <=480px) {
  .main-content {
    padding: 10px;

    .content-card {
      padding: 16px;
    }

    .document-manager-header {
      align-items: flex-start !important;
    }

    .document-manager-title {
      font-size: 16px !important;
    }

    .upload-actions {
      gap: 8px !important;
    }

    .refresh-doc-btn {
      width: 36px !important;
      height: 36px !important;
    }

    .upload-doc-btn {
      height: 36px !important;
      padding: 0 12px !important;
      font-size: 13px !important;
    }

    .document-upload {
      :deep(.el-upload-dragger) {
        height: 170px;
      }
    }

    .upload-icon-box {
      width: 46px !important;
      height: 46px !important;
      font-size: 26px !important;
    }

    .upload-main-text {
      font-size: 14px !important;
    }

    .upload-sub-text {
      padding: 0 12px;
      font-size: 12px !important;
    }
  }
}
</style>
