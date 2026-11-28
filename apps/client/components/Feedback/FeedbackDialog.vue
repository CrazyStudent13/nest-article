<!-- 反馈弹窗：类型下拉走字典 post_feedback_type 懒加载（弹窗 v-if 挂载即登录态，满足 useDict 登录守卫——
     非公开字典登录用户可读，游客不可提交故无需公开）；内容 textarea maxlength 500 与服务端 DTO 同限；
     提交成功 toast + emit('done') 由挂点（FeedbackWidget）关弹窗；频控等业务错误在弹窗内提示不打断填写现场 -->
<template>
  <Teleport to="body">
    <div class="feedback-overlay" @click.self="emit('close')">
      <div class="feedback-modal">
        <div class="modal-head">
          <h2>意见反馈</h2>
          <button class="modal-close" type="button" @click="emit('close')">×</button>
        </div>

        <p class="feedback-lead">遇到问题或有功能建议？告诉我们，处理结果会通过系统通知回复给你。</p>

        <div class="feedback-row">
          <span class="row-label">反馈类型</span>
          <select v-model="form.type" class="type-select">
            <option value="" disabled>{{ typeOptions.length ? '请选择反馈类型' : '类型加载中…' }}</option>
            <option v-for="opt in typeOptions" :key="opt.dictValue" :value="opt.dictValue">{{ opt.dictLabel }}</option>
          </select>
        </div>

        <div class="feedback-row">
          <span class="row-label">反馈内容</span>
          <span class="row-field">
            <textarea
              v-model="form.content"
              class="form-textarea"
              rows="5"
              maxlength="500"
              placeholder="请描述你遇到的问题或建议（1-500 字）"
            />
            <span class="char-count" :class="{ over: form.content.length >= 500 }">{{ form.content.length }}/500</span>
          </span>
        </div>

        <p v-if="tip" class="form-tip tip-error">{{ tip }}</p>

        <div class="modal-actions">
          <button class="btn ghost" type="button" @click="emit('close')">取消</button>
          <button class="btn primary" type="button" :disabled="submitting" @click="confirmSubmit">
            {{ submitting ? '提交中…' : '提交反馈' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'done'): void
}>()

// 类型选项走字典（运营可在管理端扩类型，前端不写死）；弹窗 v-if 挂载即已登录，满足登录守卫
const typeOptions = useDict('post_feedback_type')
const { submitFeedback } = useFeedback()

const form = reactive({ type: '', content: '' })
const tip = ref('')
const submitting = ref(false)

const confirmSubmit = async () => {
  if (!form.type) {
    tip.value = '请选择反馈类型'
    return
  }
  const content = form.content.trim()
  if (!content) {
    tip.value = '请填写反馈内容'
    return
  }
  if (content.length > 500) {
    tip.value = '反馈内容不能超过 500 字'
    return
  }
  submitting.value = true
  tip.value = ''
  try {
    await submitFeedback({ type: form.type, content })
    showToast('反馈已提交，感谢你的建议', 'success')
    emit('done')
  } catch (error: any) {
    // 频控/类型无效等业务错误在弹窗内提示，不打断填写现场
    tip.value = error?.message || '提交失败，请稍后再试'
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less" scoped>
// 与举报弹窗同款骨架：居中卡片 + 遮罩点击关闭
.feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: rgba(0, 0, 0, 0.45);
}

.feedback-modal {
  width: 440px;
  max-width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 20px 24px;
  background-color: var(--color-surface);
  // 圆角收敛到 8px：--radius-md(12px) 在小弹窗上观感偏圆（同举报弹窗口径）
  border-radius: 8px;
  box-shadow: var(--shadow-2);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .modal-close {
    padding: 0 4px;
    border: 0;
    background-color: transparent;
    font-size: 20px;
    line-height: 1;
    color: var(--color-text-3);
    cursor: pointer;

    &:hover {
      color: var(--color-text-1);
    }
  }
}

.feedback-lead {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-3);
}

.feedback-row {
  margin-bottom: 14px;

  .row-label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--color-text-2);
  }

  // 类型下拉：与发布弹窗的 select 同款表单风格
  .type-select {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    font-size: 13px;
    color: var(--color-text-1);
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}

.row-field {
  position: relative;
  display: block;

  .form-textarea {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    font-size: 13px;
    line-height: 20px;
    color: var(--color-text-1);
    resize: vertical;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .char-count {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-size: 11px;
    color: var(--color-text-3);

    &.over {
      color: #d1242f;
    }
  }
}

.form-tip {
  margin: 0 0 10px;
  font-size: 13px;

  &.tip-error {
    color: #d1242f;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}
</style>
