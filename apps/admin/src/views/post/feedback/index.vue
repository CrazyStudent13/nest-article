<!-- 反馈管理（交互管理/反馈管理）：登录用户提交的反馈明细列表，支持反馈类型/处理状态/提交人昵称与时间范围过滤；
     反馈内容列单行省略可点开右侧详情抽屉（全文+截图附件大图预览，行内不渲染缩略图——列表只留「图 xN」角标）；
     查看与处理合一抽屉：待处理记录在抽屉下半区直接给处理表单（回复必填/关闭可选，处理结果经 sys_notice
     定向通知 type=4 发给提交人），已处理记录只读展示处理结果；终态不可重复处理（服务端 status='0' 条件更新
     乐观锁）；提交人昵称/头像由服务端 attachUserInfo 回填（row.userInfo），批量删除为物理删除（同举报记录口径） -->
<template>
  <div class="app-container">
    <div class="main-card">
      <el-form v-show="feedback.showSearch" :inline="true" :model="feedback.queryParams" @submit.prevent>
        <el-form-item label="反馈类型">
          <el-select v-model="feedback.queryParams.type" clearable placeholder="全部" style="width: 120px" @change="feedback.handleQuery">
            <el-option v-for="dict in post_feedback_type" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="feedback.queryParams.status" clearable placeholder="全部" style="width: 120px" @change="feedback.handleQuery">
            <el-option v-for="dict in post_feedback_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="提交人"><el-input v-model="feedback.queryParams.userName" clearable placeholder="请输入提交人昵称" @keyup.enter="feedback.handleQuery" /></el-form-item>
        <el-form-item label="提交时间">
          <el-date-picker v-model="dateRange" :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]" end-placeholder="结束日期" range-separator="-" start-placeholder="开始日期" style="width: 240px" type="daterange" value-format="YYYY-MM-DD HH:mm:ss" @change="feedback.handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button :icon="Search" type="primary" @click="feedback.handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <el-row class="mb8">
        <el-button v-hasPermi="['post:feedback:remove']" :disabled="feedback.multiple" :icon="Delete" plain type="danger" @click="feedback.handleDelete">删除</el-button>
        <right-toolbar v-model:show-search="feedback.showSearch" @query-table="feedback.getList" />
      </el-row>
      <el-table v-loading="feedback.loading" :data="feedback.list" @selection-change="feedback.handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column label="反馈类型" width="100">
          <template #default="{ row }">
            <dict-tag type="post_feedback_type" :value="row.type" />
          </template>
        </el-table-column>
        <!-- 反馈内容：单行省略，点击开详情抽屉看全文与大图；「图 xN」只作数量角标（行内缩略图看不清，大图进抽屉） -->
        <el-table-column min-width="220" show-overflow-tooltip>
          <template #header>反馈内容</template>
          <template #default="{ row }">
            <span class="feedback-link" @click="openDetail(row)">{{ row.content }}</span>
            <el-tag v-if="row.attachments?.length" class="attach-count" size="small" type="info" effect="plain">图 x{{ row.attachments.length }}</el-tag>
          </template>
        </el-table-column>
        <!-- 提交人：服务端 attachUserInfo 回填 userInfo（昵称+头像），头像缺省降级纯昵称 -->
        <el-table-column label="提交人" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="submitter">
              <el-avatar v-if="row.userInfo?.avatar" :size="24" :src="getImageUrl(row.userInfo.avatar)" />
              <span>{{ row.userInfo?.nickName || '已注销用户' }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="处理状态" width="90">
          <template #default="{ row }">
            <dict-tag type="post_feedback_status" :value="row.status" />
          </template>
        </el-table-column>
        <el-table-column width="160">
          <template #header>回复内容</template>
          <template #default="{ row }">
            <!-- 单标签标记结论，回复全文/处理人/时间进详情抽屉 -->
            <el-tag v-if="row.status !== '0'" :type="row.status === '1' ? 'success' : 'info'" effect="light" size="small">{{ row.status === '1' ? '已回复' : '已关闭' }}</el-tag>
            <span v-else class="handle-pending">待处理</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" prop="createTime" width="180">
          <template #default="{ row }">{{ row.createTime ? dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') : '' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <el-button v-if="row.status === '0'" v-hasPermi="['post:feedback:handle']" :icon="Edit" link type="primary" @click="openDetail(row)">处理</el-button>
            <el-button v-hasPermi="['post:feedback:remove']" :icon="Delete" link type="danger" @click="feedback.handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="feedback.total > 0" v-model:limit="feedback.queryParams.pageSize" v-model:page="feedback.queryParams.pageNum" :total="feedback.total" @pagination="feedback.getList" />
    </div>

    <!-- 详情/处理合一抽屉：上半区只读详情（提交人/类型与时间/反馈全文/截图附件大图/处理结果回显），
         下半区待处理时给处理表单（回复必填、关闭可选说明）；内容列与操作列「处理」都开本抽屉 -->
    <el-drawer v-model="detailOpen" append-to-body direction="rtl" size="480px" title="反馈详情">
      <div class="detail-scroll">
        <div class="detail-row">
          <span class="detail-label">提交人</span>
          <span class="submitter">
            <el-avatar v-if="detailRow?.userInfo?.avatar" :size="28" :src="getImageUrl(detailRow.userInfo.avatar)" />
            <span>{{ detailRow?.userInfo?.nickName || '已注销用户' }}</span>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">反馈类型</span>
          <dict-tag type="post_feedback_type" :value="detailRow?.type" />
          <span class="submit-time">{{ detailRow?.createTime ? dayjs(detailRow.createTime).format('YYYY-MM-DD HH:mm:ss') : '' }} 提交</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">反馈内容</span>
          <span class="feedback-content">{{ detailRow?.content }}</span>
        </div>
        <div v-if="detailRow?.attachments?.length" class="detail-row">
          <span class="detail-label">截图附件</span>
          <div class="detail-attachments">
            <el-image
              v-for="(url, index) in detailRow.attachments"
              :key="url"
              :initial-index="index"
              :preview-src-list="detailRow.attachments.map((a) => getImageUrl(a))"
              :src="getImageUrl(url)"
              fit="cover"
              preview-teleported
              class="detail-thumb"
            />
          </div>
        </div>
        <div v-if="detailRow && detailRow.status !== '0'" class="detail-row">
          <span class="detail-label">处理结果</span>
          <div class="handle-result">
            <div class="handle-result-head">
              <dict-tag type="post_feedback_status" :value="detailRow.status" />
              <span class="submit-time">{{ detailRow.replyAdminName || '—' }} · {{ detailRow.replyTime ? dayjs(detailRow.replyTime).format('YYYY-MM-DD HH:mm:ss') : '' }}</span>
            </div>
            <span v-if="detailRow.replyContent" class="feedback-content">{{ detailRow.replyContent }}</span>
          </div>
        </div>

        <!-- 处理表单：仅待处理 + 持处理权限可见；结论默认回复，回复内容必填（服务端同口径） -->
        <template v-if="detailRow?.status === '0'">
          <el-divider class="detail-divider" content-position="left">处理</el-divider>
          <el-form label-width="80px">
            <el-form-item label="处理结论">
              <el-radio-group v-model="handleForm.status">
                <el-radio label="1">回复</el-radio>
                <el-radio label="2">关闭</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item :required="handleForm.status === '1'" label="回复内容">
              <el-input v-model="handleForm.replyContent" :rows="4" maxlength="500" show-word-limit type="textarea" :placeholder="handleForm.status === '1' ? '回复内容会通过系统通知发给提交人' : '关闭说明（可选）'" />
            </el-form-item>
          </el-form>
        </template>
      </div>
      <template v-if="detailRow?.status === '0'" #footer>
        <el-button @click="detailOpen = false">取消</el-button>
        <el-button v-hasPermi="['post:feedback:handle']" :loading="handleSubmitting" type="primary" @click="submitHandle">确定</el-button>
      </template>
    </el-drawer>
  </div>
</template>
<script setup name="FeedbackManagement">
import { Delete, Edit, Refresh, Search } from '@element-plus/icons-vue';

import { delFeedback, handleFeedback, listFeedback } from '@/api/post/feedback';
import { addDateRange } from '@/composables/useCommon';
import { useCrud } from '@/composables/useCrud';
import { useDict } from '@/composables/useDict';
import { getImageUrl } from '@/utils/image';

const dateRange = ref([]);

const route = useRoute();

const { post_feedback_type, post_feedback_status } = useDict('post_feedback_type', 'post_feedback_status');

// 反馈管理列表（无新增/编辑；查看与处理合一抽屉）
// status 初值取工作台卡片深链（?status=0 预置「待处理」筛选）
const feedback = useCrud({
  api: {
    // 列表查询注入日期范围参数
    list: (params) => listFeedback(addDateRange(params, dateRange.value)),
    del: delFeedback
  },
  idKey: 'id',
  name: '反馈记录',
  query: { type: '', status: route.query.status || '', userName: '' },
  texts: {
    // 物理删除：仅清理记录本身，已发出的处理通知不受影响（同举报记录口径）
    deleteConfirm: (ids) => `确认删除选中的 ${Array.isArray(ids) ? ids.length : 1} 条反馈记录吗？删除为物理删除，不影响已发出的处理通知`
  }
});

// 工作台深链的缓存页同步：keep-alive 重进时 route.query 有变则覆盖筛选并重查；
// 仅显式带参时生效（常规菜单导航不带参，不覆盖用户当前筛选），首次进入走 query 初值不会重复查询
onActivated(() => {
  if (route.query.status !== undefined && feedback.queryParams.status !== route.query.status) {
    feedback.queryParams.status = route.query.status;
    feedback.handleQuery();
  }
});

// ---------- 详情/处理抽屉：内容列点击与操作列「处理」共用；提交后重拉列表 ----------
const detailOpen = ref(false);
const handleSubmitting = ref(false);
const detailRow = ref(null);
const handleForm = reactive({ status: '1', replyContent: '' });

const openDetail = (row) => {
  detailRow.value = row;
  handleForm.status = '1';
  handleForm.replyContent = '';
  detailOpen.value = true;
};

const submitHandle = async () => {
  if (!detailRow.value) return;
  // 回复结论必填回复内容（服务端同口径校验，前端先拦一层）；关闭可不填
  const replyContent = handleForm.replyContent.trim();
  if (handleForm.status === '1' && !replyContent) {
    ElMessage.warning('请填写回复内容');
    return;
  }
  handleSubmitting.value = true;
  try {
    await handleFeedback(detailRow.value.id, {
      status: handleForm.status,
      replyContent: replyContent || undefined
    });
    ElMessage.success('处理完成');
    detailOpen.value = false;
    feedback.getList();
  } catch {
    /* 业务失败（如已被并发处理/终态不可重复处理）由请求层统一弹出，保持抽屉现场 */
  } finally {
    handleSubmitting.value = false;
  }
};

// 重置按钮操作：额外清空日期范围
const resetQuery = () => {
  dateRange.value = [];
  feedback.resetQuery();
};

// 初始化加载
feedback.getList();
</script>
<style lang="scss" scoped>
// 提交人：头像与昵称同行
.submitter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.submit-time {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
}

// 内容列：可点击开抽屉的链接态
.feedback-link {
  color: var(--el-color-primary);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.attach-count {
  margin-left: 6px;
}

// 抽屉详情区：纵向排布，标签行 + 内容块
.detail-scroll {
  padding-right: 4px;
}

.detail-row {
  margin-bottom: 16px;

  .detail-label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.feedback-content {
  display: block;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: var(--el-fill-color-light);
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

// 抽屉内附件：96px 大图（el-image preview-teleported 点击全屏预览）
.detail-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .detail-thumb {
    width: 96px;
    height: 96px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-lighter);
    cursor: zoom-in;
  }
}

.handle-result {
  .handle-result-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .feedback-content {
    margin: 0;
  }
}

.detail-divider {
  margin: 20px 0 16px;
}

.handle-pending {
  color: var(--el-text-color-placeholder);
}
</style>
