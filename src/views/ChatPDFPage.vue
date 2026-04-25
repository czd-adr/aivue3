<template>
  <div class="chat-pdf-wrapper">
    <div v-if="!activeChatId" class="upload-container">
      <el-card class="upload-card" shadow="always">
        <template #header>
          <div class="card-header">
            <el-icon :size="40" color="#409eff"><Document /></el-icon>
            <h2 class="title">与任何 <span class="text-primary">PDF</span> 对话</h2>
          </div>
        </template>

        <el-upload
          class="pdf-uploader"
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          accept=".pdf"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">将 PDF 文件拖到此处，或 <em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持解析标准 PDF 格式的学术论文</div>
          </template>
        </el-upload>
      </el-card>
    </div>

    <el-container v-else class="main-container">
      <el-aside width="55%" class="preview-aside">
        <div class="aside-header">
          <el-button link icon="ArrowLeft" @click="resetSession">重新上传</el-button>
          <span class="filename">{{ currentFileName }}</span>
        </div>
        <div class="pdf-frame-wrapper">
          <iframe :src="pdfUrl" class="pdf-iframe"></iframe>
        </div>
      </el-aside>

      <el-main class="chat-main">
        <div class="chat-messages" ref="messageBox">
          <div v-for="(msg, idx) in chatHistory" :key="idx" :class="['message-item', msg.role]">
            <el-avatar :size="32" :icon="msg.role === 'user' ? 'User' : 'Cpu'" />
            <div class="content-bubble">
              {{ msg.content }}
            </div>
          </div>
          <div v-if="isAiTyping" class="message-item assistant">
            <el-avatar :size="32" icon="Cpu" />
            <div class="content-bubble loading">AI 正在思考中...</div>
          </div>
        </div>

        <div class="input-container">
          <el-input
            v-model="queryText"
            placeholder="关于这份文档，你想了解什么？"
            size="large"
            @keyup.enter="handleSend"
          >
            <template #append>
              <el-button icon="Promotion" @click="handleSend" :disabled="!queryText" />
            </template>
          </el-input>
          <p class="input-hint">基于 RAG 技术检索 PDF 全文</p>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { Document, UploadFilled, ArrowLeft, Promotion, User, Cpu } from '@element-plus/icons-vue'
// 导入你刚才封装的 API
import { uploadPdf, pdfChat, getPdfFile } from '@/api/pdf'

// --- 响应式变量 ---
const activeChatId = ref<string | null>(null)
const currentFileName = ref('')
const pdfUrl = ref('')
const queryText = ref('')
const isAiTyping = ref(false)
const messageBox = ref<HTMLElement | null>(null)

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
const chatHistory = ref<ChatMessage[]>([])

// --- 核心逻辑 ---

/**
 * 文件选择并触发上传流程
 */
const handleFileChange = async (uploadFile: any) => {
  const file = uploadFile.raw as File
  if (file.type !== 'application/pdf') {
    ElMessage.error('只能上传 PDF 文件！')
    return
  }

  const loading = ElLoading.service({ text: '正在上传并建立向量索引...' })
  const chatId = `chat_${Date.now()}` // 生成会话 ID

  try {
    const result = await uploadPdf(chatId, file)
    if (result.msg === 'ok') {
      activeChatId.value = chatId
      currentFileName.value = file.name
      // 获取预览流
      pdfUrl.value = await getPdfFile(chatId)
      ElMessage.success('文档解析完成，可以开始提问。')
    } else {
      ElMessage.error(result.message || '上传失败')
    }
  } catch (error) {
    ElMessage.error('服务器连接失败')
  } finally {
    loading.close()
  }
}

/**
 * 发送对话请求
 */
const handleSend = async () => {
  if (!queryText.value.trim() || !activeChatId.value) return

  const userMsg = queryText.value
  chatHistory.value.push({ role: 'user', content: userMsg })
  queryText.value = ''
  isAiTyping.value = true

  await nextTick()
  scrollToBottom()

  try {
    // 调用 RAG 接口
    const aiResponse = await pdfChat(userMsg, activeChatId.value)
    chatHistory.value.push({ role: 'assistant', content: aiResponse })
  } catch (error) {
    chatHistory.value.push({ role: 'assistant', content: '服务响应异常，请检查向量库连接。' })
  } finally {
    isAiTyping.value = false
    await nextTick()
    scrollToBottom()
  }
}

const resetSession = () => {
  activeChatId.value = null
  pdfUrl.value = ''
  chatHistory.value = []
}

const scrollToBottom = () => {
  if (messageBox.value) {
    messageBox.value.scrollTop = messageBox.value.scrollHeight
  }
}
</script>

<style scoped>
.chat-pdf-wrapper {
  height: 100vh;
  background-color: #f5f7fa;
}

/* 上传页样式 */
.upload-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.upload-card {
  width: 500px;
  text-align: center;
}
.text-primary {
  color: #409eff;
}
.title {
  margin-top: 10px;
  font-weight: 600;
}

/* 聊天页样式 */
.main-container {
  height: 100%;
}
.preview-aside {
  background: #fff;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}
.aside-header {
  padding: 10px 15px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  gap: 15px;
}
.filename {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pdf-frame-wrapper {
  flex: 1;
  overflow: hidden;
}
.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.chat-main {
  display: flex;
  flex-direction: column;
  padding: 0;
  background: #fff;
}
.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
.message-item {
  display: flex;
  margin-bottom: 20px;
  gap: 12px;
}
.message-item.user {
  flex-direction: row-reverse;
}
.content-bubble {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  max-width: 75%;
}
.user .content-bubble {
  background-color: #409eff;
  color: #fff;
}
.assistant .content-bubble {
  background-color: #f4f4f5;
  color: #303133;
}

.input-container {
  padding: 20px;
  border-top: 1px solid #ebeef5;
}
.input-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  text-align: center;
}
</style>