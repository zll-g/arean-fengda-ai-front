<template>
  <el-dialog
    v-model="visible"
    width="1200px"
    top="50px"
    :title="previewFileName || '文件预览'"
    destroy-on-close
    class="preview-dialog"
    @closed="resetPreview"
  >
    <div v-loading="previewLoading" class="preview-body">
      <file-viewer
        v-if="previewFile"
        :key="viewerKey"
        :file="previewFile"
        :options="{ preset: officePreset, toolbar: { print: false, exportHtml: false } }"
        class="file-viewer-wrap"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import officePreset from '@file-viewer/preset-office';
interface FileRecord {
  id: string;
  fileOriginalName?: string;
  fileName?: string;
  fileSuffix?: string;
  fileType?: string;
  fileUrl?: string;
  filePolicyUrl?: string;
}

const visible = ref(false);
const previewLoading = ref(false);
const previewFileName = ref('');
const previewFile = ref<File | null>(null);
const previewFileRow = ref<FileRecord | null>(null);
const viewerKey = ref('');

const open = async (row: FileRecord) => {
  const url = getPreviewUrl(row);

  if (!url) {
    ElMessage.warning('文件预览地址不存在');
    return;
  }

  resetPreview();
  visible.value = true;
  previewLoading.value = true;
  previewFileRow.value = row;

  try {
    const fileName = getPreviewFileName(row);
    const suffix = getSuffixByName(fileName).toLowerCase();
    const mimeType = getMimeType(suffix, row.fileType);

    const res = await fetch(url, { method: 'GET', cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`文件请求失败：${res.status}`);
    }

    const blob = await res.blob();

    if (!blob.size) {
      throw new Error('文件内容为空');
    }

    await checkBlobIsFile(blob, suffix);

    previewFileName.value = fileName;
    previewFile.value = new File([blob], fileName, { type: mimeType });
    viewerKey.value = `${row.id}-${Date.now()}`;
  } catch (error) {
    console.error('文件预览失败：', error);
    ElMessage.error('文件预览失败，请检查文件地址、跨域配置或文件内容');
  } finally {
    previewLoading.value = false;
  }
};

const resetPreview = () => {
  previewLoading.value = false;
  previewFileName.value = '';
  previewFile.value = null;
  previewFileRow.value = null;
  viewerKey.value = '';
};

const getPreviewUrl = (row: FileRecord) => {
  if (row.filePolicyUrl) return row.filePolicyUrl;
  if (/^https?:\/\//.test(row.fileUrl || '')) return row.fileUrl || '';
  if (row.fileUrl) return `${window.location.origin}${row.fileUrl}`;
  return '';
};

const getPreviewFileName = (row: FileRecord) => {
  const suffix = getRecordSuffix(row);
  const name = row.fileOriginalName || row.fileName || '预览文件';

  if (!suffix || name.toLowerCase().endsWith(`.${suffix}`)) return name;
  return `${name}.${suffix}`;
};

const getRecordSuffix = (row: FileRecord) => {
  return (
    row.fileSuffix ||
    getSuffixByName(row.fileOriginalName || '') ||
    getSuffixByName(row.fileName || '')
  ).toLowerCase();
};

const getSuffixByName = (fileName = '') => {
  const list = fileName.split('.');
  return list.length > 1 ? list[list.length - 1] : '';
};

const getMimeType = (suffix: string, fileType = '') => {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
  };

  return map[suffix] || fileType || 'application/octet-stream';
};

const checkBlobIsFile = async (blob: Blob, suffix: string) => {
  const textLikeTypes = ['html', 'xml', 'json'];
  const contentType = blob.type.toLowerCase();

  const maybeErrorText =
    contentType.includes('text/html') ||
    contentType.includes('application/json') ||
    contentType.includes('application/xml') ||
    contentType.includes('text/xml');

  if (!textLikeTypes.includes(suffix) && maybeErrorText) {
    const text = await blob.text();
    throw new Error(`接口返回的不是文件内容：${text.slice(0, 120)}`);
  }
};

defineExpose({
  open,
});
</script>

<style scoped>
.preview-body {
  box-sizing: border-box;
  width: 1000px;
  height: 850px;
  margin: 0 auto;
  overflow: auto;
  background: #fff;
  border: 1px solid #edf2fb;
  border-radius: 12px;
}

:deep(.preview-dialog .el-dialog) {
  border-radius: 18px;
}

:deep(.preview-dialog .el-dialog__header) {
  padding: 22px 24px 10px;
}

:deep(.preview-dialog .el-dialog__title) {
  font-size: 18px;
  font-weight: 700;
  color: #1d2b4f;
}

:deep(.preview-dialog .el-dialog__body) {
  padding: 16px 24px 24px;
}

:deep(.file-viewer-wrap .docx),
:deep(.file-viewer-wrap .docx section) {
  height: auto !important;
  min-height: auto !important;
}
</style>
