<template>
  <el-dialog
    :model-value="visible"
    :title="`选择${sourceLabel}`"
    width="80vw"
    :fullscreen="isMobile"
    class="master-data-picker"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-input
      v-model="keyword"
      placeholder="请输入搜索内容..."
      :prefix-icon="Search"
      clearable
      class="picker-search"
      @input="handleSearch"
    />

    <div v-loading="loading" class="picker-list">
      <!-- 动态表头 -->
      <div
        v-if="titleList.length"
        class="tree-header"
        :style="{ gridTemplateColumns: tableColumns }"
      >
        <div v-for="title in titleList" :key="title" class="header-cell">
          {{ title }}
        </div>
      </div>

      <!-- 虚拟树 -->
      <el-tree-v2
        v-if="treeData.length"
        :data="treeData"
        :props="treeProps"
        :height="400"
        :item-size="46"
        :expand-on-click-node="false"
        highlight-current
        class="virtual-tree"
        @node-click="handleSelect"
      >
        <template #default="{ data }">
          <div
            class="tree-row"
            :class="{ selected: selectedId === data.id }"
            :style="{ gridTemplateColumns: tableColumns }"
          >
            <div
              v-for="title in titleList"
              :key="title"
              class="tree-cell"
              :title="String(data.raw?.[title] ?? '')"
            >
              {{ data.raw?.[title] ?? '-' }}
            </div>
          </div>
        </template>
      </el-tree-v2>

      <el-empty
        v-if="!loading && treeData.length === 0"
        description="无匹配结果"
        :image-size="80"
      />
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)"> 取消 </el-button>

      <el-button type="primary" :disabled="!selectedItem" @click="handleConfirm">
        确认选择
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
import { useDebounceFn, useMediaQuery } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

import api from '@/api';

type DataItem = Record<string, any>;

interface TreeItem {
  id: string;
  label: string;
  raw: DataItem;
  children?: TreeItem[];
}

const props = defineProps<{
  visible: boolean;
  sourceCode: string;
  sourceLabel?: string;
  fieldCode?: string;
  inputValue?: string;
}>();

const emit = defineEmits<{
  'update:visible': [val: boolean];
  select: [item: DataItem];
}>();

const isMobile = useMediaQuery('(max-width: 768px)');

const loading = ref(false);
const keyword = ref('');
const titleList = ref<string[]>([]);
const treeData = ref<TreeItem[]>([]);
const selectedId = ref('');
const selectedItem = ref<DataItem | null>(null);

const treeProps = {
  value: 'id',
  label: 'label',
  children: 'children',
};

const tableColumns = computed(() => {
  return `repeat(${titleList.value.length || 1}, minmax(160px, 1fr))`;
});

const handleSearch = useDebounceFn(loadData, 300);

async function loadData() {
  loading.value = true;

  try {
    const res: any = await api.master.gmsMatchSearch({
      sourceCode: props.sourceCode,
      fieldCode: props.fieldCode,
      inputValue: keyword.value,
    });

    const result = res?.data || {};

    titleList.value = Array.isArray(result.title) ? result.title : [];

    treeData.value = buildTree(Array.isArray(result.data) ? result.data : []);

    selectedId.value = '';
    selectedItem.value = null;
  } finally {
    loading.value = false;
  }
}

function normalizeLevelCode(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  const code = String(value).trim();

  return code.toLowerCase() === 'null' ? '' : code;
}

function buildTree(list: DataItem[]): TreeItem[] {
  // 每条接口数据都创建独立节点，避免 null level_code 共用一个节点
  const nodes = list.map((item, index): TreeItem => {
    const levelCode = normalizeLevelCode(item.level_code);

    return {
      id: `${levelCode || 'node'}-${index}`,
      label: getNodeLabel(item),
      raw: item,
      children: [],
    };
  });

  // 只将有效的 level_code 放入 Map
  const nodeMap = new Map<string, TreeItem>();

  nodes.forEach((node) => {
    const levelCode = normalizeLevelCode(node.raw.level_code);

    if (levelCode && !nodeMap.has(levelCode)) {
      nodeMap.set(levelCode, node);
    }
  });

  const roots: TreeItem[] = [];

  nodes.forEach((node) => {
    const levelCode = normalizeLevelCode(node.raw.level_code);

    // 没有层级编码的数据，直接作为独立根节点展示
    if (!levelCode) {
      roots.push(node);
      return;
    }

    const parentCode = levelCode.slice(0, -2);
    const parent = nodeMap.get(parentCode);

    if (parent && parent !== node) {
      parent.children?.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * 节点文本只用于 Element Plus 树内部识别，
 * 实际展示内容由 title 动态控制。
 */
function getNodeLabel(item: DataItem) {
  const firstTitle = titleList.value[0];

  return firstTitle ? String(item[firstTitle] ?? '') : '';
}

function handleSelect(node: TreeItem) {
  selectedId.value = node.id;
  selectedItem.value = node.raw;
}

function handleConfirm() {
  if (!selectedItem.value) {
    return;
  }

  emit('select', selectedItem.value);
  emit('update:visible', false);
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      keyword.value = props.inputValue || '';
      selectedId.value = '';
      selectedItem.value = null;
      loadData();
    }
  },
);

watch(
  () => props.inputValue,
  () => {
    if (props.visible) {
      loadData();
    }
  },
);
</script>

<style lang="scss" scoped>
.picker-search {
  margin-bottom: 16px;

  :deep(.el-input__wrapper) {
    border-radius: 10px;
  }
}

.picker-list {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.tree-header {
  display: grid;
  min-width: max-content;
  padding-left: 32px;
  font-weight: 600;
  color: #303133;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.header-cell {
  box-sizing: border-box;
  min-width: 160px;
  padding: 12px;
}

.virtual-tree {
  min-width: max-content;

  :deep(.el-tree-node__content) {
    height: 46px;
    border-bottom: 1px solid #f2f3f5;
  }
}

.tree-row {
  display: grid;
  flex: 1;
  min-width: max-content;
  height: 46px;
  cursor: pointer;

  &:hover,
  &.selected {
    background: #fff7ed;
  }
}

.tree-cell {
  box-sizing: border-box;
  min-width: 160px;
  padding: 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 46px;
  white-space: nowrap;
}
</style>
