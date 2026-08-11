<template>
  <el-dialog
    :model-value="visible"
    :title="`选择${sourceLabel}`"
    width="600px"
    :fullscreen="isMobile"
    class="master-data-picker"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-input
      v-model="keyword"
      placeholder="搜索名称/编码/别名..."
      :prefix-icon="Search"
      clearable
      class="picker-search"
      @input="handleSearch"
    />

    <div v-loading="loading" class="picker-list">
      <div
        v-for="item in dataList"
        :key="item.id"
        class="picker-item"
        :class="{ selected: selectedId === item.id }"
        @click="handleSelect(item)"
      >
        <div class="item-main">
          <span class="item-code">{{ item.dataCode }}</span>
          <span class="item-name">{{ item.dataName }}</span>
        </div>
        <div v-if="item.dataValues" class="item-detail">
          <span v-for="(val, key) in item.dataValues" :key="key" class="detail-tag">
            {{ key }}: {{ val }}
          </span>
        </div>
        <div v-if="item.aliases" class="item-aliases">别名：{{ item.aliases }}</div>
      </div>

      <el-empty
        v-if="!loading && dataList.length === 0"
        description="无匹配结果"
        :image-size="80"
      />
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :disabled="!selectedItem" @click="handleConfirm">
        确认选择
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
import { useDebounceFn, useMediaQuery } from '@vueuse/core';

import type { MasterDataItem } from '@/types';
import { ref, watch } from 'vue';
const props = defineProps<{
  visible: boolean;
  sourceCode: string;
  sourceLabel?: string;
}>();

// 将原来的写法修改为：
const emit = defineEmits<{
  'update:visible': [val: boolean];
  select: [item: MasterDataItem];
}>();

const isMobile = useMediaQuery('(max-width: 768px)');
const loading = ref(false);
const keyword = ref('');
const dataList = ref<MasterDataItem[]>([]);
const selectedId = ref<number | null>(null);
const selectedItem = ref<MasterDataItem | null>(null);

const handleSearch = useDebounceFn(async () => {
  await loadData();
}, 300);

async function loadData() {
  loading.value = true;
  try {
    const res: any = {};
    dataList.value = res.data || [];
  } finally {
    loading.value = false;
  }
}

function handleSelect(item: MasterDataItem) {
  selectedId.value = item.id;
  selectedItem.value = item;
}

function handleConfirm() {
  if (selectedItem.value) {
    emit('select', selectedItem.value);
    emit('update:visible', false);
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      keyword.value = '';
      selectedId.value = null;
      selectedItem.value = null;
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
  max-height: 400px;
  overflow-y: auto;
}

.picker-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid #f3f4f6;
  border-radius: 10px;
  transition: all 0.2s;

  &:hover {
    background: #fafafe;
    border-color: #c7d2fe;
  }

  &.selected {
    background: #eef2ff;
    border-color: #6366f1;
  }

  .item-main {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 4px;

    .item-code {
      padding: 2px 8px;
      font-family: monospace;
      font-size: 12px;
      color: #6366f1;
      background: #eef2ff;
      border-radius: 4px;
    }

    .item-name {
      font-weight: 600;
      color: #1f2937;
    }
  }

  .item-detail {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;

    .detail-tag {
      padding: 2px 6px;
      font-size: 12px;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 4px;
    }
  }

  .item-aliases {
    margin-top: 4px;
    font-size: 11px;
    color: #9ca3af;
  }
}
</style>
