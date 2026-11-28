<template>
  <div class="app-container home">
    <!-- 待办工作台（政府 OA 式收件箱）：首页唯一要紧内容——统一待办队列（待办/已办双 tab +
         来源/时间范围/排序筛选），行点击带 status=0 深链跳对应管理页处理；右侧独立问候小卡 -->
    <el-row :gutter="16">
      <el-col :xs="24" :md="18">
        <el-card class="workbench-card">
          <template #header>
            <span class="card-title">待办处理</span>
          </template>
          <WorkbenchTodoList :meta="todoMeta" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="6">
        <el-card class="greeting-card">
          <div class="greeting-body">
            <div class="greeting-main">{{ greeting }}，{{ userStore.name }}</div>
            <div class="greeting-sub">欢迎回来，今天是 {{ today }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Index">
import dayjs from 'dayjs';

import useUserStore from '@/store/modules/user';

const userStore = useUserStore();

const hour = new Date().getHours();
const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const today = `${dayjs().format('YYYY年MM月DD日')} ${WEEK_LABELS[new Date().getDay()]}`;

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

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  // 问候小卡：与待办卡同高（el-row 拉伸 + 卡片撑满），内容垂直居中
  .greeting-card {
    height: 100%;
    border-radius: 8px;

    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      justify-content: center;
      height: calc(100% - 61px);
    }
  }

  .greeting-body {
    text-align: center;
  }

  .greeting-main {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }

  .greeting-sub {
    margin-top: 10px;
    font-size: 13px;
    color: #909399;
  }
}
</style>
