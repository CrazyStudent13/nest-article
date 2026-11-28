<!-- 反馈弹窗：类型下拉走字典 post_feedback_type 懒加载（弹窗 v-if 挂载即登录态，满足 useDict 登录守卫——
     非公开字典登录用户可读，游客不可提交故无需公开）；内容 textarea maxlength 500 与服务端 DTO 同限；
     截图附件走 /common/upload（登录即可，≤3 张，支持点击选图与 textarea 粘贴截图——Win+Shift+S 后 Ctrl+V 直达）；
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
              @paste="onPaste"
            />
            <span class="char-count" :class="{ over: form.content.length >= 500 }">{{ form.content.length }}/500</span>
          </span>
        </div>

        <div class="feedback-row">
          <span class="row-label">截图附件 <span class="row-hint">（可选，至多 3 张；支持在内容框直接粘贴截图）</span></span>
          <div class="attach-grid">
            <div v-for="(url, index) in form.attachments" :key="url" class="attach-thumb">
              <img :src="resolveUrl(url)" alt="反馈截图" />
              <button class="attach-remove" type="button" title="移除" @click="removeAttachment(index)">×</button>
            </div>
            <button v-if="form.attachments.length < MAX_ATTACHMENTS" class="attach-add" type="button" :disabled="uploadingCount > 0" @click="pickFiles">
              {{ uploadingCount > 0 ? `上传中 ${uploadingCount}` : '+' }}
            </button>
          </div>
          <input ref="fileInputRef" class="attach-input" type="file" accept="image/*" multiple @change="onFilesChange" />
        </div>

        <p v-if="tip" class="form-tip tip-error">{{ tip }}</p>

        <div class="modal-actions">
          <button class="btn ghost" type="button" @click="emit('close')">取消</button>
          <button class="btn primary" type="button" :disabled="submitting || uploadingCount > 0" @click="confirmSubmit">
            {{ uploadingCount > 0 ? '图片上传中…' : submitting ? '提交中…' : '提交反馈' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { toCoverUrl } from '~/utils/cover'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'done'): void
}>()

// 附件张数上限与服务端 DTO 同限（ArrayMaxSize(3)）；单文件大小由上传接口兜底（10MB）
const MAX_ATTACHMENTS = 3

// 类型选项走字典（运营可在管理端扩类型，前端不写死）；弹窗 v-if 挂载即已登录，满足登录守卫
const typeOptions = useDict('post_feedback_type')
const { submitFeedback } = useFeedback()
const { uploadImage } = useUpload()

const config = useRuntimeConfig()
// 上传返回 /profile/ 相对 URL，预览需拼 apiBase（同封面/头像补全口径）
const resolveUrl = (url: string) => toCoverUrl(config.public.apiBase, url)

const form = reactive({ type: '', content: '', attachments: [] as string[] })
const tip = ref('')
const submitting = ref(false)
const uploadingCount = ref(0)
const fileInputRef = ref<HTMLInputElement | null>(null)

const pickFiles = () => {
  fileInputRef.value?.click()
}

const onFilesChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  await uploadFiles(files)
}

// 粘贴截图：内容框 paste 事件里截获剪贴板图片文件，走同一上传通道（文本粘贴不受影响）
const onPaste = async (event: ClipboardEvent) => {
  const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith('image/'))
  if (!files.length) {
    return
  }
  event.preventDefault()
  await uploadFiles(files)
}

const uploadFiles = async (files: File[]) => {
  for (const file of files) {
    if (form.attachments.length >= MAX_ATTACHMENTS) {
      tip.value = `截图附件至多 ${MAX_ATTACHMENTS} 张`
      break
    }
    uploadingCount.value += 1
    try {
      // path 归档到 feedback 子目录（服务端 FILE 上传通道按 path 分目录）
      const url = await uploadImage(file, 'feedback')
      if (url) {
        form.attachments.push(url)
        tip.value = ''
      }
    } catch (error: any) {
      tip.value = error?.message || '图片上传失败，请稍后再试'
    } finally {
      uploadingCount.value -= 1
    }
  }
}

const removeAttachment = (index: number) => {
  form.attachments.splice(index, 1)
}

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
    await submitFeedback({ type: form.type, content, attachments: form.attachments })
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

    .row-hint {
      color: var(--color-text-3);
      font-size: 12px;
    }
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

// 截图附件：缩略图方块 + 虚线「+」添加位（满 3 张隐藏）
.attach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .attach-thumb {
    position: relative;
    width: 76px;
    height: 76px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-border-light);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .attach-remove {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.55);
      font-size: 13px;
      line-height: 1;
      color: #fff;
      cursor: pointer;

      &:hover {
        background-color: rgba(0, 0, 0, 0.75);
      }
    }
  }

  .attach-add {
    width: 76px;
    height: 76px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    font-size: 22px;
    color: var(--color-text-3);
    cursor: pointer;
    transition:
      color 0.2s ease,
      border-color 0.2s ease;

    &:hover:not(:disabled) {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
  }
}

// 隐藏的原生 file input：由「+」按钮程序化触发
.attach-input {
  display: none;
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
