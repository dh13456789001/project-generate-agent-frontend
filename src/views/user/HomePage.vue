<template>
  <div id="homePage">
    <!-- 主标题和副标题 -->
    <div class="hero-section">
      <h1 class="main-title">一句话 <span class="logo-icon">🐱</span> 呈所想</h1>
      <p class="subtitle">与 AI 对话轻松创建应用和网站</p>
    </div>

    <!-- 提示词输入框 -->
    <div class="prompt-section">
      <a-form @finish="createApp">
        <a-form-item>
          <a-input
            v-model:value="prompt"
            placeholder="使用 NoCode 创建一个高效的小工具，帮我计算......"
            class="prompt-input"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" class="create-btn" @click="handleCreateClick">
            开始创建
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <!-- 功能标签 -->
    <div class="feature-tags">
      <a-tag color="blue">波普风电商页面</a-tag>
      <a-tag color="blue">企业网站</a-tag>
      <a-tag color="blue">电商运营后台</a-tag>
      <a-tag color="blue">暗黑话题社区</a-tag>
    </div>

    <!-- 我的应用列表 -->
    <div class="app-section">
      <h2 class="section-title">我的作品</h2>
      <div class="app-list">
        <div v-if="myApps.length > 0" class="app-grid">
          <div v-for="app in myApps" :key="app.id" class="app-card">
            <a-card :hoverable="true" @click="goToApp(app.id)">
              <template #cover>
                <img alt="app cover" :src="app.cover || 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(app.appName || '应用封面')" />
              </template>
              <a-card-meta
                :title="app.appName || '未命名应用'"
                :description="formatDate(app.createTime)"
              />
            </a-card>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无应用，输入提示词开始创建</p>
        </div>
      </div>
      <a-pagination
        v-if="myApps.length > 0"
        v-model:current="myAppsPageNum"
        v-model:page-size="myAppsPageSize"
        :total="myAppsTotal"
        showSizeChanger
        :showTotal="(total) => `共 ${total} 条`"
        @change="fetchMyApps"
        @showSizeChange="handleMyAppsSizeChange"
        class="pagination"
      />
    </div>

    <!-- 精选应用列表 -->
    <div class="app-section">
      <h2 class="section-title">精选案例</h2>
      <div class="app-list">
        <div v-if="goodApps.length > 0" class="app-grid">
          <div v-for="app in goodApps" :key="app.id" class="app-card">
            <a-card :hoverable="true" @click="goToApp(app.id)">
              <template #cover>
                <img alt="app cover" :src="app.cover || 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(app.appName || '应用封面')" />
              </template>
              <a-card-meta
                :title="app.appName || '未命名应用'"
                :description="app.user?.userName || '官方案例'"
              />
            </a-card>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无精选应用</p>
        </div>
      </div>
      <a-pagination
        v-if="goodApps.length > 0"
        v-model:current="goodAppsPageNum"
        v-model:page-size="goodAppsPageSize"
        :total="goodAppsTotal"
        showSizeChanger
        showTotal="(total) => `共 ${total} 条`"
        @change="fetchGoodApps"
        @showSizeChange="handleGoodAppsSizeChange"
        class="pagination"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { addApp, listMyAppVoByPage, listGoodAppVoByPage } from '@/api/appController';
import dayjs from 'dayjs';
import { useLoginUserStore } from '@/stores/loginUser';

const router = useRouter();
const loginUserStore = useLoginUserStore();

// 提示词输入
const prompt = ref('');

// 我的应用列表数据
const myApps = ref<API.AppVO[]>([]);
const myAppsTotal = ref(0);
const myAppsPageNum = ref(1);
const myAppsPageSize = ref(20);
const myAppsSearchParams = ref('');

// 精选应用列表数据
const goodApps = ref<API.AppVO[]>([]);
const goodAppsTotal = ref(0);
const goodAppsPageNum = ref(1);
const goodAppsPageSize = ref(20);
const goodAppsSearchParams = ref('');

// 处理创建按钮点击
const handleCreateClick = (e: MouseEvent) => {
  e.preventDefault();
  createApp();
};

// 创建应用
const createApp = async () => {
  if (!prompt.value.trim()) {
    message.error('请输入提示词');
    return;
  }

  try {
    const res = await addApp({
      initPrompt: prompt.value.trim()
    });
    
    if (res.data.code === 0 && res.data.data) {
      const appId = res.data.data;
      message.success('应用创建成功');
      router.push(`/app/generate/${appId}`);
    } else {
      message.error('应用创建失败：' + (res.data.message || '未知错误'));
    }
  } catch (error) {
    message.error('应用创建失败');
    console.error('创建应用失败:', error);
  }
};

// 跳转到应用生成页面
const goToApp = (appId: string | number) => {
  // 直接使用appId，不进行转换
  router.push(`/app/generate/${appId}`);
};

// 获取我的应用列表
const fetchMyApps = async () => {
  try {
    const res = await listMyAppVoByPage({
      pageNum: myAppsPageNum.value,
      pageSize: myAppsPageSize.value,
      appName: myAppsSearchParams.value || undefined
    });
    
    if (res.data.code === 0 && res.data.data) {
      myApps.value = res.data.data.records || [];
      myAppsTotal.value = res.data.data.totalRow || 0;
    } else {
      message.error('获取我的应用失败：' + (res.data.message || '未知错误'));
    }
  } catch (error) {
    message.error('获取我的应用失败');
    console.error('获取我的应用失败:', error);
  }
};

// 处理我的应用分页大小变化
const handleMyAppsSizeChange = (current: number, size: number) => {
  myAppsPageNum.value = current;
  myAppsPageSize.value = size;
  fetchMyApps();
};

// 获取精选应用列表
const fetchGoodApps = async () => {
  try {
    const res = await listGoodAppVoByPage({
      pageNum: goodAppsPageNum.value,
      pageSize: goodAppsPageSize.value,
      appName: goodAppsSearchParams.value || undefined
    });
    
    if (res.data.code === 0 && res.data.data) {
      goodApps.value = res.data.data.records || [];
      goodAppsTotal.value = res.data.data.totalRow || 0;
    } else {
      message.error('获取精选应用失败：' + (res.data.message || '未知错误'));
    }
  } catch (error) {
    message.error('获取精选应用失败');
    console.error('获取精选应用失败:', error);
  }
};

// 处理精选应用分页大小变化
const handleGoodAppsSizeChange = (current: number, size: number) => {
  goodAppsPageNum.value = current;
  goodAppsPageSize.value = size;
  fetchGoodApps();
};

// 格式化日期
const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  return dayjs(dateString).format('YYYY-MM-DD');
};

// 页面加载时获取数据
onMounted(async () => {
  // 获取登录用户信息
  await loginUserStore.fetchLoginUser();
  
  // 如果用户已登录，获取我的应用
  if (loginUserStore.loginUser.id) {
    await fetchMyApps();
  }
  
  // 获取精选应用
  await fetchGoodApps();
});
</script>

<style scoped>
#homePage {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.hero-section {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 0;
}

.main-title {
  font-size: 42px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #333;
}

.logo-icon {
  color: #1890ff;
}

.subtitle {
  font-size: 18px;
  color: #666;
  margin-bottom: 0;
}

.prompt-section {
  max-width: 800px;
  margin: 0 auto 40px;
  text-align: center;
}

.prompt-input {
  height: 50px;
  font-size: 16px;
  margin-bottom: 20px;
}

.create-btn {
  height: 50px;
  font-size: 16px;
  padding: 0 40px;
}

.feature-tags {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 60px;
  flex-wrap: wrap;
}

.app-section {
  margin-bottom: 60px;
}

.section-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.app-card {
  transition: transform 0.3s ease;
}

.app-card:hover {
  transform: translateY(-5px);
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  background-color: #f5f5f5;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .main-title {
    font-size: 32px;
  }
  
  .subtitle {
    font-size: 16px;
  }
  
  .app-grid {
    grid-template-columns: 1fr;
  }
}
</style>