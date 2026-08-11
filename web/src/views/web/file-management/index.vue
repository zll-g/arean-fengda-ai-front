<template>
  <div class="file-page">
    <el-card class="file-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="title-wrap">
            <div class="card-title">{{ t('fileManagement.pageTitle') }}</div>
          </div>

          <div class="header-actions">
            <el-input
              v-model.trim="searchKeyword"
              class="search-input"
              clearable
              :placeholder="t('fileManagement.searchPlaceholder')"
              :prefix-icon="Search"
              @keyup.enter="handleSearch"
              @clear="handleResetSearch"
            />

            <el-button class="search-btn" type="primary" @click="handleSearch">
              {{ t('fileManagement.search') }}
            </el-button>

            <el-button v-if="searchKeyword" class="reset-btn" @click="handleResetSearch">
              {{ t('fileManagement.reset') }}
            </el-button>

            <el-button
              class="embed-open-btn"
              type="primary"
              plain
              :disabled="!selectedRows.length"
              @click="openEmbedDialog()"
            >
              {{ t('fileManagement.embedSelected') }}
              <span v-if="selectedRows.length">({{ selectedRows.length }})</span>
            </el-button>

            <el-button class="upload-open-btn" type="primary" @click="openUploadDialog">
              {{ t('fileManagement.uploadDocument') }}
            </el-button>
          </div>
        </div>
      </template>

      <div class="content-layout">
        <aside class="org-panel">
          <div class="org-panel-header">
            <div class="org-panel-title">{{ t('organizationInfo.title') }}</div>
          </div>

          <el-input
            v-model.trim="orgSearchKeyword"
            class="org-search-input"
            clearable
            :placeholder="t('organizationInfo.searchPlaceholder')"
            :prefix-icon="Search"
            @input="applyOrgSearch"
            @clear="handleResetOrgSearch"
          />

          <div v-loading="orgLoading" class="org-tree-wrap">
            <el-empty
              v-if="!orgTreeData.length"
              :description="orgErrorMessage || t('organizationInfo.empty')"
              :image-size="90"
            />

            <el-tree
              v-else
              ref="orgTreeRef"
              class="org-tree"
              node-key="id"
              highlight-current
              default-expand-all
              :data="orgTreeData"
              :props="orgTreeProps"
              :current-node-key="selectedOrgId"
              :expand-on-click-node="false"
              @node-click="handleOrganizationNodeClick"
              @node-contextmenu="handleOrganizationNodeContextmenu"
            >
              <template #default="{ data }">
                <div class="org-tree-node" :title="data.name || '-'">
                  <span class="org-node-dot" />
                  <span class="org-node-name">{{ data.name || '-' }}</span>
                </div>
              </template>
            </el-tree>
          </div>
        </aside>

        <section class="file-content">
          <div class="table-area">
            <el-table
              v-loading="loading"
              :data="tableData"
              row-key="id"
              class="file-table"
              height="100%"
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="54" fixed />

              <el-table-column :label="t('fileManagement.table.fileName')" min-width="300">
                <template #default="{ row }">
                  <div class="file-name">
                    <el-tooltip
                      effect="dark"
                      placement="top"
                      popper-class="file-tooltip"
                      :content="row.fileOriginalName || '-'"
                      :disabled="!row.fileOriginalName"
                    >
                      <span class="name-text">{{ row.fileOriginalName || '-' }}</span>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>

              <el-table-column :label="t('fileManagement.table.fileSuffix')" width="110">
                <template #default="{ row }">
                  <el-tooltip
                    effect="dark"
                    placement="top"
                    popper-class="file-tooltip"
                    :content="getFileSuffix(row.fileSuffix, row.fileType)"
                  >
                    <el-tag effect="light">
                      {{ getFileSuffix(row.fileSuffix, row.fileType) }}
                    </el-tag>
                  </el-tooltip>
                </template>
              </el-table-column>

              <el-table-column :label="t('fileManagement.table.fileSize')" width="110">
                <template #default="{ row }">
                  <el-tooltip
                    effect="dark"
                    placement="top"
                    popper-class="file-tooltip"
                    :content="formatFileSize(row.fileSize)"
                  >
                    <span>{{ formatFileSize(row.fileSize) }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>

              <el-table-column :label="t('fileManagement.table.fileType')" min-width="220">
                <template #default="{ row }">
                  <el-tooltip
                    effect="dark"
                    placement="top"
                    popper-class="file-tooltip"
                    :content="row.fileType || '-'"
                    :disabled="!row.fileType"
                  >
                    <span class="ellipsis-text">{{ row.fileType || '-' }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>

              <el-table-column :label="t('fileManagement.table.uploadTime')" width="180">
                <template #default="{ row }">
                  <el-tooltip
                    effect="dark"
                    placement="top"
                    popper-class="file-tooltip"
                    :content="row.createTime || '-'"
                    :disabled="!row.createTime"
                  >
                    <span class="ellipsis-text">{{ row.createTime || '-' }}</span>
                  </el-tooltip>
                </template>
              </el-table-column>

              <el-table-column :label="t('fileManagement.table.status')" width="100">
                <template #default="{ row }">
                  <el-tooltip
                    effect="dark"
                    placement="top"
                    popper-class="file-tooltip"
                    :content="getStatus(row.delFlag).text"
                  >
                    <el-tag :type="getStatus(row.delFlag).type" effect="light">
                      {{ getStatus(row.delFlag).text }}
                    </el-tag>
                  </el-tooltip>
                </template>
              </el-table-column>

              <el-table-column :label="t('fileManagement.table.action')" width="320" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" :icon="View" @click="handlePreviewFile(row)">
                    {{ t('fileManagement.action.preview') }}
                  </el-button>
                  <el-button link type="primary" :icon="Connection" @click="openEmbedDialog([row])">
                    {{ t('fileManagement.action.embed') }}
                  </el-button>
                  <el-button link type="primary" :icon="Download" @click="handleDownloadFile(row)">
                    {{ t('fileManagement.action.download') }}
                  </el-button>
                  <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">
                    {{ t('fileManagement.action.delete') }}
                  </el-button>
                </template>
              </el-table-column>

              <template #empty>
                <el-empty :description="errorMessage || t('fileManagement.empty.file')" />
              </template>
            </el-table>
          </div>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.current"
              v-model:page-size="pagination.size"
              background
              :page-sizes="[5, 10, 20, 50]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </section>
      </div>
    </el-card>

    <Teleport to="body">
      <div
        v-if="orgContextMenuVisible"
        class="org-context-menu-mask"
        @click="closeOrgContextMenu"
        @contextmenu.prevent="closeOrgContextMenu"
      >
        <div
          class="org-context-menu"
          :style="{
            left: `${orgContextMenuPosition.x}px`,
            top: `${orgContextMenuPosition.y}px`,
          }"
          @click.stop
          @contextmenu.prevent
        >
          <button class="org-context-menu-item" type="button" @click="openContextUploadDialog">
            <el-icon><UploadFilled /></el-icon>
            <span>{{ t('fileManagement.uploadDocument') }}</span>
          </button>
        </div>
      </div>
    </Teleport>

    <el-dialog
      v-model="uploadDialogVisible"
      :width="contextUploadMode ? '640px' : '980px'"
      :title="t('fileManagement.upload.dialogTitle')"
      :show-close="!uploadLoading"
      :close-on-click-modal="!uploadLoading"
      :close-on-press-escape="!uploadLoading"
      :before-close="handleDialogBeforeClose"
      class="upload-dialog"
      @closed="handleUploadDialogClosed"
    >
      <div :class="['upload-content-layout', { 'context-upload-layout': contextUploadMode }]">
        <div v-if="!contextUploadMode" class="upload-org-panel">
          <div class="upload-section-title">选择上传组织</div>

          <div v-loading="orgLoading" class="upload-org-tree-wrap">
            <el-empty
              v-if="!sourceOrgTreeData.length"
              :description="orgErrorMessage || t('organizationInfo.empty')"
              :image-size="80"
            />

            <el-tree
              v-else
              ref="uploadOrgTreeRef"
              class="org-tree"
              node-key="id"
              highlight-current
              default-expand-all
              :data="sourceOrgTreeData"
              :props="orgTreeProps"
              :current-node-key="uploadOrgId"
              :expand-on-click-node="false"
              @node-click="handleUploadOrgNodeClick"
            >
              <template #default="{ data }">
                <div class="org-tree-node" :title="data.name || '-'">
                  <span class="org-node-dot" />
                  <span class="org-node-name">{{ data.name || '-' }}</span>
                </div>
              </template>
            </el-tree>
          </div>
        </div>

        <div class="upload-main">
          <div :class="['upload-org-tip', { selected: uploadOrgId }]">
            {{ uploadOrgId ? `已选择：${uploadOrgName}` : '请先选择左侧组织，再上传文档' }}
          </div>

          <div
            class="upload-wrapper"
            @click.capture="prepareUploadAgain"
            @drop.capture="prepareUploadAgain"
          >
            <el-upload
              ref="uploadRef"
              v-model:file-list="uploadFileList"
              class="upload-box"
              drag
              multiple
              action="#"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              :auto-upload="false"
              :disabled="uploadLoading || !uploadOrgId"
              :show-file-list="false"
              :on-change="handleUploadChange"
            >
              <div class="custom-upload-content">
                <el-icon class="upload-icon"><UploadFilled /></el-icon>
                <div class="upload-title">
                  {{
                    uploadLoading
                      ? t('fileManagement.upload.uploading')
                      : t('fileManagement.upload.dragText')
                  }}
                </div>
                <div class="upload-tip">
                  {{
                    t('fileManagement.upload.supportedFormatsText', { formats: supportedFormats })
                  }}
                </div>
              </div>
            </el-upload>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="embedDialogVisible"
      width="760px"
      top="50px"
      :title="t('fileManagement.embed.dialogTitle')"
      :show-close="!embedLoading"
      :close-on-click-modal="!embedLoading"
      :close-on-press-escape="!embedLoading"
      class="embed-dialog"
      @closed="resetEmbedDialog"
    >
      <div class="embed-content">
        <div class="embed-summary">
          <span>{{ t('fileManagement.embed.selected') }}</span>
          <strong>{{ embedFiles.length }}</strong>
          <span>{{ t('fileManagement.embed.fileUnit') }}</span>
        </div>

        <div class="embed-file-list">
          <div v-for="item in embedFiles" :key="item.id" class="embed-file-item">
            <span class="embed-file-name">{{ item.fileOriginalName || item.fileName }}</span>
            <span class="embed-file-size">{{ formatFileSize(item.fileSize) }}</span>
          </div>
        </div>

        <div class="kb-header">
          <div class="kb-title">{{ t('fileManagement.embed.selectKnowledgeBase') }}</div>
          <el-button link type="primary" :loading="knowledgeLoading" @click="fetchKnowledgeList">
            {{ t('fileManagement.embed.refresh') }}
          </el-button>
        </div>

        <el-skeleton v-if="knowledgeLoading" animated :rows="4" />

        <el-empty
          v-else-if="!knowledgeList.length"
          :description="t('fileManagement.empty.knowledgeBase')"
        />

        <el-radio-group v-else v-model="embedKnowledgeBaseId" class="kb-radio-group">
          <el-radio
            v-for="item in knowledgeList"
            :key="item.id"
            class="kb-radio-card"
            :label="item.id"
          >
            <div class="kb-card-content">
              <div class="kb-name">{{ item.name || '-' }}</div>
              <div class="kb-desc">
                {{
                  item.description ||
                    t('fileManagement.embed.documentCount', { count: item.documentCount || 0 })
                }}
              </div>
            </div>
          </el-radio>
        </el-radio-group>
      </div>

      <template #footer>
        <el-button :disabled="embedLoading" @click="embedDialogVisible = false">
          {{ t('fileManagement.button.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="embedLoading"
          :disabled="!embedKnowledgeBaseId || !embedFiles.length"
          @click="handleEmbedFiles"
        >
          {{ t('fileManagement.embed.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <FilePreviewDialog ref="filePreviewDialogRef" />
  </div>
</template>

<script setup lang="ts">
import api from '@/api';
import { Connection, Delete, Download, Search, UploadFilled, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import FilePreviewDialog from '@/components/filePreviewDialog/index.vue';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

interface OrganizationTreeNode {
  id: string;
  name: string;
  parentId?: string;
  children?: OrganizationTreeNode[];
}

interface ApiFileRecord {
  createBy: string | null;
  createTime: string;
  updateBy: string | null;
  updateTime: string;
  remark: string | null;
  id: string;
  fileOriginalName: string;
  fileName: string;
  fileSuffix: string;
  fileType: string;
  filePath: string;
  fileUrl: string;
  filePolicyUrl: string;
  fileSize: number;
  uploadUserId: string | null;
  uploadUserName: string;
  delFlag: string;
}

interface KnowledgeBaseRecord {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
}

interface FilePageData {
  records: ApiFileRecord[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

interface FileListResponse {
  code: string;
  data: FilePageData;
  msg: string;
  success: boolean;
}

const allowSuffixList = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];

const loading = ref(false);
const orgLoading = ref(false);
const errorMessage = ref('');
const orgErrorMessage = ref('');
const searchKeyword = ref('');
const orgSearchKeyword = ref('');
const tableData = ref<ApiFileRecord[]>([]);
const selectedRows = ref<ApiFileRecord[]>([]);
const supportedFormatList = ref<string[]>(allowSuffixList);
const uploadRef = ref<any>();
const orgTreeRef = ref<any>();
const uploadOrgTreeRef = ref<any>();
const uploadDialogVisible = ref(false);
const contextUploadMode = ref(false);
const uploadLoading = ref(false);
const orgContextMenuVisible = ref(false);
const contextMenuOrg = ref<OrganizationTreeNode | null>(null);
const orgContextMenuPosition = reactive({
  x: 0,
  y: 0,
});
const uploadFileList = ref<any[]>([]);
const filePreviewDialogRef = ref<InstanceType<typeof FilePreviewDialog>>();
const { t, locale } = useI18n();

const sourceOrgTreeData = ref<OrganizationTreeNode[]>([]);
const orgTreeData = ref<OrganizationTreeNode[]>([]);
const selectedOrgId = ref('');
const uploadOrgId = ref('');

const orgTreeProps = {
  label: 'name',
  children: 'children',
};

const formatSeparator = computed(() => (String(locale.value).startsWith('en') ? ', ' : '、'));
const supportedFormats = computed(() => supportedFormatList.value.join(formatSeparator.value));

const findTreeNode = (
  list: OrganizationTreeNode[] = [],
  id = '',
): OrganizationTreeNode | undefined => {
  for (const item of list) {
    if (item.id === id) return item;

    const child = findTreeNode(item.children || [], id);
    if (child) return child;
  }

  return undefined;
};

const uploadOrgName = computed(() => {
  return findTreeNode(sourceOrgTreeData.value, uploadOrgId.value)?.name || '-';
});

const embedDialogVisible = ref(false);
const embedLoading = ref(false);
const knowledgeLoading = ref(false);
const embedFiles = ref<ApiFileRecord[]>([]);
const knowledgeList = ref<KnowledgeBaseRecord[]>([]);
const embedKnowledgeBaseId = ref('');

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0,
  pages: 1,
});

let uploadTimer: number | undefined;

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

const applyOrgSearch = () => {
  orgTreeData.value = filterTree(sourceOrgTreeData.value, orgSearchKeyword.value);
  orgErrorMessage.value =
    orgSearchKeyword.value && orgTreeData.value.length === 0
      ? t('organizationInfo.searchEmpty')
      : '';
};

const handleResetOrgSearch = () => {
  orgSearchKeyword.value = '';
  applyOrgSearch();
};

const resetFileList = (message = '') => {
  tableData.value = [];
  selectedRows.value = [];
  pagination.total = 0;
  pagination.pages = 1;
  errorMessage.value = message;
};

const closeOrgContextMenu = () => {
  orgContextMenuVisible.value = false;
};

const setContextMenuPosition = (event: MouseEvent) => {
  const menuWidth = 164;
  const menuHeight = 48;
  const gap = 8;

  orgContextMenuPosition.x = Math.min(
    Math.max(event.clientX, gap),
    window.innerWidth - menuWidth - gap,
  );
  orgContextMenuPosition.y = Math.min(
    Math.max(event.clientY, gap),
    window.innerHeight - menuHeight - gap,
  );
};

const selectOrganization = async (node: OrganizationTreeNode, toggle = false) => {
  if (!node?.id) return;

  selectedOrgId.value = toggle && selectedOrgId.value === node.id ? '' : node.id;
  pagination.current = 1;

  await nextTick();
  orgTreeRef.value?.setCurrentKey(selectedOrgId.value || undefined);

  fetchFileList();
};

const fetchOrganizationTree = async () => {
  orgLoading.value = true;
  orgErrorMessage.value = '';

  try {
    const res = await api.organizationInfo.getGmsTreeList();
    const code = res?.code ?? res?.data?.code;

    if (res?.success === false || (code && `${code}` !== '200')) {
      sourceOrgTreeData.value = [];
      orgTreeData.value = [];
      orgErrorMessage.value = res?.message || res?.msg || t('organizationInfo.loadFailed');
      resetFileList(t('fileManagement.empty.file'));
      return;
    }

    const list = getTreeData(res);

    sourceOrgTreeData.value = list;
    orgTreeData.value = cloneTree(list);
    if (res.data[0].id) {
      selectedOrgId.value = res.data[0]?.id;
    }

    pagination.current = 1;

    await nextTick();
    orgTreeRef.value?.setCurrentKey(selectedOrgId.value);

    await fetchFileList();
  } catch (error) {
    console.error(t('organizationInfo.loadFailed'), error);
    sourceOrgTreeData.value = [];
    orgTreeData.value = [];
    orgErrorMessage.value = t('organizationInfo.loadFailed');
    resetFileList(t('fileManagement.empty.file'));
  } finally {
    orgLoading.value = false;
  }
};

const handleOrganizationNodeClick = (node: OrganizationTreeNode) => {
  closeOrgContextMenu();
  selectOrganization(node, true);
};

const handleOrganizationNodeContextmenu = async (event: MouseEvent, node: OrganizationTreeNode) => {
  if (!node?.id) return;

  event.preventDefault();
  contextMenuOrg.value = node;
  await selectOrganization(node);
  setContextMenuPosition(event);
  orgContextMenuVisible.value = true;
};

const handleUploadOrgNodeClick = async (node: OrganizationTreeNode) => {
  if (!node?.id || uploadLoading.value) return;

  uploadOrgId.value = node.id;

  await nextTick();
  uploadOrgTreeRef.value?.setCurrentKey(uploadOrgId.value);
};

const fetchFileList = async () => {
  loading.value = true;
  errorMessage.value = '';

  try {
    const params = {
      page: pagination.current,
      limit: pagination.size,
      fileOriginalName: searchKeyword.value || undefined,
      delFlag: '1',
      bucketName: 'fengda-file',
      ...(selectedOrgId.value ? { orgId: selectedOrgId.value } : {}),
    };

    const res = (await api.file.getFileList(params)) as FileListResponse;

    if (!res?.success && `${res?.code}` !== '200') {
      resetFileList(res?.msg || t('fileManagement.message.fetchFileListFailed'));
      return;
    }

    const pageData = res.data || ({} as FilePageData);

    tableData.value = Array.isArray(pageData.records) ? pageData.records : [];
    selectedRows.value = [];
    pagination.total = Number(pageData.total || 0);
    pagination.size = Number(pageData.size || pagination.size);
    pagination.current = Number(pageData.current || pagination.current);
    pagination.pages = Number(pageData.pages || 1);
  } catch (error: any) {
    if (error.code === '401') {
      resetFileList(t('fileManagement.message.fetchFileListRetry'));
      ElMessage.warning(error.msg);
      return;
    }
  } finally {
    loading.value = false;
  }
};

const handleSelectionChange = (rows: ApiFileRecord[]) => {
  selectedRows.value = rows;
};

const fetchKnowledgeList = async () => {
  knowledgeLoading.value = true;

  try {
    const res = await api.base.getKnowledgeList({ page: 1, limit: 999 });
    const data = res?.data;
    const list = data || data?.records || [];

    knowledgeList.value = list;

    if (!embedKnowledgeBaseId.value && list.length === 1) {
      embedKnowledgeBaseId.value = list[0].id;
    }
  } catch (error) {
    console.error('fetch knowledge list failed:', error);
    knowledgeList.value = [];
  } finally {
    knowledgeLoading.value = false;
  }
};

const openEmbedDialog = async (rows?: ApiFileRecord[]) => {
  const files = rows?.length ? rows : selectedRows.value;

  if (!files.length) {
    ElMessage.warning(t('fileManagement.message.selectEmbedFile'));
    return;
  }

  embedFiles.value = [...files];
  embedKnowledgeBaseId.value = '';
  embedDialogVisible.value = true;

  await fetchKnowledgeList();
};

const resetEmbedDialog = () => {
  if (embedLoading.value) return;

  embedFiles.value = [];
  embedKnowledgeBaseId.value = '';
};

const buildDocFiles = (data: ApiFileRecord[]) => {
  return Object.values(data).map((item: any) => ({
    fileUrl: item.filePolicyUrl,
    originalName: item.fileOriginalName,
    savedFileName: item.fileName,
    fileSize: item.fileSize,
  }));
};

const handleEmbedFiles = async () => {
  if (!embedKnowledgeBaseId.value) {
    ElMessage.warning(t('fileManagement.message.selectKnowledgeBase'));
    return;
  }

  if (!embedFiles.value.length) {
    ElMessage.warning(t('fileManagement.message.selectEmbedFile'));
    return;
  }

  const docFiles = buildDocFiles(embedFiles.value);

  if (docFiles.some((item) => !item.fileUrl || !item.savedFileName)) {
    ElMessage.warning(t('fileManagement.message.missingEmbedInfo'));
    return;
  }

  embedLoading.value = true;

  try {
    await api.base.createDocByFiles({
      knowledgeBaseId: embedKnowledgeBaseId.value,
      files: docFiles,
    });

    ElMessage.success(t('fileManagement.message.embedSuccess'));
    embedDialogVisible.value = false;
  } catch (error) {
    console.error('embed files failed:', error);
  } finally {
    embedLoading.value = false;
  }
};

const handlePreviewFile = (row: ApiFileRecord) => {
  filePreviewDialogRef.value?.open(row);
};

const handleSearch = () => {
  pagination.current = 1;
  fetchFileList();
};

const handleResetSearch = () => {
  searchKeyword.value = '';
  pagination.current = 1;
  fetchFileList();
};

const handlePageChange = (page: number) => {
  pagination.current = page;
  fetchFileList();
};

const handlePageSizeChange = (size: number) => {
  pagination.size = size;
  pagination.current = 1;
  fetchFileList();
};

const openUploadDialog = async () => {
  closeOrgContextMenu();
  contextUploadMode.value = false;
  uploadDialogVisible.value = true;
  resetUpload();
  uploadOrgId.value = '';

  await nextTick();
  uploadOrgTreeRef.value?.setCurrentKey(undefined);
};

const openContextUploadDialog = async () => {
  const node = contextMenuOrg.value || findTreeNode(sourceOrgTreeData.value, selectedOrgId.value);

  if (!node?.id) {
    ElMessage.warning('请先选择组织');
    closeOrgContextMenu();
    return;
  }

  closeOrgContextMenu();
  contextUploadMode.value = true;
  uploadDialogVisible.value = true;
  resetUpload();
  uploadOrgId.value = node.id;

  await nextTick();
};

const handleDialogBeforeClose = (done: () => void) => {
  if (uploadLoading.value) return;
  resetUpload();
  uploadOrgId.value = '';
  contextUploadMode.value = false;
  done();
};

const handleUploadDialogClosed = () => {
  if (uploadLoading.value) return;

  resetUpload();
  uploadOrgId.value = '';
  contextUploadMode.value = false;
};

const resetUpload = () => {
  uploadFileList.value = [];
  uploadRef.value?.clearFiles();

  if (uploadTimer) {
    window.clearTimeout(uploadTimer);
    uploadTimer = undefined;
  }
};

const prepareUploadAgain = () => {
  if (uploadLoading.value) return;
  resetUpload();
};

const handleUploadChange = (_file: any, fileList: any) => {
  if (uploadLoading.value) return;

  const readyFiles = fileList.filter((item: any) => item.raw && item.status === 'ready');
  uploadFileList.value = readyFiles as any[];

  if (uploadTimer) window.clearTimeout(uploadTimer);
  uploadTimer = window.setTimeout(() => uploadFiles(readyFiles), 100);
};

const uploadFiles = async (fileList: any) => {
  if (!fileList.length) return;

  const validFiles = fileList.filter((item: any) => {
    const suffix = getSuffixByName(item.name).toLowerCase();
    return allowSuffixList.includes(suffix);
  });

  if (validFiles.length !== fileList.length) {
    ElMessage.warning(
      t('fileManagement.message.onlySupportFormats', {
        formats: allowSuffixList.join(formatSeparator.value),
      }),
    );
  }

  if (!validFiles.length) {
    resetUpload();
    return;
  }

  uploadFileList.value = validFiles as any[];
  uploadLoading.value = true;

  let successCount = 0;

  try {
    for (const item of validFiles) {
      try {
        await (api.base.getoDssUploadByOrg as any)(
          'fengda-file',
          item.raw as File,
          uploadOrgId.value,
        );
        successCount += 1;
      } catch (error: any) {
        if (error.code === '401') {
          ElMessage.warning(error.msg);
          return;
        }
      }
    }

    if (successCount === validFiles.length) {
      ElMessage.success(t('fileManagement.message.uploadSuccessCount', { count: successCount }));

      pagination.current = 1;
      uploadDialogVisible.value = false;
      resetUpload();
      uploadOrgId.value = '';

      await nextTick();
      await fetchFileList();
      return;
    }

    if (successCount > 0) {
      pagination.current = 1;
      await fetchFileList();
      ElMessage.warning(
        t('fileManagement.message.uploadPartialSuccess', {
          success: successCount,
          fail: validFiles.length - successCount,
        }),
      );
      return;
    }
  } finally {
    uploadLoading.value = false;
  }
};

const handleDownloadFile = async (row: ApiFileRecord) => {
  try {
    const res = await fetch(`/oss/download?id=${encodeURIComponent(row.id)}`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error(t('fileManagement.message.downloadFailed'));
    }

    const blob = await res.blob();
    const fileName = row.fileOriginalName || row.fileName || t('fileManagement.defaultFileName');

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = fileName;
    a.click();

    window.URL.revokeObjectURL(blobUrl);

    ElMessage.success(t('fileManagement.message.downloadSuccess'));
  } catch (error) {
    console.error('download failed:', error);
  }
};

const getKnowledgeSupportedFormats = () => {
  api.base.getKnowledgeSupportedFormats().then((res) => {
    supportedFormatList.value = Array.isArray(res?.data?.formats)
      ? res.data.formats
      : allowSuffixList;
  });
};

const handleDelete = async (row: ApiFileRecord) => {
  await ElMessageBox.confirm(
    t('fileManagement.message.deleteConfirm', {
      name: row.fileOriginalName || row.fileName || '-',
    }),
    t('fileManagement.message.tips'),
    {
      type: 'warning',
      confirmButtonText: t('fileManagement.button.confirm'),
      cancelButtonText: t('fileManagement.button.cancel'),
    },
  );

  api.file.deleteFile(row.id).then(() => {
    ElMessage.success(t('fileManagement.message.deleteSuccess'));
    fetchFileList();
  });
};

const getSuffixByName = (fileName = '') => {
  const list = fileName.split('.');
  return list.length > 1 ? list[list.length - 1] : '';
};

const getFileSuffix = (suffix?: string, mimeType?: string) => {
  if (suffix) return suffix.toUpperCase();

  const type = mimeType || '';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word')) return 'DOCX';
  if (type.includes('msword')) return 'DOC';
  if (type.includes('sheet') || type.includes('excel')) return 'XLSX';
  if (type.includes('presentation')) return 'PPTX';
  if (type.includes('image')) return 'IMG';
  if (type.includes('text')) return 'TXT';

  return 'FILE';
};

const formatFileSize = (size?: number) => {
  const value = Number(size || 0);
  if (value <= 0) return '0B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let result = value;

  while (result >= 1024 && index < units.length - 1) {
    result /= 1024;
    index += 1;
  }

  return `${result.toFixed(result >= 10 || index === 0 ? 0 : 1)}${units[index]}`;
};

const getStatus = (delFlag?: string) => {
  if (delFlag === '1') {
    return { text: t('fileManagement.status.normal'), type: 'success' as const };
  }

  if (delFlag === '0') {
    return { text: t('fileManagement.status.deleted'), type: 'danger' as const };
  }
  return { text: t('fileManagement.status.unknown'), type: 'warning' as const };
};

onMounted(() => {
  fetchOrganizationTree();
  getKnowledgeSupportedFormats();
});

onBeforeUnmount(() => {
  resetUpload();
});
</script>

<style scoped lang="scss">
/* 组织右键菜单 */
.org-context-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: transparent;
}

.org-context-menu {
  position: fixed;
  z-index: 3001;
  width: 156px;
  padding: 6px;
  background: rgb(255 255 255 / 98%);
  border: 1px solid #f0dfcf;
  border-radius: 12px;
  box-shadow:
    0 16px 38px rgb(92 54 24 / 16%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
  backdrop-filter: blur(12px);
}

.org-context-menu-item {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #5b4738;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 9px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;

  .el-icon {
    color: #f97316;
  }

  &:hover {
    color: #e86f0b;
    background: #fff0e2;
    transform: translateX(2px);
  }
}

/* 页面整体 */
.file-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 10%), transparent 32%),
    linear-gradient(180deg, #fff9f3 0%, #fff4e9 100%);
}

.file-card {
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

/* 顶部标题与操作 */
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
.reset-btn,
.embed-open-btn,
.upload-open-btn {
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

.embed-open-btn {
  color: #e86f0b;
  background: #fff7ef;
  border-color: #ffc995;

  &:hover:not(.is-disabled),
  &:focus:not(.is-disabled) {
    color: #d95f06;
    background: #fff0e2;
    border-color: #ffad61;
    box-shadow: 0 7px 16px rgb(249 115 22 / 11%);
    transform: translateY(-1px);
  }

  &.is-disabled {
    color: #c9ac95;
    background: #fffaf5;
    border-color: #f0dfcf;
    box-shadow: none;
  }
}

.upload-open-btn {
  min-width: 122px;
  font-size: 15px;
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border: 1px solid #ff8a26;
  box-shadow: 0 8px 18px rgb(249 115 22 / 24%);

  &:hover,
  &:focus {
    color: #fff;
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    border-color: #f97316;
    box-shadow: 0 10px 22px rgb(249 115 22 / 28%);
    transform: translateY(-1px);
  }
}

/* 主体布局 */
.content-layout {
  display: flex;
  flex: 1;
  gap: 18px;
  min-height: 0;
  overflow: hidden;
}

/* 左侧组织区域 */
.org-panel {
  display: flex;
  flex: 0 0 400px;
  flex-direction: column;
  min-width: 260px;
  min-height: 0;
  padding: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 250 245 / 98%) 0%, rgb(255 255 255 / 97%) 100%);
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgb(126 72 24 / 5%);
}

.org-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.org-panel-title {
  position: relative;
  padding-left: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #4a382c;

  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 4px;
    height: 15px;
    content: '';
    background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
    border-radius: 8px;
    transform: translateY(-50%);
  }
}

.org-search-input {
  flex-shrink: 0;
  margin-bottom: 14px;
}

.org-tree-wrap {
  flex: 1;
  min-height: 0;
  padding: 6px;
  overflow: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background: #fff;
  border: 1px solid #f1e1d2;
  border-radius: 14px;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
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

.org-tree {
  min-width: max-content;
  padding: 4px 0;
  background: transparent;
}

.org-tree-node {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 32px;
  overflow: hidden;
}

.org-node-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-right: 8px;
  background: #d8a77f;
  border-radius: 50%;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.org-node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: #6b5545;
  white-space: nowrap;
  transition: color 0.18s ease;
}

/* 文件区域 */
.file-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.table-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f1e1d2;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgb(126 72 24 / 4%);
}

.file-table {
  width: 100%;
}

.file-name {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

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

/* 分页 */
.pagination-wrap {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding-top: 18px;
}

/* 上传弹窗布局 */
.upload-content-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
  min-height: 360px;

  &.context-upload-layout {
    display: block;
    min-height: 300px;

    .upload-main {
      min-height: 300px;
    }

    .custom-upload-content {
      min-height: 250px;
    }
  }
}

.upload-org-panel,
.upload-main {
  min-width: 0;
}

.upload-section-title {
  position: relative;
  padding-left: 12px;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #4a382c;

  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 3px;
    height: 14px;
    content: '';
    background: #ff8a26;
    border-radius: 999px;
    transform: translateY(-50%);
  }
}

.upload-org-tree-wrap {
  height: 318px;
  padding: 6px;
  overflow: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background: #fffaf5;
  border: 1px solid #f0dfcf;
  border-radius: 14px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;
  }
}

.upload-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-org-tip {
  padding: 10px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  color: #a18b7b;
  white-space: nowrap;
  background: #fffaf5;
  border: 1px solid #f0dfcf;
  border-radius: 10px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &.selected {
    font-weight: 600;
    color: #e86f0b;
    background: #fff1e5;
    border-color: #ffc58f;
    box-shadow: 0 5px 14px rgb(249 115 22 / 7%);
  }
}

.upload-wrapper,
.upload-box {
  width: 100%;
}

.custom-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 240px;
}

.upload-icon {
  margin-bottom: 30px;
  font-size: 42px;
  color: #f97316;
  filter: drop-shadow(0 6px 10px rgb(249 115 22 / 18%));
}

.upload-title {
  font-size: 18px;
  line-height: 1;
  color: #5b4738;
}

.upload-tip {
  margin-top: 18px;
  font-size: 15px;
  line-height: 1.5;
  color: #a18b7b;
  text-align: center;
  letter-spacing: 0.8px;
}

/* 嵌入弹窗 */
.embed-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 650px;
  padding-right: 6px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 10px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.embed-summary {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 12px 14px;
  color: #806b5b;
  background: #fff7ef;
  border: 1px solid #f0dfcf;
  border-radius: 12px;

  strong {
    font-size: 18px;
    color: #f97316;
  }
}

.embed-file-list {
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 12px;
}

.embed-file-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f5e8dc;
  transition: background 0.18s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #fffaf5;
  }
}

.embed-file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #4a382c;
  white-space: nowrap;
}

.embed-file-size {
  flex-shrink: 0;
  font-size: 13px;
  color: #a18b7b;
}

.kb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  :deep(.el-button.is-link) {
    color: #f97316;

    &:hover {
      color: #e9680a;
    }
  }
}

.kb-title {
  font-size: 15px;
  font-weight: 700;
  color: #4a382c;
}

.kb-radio-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.kb-card-content {
  min-width: 0;
}

.kb-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 700;
  color: #4a382c;
  white-space: nowrap;
}

.kb-desc {
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #a18b7b;
  white-space: nowrap;
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

/* 搜索输入框 */
:deep(.search-input .el-input__wrapper),
:deep(.org-search-input .el-input__wrapper) {
  height: 40px;
  background: #fff7ef;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px #f0dfcf;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

:deep(.search-input .el-input__wrapper:hover),
:deep(.org-search-input .el-input__wrapper:hover) {
  background: #fff;
  box-shadow: inset 0 0 0 1px #ffc58f;
}

:deep(.search-input .el-input__wrapper.is-focus),
:deep(.org-search-input .el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow:
    inset 0 0 0 1px #ff8a26,
    0 0 0 3px rgb(255 138 38 / 10%);
}

:deep(.search-input .el-input__inner),
:deep(.org-search-input .el-input__inner) {
  font-size: 14px;
  color: #4a382c;
}

:deep(.search-input .el-input__inner::placeholder),
:deep(.org-search-input .el-input__inner::placeholder) {
  color: #b09b8c;
}

:deep(.search-input .el-input__prefix),
:deep(.org-search-input .el-input__prefix) {
  color: #d98a49;
}

:deep(.search-input .el-input__clear),
:deep(.org-search-input .el-input__clear) {
  color: #b09b8c;

  &:hover {
    color: #f97316;
  }
}

/* 组织树 */
:deep(.org-tree .el-tree-node__content) {
  height: 38px;
  padding-right: 10px;
  border-radius: 10px;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease;
}

:deep(.org-tree .el-tree-node__content:hover) {
  background: #fff7ef;
}

:deep(.org-tree .el-tree-node.is-current > .el-tree-node__content) {
  background: linear-gradient(
    90deg,
    rgb(255 138 38 / 15%) 0%,
    rgb(249 115 22 / 8%) 100%
  ) !important;
  box-shadow: inset 3px 0 0 #ff8a26;
}

:deep(.org-tree .el-tree-node.is-current > .el-tree-node__content .org-node-dot) {
  background: #ff8a26;
  box-shadow: 0 0 0 3px rgb(255 138 38 / 11%);
  transform: scale(1.08);
}

:deep(.org-tree .el-tree-node.is-current > .el-tree-node__content .org-node-name) {
  font-weight: 700;
  color: #d95f06;
}

:deep(.org-tree .el-tree-node__expand-icon) {
  color: #d98a49;

  &.expanded {
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

:deep(.el-table__fixed-right),
:deep(.el-table__fixed) {
  box-shadow: none;
}

/* 表格选择框 */
:deep(.el-checkbox__inner) {
  border-color: #d9b797;
  border-radius: 4px;

  &:hover {
    border-color: #ff8a26;
  }
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner),
:deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
  background: #ff8a26;
  border-color: #ff8a26;
}

/* 标签 */
:deep(.el-tag) {
  font-weight: 600;
  border-radius: 8px;
}

:deep(.el-tag:not(.el-tag--success, .el-tag--danger, .el-tag--warning)) {
  color: #e86f0b;
  background: #fff4e9;
  border-color: #ffd3aa;
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

:deep(.el-tag--warning) {
  color: #e86f0b;
  background: #fff4e9;
  border-color: #ffd3aa;
}

/* 表格操作按钮 */
:deep(.el-button.is-link) {
  font-weight: 500;
  transition:
    color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }
}

:deep(.el-button.is-link.el-button--primary) {
  color: #e86f0b;

  &:hover {
    color: #f97316;
  }
}

:deep(.el-button.is-link.el-button--danger) {
  color: #ef4444;

  &:hover {
    color: #dc2626;
  }
}

/* 表格滚动条 */
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

/* 分页 */
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

/* 弹窗 */
:deep(.upload-dialog .el-dialog),
:deep(.embed-dialog .el-dialog) {
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow:
    0 24px 60px rgb(92 54 24 / 18%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

:deep(.upload-dialog .el-dialog__header),
:deep(.embed-dialog .el-dialog__header) {
  padding: 20px 24px 16px;
  margin-right: 0;
  background: linear-gradient(180deg, #fffaf5 0%, #fff 100%);
  border-bottom: 1px solid #f3e4d6;
}

:deep(.upload-dialog .el-dialog__title),
:deep(.embed-dialog .el-dialog__title) {
  font-size: 18px;
  font-weight: 700;
  color: #4a382c;
}

:deep(.upload-dialog .el-dialog__headerbtn),
:deep(.embed-dialog .el-dialog__headerbtn) {
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

:deep(.upload-dialog .el-dialog__body),
:deep(.embed-dialog .el-dialog__body) {
  padding: 20px 24px 26px;
}

:deep(.embed-dialog .el-dialog__footer) {
  padding: 14px 24px 22px;
  background: #fffaf5;
  border-top: 1px solid #f3e4d6;
}

/* 上传区域 */
:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  padding: 0 20px;
  background: radial-gradient(circle at 50% 20%, rgb(255 138 38 / 8%) 0%, transparent 44%), #fffaf5;
  border: 1px dashed #e9a96d;
  border-radius: 16px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background:
      radial-gradient(circle at 50% 20%, rgb(255 138 38 / 12%) 0%, transparent 46%), #fff7ef;
    border-color: #ff8a26;
    box-shadow:
      0 0 0 4px rgb(255 138 38 / 6%),
      0 10px 24px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }
}

:deep(.el-upload.is-disabled .el-upload-dragger) {
  cursor: not-allowed;
  background: #fffaf7;
  border-color: #ead8c8;
  box-shadow: none;
  transform: none;
}

:deep(.el-upload.is-disabled .upload-icon),
:deep(.el-upload.is-disabled .upload-title),
:deep(.el-upload.is-disabled .upload-tip) {
  color: #c3ad9c;
  filter: none;
}

:deep(.el-upload-list) {
  display: none;
}

/* 知识库单选卡片 */
:deep(.kb-radio-card) {
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  width: 100%;
  height: auto;
  min-height: 72px;
  padding: 14px;
  margin: 0;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 12px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

:deep(.kb-radio-card:hover) {
  background: #fff8f1;
  border-color: #ffc58f;
  box-shadow: 0 6px 16px rgb(249 115 22 / 8%);
  transform: translateY(-1px);
}

:deep(.kb-radio-card.is-checked) {
  background: linear-gradient(135deg, #fff0e2 0%, #fff8f1 100%);
  border-color: #ff8a26;
  box-shadow:
    inset 3px 0 0 #ff8a26,
    0 8px 20px rgb(249 115 22 / 10%);
}

:deep(.kb-radio-card .el-radio__label) {
  flex: 1;
  min-width: 0;
}

:deep(.kb-radio-card .el-radio__inner) {
  border-color: #d9b797;
}

:deep(.kb-radio-card .el-radio__input.is-checked .el-radio__inner) {
  background: #ff8a26;
  border-color: #ff8a26;
}

:deep(.kb-radio-card .el-radio__input.is-checked + .el-radio__label) {
  color: #d95f06;
}

/* 主按钮统一橙色 */
:deep(.el-button--primary:not(.is-plain, .is-link)) {
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border-color: #ff8a26;
  box-shadow: 0 6px 14px rgb(249 115 22 / 17%);

  &:hover:not(.is-disabled),
  &:focus:not(.is-disabled) {
    color: #fff;
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    border-color: #f97316;
    box-shadow: 0 8px 18px rgb(249 115 22 / 24%);
  }
}

/* 弹窗取消按钮 */
:deep(.embed-dialog .el-dialog__footer .el-button:not(.el-button--primary)) {
  color: #806b5b;
  background: #fff;
  border-color: #ead8c8;
  border-radius: 10px;

  &:hover {
    color: #f97316;
    background: #fff7ef;
    border-color: #ffc58f;
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

/* Skeleton */
:deep(.el-skeleton__item) {
  background: linear-gradient(90deg, #fff1e5 25%, #fff8f1 37%, #fff1e5 63%);
  background-size: 400% 100%;
}

/* Tooltip */
:deep(.file-tooltip) {
  color: #fff;
  background: #5c3b25;
  border: 1px solid #6d4930;
  box-shadow: 0 8px 20px rgb(92 54 24 / 18%);
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

  .content-layout {
    flex-direction: column;
  }

  .org-panel {
    flex: 0 0 280px;
    width: 100%;
  }
}

@media (width <= 768px) {
  .file-page {
    padding: 12px;
  }

  .file-card {
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
  .reset-btn,
  .embed-open-btn,
  .upload-open-btn {
    flex: 1;
    min-width: 90px;
    padding: 0 14px;
  }

  .content-layout {
    gap: 12px;
  }

  .org-panel {
    flex-basis: 260px;
    min-width: 0;
    padding: 14px;
    border-radius: 14px;
  }

  .table-area {
    border-radius: 14px;
  }

  .kb-radio-group,
  .upload-content-layout {
    grid-template-columns: 1fr;
  }

  .upload-org-tree-wrap {
    height: 240px;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }

  :deep(.el-card__header) {
    padding: 18px 18px 10px;
  }

  :deep(.el-card__body) {
    padding: 8px 18px 18px;
  }

  :deep(.upload-dialog .el-dialog),
  :deep(.embed-dialog .el-dialog) {
    width: 94% !important;
  }
}

@media (width <= 480px) {
  .file-page {
    padding: 8px;
  }

  .header-actions {
    align-items: stretch;
  }

  .search-btn,
  .reset-btn,
  .embed-open-btn,
  .upload-open-btn {
    min-width: calc(50% - 5px);
  }

  .org-panel {
    flex-basis: 230px;
  }

  .embed-summary {
    flex-wrap: wrap;
  }

  .custom-upload-content {
    min-height: 210px;
  }

  .upload-icon {
    margin-bottom: 22px;
    font-size: 36px;
  }

  .upload-title {
    font-size: 16px;
  }

  .upload-tip {
    font-size: 13px;
  }
}
</style>
