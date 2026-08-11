<template>
  <div class="circle-contain">
    <h3>任务统计</h3>
    <p>本月完成任务情况</p>
    <van-circle
      v-model:current-rate="currentRate"
      :rate="30"
      :speed="100"
      :text="text"
      size="150"
      stroke-width="100"
      layer-color="#f7f8fa"
    />
    <van-row justify="center" gutter="30">
      <van-col>
        <van-icon name="stop" style="color: #528af2" />
        已完成
      </van-col>
      <van-col>
        <van-icon name="circle" />
        未完成
      </van-col>
    </van-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const currentRate = ref(40);
const text = '完成进度：' + currentRate.value.toFixed(0) + '%';
</script>

<style scoped>
.circle-contain {
  padding: 16px;
  text-align: center;
  background-color: #fff;
}

.circle-contain > * {
  margin-top: 16px;
  margin-bottom: 16px;
}

.circle-contain > *:first-child {
  margin-top: 0;
}

.circle-contain > *:last-child {
  margin-bottom: 0;
}
</style>
