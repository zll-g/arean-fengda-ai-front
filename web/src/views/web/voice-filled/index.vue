<template>
  <div class="app-layout">
    <div class="left-column">
      <div class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">表单模板</span>
        </div>
        <div class="sidebar-search">
          <el-input v-model="searchQuery" placeholder="搜索表单..." :prefix-icon="Search" />
        </div>
        <div class="template-list">
          <div
            v-for="item in filteredFormList"
            :key="item.id"
            class="template-item"
            :class="['menu-item', { active: templateId === item.id }]"
            @click="handleTemplateId(item.id)"
          >
            <div class="item-info">
              <div
                class="item-icon"
                :style="{ backgroundColor: item.iconBg, color: item.iconColor }"
              >
                <el-icon><component :is="item.icon" /></el-icon>
              </div>
              <div>
                <div class="item-name">{{ item.templateName }}</div>
                <div class="item-desc">{{ item.status }} · 共{{ item.fieldCount }}个字段</div>
              </div>
            </div>
            <el-icon class="delete-icon" @click="removeTemplateData"><Delete /></el-icon>
          </div>
        </div>
      </div>

      <!-- <div class="panel-card history-panel">
        <div class="panel-header flex-between">
          <div class="left-part">
            <el-icon class="header-icon"><Clock /></el-icon>
            <span class="header-title">历史填报</span>
          </div>
          <el-button link class="more-btn">更多</el-button>
        </div>
        <div class="history-list custom-scrollbar">
          <div class="history-item">
            <div class="tags-row">
              <span class="tag tag-blue">缺陷单</span>
              <span class="tag tag-green">已完成</span>
              <span class="time">今天 10:23</span>
            </div>
            <div class="item-title">#20231209001 一号机组送风机异常</div>
            <div class="item-user">填报人：张三</div>
          </div>
          <div class="history-item">
            <div class="tags-row">
              <span class="tag tag-green">工作票</span>
              <span class="tag tag-yellow">审批中</span>
              <span class="time">昨天 15:42</span>
            </div>
            <div class="item-title">#20231208015 二号机组检修工作票</div>
            <div class="item-user">填报人：张三</div>
          </div>
          <div class="history-item">
            <div class="tags-row">
              <span class="tag tag-purple">采购单</span>
              <span class="tag tag-green">已完成</span>
              <span class="time">12月7日</span>
            </div>
            <div class="item-title">#20231207034 传感器采购申请</div>
            <div class="item-user">填报人：张三</div>
          </div>
        </div>
      </div> -->
    </div>

    <div class="right-column">
      <FormDetailPage :template-id="state.templateId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
import FormDetailPage from './components/FormDetailPage.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api';
const searchQuery = ref('');
const templateId = ref('');
const state = reactive({
  formList: [] as any,
  formDetail: {} as any,
  templateId: null as any,
});

const filteredFormList = computed(() => {
  if (!searchQuery.value) {
    return state.formList;
  }

  const query = searchQuery.value.toLowerCase();

  return state.formList.filter((item: any) => {
    return item.templateName.toLowerCase()?.includes(query);
  });
});

const handleTemplateId = (id: string) => {
  state.templateId = id;
};
const removeTemplateData = (id: string) => {
  ElMessageBox.confirm('请确认是否删除此表单模板?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'confirmButton',
  }).then(() => {
    api.form.removeTemplate(id).then(() => {
      ElMessage.success('删除成功');
      getTemplateList();
    });
  });
};

const getTemplateList = () => {
  api.form.getFormList().then((res) => {
    state.formList = res.data;
  });
};

onMounted(() => {
  getTemplateList();
});
</script>

<style scoped lang="scss">
.app-layout {
  box-sizing: border-box;
  display: flex;
  gap: 16px;
  height: 100%; /* 严格限定高度 */
  padding: 22px;
  overflow: hidden; /* 隐藏全局滚动条 */
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f4f6f9;
}

.left-column {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 16px;
  width: 300px;
  height: 100%; /* 撑满父级高度 */

  .panel-card {
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgb(0 0 0 / 2%);
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    width: 300px;
    height: 100%;
    padding: 10px;
    margin-right: 0;
    background-color: #fff;
    border-right: 1px solid #e4e7ed;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgb(0 0 0 / 5%);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 16px;
  }

  .sidebar-title {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
  }

  .sidebar-search {
    padding: 0 16px 12px;
  }

  .template-list {
    flex: 1;
    padding: 0 8px;
    overflow-y: auto;
  }

  .template-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 4px;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.2s;
  }

  .menu-item {
    position: relative;
    display: flex;
    align-items: center;
    padding: 12px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s ease-in-out;

    /* Hover 与 Active 状态 */
    &:hover {
      background-color: #f7f8fa;

      .op-actions {
        display: flex;
      }

      .custom-badge {
        display: none;
      }
    }

    &.active {
      background-color: #f0f7ff;
    }

    /* 图标 */
    .menu-icon {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      margin-right: 12px;
      font-size: 18px;
      border-radius: 8px;

      .fallback-icon {
        font-size: 16px;
        font-weight: bold;
      }
    }

    /* 文字信息 */
    .menu-info {
      flex: 1;
      min-width: 0;

      .menu-name {
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 14px;
        font-weight: 500;
        color: #1d2129;
        white-space: nowrap;
      }

      .menu-count {
        font-size: 12px;
        color: #86909c;
      }
    }

    /* 红色徽标 */
    .custom-badge {
      flex-shrink: 0;
      padding: 2px 8px;
      margin-left: 8px;
      font-size: 11px;
      color: #fff;
      background-color: #f53f3f;
      border-radius: 12px;
      transform: scale(0.9);
    }

    /* 操作按钮 */
    .op-actions {
      position: absolute;
      right: 12px;
      display: none;
      gap: 10px;
      align-items: center;
      padding-left: 8px;
      background: inherit;

      .op-icon {
        font-size: 16px;
        color: #86909c;

        &:hover {
          color: #3471ff;
        }
      }
    }
  }

  .item-info {
    display: flex;
    align-items: center;
    justify-content: center;

    .item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin-right: 12px;
      font-size: 18px;
      border-radius: 8px;
    }

    .item-desc {
      font-size: 12px;
      color: #909399;
    }
  }

  .delete-icon {
    color: #f56c6c;
  }
}

/* 历史卡片自动拉伸剩余高度 */
.history-panel {
  flex: 1;
  overflow: hidden; /* 保证内部可以滚动 */
}

.panel-header {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  padding: 10px;
  margin: 22px;

  .header-icon {
    font-size: 16px;
    color: #409eff;
  }

  .header-title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }
}

.flex-between {
  justify-content: space-between;

  .left-part {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .more-btn {
    font-size: 12px;
    color: #909399;
  }
}

.menu-list {
  padding: 0 12px 16px;

  .template-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 4px;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.2s;
  }

  .template-item:hover {
    background-color: #f5f7fa;
  }

  .template-item.active {
    background-color: #f0f5ff;
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-right: 12px;
    font-size: 18px;
    border-radius: 8px;
  }
}

/* 历史记录独立滚动 */
.history-list {
  flex: 1;
  padding: 0 20px 20px;
  overflow-y: auto;

  .history-item {
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid #f0f2f5;

    &:last-child {
      padding-bottom: 0;
      margin-bottom: 0;
      border-bottom: none;
    }

    .tags-row {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 8px;

      .tag {
        padding: 2px 6px;
        font-size: 10px;
        font-weight: 500;
        border-radius: 4px;

        &.tag-blue {
          color: #409eff;
          background: #eef5ff;
        }

        &.tag-green {
          color: #67c23a;
          background: #eefbf4;
        }

        &.tag-yellow {
          color: #e6a23c;
          background: #fff8eb;
        }

        &.tag-purple {
          color: #9c27b0;
          background: #f6f0ff;
        }
      }

      .time {
        margin-left: auto;
        font-size: 11px;
        color: #909399;
      }
    }

    .item-title {
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      color: #303133;
    }

    .item-user {
      font-size: 11px;
      color: #909399;
    }
  }
}

.right-column {
  flex: 1;
  height: 100%;
}

.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.ai-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f2f5;

  .ai-info {
    display: flex;
    gap: 10px;
    align-items: center;

    .ai-avatar-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      font-size: 18px;
      color: #409eff;
      background: #eef5ff;
      border-radius: 50%;
    }

    .ai-titles {
      .main-title {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
      }

      .sub-title {
        font-size: 11px;
        color: #909399;
      }
    }
  }

  .ai-actions {
    display: flex;
    gap: 12px;
    font-size: 16px;
    color: #909399;
    cursor: pointer;
  }
}

/* 聊天内容独立滚动 */
.chat-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background-color: #fafbfe;

  .time-divider {
    margin-bottom: 20px;
    font-size: 11px;
    color: #c0c4cc;
    text-align: center;
  }

  .message-row {
    display: flex;
    gap: 10px;
    margin-bottom: 4px;
  }

  .msg-time {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-bottom: 20px;
    font-size: 11px;
    color: #c0c4cc;
  }

  .avatar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    font-size: 16px;
    border-radius: 50%;

    &.bg-light-blue {
      color: #409eff;
      background: #eef5ff;
    }

    &.bg-blue {
      font-size: 14px;
      color: white;
      background: #409eff;
    }
  }

  .bubble {
    max-width: 230px;
    padding: 12px 16px;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-all;
    border-radius: 12px;

    &.ai-bubble {
      color: #303133;
      background: #fff;
      border: 1px solid #ebeef5;
      border-top-left-radius: 4px;
    }

    &.user-bubble {
      color: #fff;
      background: #36f;
      border-top-right-radius: 4px;
    }

    &.list-bubble {
      p {
        margin: 0 0 8px;
      }

      ul {
        padding: 0;
        margin: 0 0 8px;
        list-style: none;
      }

      li {
        display: flex;
        gap: 6px;
        align-items: flex-start;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .check-icon {
        margin-top: 2px;
        color: #67c23a;
      }

      .question-text {
        margin: 0;
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .ai-msg {
    justify-content: flex-start;
  }

  .ai-time {
    margin-left: 46px;
  }

  .user-msg {
    justify-content: flex-end;
  }

  .user-time {
    justify-content: flex-end;
    margin-right: 46px;
  }
}

.ai-footer {
  flex-shrink: 0;
  padding-bottom: 20px;
  background: white;
  border-top: 1px solid #f0f2f5;

  .recording-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin: 12px 16px;
    background: #eef5ff;
    border-radius: 6px;

    .status-left {
      display: flex;
      gap: 6px;
      align-items: center;

      .red-dot {
        width: 6px;
        height: 6px;
        background: #f56c6c;
        border-radius: 50%;
      }

      .status-text {
        font-size: 12px;
        color: #409eff;
      }
    }

    .timer-text {
      font-size: 12px;
      font-weight: 500;
      color: #409eff;
    }
  }

  .input-toolbar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    font-size: 20px;
    color: #909399;

    .mic-button-wrapper {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
    }

    .mic-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      font-size: 24px;
      color: white;
      cursor: pointer;
      background: #36f;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgb(51 102 255 / 40%);

      &.pulse-anim {
        animation: pulse 2s infinite;
      }
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(51 102 255 / 40%);
  }

  70% {
    box-shadow: 0 0 0 10px rgb(51 102 255 / 0%);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(51 102 255 / 0%);
  }
}
</style>
