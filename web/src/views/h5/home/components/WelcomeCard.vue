<template>
  <div class="welcome-contain">
    <div class="welcome-card">
      <p class="hello-text">{{ greeting }}，{{ getUserInfo()?.nickname || '操作员' }}</p>
      <p class="date-text">{{ currentDate }}</p>
    </div>
    <div class="quick-guide">
      <h3>快捷入口</h3>
      <div class="guide-box">
        <div
          v-for="i in item"
          :key="i.path"
          class="quick-guide-item van-haptics-feedback"
          @click="JumpTo(i.path)"
        >
          <div :class="i.style">
            <van-icon :name="i.icon" class="icon" />
          </div>
          <div class="text">{{ i.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getUserInfo } from '@/utils/device';
const router = useRouter();

const item = [
  {
    name: '语音填单',
    icon: 'phone',
    path: '/h5/template',
    style: 'item-box item-box-purple',
  },
  {
    name: '知识库问答',
    icon: 'description',
    path: '/h5/knowledge-history',
    style: 'item-box item-box-blue',
  },
  {
    name: '智能问数',
    icon: 'points',
    path: '/h5/dataQuery-history',
    style: 'item-box item-box-green',
  },
  {
    name: '数据预测',
    icon: 'cluster',
    path: '/h5/predictive',
    style: 'item-box item-box-orange',
  },
];

const currentDate = ref<string>('');
const greeting = ref<string>('您好');

// 星期数组
const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 更新日期和问候语
const updateDate = () => {
  const now = new Date();

  // 格式化日期 YYYY年MM月DD日 星期X
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const week = weekDays[now.getDay()] || '星期日';
  currentDate.value = `${year}年${month}月${day}日 ${week}`;

  // 根据时间设置问候语
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    greeting.value = '早上好';
  } else if (hour >= 12 && hour < 14) {
    greeting.value = '中午好';
  } else if (hour >= 14 && hour < 18) {
    greeting.value = '下午好';
  } else if (hour >= 18 && hour < 22) {
    greeting.value = '晚上好';
  } else {
    greeting.value = '夜深了';
  }
};

onMounted(() => {
  updateDate();
});

const JumpTo = (path: string) => {
  router.push(path);
};
</script>

<style scoped>
.welcome-contain {
  margin-bottom: 1rem;
  background: #f7f5f2;
}

.welcome-card {
  width: 100%;
  height: 100%;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: left;
  background: #fff;
  border: 1px solid rgb(238 225 210 / 55%);
  border-radius: 13px;
  box-shadow: 0 4px 14px rgb(74 55 35 / 6%);
}

.hello-text {
  font-size: 1.6rem;
  font-weight: 700;
  color: #263247;
}

.date-text {
  margin-top: 0.3rem;
  font-size: 1rem;
  color: #99a3b4;
}

.quick-guide {
  box-sizing: border-box;
  padding: 1rem;
  text-align: left;
  background: #fff;
  border: 1px solid rgb(238 225 210 / 55%);
  border-radius: 13px;
  box-shadow: 0 4px 14px rgb(74 55 35 / 6%);
}

.quick-guide h3 {
  margin: 0 0 0.8rem;
  font-size: 1rem;
  font-weight: 600;
  color: #d96216;
}

.guide-box {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
}

.item-box {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 4.5rem;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: 15px;
}

.item-box-purple {
  background: linear-gradient(#bb8df5, #893be2);
}

.item-box-blue {
  background: linear-gradient(#78a9f4, #3864e3);
}

.item-box-green {
  background: linear-gradient(#78db89, #4da255);
}

.item-box-orange {
  background: linear-gradient(#ed974f, #d9632c);
}

.quick-guide-item {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  cursor: pointer;
}

.icon {
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  color: white;
}

.text {
  margin-top: 0.3rem;
  font-size: clamp(0.6rem, 2.2vw, 0.8rem);
  color: #596579;
  text-align: center;
}
</style>
