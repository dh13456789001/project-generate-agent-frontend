<template>
  <div id="appManagePage">
    <!-- 搜索表单 -->
    <a-form layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="应用名称">
        <a-input v-model:value="searchParams.appName" placeholder="输入应用名称"/>
      </a-form-item>
      <a-form-item label="创建者">
        <a-input v-model:value="searchParams.userName" placeholder="输入创建者用户名"/>
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
      </a-form-item>
    </a-form>
    <a-divider/>
    <!-- 表格 -->
    <a-table
        :columns="columns"
        :data-source="data"
        :pagination="pagination"
        @change="doTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'cover'">
          <a-image v-if="record.cover" :src="record.cover" :width="120" :preview="false"/>
          <span v-else>无封面</span>
        </template>
        <template v-else-if="column.dataIndex === 'priority'">
          <div v-if="record.priority === 99">
            <a-tag color="red">精选应用</a-tag>
          </div>
          <div v-else>
            {{ record.priority || 0 }}
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" @click="doEdit(record.id)">编辑</a-button>
          <a-button type="link" danger @click="doDelete(record.id)">删除</a-button>
          <a-button type="link" @click="doFeatured(record.id, record.priority === 99)">
            {{ record.priority === 99 ? '取消精选' : '设为精选' }}
          </a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import {computed, onMounted, reactive, ref} from "vue";
import {useRouter} from 'vue-router';
import {deleteAppByAdmin, listAppVoByPageByAdmin, updateAppByAdmin} from "@/api/appController.ts";
import {message} from "ant-design-vue";

const router = useRouter();

// 表格列配置
const columns = [
  {
    title: 'id',
    dataIndex: 'id',
  },
  {
    title: '应用名称',
    dataIndex: 'appName',
  },
  {
    title: '封面',
    dataIndex: 'cover',
  },
  {
    title: '初始提示词',
    dataIndex: 'initPrompt',
    ellipsis: true,
    width: 300,
  },
  {
    title: '代码生成类型',
    dataIndex: 'codeGenType',
  },
  {
    title: '优先级',
    dataIndex: 'priority',
  },
  {
    title: '用户ID',
    dataIndex: 'userId',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
  },
]

// 数据
const data = ref<API.AppVO[]>([])
const total = ref(0)

// 搜索条件
const searchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 10,
})

// 获取数据
const fetchData = async () => {
  const res = await listAppVoByPageByAdmin({
    ...searchParams,
  })
  if (res.data.data) {
    data.value = res.data.data.records ?? []
    total.value = res.data.data.totalRow ?? 0
  } else {
    message.error('获取数据失败，' + res.data.message)
  }
}

// 页面加载时请求一次
onMounted(() => {
  fetchData()
})

// 分页参数
const pagination = computed(() => {
  return {
    current: searchParams.pageNum ?? 1,
    pageSize: searchParams.pageSize ?? 10,
    total: total.value,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条`,
  }
})

// 表格变化处理
const doTableChange = (page: any) => {
  searchParams.pageNum = page.current
  searchParams.pageSize = page.pageSize
  fetchData()
}

// 搜索数据
const doSearch = () => {
  // 重置页码
  searchParams.pageNum = 1
  fetchData()
}

// 编辑数据
const doEdit = (id: number) => {
  if (!id) {
    return
  }
  router.push(`/app/edit/${id}`)
}

// 删除数据
const doDelete = async (id: number) => {
  if (!id) {
    return
  }
  
  // 确认对话框
  const confirmResult = await new Promise<boolean>((resolve) => {
    window.confirm('确定要删除这个应用吗？') ? resolve(true) : resolve(false);
  });
  
  if (!confirmResult) {
    return;
  }
  
  const res = await deleteAppByAdmin({ id })
  if (res.data.code === 0) {
    message.success('删除成功')
    // 刷新数据
    fetchData()
  } else {
    message.error('删除失败，' + res.data.message)
  }
}

// 设置为精选或取消精选
const doFeatured = async (id: number, isFeatured: boolean) => {
  if (!id) {
    return
  }
  
  const res = await updateAppByAdmin({
    id,
    priority: isFeatured ? 0 : 99 // 99表示精选，0表示取消精选
  })
  
  if (res.data.code === 0) {
    message.success(isFeatured ? '已取消精选' : '已设为精选')
    // 刷新数据
    fetchData()
  } else {
    message.error('操作失败，' + res.data.message)
  }
}
</script>

<style scoped>
#appManagePage {
  width: 100%;
}
</style>