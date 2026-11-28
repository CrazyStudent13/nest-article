<template>
  <div class="app-container home">
    <!-- 待办工作台（政府 OA 式收件箱）：首页唯一要紧内容——统一待办队列全宽铺开（待办/已办双 tab +
         来源/时间范围/排序筛选），行点击带 status=0 深链跳对应管理页处理；问候压成卡头一行小字 -->
    <el-card class="workbench-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">待办处理</span>
          <span class="card-greeting">{{ greeting }}，{{ userStore.name }}，欢迎回来</span>
        </div>
      </template>
      <WorkbenchTodoList :meta="todoMeta" />
    </el-card>
  </div>
</template>

<script setup name="Index">
import useUserStore from '@/store/modules/user';

const userStore = useUserStore();

const hour = new Date().getHours();
const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

// ---------- 待办工作台 ----------
// 展示元数据前端维护：服务端只回 key+count / source 行（无权限源不出现），文案与跳转路由不进契约；
// 文章审核上线时服务端增量返回 key='audit'，此处补一条映射即可（来源下拉选项与行内标签同源）；未知 key 兜底展示不跳转
const todoMeta = {
  report: { tag: '举报', tagType: 'danger', path: '/interaction/report' },
  feedback: { tag: '反馈', tagType: 'primary', path: '/interaction/feedback' }
};
</script>

<style scoped lang="scss">
.home {
  .workbench-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .card-greeting {
    font-size: 12px;
    color: #909399;
  }
}
</style>
