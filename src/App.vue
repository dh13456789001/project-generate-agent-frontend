<template>
  <BasicLayout/>
</template>

<script setup lang="ts">
import BasicLayout from './layouts/BasicLayout.vue'
import {useLoginUserStore} from "@/stores/loginUser.ts";

const loginUserStore = useLoginUserStore()
loginUserStore.fetchLoginUser()

</script>


<style scoped>
/* 全局样式已在 BasicLayout 中定义 */
</style>
