<!-- 工作台统一待办列表（政府 OA 式收件箱）：待办/已办双 tab + 来源/时间范围/排序筛选 + 全宽分页；
     行只读不承载处理——行点击跳对应管理页（待办行带 status=0 深链，已办行不带筛选——已办混两种终态，
     带 0 跳过去看的是待处理列表反直觉），处理交互长在各自管理页（举报弹窗/反馈抽屉） -->
<template>
  <div class="todo-list">
    <div class="list-toolbar">
      <el-tabs v-model="queryParams.tab" class="todo-tabs" @tab-change="handleQuery">
        <el-tab-pane :label="`待办 (${tabs.pending})`" name="pending" />
        <el-tab-pane :label="`已办 (${tabs.done})`" name="done" />
      </el-tabs>
      <div class="filter-row">
        <el-select v-model="queryParams.source" clearable placeholder="全部来源" style="width: 110px">
          <el-option v-for="(m, key) in meta" :key="key" :label="m.tag" :value="key" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          end-placeholder="结束日期"
          range-separator="-"
          start-placeholder="开始日期"
          style="width: 240px"
          type="daterange"
          value-format="YYYY-MM-DD"
        />
        <el-button :icon="Search" type="primary" @click="handleQuery">查询</el-button>
      </div>
    </div>

    <div class="table-fixed">
      <el-table v-loading="loading" :data="list" :empty-text="queryParams.tab === 'done' ? '暂无已办记录' : '暂无待办'" @row-click="goHandle">
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
        <el-table-column label="发起者" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.submitterName || '—' }}</template>
        </el-table-column>
        <el-table-column :label="queryParams.tab === 'done' ? '办结时间' : '提交时间'" width="150">
          <template #default="{ row }">{{ formatTime(queryParams.tab === 'done' ? row.finishTime : row.submitTime) }}</template>
        </el-table-column>
      </el-table>
    </div>
    <pagination
      v-model:limit="queryParams.pageSize"
      v-model:page="queryParams.pageNum"
      :auto-scroll="false"
      :total="total"
      layout="total, prev, pager, next"
      @pagination="fetchList"
    />
  </div>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue';

import { listWorkbenchTodos } from '@/api/post/workbench';
import { addDateRange } from '@/composables/useCommon';

const props = defineProps({
  // 待办源展示元数据（key→tag/tagType/path）：来源标签/来源下拉选项/跳转路由统一由首页维护
  meta: {
    type: Object,
    required: true
  }
});

const loading = ref(false);
const list = ref([]);
const total = ref(0);
// tab 徽标计数：响应捎回的有权源全局计数（不受来源/时间筛选影响）
const tabs = ref({ pending: 0, done: 0 });
const dateRange = ref([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 5,
  tab: 'pending',
  source: ''
});

const formatTime = (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—');

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await listWorkbenchTodos(addDateRange({ ...queryParams }, dateRange.value));
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
    if (res.data?.tabs) tabs.value = res.data.tabs;
  } finally {
    loading.value = false;
  }
};

// 查询/切 tab：回到第 1 页重新加载
const handleQuery = () => {
  queryParams.pageNum = 1;
  fetchList();
};

const router = useRouter();

// 行点击跳对应管理页：待办行带待处理筛选深链（列表按当前排序，目标行通常就在首页附近）；已办行不带筛选
const goHandle = (row) => {
  const target = props.meta[row.source];
  if (!target) return;
  router.push({ path: target.path, query: queryParams.tab === 'pending' ? { status: '0' } : {} });
};

onMounted(fetchList);
</script>

<style lang="scss" scoped>
.todo-list {
  .list-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
    // 工具条整行底线：tabs 与右侧查询条件/按钮一并与表格区隔开（el-tabs 自带半截线撤掉避免双线）
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .todo-tabs {
    flex: 1;
    min-width: 200px;

    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }

    // 自带底线撤掉，由 .list-toolbar 的整行底线承接（active 指示条仍压在线上）
    :deep(.el-tabs__nav-wrap::after) {
      display: none;
    }
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  // 表格区定高=表头+5 行（实测 EP 默认行高：40 + 5×39.67≈238，每页 5 条恰好填满无空白；
  // 不足 5 条/空态留白，切页与切 tab 卡高稳定不跳动。行高随 EP 样式变动时此处需同步）
  .table-fixed {
    min-height: 238px;
  }

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
