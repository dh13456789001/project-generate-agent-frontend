<template>
  <div id="appGenerationPage">
    <!-- 顶部栏 -->
    <div class="app-header">
      <div class="header-content">
        <div class="app-title">
          {{ appInfo?.appName || '未命名应用' }}
        </div>
        <div class="header-actions">
          <a-button type="primary" @click="deployApp" :loading="deploying">
            部署应用
          </a-button>
        </div>
      </div>
    </div>

    <!-- 核心内容区域 -->
    <div class="main-content">
      <!-- 左侧对话区域 -->
      <div class="chat-section">
        <!-- 消息列表 -->
        <div class="message-list" ref="messageListRef">
          <div v-for="message in messages" :key="message.id" class="message-wrapper">
            <div v-if="message.role === 'user'" class="user-message">
              <div class="message-content">
                {{ message.content }}
              </div>
            </div>
            <div v-else class="ai-message">
              <div class="message-content">
                <div v-if="message.contentType === 'text'" v-html="formatMessageContent(message.content)"></div>
                <div v-else-if="message.contentType === 'code'" class="code-block">
                  <pre><code>{{ message.content }}</code></pre>
                </div>
              </div>
            </div>
          </div>
          <div v-if="loading" class="loading-indicator">
            <a-spin />
            <span>AI 正在生成代码...</span>
          </div>
        </div>

        <!-- 输入框区域 -->
        <div class="input-section">
          <a-form @finish="sendMessage">
            <a-form-item>
              <a-input
                v-model:value="inputMessage"
                placeholder="输入您的需求，让 AI 继续完善应用..."
                class="message-input"
                :disabled="loading"
                @keydown.ctrl.enter="sendMessage"
              />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" :loading="loading">
                发送消息
              </a-button>
              <span class="shortcut-tip">Ctrl + Enter 快速发送</span>
            </a-form-item>
          </a-form>
        </div>
      </div>

      <!-- 右侧网页展示区域 -->
      <div class="preview-section">
        <div v-if="showPreview && appInfo" class="preview-container">
          <iframe
            :src="`http://localhost:8123/api/static/${appInfo.codeGenType}_${appInfo.id}/`"
            frameborder="0"
            class="preview-iframe"
            @load="handlePreviewLoad"
            @error="handlePreviewError"
          ></iframe>
        </div>
        <div v-else class="preview-placeholder">
          <div class="placeholder-content">
            <CodeOutlined style="font-size: 48px; color: #ccc; margin-bottom: 16px;" />
            <p v-if="loading">AI 正在生成您的应用，请稍候...</p>
            <p v-else-if="appInfo && !showPreview">应用生成已完成，点击部署按钮查看效果</p>
            <p v-else>请先创建应用并等待 AI 生成完成</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Upload } from 'ant-design-vue';
import { getAppVoById, deployApp as deployAppApi, chatToGenCode } from '@/api/appController';
import { CodeOutlined } from '@ant-design/icons-vue';
import type { UploadFile, UploadProps } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();
const messageListRef = ref<HTMLDivElement>();

// 获取路由参数 appId
const appId = ref<string>(route.params.appId as string || '');

// 应用信息
const appInfo = ref<API.AppVO | null>(null);

// 对话消息列表
const messages = ref<Array<{ id: string; role: 'user' | 'ai'; content: string; contentType: 'text' | 'code'; }>>([]);

// 输入框消息
const inputMessage = ref('');

// 加载状态
const loading = ref(false);
const deploying = ref(false);

// 是否显示预览
const showPreview = ref(false);

// 获取应用信息
const fetchAppInfo = async () => {
  if (!appId.value) {
    message.error('应用ID无效');
    router.push('/');
    return;
  }

  try {
    // 直接使用字符串类型的id，不进行转换
    const res = await getAppVoById({ id: appId.value });
    if (res.data.code === 0 && res.data.data) {
      appInfo.value = res.data.data;
      // 如果有部署密钥，显示预览
      if (appInfo.value.deployKey) {
        showPreview.value = true;
      }
    } else {
      message.error('获取应用信息失败：' + (res.data.message || '未知错误'));
    }
  } catch (error) {
    message.error('获取应用信息失败');
    console.error('获取应用信息失败:', error);
  }
};

// 发送消息（使用SSE流式返回）
const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) {
    return;
  }

  const userMessage = inputMessage.value.trim();
  inputMessage.value = '';

  // 添加用户消息到列表
  messages.value.push({
    id: Date.now().toString() + '-user',
    role: 'user',
    content: userMessage,
    contentType: 'text'
  });

  loading.value = true;

  // 滚动到底部
  scrollToBottom();

  try {
    // 调用SSE接口获取代码生成结果
    const eventSource = new EventSource(
      `http://localhost:8123/api/app/chat/gen/code?appId=${appId.value}&message=${encodeURIComponent(userMessage)}`,{
          withCredentials: true,
        }
    );

    let aiMessageContent = '';
    let aiMessageId = Date.now().toString() + '-ai';
    let aiMessageContentType: 'text' | 'code' = 'text';

    // 添加AI消息占位符
    messages.value.push({
      id: aiMessageId,
      role: 'ai',
      content: '',
      contentType: aiMessageContentType
    });

    // 处理消息块
    eventSource.onmessage = (event) => {
      try {
        // 解析SSE数据
        const data = JSON.parse(event.data);
        if (data.d) {
          aiMessageContent += data.d;
          
          // 更新AI消息
          const messageIndex = messages.value.findIndex(msg => msg.id === aiMessageId);
          if (messageIndex !== -1) {
            messages.value[messageIndex].content = aiMessageContent;
            messages.value = [...messages.value]; // 触发响应式更新
          }
          
          // 滚动到底部
          scrollToBottom();
        }
      } catch (error) {
        console.error('解析SSE数据失败:', error);
      }
    };

    // 处理完成事件
    eventSource.addEventListener('done', () => {
      eventSource.close();
      loading.value = false;
      showPreview.value = true;
      scrollToBottom();
    });

    // 处理错误
    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      eventSource.close();
      loading.value = false;
      message.error('代码生成失败，请重试');
    };

  } catch (error) {
    message.error('发送消息失败');
    console.error('发送消息失败:', error);
    loading.value = false;
  }
};

// 部署应用
const deployApp = async () => {
  if (!appInfo.value || deploying.value) {
    return;
  }

  deploying.value = true;

  try {
    const res = await deployAppApi({ id: appInfo.value.id });
    
    if (res.data.code === 0 && res.data.data) {
      message.success('部署成功！');
      
      // 更新应用信息
      appInfo.value.deployKey = res.data.data;
      showPreview.value = true;
      
      // 显示部署成功的消息
      messages.value.push({
        id: Date.now().toString() + '-deploy-success',
        role: 'ai',
        content: '您的应用已成功部署！访问地址：' + res.data.data,
        contentType: 'text'
      });
      
      // 滚动到底部
      scrollToBottom();
    } else {
      message.error('部署失败：' + (res.data.message || '未知错误'));
    }
  } catch (error) {
    message.error('部署失败');
    console.error('部署失败:', error);
  } finally {
    deploying.value = false;
  }
};

// 格式化消息内容
const formatMessageContent = (content: string): string => {
  // 简单的Markdown解析，将```包裹的代码块转换为HTML
  let formattedContent = content.replace(/```([\s\S]*?)```/g, '<div class="code-block"><pre><code>$1</code></pre></div>');
  // 将\n转换为<br>
  formattedContent = formattedContent.replace(/\n/g, '<br>');
  return formattedContent;
};

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
};

// 处理预览加载
const handlePreviewLoad = () => {
  console.log('预览加载完成');
};

// 处理预览错误
const handlePreviewError = () => {
  console.log('预览加载失败');
  message.warning('预览加载失败，请检查网络连接或稍后再试');
};

// 监听路由参数变化
watch(() => route.params.appId, async (newAppId) => {
  appId.value = parseInt(newAppId as string) || 0;
  await fetchAppInfo();
});

// 页面加载时获取数据
onMounted(async () => {
  await fetchAppInfo();
  
  // 如果是新创建的应用，自动发送初始提示词
  if (appInfo.value && !messages.value.length && appInfo.value.initPrompt) {
    inputMessage.value = appInfo.value.initPrompt;
    setTimeout(() => {
      sendMessage();
    }, 500);
  }
});
</script>

<style scoped>
#appGenerationPage {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

/* 顶部栏样式 */
.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 16px 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  overflow: hidden;
}

/* 左侧对话区域样式 */
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  overflow: hidden;
}

/* 消息列表样式 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  display: flex;
  margin-bottom: 16px;
}

.user-message {
  justify-content: flex-end;
}

.ai-message {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
}

.user-message .message-content {
  background-color: #1890ff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ai-message .message-content {
  background-color: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4px;
}

.code-block {
  background-color: #282c34;
  color: #abb2bf;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.code-block pre {
  margin: 0;
}

.code-block code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

/* 加载指示器样式 */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #999;
}

/* 输入框区域样式 */
.input-section {
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
}

.message-input {
  width: 100%;
}

.shortcut-tip {
  margin-left: 12px;
  color: #999;
  font-size: 12px;
}

/* 右侧预览区域样式 */
.preview-section {
  width: 50%;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-container {
  flex: 1;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.placeholder-content {
  text-align: center;
  color: #999;
}

.placeholder-content p {
  margin-top: 8px;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .preview-section {
    width: 45%;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .preview-section {
    width: 100%;
    height: 50%;
  }
}
</style>