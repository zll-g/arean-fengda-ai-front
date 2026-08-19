<template>
  <div v-if="props.loading" class="loading-overlay">
    <div class="loading-spinner">
      <div class="spinner-box">
        <div class="spinner" />
      </div>
      <p v-if="props.text" class="loading-text">{{ text }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  text: {
    type: String,
    default: '加载中...',
  },
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgb(255 255 255 / 80%);
}

.spinner-box {
  display: flex;
  justify-content: center;
}

.spinner {
  width: 50px;
  height: 50px;
  text-align: center;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  padding-top: 15px;
  font-size: 14px;
  color: #666;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
