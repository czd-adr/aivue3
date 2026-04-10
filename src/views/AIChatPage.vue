<template>
  <div class="ai-chat-page">
    <div class="header">
      <div class="logo">AI Hub</div>
      <div class="theme-toggle" @click="toggleTheme">🌙</div>
    </div>
    <div class="chat-container">
      <div class="chat-sidebar">
        <div class="sidebar-header">
          <h2>聊天记录</h2>
          <button class="new-chat-btn" @click="startNewChat">+ 新对话</button>
        </div>
        <div class="chat-list">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="chat-item"
            :class="{ active: session.id === currentSessionId }"
            @click="switchSession(session.id)"
          >
            <div class="chat-icon">💬</div>
            <div class="chat-info">
              <div class="chat-title">{{ session.title }}</div>
              <div class="chat-session-id">{{ session.id }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="chat-main">
        <div class="chat-messages" ref="messagesContainer">
          <!-- 空状态提示 -->
          <div v-if="messages.length === 0 && !loading" class="empty-state">
            <div class="empty-icon">💬</div>
            <div class="empty-text">开始新的对话吧～</div>
          </div>

          <!-- 动态渲染消息 -->
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="message"
            :class="msg.role === 'user' ? 'user-message' : 'ai-message'"
          >
            <div class="message-content">
              <div class="message-text">{{ msg.content }}</div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <!-- AI 思考过程（如果有） -->
          <div v-if="thinkingText" class="message ai-message">
            <div class="ai-thinking">
              <div class="thinking-icon">🤖</div>
              <div class="thinking-content">
                <div class="thinking-title">思考</div>
                <div class="thinking-text">{{ thinkingText }}</div>
              </div>
              <div class="thinking-time">{{ formatTime(Date.now()) }}</div>
            </div>
          </div>

          <!-- 加载动画 -->
          <div v-if="loading" class="message ai-message">
            <div class="message-content" style="background-color: #f0f0f0; color: #333">
              <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>
        <div class="chat-input">
          <div class="input-container">
            <button class="input-tool">📎</button>
            <input
              v-model="inputMessage"
              type="text"
              placeholder="输入消息，可上传图片、音频或视频..."
              class="message-input"
              @keyup.enter="sendMessage"
              :disabled="loading"
            />
            <button class="input-tool">🎤</button>
            <button class="input-tool">📹</button>
          </div>
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="loading || !inputMessage.trim()"
            style="transform: none"
          >
            <span v-if="!loading">发送</span>
            <span v-else>...</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { chat, getChatHistory, chatStream, type HistoryMessage } from '../api/chat'

// ========== 响应式数据 ==========
const inputMessage = ref('')
const loading = ref(false)
const thinkingText = ref('')
const currentSessionId = ref<string | null>(null)
const messages = ref<Message[]>([])
const sessions = ref<Session[]>([])
const messagesContainer = ref<HTMLElement>()

// ========== 类型定义 ==========
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Session {
  id: string
  title: string
  lastTime: number
}

interface ChatResponse {
  content: string
  conversationId: string
  isNewSession: boolean
}

// ========== 工具函数 ==========
const generateConversationId = (): string => {
  return (
    'session-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4)
  )
}

// ========== 核心方法 ==========

/**
 * ✅ 修改：切换会话时加载历史消息
 */
const switchSession = async (sessionId: string) => {
  // 1️⃣ 先更新当前会话 ID
  currentSessionId.value = sessionId
  loading.value = true

  try {
    // 2️⃣ 调用后端接口加载历史
    const history = await getChatHistory(sessionId)

    // 3️⃣ 转换格式并渲染
    messages.value = history.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    }))

    console.log(`📚 加载会话 ${sessionId} 的历史: ${messages.value.length} 条`)
  } catch (error) {
    console.error('加载历史失败:', error)
    messages.value = [] // 加载失败就清空
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const sendMessage = async () => {
  const prompt = inputMessage.value.trim()
  if (!prompt || loading.value) return

  // 1️⃣ 添加用户消息
  messages.value.push({
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
  })
  inputMessage.value = ''
  loading.value = true
  thinkingText.value = '正在思考...'
  scrollToBottom()

  // 2️⃣ 创建 AI 消息占位（用于流式追加）
  const aiMessage = ref({
    role: 'assistant' as const,
    content: '',
    timestamp: Date.now(),
  })
  messages.value.push(aiMessage)

  try {
    // 3️⃣ 调用流式接口
    const stream = await chatStream({
      prompt,
      conversationId: currentSessionId.value,
    })

    // 4️⃣ 逐块接收并实时更新
    for await (const chunk of stream) {
      aiMessage.content += chunk // 🔥 Vue 响应式会自动刷新
      scrollToBottom() // 可选：实时滚动
    }

    // 5️⃣ 第一条消息时更新会话标题
    if (messages.value.filter((m) => m.role === 'user').length === 1) {
      const session = sessions.value.find((s) => s.id === currentSessionId.value)
      if (session) {
        session.title = prompt.length > 20 ? prompt.slice(0, 20) + '...' : prompt
        session.lastTime = Date.now()
      }
    }
  } catch (error) {
    console.error('发送失败:', error)
    // 更新错误提示
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg?.role === 'assistant' && !lastMsg.content) {
      lastMsg.content = '❌ 抱歉，连接中断，请稍后重试。'
    }
  } finally {
    loading.value = false
    thinkingText.value = ''
    scrollToBottom()
  }
}

const startNewChat = () => {
  const newSessionId = generateConversationId()

  const newSession: Session = {
    id: newSessionId,
    title: '新对话',
    lastTime: Date.now(),
  }

  sessions.value.unshift(newSession)
  currentSessionId.value = newSessionId
  messages.value = []
  thinkingText.value = ''
  inputMessage.value = ''

  console.log('✅ 创建新会话:', newSessionId)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const toggleTheme = () => {
  document.documentElement.classList.toggle('dark')
}

// ========== 生命周期 ==========
onMounted(() => {
  // 页面加载时自动创建一个新对话
  startNewChat()
})
</script>

<style scoped>
/* ========== 完全保留原始样式 ========== */
.ai-chat-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo {
  font-size: 24px;
  font-weight: bold;
  color: #4a90e2;
}

.theme-toggle {
  font-size: 20px;
  cursor: pointer;
}

.chat-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-sidebar {
  width: 280px;
  background-color: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.new-chat-btn {
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.new-chat-btn:hover {
  background-color: #357abd;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.chat-item:hover {
  background-color: #f0f0f0;
}

.chat-item.active {
  background-color: #e3f2fd;
}

.chat-icon {
  font-size: 20px;
  margin-right: 12px;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 会话 ID 样式 */
.chat-session-id {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-item.active .chat-session-id {
  color: #4a90e2;
}

.chat-item:hover .chat-session-id {
  color: #666;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f9f9f9;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ✅ 新增：空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #666;
}

.message {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.user-message {
  align-self: flex-end;
}

.ai-message {
  align-self: flex-start;
}

.message-content {
  background-color: #4a90e2;
  color: white;
  border-radius: 18px 18px 4px 18px;
  padding: 12px 16px;
  position: relative;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.message-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
}

.ai-thinking {
  background-color: #f0f0f0;
  border-radius: 18px 18px 18px 4px;
  padding: 12px 16px;
  position: relative;
}

.thinking-icon {
  font-size: 16px;
  margin-bottom: 8px;
}

.thinking-title {
  font-size: 14px;
  font-weight: bold;
  color: #666;
  margin-bottom: 8px;
}

.thinking-text {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
  margin-bottom: 8px;
}

.thinking-time {
  font-size: 12px;
  color: #999;
  text-align: right;
  margin-top: 8px;
}

.chat-input {
  padding: 20px;
  background-color: white;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-container {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 24px;
  padding: 8px 16px;
  gap: 10px;
}

.input-tool {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.input-tool:hover {
  background-color: #e0e0e0;
}

.message-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: 14px;
  color: #333;
  padding: 8px 0;
}

.send-btn {
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover {
  background-color: #357abd;
}

.send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* 打字机加载动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>