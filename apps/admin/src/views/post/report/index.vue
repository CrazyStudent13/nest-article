<!-- 举报管理（交互管理/举报管理）：文章/用户举报明细列表，支持目标类型/举报理由/处理状态/举报人昵称与时间范围过滤；处理弹窗选结论（成立/驳回）+ 可选处置动作（下架文章/停用用户，须与目标类型匹配）+ 备注；同一目标同时至多一条待处理举报（uk_reporter_pending 唯一索引，处理完可再次举报），批量删除为物理删除（删除会释放该举报人对该目标的举报资格） -->
<template>
  <div class="app-container">
    <div class="main-card">
      <el-form v-show="report.showSearch" :inline="true" :model="report.queryParams" @submit.prevent>
        <el-form-item label="目标类型">
          <el-select v-model="report.queryParams.targetType" clearable placeholder="全部" style="width: 120px" @change="report.handleQuery">
            <el-option v-for="dict in post_report_target" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="举报理由">
          <el-select v-model="report.queryParams.reasonType" clearable placeholder="全部" style="width: 120px" @change="report.handleQuery">
            <el-option v-for="dict in post_report_reason" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="report.queryParams.status" clearable placeholder="全部" style="width: 120px" @change="report.handleQuery">
            <el-option v-for="dict in post_report_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="举报人"><el-input v-model="report.queryParams.reporterName" clearable placeholder="请输入举报人昵称" @keyup.enter="report.handleQuery" /></el-form-item>
        <el-form-item label="举报时间">
          <el-date-picker v-model="dateRange" :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]" end-placeholder="结束日期" range-separator="-" start-placeholder="开始日期" style="width: 240px" type="daterange" value-format="YYYY-MM-DD HH:mm:ss" @change="report.handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button :icon="Search" type="primary" @click="report.handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <el-row class="mb8">
        <el-button v-hasPermi="['post:report:remove']" :disabled="report.multiple" :icon="Delete" plain type="danger" @click="report.handleDelete">删除</el-button>
        <right-toolbar v-model:show-search="report.showSearch" @query-table="report.getList" />
      </el-row>
      <el-table v-loading="report.loading" :data="report.list" @selection-change="report.handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <!-- 目标列：类型标签 + 举报时快照（文章标题+简介 / 用户昵称，编辑或删除后仍可还原被举报内容）；无快照的旧数据降级当前标题或灰字；
             未读行红点（.unread-dot 全局原语）+目标名加粗，打开处理弹窗即标记已读（与工作区口径一致） -->
        <el-table-column min-width="220" show-overflow-tooltip class-name="summary-col">
          <template #header>举报目标</template>
          <template #default="{ row }">
            <span v-if="!row.isRead" class="unread-dot" />
            <dict-tag type="post_report_target" :value="row.targetType" />
            <span class="target-name" :class="{ 'is-missing': !(row.targetSnapshot || row.targetTitle || row.targetName), 'is-unread': !row.isRead }">{{ row.targetSnapshot || row.targetTitle || row.targetName || '内容已删除' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="举报理由" min-width="120">
          <template #default="{ row }">
            <dict-tag type="post_report_reason" :value="row.reasonType" />
          </template>
        </el-table-column>
        <el-table-column label="补充说明" prop="reasonContent" show-overflow-tooltip min-width="160" />
        <el-table-column label="举报人" prop="reporterName" show-overflow-tooltip width="130" />
        <el-table-column label="处理状态" width="90">
          <template #default="{ row }">
            <dict-tag type="post_report_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column width="150">
          <template #header>处理结果</template>
          <template #default="{ row }">
            <!-- 单标签标记处置结果，处理人/时间/备注收进悬浮详情 -->
            <el-tooltip v-if="row.status !== '0'" placement="top">
              <template #content>
                处理人：{{ row.handlerName || '—' }}<br />
                处理时间：{{ row.handleTime ? dayjs(row.handleTime).format('YYYY-MM-DD HH:mm:ss') : '—' }}<br />
                处理备注：{{ row.handleRemark || '无' }}
              </template>
              <el-tag :type="actionTagType(row.handleAction)" effect="light" size="small">{{ actionLabel(row.handleAction) }}</el-tag>
            </el-tooltip>
            <el-tooltip v-else content="等待管理员处理" placement="top">
              <span class="handle-pending">待处理</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="举报时间" prop="createTime" width="180">
          <template #default="{ row }">{{ row.createTime ? dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') : '' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <el-button v-if="row.status === '0'" v-hasPermi="['post:report:handle']" :icon="Edit" link type="primary" @click="openHandle(row)">处理</el-button>
            <el-button v-hasPermi="['post:report:remove']" :icon="Delete" link type="danger" @click="report.handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="report.total > 0" v-model:limit="report.queryParams.pageSize" v-model:page="report.queryParams.pageNum" :total="report.total" @pagination="report.getList" />
    </div>

    <!-- 处理弹窗：结论必选；成立时可选处置动作（选项按目标类型给出，服务端再校验匹配）；驳回不携带动作 -->
    <el-dialog v-model="handleOpen" append-to-body title="处理举报" width="560px">
      <el-form label-width="90px">
        <el-form-item label="举报目标">
          <dict-tag type="post_report_target" :value="handleRow?.targetType" />
          <span class="target-name">{{ handleRow?.targetSnapshot || handleRow?.targetTitle || handleRow?.targetName || '内容已删除' }}</span>
        </el-form-item>
        <el-form-item label="举报理由">
          <dict-tag type="post_report_reason" :value="handleRow?.reasonType" />
          <span v-if="handleRow?.reasonContent" class="target-reason">{{ handleRow.reasonContent }}</span>
        </el-form-item>
        <el-form-item label="处理结论">
          <el-radio-group v-model="handleForm.status">
            <el-radio label="1">成立</el-radio>
            <el-radio label="2">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="handleForm.status === '1'" label="处置动作">
          <el-select v-model="handleForm.handleAction" clearable placeholder="不执行处置动作" style="width: 200px">
            <el-option v-if="handleRow?.targetType === 'post'" label="下架文章" value="unpublish" />
            <el-option v-if="handleRow?.targetType === 'user'" label="停用用户" value="disableUser" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="handleForm.status === '1' && handleForm.handleAction === 'disableUser'" label="停用原因">
          <el-input v-model="handleForm.stopReason" maxlength="255" placeholder="展示在被停用用户的登录提示中" />
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input v-model="handleForm.handleRemark" :rows="3" maxlength="255" type="textarea" placeholder="处理说明（可选，会展示给处理审计）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleOpen = false">取消</el-button>
        <el-button :loading="handleSubmitting" type="primary" @click="submitHandle">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup name="ReportManagement">
import { Delete, Edit, Refresh, Search } from '@element-plus/icons-vue';

import { delReport, handleReport, listReport } from '@/api/post/report';
import { markTodoRead } from '@/api/post/workbench';
import { addDateRange } from '@/composables/useCommon';
import { useCrud } from '@/composables/useCrud';
import { useDict } from '@/composables/useDict';

const dateRange = ref([]);

const route = useRoute();

const { post_report_target, post_report_reason, post_report_status } = useDict('post_report_target', 'post_report_reason', 'post_report_status');

// 举报管理列表（无新增/编辑；处理走独立弹窗）
// status 初值取工作台卡片深链（?status=0 预置「待处理」筛选）
const report = useCrud({
  api: {
    // 列表查询注入日期范围参数
    list: (params) => listReport(addDateRange(params, dateRange.value)),
    del: delReport
  },
  idKey: 'id',
  name: '举报记录',
  query: { targetType: '', reasonType: '', status: route.query.status || '', reporterName: '' },
  texts: {
    // 物理删除：会释放该举报人对该目标的举报资格（唯一索引约束随行删除解除）
    deleteConfirm: (ids) => `确认删除选中的 ${Array.isArray(ids) ? ids.length : 1} 条举报记录吗？删除后该举报人可对同一目标再次举报`
  }
});

// 工作台深链的缓存页同步：keep-alive 重进时 route.query 有变则覆盖筛选并重查；
// 仅显式带参时生效（常规菜单导航不带参，不覆盖用户当前筛选），首次进入走 query 初值不会重复查询
onActivated(() => {
  if (route.query.status !== undefined && report.queryParams.status !== route.query.status) {
    report.queryParams.status = route.query.status;
    report.handleQuery();
  }
});

// 处置动作展示文案与标签配色（与后端 ReportHandleActionEnum 对齐；驳回/无动作显示「仅记录结论」）
const actionLabel = (action) => {
  if (action === 'unpublish') return '已下架文章';
  if (action === 'disableUser') return '已停用用户';
  return '仅记录结论';
};

const actionTagType = (action) => {
  if (action === 'unpublish') return 'danger';
  if (action === 'disableUser') return 'warning';
  return 'info';
};

// ---------- 处理弹窗：结论默认成立、动作默认空（不执行处置）；提交后重拉列表 ----------
const DEFAULT_STOP_REASON = '举报核实成立，内容违规';
const handleOpen = ref(false);
const handleSubmitting = ref(false);
const handleRow = ref(null);
const handleForm = reactive({ status: '1', handleAction: '', handleRemark: '', stopReason: DEFAULT_STOP_REASON });

// 打开即视为已读：乐观置位（不重拉列表），标记失败静默——与工作区共用 30 号逐条已读（POST /post/workbench/read）
const openHandle = (row) => {
  handleRow.value = row;
  handleForm.status = '1';
  handleForm.handleAction = '';
  handleForm.handleRemark = '';
  handleForm.stopReason = DEFAULT_STOP_REASON;
  if (!row.isRead) {
    row.isRead = true;
    markTodoRead({ source: 'report', id: row.id }).catch(() => {});
  }
  handleOpen.value = true;
};

const submitHandle = async () => {
  if (!handleRow.value) return;
  // 结论为成立但目标动作未选择时视为「仅记录结论」，不拦截；备注超长由 maxlength + 服务端双重兜底
  const isDisableUser = handleForm.status === '1' && handleForm.handleAction === 'disableUser';
  handleSubmitting.value = true;
  try {
    await handleReport(handleRow.value.id, {
      status: handleForm.status,
      handleAction: handleForm.status === '1' && handleForm.handleAction ? handleForm.handleAction : undefined,
      handleRemark: handleForm.handleRemark || undefined,
      // 停用原因展示在被停用用户的登录拦截提示中（空则服务端用默认文案）
      stopReason: isDisableUser ? handleForm.stopReason.trim() || DEFAULT_STOP_REASON : undefined
    });
    ElMessage.success('处理完成');
    handleOpen.value = false;
    report.getList();
  } catch {
    /* 业务失败（如已被并发处理）由请求层统一弹出，保持弹窗现场 */
  } finally {
    handleSubmitting.value = false;
  }
};

// 重置按钮操作：额外清空日期范围
const resetQuery = () => {
  dateRange.value = [];
  report.resetQuery();
};

// 初始化加载
report.getList();
</script>
<style lang="scss" scoped>
// 未读红点宿主锚点（红点/加粗走全局 .unread-dot/.is-unread）
:deep(.summary-col .cell) {
  position: relative;
}

// 目标列：类型标签与标题同行，标题超长省略
.target-name {
  margin-left: 6px;

  &.is-missing {
    color: var(--el-text-color-placeholder);
  }
}

.target-reason {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
}

.handle-pending {
  color: var(--el-text-color-placeholder);
}
</style>
