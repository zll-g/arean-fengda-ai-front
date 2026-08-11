<template>
  <!-- 悬浮菜单按钮 -->
  <van-floating-bubble
    icon="ellipsis"
    :gap="{ x: 10, y: 100 }"
    axis="lock"
    @click="showMenu = true"
  />

  <!-- 展开式菜单 -->
  <van-popup
    v-model:show="showMenu"
    position="bottom"
    round
    :style="{ maxHeight: '70%', padding: '16px' }"
  >
    <div class="menu-container">
      <!-- 按原始顺序渲染所有菜单项 -->
      <div v-for="item in menuData" :key="item.id">
        <!-- 有子菜单的项 -->
        <div v-if="item.children && item.children.length > 0" class="menu-item-group">
          <van-cell
            :title="item.text"
            is-link
            :class="{ 'cell-expanded': activeNames.includes(item.id) }"
            @click="toggleExpand(item.id)"
          />
          <transition name="submenu-slide">
            <div v-show="activeNames.includes(item.id)" class="submenu-container">
              <van-cell
                v-for="child in item.children"
                :key="child.id"
                :title="child.text"
                @click="handleMenuClick(child)"
              />
            </div>
          </transition>
        </div>

        <!-- 没有子菜单的项 -->
        <van-cell v-else :title="item.text" @click="handleMenuClick(item)" />
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

// 菜单项类型定义
interface MenuItem {
  id: string;
  text: string;
  path?: string;
  children?: MenuItem[];
}

const router = useRouter();
const showMenu = ref(false);
const activeNames = ref<string[]>([]);

// 切换展开/收起
const toggleExpand = (id: string) => {
  const index = activeNames.value.indexOf(id);
  if (index > -1) {
    activeNames.value = [];
  } else {
    activeNames.value = [id];
  }
};

// 菜单配置
const menuData: MenuItem[] = [
  {
    id: 'home',
    text: '首页',
    path: '/h5/home',
  },
  {
    id: 'chat',
    text: '语音交互',
    children: [
      { id: 'chat-1', text: '缺陷单填报', path: '/h5/voice-interaction' },
      { id: 'chat-2', text: '设备报修', path: '/h5/voice-interaction' },
      { id: 'chat-3', text: '智能问答', path: '/h5/voice-interaction' },
    ],
  },
  {
    id: 'knowledge',
    text: '知识库问答',
    path: '/h5/knowledge-qa',
  },
  {
    id: 'data-query',
    text: '智能问数',
    path: '/h5/data-query',
  },
  {
    id: 'predictive',
    text: '数据预测',
    path: '/h5/predictive',
  },
];

// 点击菜单项
const handleMenuClick = (item: MenuItem) => {
  if (item.path) {
    showMenu.value = false;
    router.push(item.path);
    // 清空展开状态
    activeNames.value = [];
  }
};
</script>

<style scoped>
.menu-container {
  max-height: 70vh;
  overflow-y: auto;
}

.menu-container :deep(.van-cell) {
  padding: 12px 16px;
}

.menu-container :deep(.van-collapse-item__title) {
  font-weight: 600;
  background-color: #f7f8fa;
}

.menu-item-group {
  margin-bottom: 8px;
}

.cell-expanded :deep(.van-cell__right-icon) {
  transform: rotate(90deg);
  transition: transform 0.3s ease;
}

.submenu-container {
  padding-left: 16px;
  overflow: hidden;
  background-color: #f7f8fa;
  border-radius: 0 0 8px 8px;
}

.submenu-container .van-cell {
  background-color: #f7f8fa;
  border-bottom: 1px solid #eee;
}

.submenu-container .van-cell:last-child {
  border-bottom: none;
}

/* 子菜单展开/收起动画 */
.submenu-slide-enter-active,
.submenu-slide-leave-active {
  max-height: 200px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.submenu-slide-enter-from,
.submenu-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.submenu-slide-enter-to,
.submenu-slide-leave-from {
  max-height: 200px;
  opacity: 1;
}
</style>
