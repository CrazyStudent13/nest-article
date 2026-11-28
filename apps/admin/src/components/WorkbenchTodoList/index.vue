<!-- 工作台统一待办列表（政府 OA 式收件箱）：来源标签/摘要/提交人/提交时间，按提交时间倒序分页；
     行只读不承载处理——行点击跳对应管理页（status=0 深链），处理交互长在各自管理页（举报弹窗/反馈抽屉）；
     首页 widget（5 条/页）与「查看更多」抽屉（10 条/页）共用本组件，各自独立分页 -->
<template>
  <div class="todo-list">    <el-table v-loading="loading" :data="list" empty-text="暂无待办" @row-click="goHandle">
      <el-table-column label="来源" width="76">
        <template #default="{ row }">
          <el-tag :type="meta[row.source]?.tagType || 'info'" size="small">{{ meta[row.source]?.tag || '待办' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="摘要" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <span :class="{ 'summary-unknown': !meta[row.source] }">{{ row.summary || '（无摘要）' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="提交人" width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.submitterName || '—' }}</template>
      </el-table-column>
      <el-table-column label="提交时间" width="150">
        <template #default="{ row }">{{ row.createTime ? dayjs(row.createTime).format('YYYY-MM-DD HH:mm') : '—' }}</template>
      </el-table-column>
    </el-table>
    <pagination
      v-show="total > 0"
      v-model:limit="limit"
      v-model:page="pageNum"
      :auto-scroll="false"
      :total="total"
      layout="total, prev, pager, next"
      @pagination="fetchList"
    />
  </div>
</template>

<script setup>
import { listWorkbenchTodos } from '@/api/post/workbench';

const props = defineProps({
  // 每页条数：首页 widget 5 / 查看更多抽屉 10
  pageSize: {
    type: Number,
    default: 5
  },
  // 待办源展示元数据（key→tag/tagType/path），与首页待办概览共用一份（未知来源行展示兜底文案且不跳转）
  meta: {
    type: Object,
    required: true
  }
});

const loading = ref(false);
const list = ref([]);
const total = ref(0);
const pageNum = ref(1);
const limit = ref(props.pageSize);

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await listWorkbenchTodos({ pageNum: pageNum.value, pageSize: limit.value });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } finally {
    loading.value = false;
  }
};

const router = useRouter();

// 行点击跳对应管理页（带待处理筛选）：列表按时间倒序，目标行通常就在首页附近；未知来源（服务端先行/前端滞后）不跳转
const goHandle = (row) => {
  const target = props.meta[row.source];
  if (!target) return;
  router.push({ path: target.path, query: { status: '0' } });
};

onMounted(fetchList);
</script>

<style lang="scss" scoped>
.todo-list {
  // 行即入口：指针提示可点（el-table row-click 无默认指针）
  :deep(.el-table__row) {
    cursor: pointer;
  }

  // 注销/异常账号的待办行昵称兜底
  .summary-unknown {
    color: #909399;
  }

  :deep(.pagination-container) {
    margin-top: 12px;
    padding: 0;
    background: transparent;
  }
}
</style>
