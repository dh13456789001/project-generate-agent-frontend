import { createRouter, createWebHistory } from 'vue-router'
import UserLoginPage from "@/views/user/UserLoginPage.vue";
import UserRegisterPage from "@/views/user/UserRegisterPage.vue";
import UserManagePage from "@/views/admin/UserManagePage.vue";
import HomePage from "@/views/user/HomePage.vue";
import AppGenerationPage from "@/views/user/AppGenerationPage.vue";
import AppManagePage from "@/views/admin/AppManagePage.vue";
import AppEditPage from "@/views/user/AppEditPage.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: '主页',
      component: HomePage,
    },
    {
      path: '/user/login',
      name: '用户登录',
      component: UserLoginPage,
    },
    {
      path: '/user/register',
      name: '用户注册',
      component: UserRegisterPage,
    },
    {
      path: '/admin/userManage',
      name: '用户管理',
      component: UserManagePage,
    },
    {
      path: '/app/generate/:appId',
      name: '应用生成对话',
      component: AppGenerationPage,
    },
    {
      path: '/admin/appManage',
      name: '应用管理',
      component: AppManagePage,
    },
    {
      path: '/app/edit/:appId',
      name: '应用信息修改',
      component: AppEditPage,
    },
  ],

})

export default router
