<template>
  <div v-if="clarification" class="clarify-options">
    <div class="clarify-text">
      <el-icon color="#e6a23c"><QuestionFilled /></el-icon>
      <span>{{ clarification.clarifyText }}</span>
    </div>
    <div class="option-list">
      <div
        v-for="(opt, idx) in clarification.options"
        :key="idx"
        class="option-card"
        @click="$emit('select', opt.query)"
      >
        <div class="option-index">{{ idx + 1 }}</div>
        <div class="option-content">
          <div class="option-label">{{ opt.label }}</div>
          <div class="option-query">{{ opt.query }}</div>
        </div>
        <el-icon class="option-arrow"><ArrowRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  clarification: {
    type: Object,
    default: null,
  },
});

defineEmits(['select']);
</script>

<style scoped lang="scss">
.clarify-options {
  margin: 10px 0;

  .clarify-text {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 12px;
    font-size: 14px;
    color: #e6a23c;
  }

  .option-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .option-card {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    background: #f9fafb;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    transition: all 0.2s;

    &:hover {
      background: #ecf5ff;
      border-color: #b3d8ff;
      box-shadow: 0 2px 8px rgb(64 158 255 / 15%);
      transform: translateX(4px);
    }

    .option-index {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      background: #409eff;
      border-radius: 50%;
    }

    .option-content {
      flex: 1;
      min-width: 0;

      .option-label {
        font-size: 14px;
        font-weight: 500;
        color: #303133;
      }

      .option-query {
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 12px;
        color: #909399;
        white-space: nowrap;
      }
    }

    .option-arrow {
      flex-shrink: 0;
      color: #c0c4cc;
      transition: color 0.2s;
    }

    &:hover .option-arrow {
      color: #409eff;
    }
  }
}
</style>
