<template>
  <div id="appEditPage">
    <a-card title="应用信息修改" class="edit-card">
      <a-form :model="formData" layout="vertical" @finish="handleSubmit">
        <a-form-item
          label="应用ID"
          v-if="appInfo.id"
        >
          <a-input :value="appInfo.id" disabled />
        </a-form-item>
        
        <a-form-item
          label="应用名称"
          name="appName"
          :rules="[{ required: true, message: '请输入应用名称' }]"
        >
          <a-input v-model:value="formData.appName" placeholder="请输入应用名称" />
        </a-form-item>
        
        <a-form-item
          label="应用封面"
          name="cover"
        >
          <a-upload
            list-type="picture"
            :file-list="fileList"
            :before-upload="beforeUpload"
            :custom-request="handleUpload"
            :on-remove="handleRemove"
            :show-upload-list="true"
          >
            <a-button>
              <UploadOutlined /> 上传封面
            </a-button>
          </a-upload>
          <p class="upload-hint">支持JPG、PNG格式，文件大小不超过2MB</p>
        </a-form-item>
        
        <a-form-item
          label="优先级"
          name="priority"
          v-if="isAdmin"
        >
          <a-slider
            v-model:value="formData.priority"
            :min="0"
            :max="100"
            :marks="{ 0: '0', 50: '50', 99: '精选', 100: '100' }"
          />
          <p class="priority-hint">优先级为99时，应用将显示在精选案例中</p>
        </a-form-item>
        
        <a-form-item
          label="初始提示词"
          name="initPrompt"
        >
          <a-input.TextArea
            v-model:value="formData.initPrompt"
            placeholder="应用的初始提示词"
            :rows="4"
            disabled
          />
        </a-form-item>
        
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="saving">
            保存修改
          </a-button>
          <a-button style="margin-left: 12px" @click="handleCancel">
            取消
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Upload } from 'ant-design-vue';
import { getAppVoById, getAppVoByIdByAdmin, updateApp, updateAppByAdmin } from '@/api/appController';
import { UploadOutlined } from '@ant-design/icons-vue';
import type { UploadFile, UploadProps } from 'ant-design-vue';
import { useLoginUserStore } from '@/stores/loginUser';

const route = useRoute();
const router = useRouter();
const loginUserStore = useLoginUserStore();

// 获取路由参数 appId
const appId = ref<number>(parseInt(route.params.appId as string) || 0);

// 应用信息
const appInfo = ref<API.AppVO>({
  id: 0,
  appName: '',
  initPrompt: '',
  cover: '',
  priority: 0
});

// 表单数据
const formData = ref<{
  appName: string;
  cover: string;
  priority: number;
  initPrompt: string;
}>({
  appName: '',
  cover: '',
  priority: 0,
  initPrompt: ''
});

// 文件列表
const fileList = ref<UploadFile[]>([]);

// 保存状态
const saving = ref(false);

// 是否为管理员
const isAdmin = ref(false);

// 获取应用信息
const fetchAppInfo = async () => {
  if (!appId.value) {
    message.error('应用ID无效');
    router.push('/');
    return;
  }

  try {
    // 检查用户登录状态
    await loginUserStore.fetchLoginUser();
    isAdmin.value = loginUserStore.loginUser.userRole === 'admin';

    let res;
    if (isAdmin.value) {
      // 管理员可以获取任意应用信息
      res = await getAppVoByIdByAdmin({ id: appId.value });
    } else {
      // 普通用户只能获取自己的应用信息
      res = await getAppVoById({ id: appId.value });
    }

    if (res.data.code === 0 && res.data.data) {
      appInfo.value = res.data.data;
      
      // 检查是否有权限编辑（管理员或自己的应用）
      if (!isAdmin.value && appInfo.value.userId !== loginUserStore.loginUser.id) {
        message.error('您没有权限编辑此应用');
        router.push('/');
        return;
      }

      // 填充表单数据
      formData.value = {
        appName: appInfo.value.appName || '',
        cover: appInfo.value.cover || '',
        priority: appInfo.value.priority || 0,
        initPrompt: appInfo.value.initPrompt || ''
      };

      // 填充文件列表
      if (formData.value.cover) {
        fileList.value = [{
          uid: '-1',
          name: 'cover.jpg',
          status: 'done',
          url: formData.value.cover
        }];
      }
    } else {
      message.error('获取应用信息失败：' + (res.data.message || '未知错误'));
    }
  } catch (error) {
    message.error('获取应用信息失败');
    console.error('获取应用信息失败:', error);
  }
};

// 上传前检查
const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    message.error('请上传JPG或PNG格式的图片！');
    return Upload.LIST_IGNORE;
  }
  const isLt2M = file.size! / 1024 / 1024 < 2;
  if (!isLt2M) {
    message.error('图片大小不能超过2MB！');
    return Upload.LIST_IGNORE;
  }
  return true;
};

// 自定义上传处理（模拟）
const handleUpload: UploadProps['customRequest'] = ({ file, onSuccess }) => {
  // 模拟上传过程
  setTimeout(() => {
    // 这里应该调用实际的上传接口，这里使用占位图
    const mockUrl = `https://via.placeholder.com/300x200?text=${encodeURIComponent(formData.value.appName || '应用封面')}`;
    formData.value.cover = mockUrl;
    if (onSuccess) {
      onSuccess({
        status: 'done',
        url: mockUrl
      });
    }
  }, 500);
};

// 移除文件
const handleRemove: UploadProps['onRemove'] = () => {
  formData.value.cover = '';
  fileList.value = [];
  return true;
};

// 提交表单
const handleSubmit = async () => {
  if (!formData.value.appName.trim()) {
    message.error('请输入应用名称');
    return;
  }

  saving.value = true;

  try {
    let res;
    
    if (isAdmin.value) {
      // 管理员可以更新更多字段
      res = await updateAppByAdmin({
        id: appId.value,
        appName: formData.value.appName.trim(),
        cover: formData.value.cover || undefined,
        priority: formData.value.priority
      });
    } else {
      // 普通用户只能更新应用名称
      res = await updateApp({
        id: appId.value,
        appName: formData.value.appName.trim()
      });
    }

    if (res.data.code === 0 && res.data.data) {
      message.success('保存成功');
      // 如果是从应用生成页面进入的，返回应用生成页面；否则返回上一页
      const referrer = sessionStorage.getItem('appEditReferrer');
      if (referrer && referrer.includes('/app/generate/')) {
        router.push(referrer);
      } else if (isAdmin.value) {
        router.push('/admin/appManage');
      } else {
        router.push('/');
      }
    } else {
      message.error('保存失败：' + (res.data.message || '未知错误'));
    }
  } catch (error) {
    message.error('保存失败');
    console.error('保存失败:', error);
  } finally {
    saving.value = false;
  }
};

// 取消操作
const handleCancel = () => {
  // 如果是从应用生成页面进入的，返回应用生成页面；否则返回上一页
  const referrer = sessionStorage.getItem('appEditReferrer');
  if (referrer && referrer.includes('/app/generate/')) {
    router.push(referrer);
  } else if (isAdmin.value) {
    router.push('/admin/appManage');
  } else {
    router.push('/');
  }
};

// 监听路由参数变化
watch(() => route.params.appId, async (newAppId) => {
  appId.value = parseInt(newAppId as string) || 0;
  await fetchAppInfo();
});

// 页面加载时获取数据
onMounted(async () => {
  // 保存来源页面，以便返回
  if (document.referrer) {
    sessionStorage.setItem('appEditReferrer', document.referrer);
  }
  
  await fetchAppInfo();
});
</script>

<style scoped>
#appEditPage {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 0;
}

.edit-card {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  border-radius: 8px;
}

.upload-hint {
  color: #999;
  font-size: 12px;
  margin-top: 8px;
}

.priority-hint {
  color: #999;
  font-size: 12px;
  margin-top: 8px;
  text-align: center;
}
</style>