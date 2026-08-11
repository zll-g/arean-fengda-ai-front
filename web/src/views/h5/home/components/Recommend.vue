<template>
  <div class="recommend-container">
    <van-row justify="space-between" align="center" class="header">
      <van-col>
        <h3>推荐阅读</h3>
      </van-col>
      <van-col>
        <van-button plain size="small">
          查看全部
          <van-icon name="arrow" />
        </van-button>
      </van-col>
    </van-row>

    <div class="recommend-list">
      <div v-for="item in recommendList" :key="item.id" class="recommend-item">
        <div class="recommend-image">
          <img :src="item.image" :alt="item.title" />
        </div>
        <div class="recommend-content">
          <h4 class="recommend-title">{{ item.title }}</h4>
          <p class="recommend-text">{{ item.content }}</p>
          <div class="recommend-footer">
            <van-row justify="space-between" align="center">
              <van-col>
                <van-tag
                  v-for="(cat, index) in item.categories.slice(0, 3)"
                  :key="index"
                  type="primary"
                  size="medium"
                  :style="{
                    marginRight: index < item.categories.slice(0, 3).length - 1 ? '0.25rem' : '0',
                  }"
                >
                  {{ cat }}
                </van-tag>
              </van-col>
              <van-col><van-icon name="arrow" /></van-col>
            </van-row>
          </div>
          <div class="read-info">
            <van-icon name="eye-o" />
            <span>{{ item.readCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RecommendItem {
  id: string;
  title: string;
  content: string;
  categories: string[];
  readCount: string;
  image: string;
}

const recommendList: RecommendItem[] = [
  {
    id: '1',
    title: '锅炉冬季防冻规程',
    content: '关于确保锅炉在低温环境下安全运行,预防冻结损坏的操作规范以及流程',
    categories: ['操作规程', '冬季维护'],
    readCount: '2.3k阅读',
    image: 'https://img95.699pic.com/photo/60067/6100.jpg_wh860.jpg',
  },
  {
    id: '2',
    title: '设备维护保养指南',
    content: '定期维护保养设备的详细步骤和注意事项，确保设备长期稳定运行',
    categories: ['维护手册', '设备管理'],
    readCount: '1.8k阅读',
    image:
      'https://ts1.tc.mm.bing.net/th/id/R-C.90831c317ffd96d1bcec8062a4147761?rik=jBJJV1bsvTg%2fEQ&riu=http%3a%2f%2fwww.ygdlkj.com%2fUpload%2fTemplate%2fyanguang%2fattached%2fimage%2f20230216%2f20230216142939_3995.jpeg&ehk=HbUxJeEM6KUvxxaUK%2b8EtklvWr7CCs5kQuw4Qi0UL6A%3d&risl=&pid=ImgRaw&r=0',
  },
  {
    id: '3',
    title: '安全生产管理制度',
    content: '企业安全生产的各项管理规定和操作流程，保障员工人身安全',
    categories: ['管理制度', '安全生产', '合规'],
    readCount: '3.2k阅读',
    image: 'https://n.sinaimg.cn/sinacn/w1600h1066/20180131/5880-fyrcsrw2723602.jpg',
  },
];
</script>

<style scoped>
.recommend-container {
  background-color: #f9fafb;
  border-radius: 8px;
}

.header {
  margin-bottom: 1rem;
}

.header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.recommend-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgb(0 0 0 / 5%);
  transition: all 0.3s ease;
}

.recommend-item:active {
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
  transform: scale(0.98);
}

.recommend-image {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
}

.recommend-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.recommend-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.recommend-title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
}

.recommend-text {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  line-clamp: 2;
  font-size: 0.875rem;
  line-height: 1.4;
  color: #6b7280;
}

.recommend-footer {
  width: 100%;
}

.read-info {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  margin-top: auto;
  font-size: 0.75rem;
  color: #9ca3af;
}

.read-info .van-icon {
  font-size: 0.875rem;
}
</style>
