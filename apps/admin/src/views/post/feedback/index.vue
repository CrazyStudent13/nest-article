<!-- 反馈管理（交互管理/反馈管理）：登录用户提交的反馈明细列表，支持反馈类型/处理状态/提交人昵称与时间范围过滤；
     反馈内容列与处理弹窗展示截图附件缩略图（el-image 点击大图预览，/profile/ 相对 URL 经 getImageUrl 补全）；
     处理弹窗两结论（回复：replyContent 必填，处理结果经 sys_notice 定向通知 type=4 发给提交人；关闭：回复可选简短说明），
     终态不可重复处理（服务端 status='0' 条件更新乐观锁）；提交人昵称/头像由服务端 attachUserInfo 回填（row.userInfo），
     批量删除为物理删除（同举报记录口径，删除不影响已发出的处理通知） -->
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
        <el-table-column min-width="220">
          <template #header>反馈内容</template>
          <template #default="{ row }">
            <span class="feedback-text">{{ row.content }}</span>
            <!-- 截图附件缩略图（服务端 /profile/ 相对 URL 经 getImageUrl 补全），点击 el-image 内置大图预览 -->
            <div v-if="row.attachments?.length" class="feedback-attachments">
              <el-image
                v-for="url in row.attachments"
                :key="url"
                :initial-index="0"
                :preview-src-list="row.attachments.map((a) => getImageUrl(a))"
                :src="getImageUrl(url)"
                fit="cover"
                preview-teleported
                class="feedback-thumb"
              />
            </div>
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
            <!-- 单标签标记结论，回复全文/处理人/时间收进悬浮详情 -->
            <el-tooltip v-if="row.status !== '0'" placement="top">
              <template #content>
                处理人：{{ row.replyAdminName || '—' }}<br />
                处理时间：{{ row.replyTime ? dayjs(row.replyTime).format('YYYY-MM-DD HH:mm:ss') : '—' }}<br />
                回复内容：{{ row.replyContent || '无' }}
              </template>
              <el-tag :type="row.status === '1' ? 'success' : 'info'" effect="light" size="small">{{ row.status === '1' ? '已回复' : '已关闭' }}</el-tag>
            </el-tooltip>
            <el-tooltip v-else content="等待管理员处理" placement="top">
              <span class="handle-pending">待处理</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" prop="createTime" width="180">
          <template #default="{ row }">{{ row.createTime ? dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') : '' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <el-button v-if="row.status === '0'" v-hasPermi="['post:feedback:handle']" :icon="Edit" link type="primary" @click="openHandle(row)">处理</el-button>
            <el-button v-hasPermi="['post:feedback:remove']" :icon="Delete" link type="danger" @click="feedback.handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="feedback.total > 0" v-model:limit="feedback.queryParams.pageSize" v-model:page="feedback.queryParams.pageNum" :total="feedback.total" @pagination="feedback.getList" />
    </div>

    <!-- 处理弹窗：提交人信息展示（头像+昵称）+ 反馈内容只读回显；结论二选一（回复必填回复内容，关闭可选简短说明）；
         处理结果经 sys_notice 定向通知（type=4 反馈回复）发给提交人，前台「系统通知」栏承接 -->
    <el-dialog v-model="handleOpen" append-to-body title="处理反馈" width="560px">
      <el-form label-width="90px">
        <el-form-item label="提交人">
          <span class="submitter">
            <el-avatar v-if="handleRow?.userInfo?.avatar" :size="28" :src="getImageUrl(handleRow.userInfo.avatar)" />
            <span>{{ handleRow?.userInfo?.nickName || '已注销用户' }}</span>
          </span>
        </el-form-item>
        <el-form-item label="反馈类型">
          <dict-tag type="post_feedback_type" :value="handleRow?.type" />
          <span class="submit-time">{{ handleRow?.createTime ? dayjs(handleRow.createTime).format('YYYY-MM-DD HH:mm:ss') : '' }} 提交</span>
        </el-form-item>
        <el-form-item label="反馈内容">
          <span class="feedback-content">{{ handleRow?.content }}</span>
        </el-form-item>
        <el-form-item v-if="handleRow?.attachments?.length" label="截图附件">
          <div class="feedback-attachments">
            <el-image
              v-for="url in handleRow.attachments"
              :key="url"
              :initial-index="0"
              :preview-src-list="handleRow.attachments.map((a) => getImageUrl(a))"
              :src="getImageUrl(url)"
              fit="cover"
              preview-teleported
              class="feedback-thumb-lg"
            />
          </div>
        </el-form-item>
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
      <template #footer>
        <el-button @click="handleOpen = false">取消</el-button>
        <el-button :loading="handleSubmitting" type="primary" @click="submitHandle">确定</el-button>
      </template>
    </el-dialog>
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

const { post_feedback_type, post_feedback_status } = useDict('post_feedback_type', 'post_feedback_status');

// 反馈管理列表（无新增/编辑；处理走独立弹窗）
const feedback = useCrud({
  api: {
    // 列表查询注入日期范围参数
    list: (params) => listFeedback(addDateRange(params, dateRange.value)),
    del: delFeedback
  },
  idKey: 'id',
  name: '反馈记录',
  query: { type: '', status: '', userName: '' },
  texts: {
    // 物理删除：仅清理记录本身，已发出的处理通知不受影响（同举报记录口径）
    deleteConfirm: (ids) => `确认删除选中的 ${Array.isArray(ids) ? ids.length : 1} 条反馈记录吗？删除为物理删除，不影响已发出的处理通知`
  }
});

// ---------- 处理弹窗：结论默认回复、回复内容默认空；提交后重拉列表 ----------
const handleOpen = ref(false);
const handleSubmitting = ref(false);
const handleRow = ref(null);
const handleForm = reactive({ status: '1', replyContent: '' });

const openHandle = (row) => {
  handleRow.value = row;
  handleForm.status = '1';
  handleForm.replyContent = '';
  handleOpen.value = true;
};

const submitHandle = async () => {
  if (!handleRow.value) return;
  // 回复结论必填回复内容（服务端同口径校验，前端先拦一层）；关闭可不填
  const replyContent = handleForm.replyContent.trim();
  if (handleForm.status === '1' && !replyContent) {
    ElMessage.warning('请填写回复内容');
    return;
  }
  handleSubmitting.value = true;
  try {
    await handleFeedback(handleRow.value.id, {
      status: handleForm.status,
      replyContent: replyContent || undefined
    });
    ElMessage.success('处理完成');
    handleOpen.value = false;
    feedback.getList();
  } catch {
    /* 业务失败（如已被并发处理/终态不可重复处理）由请求层统一弹出，保持弹窗现场 */
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

.feedback-content {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: var(--el-fill-color-light);
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

// 截图附件：列表 40px 缩略图行、弹窗 80px 缩略图行；el-image preview-teleported 全屏大图预览
.feedback-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;

  .feedback-thumb {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    cursor: zoom-in;
  }

  .feedback-thumb-lg {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    cursor: zoom-in;
  }
}

.handle-pending {
  color: var(--el-text-color-placeholder);
}
</style>
