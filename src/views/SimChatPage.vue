<template>
  <div class="web-game-wrapper">
    <aside class="side-panel">
      <div class="panel-header">游戏状态</div>

      <div class="status-card">
        <div class="label">❤️ 女友原谅值 ({{ forgiveValue }}%)</div>
        <div class="web-progress">
          <div class="progress-inner" :style="{ width: `${forgiveValue}%` }"></div>
        </div>
      </div>

      <div class="status-card">
        <div class="label">⏳ 对话轮次</div>
        <div class="round-val">{{ currentRound }} / 10</div>
      </div>

      <div v-if="eventDescription" class="event-card">
        <div class="event-tag">当前场景</div>
        <p>{{ eventDescription }}</p>
      </div>
    </aside>

    <main class="chat-container">
      <header class="chat-header">与女友的对话</header>

      <div class="chat-main" ref="chatScroll">
        <div
          v-for="(msg, index) in chatHistory"
          :key="index"
          :class="['msg-wrapper', msg.role === 'user' ? 'user-row' : 'ai-row']"
        >
          <div class="avatar">{{ msg.role === 'ai' ? '💻' : '👤' }}</div>
          <div class="msg-content">
            <div class="bubble">{{ msg.content }}</div>
            <div v-if="msg.scoreChange !== undefined" class="web-score-tip">
              <span :class="msg.scoreChange >= 0 ? 'p' : 'm'">
                {{ msg.scoreChange >= 0 ? '+' : '' }}{{ msg.scoreChange }} 分
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer class="web-input-area">
        <textarea
          v-model="userInput"
          class="web-textarea"
          placeholder="请输入你的哄人话语（按下 Enter 发送）..."
          @keyup.enter.native="handleSend"
        ></textarea>
        <button class="web-send-btn" @click="handleSend" :disabled="loading">发送消息</button>
      </footer>
    </main>
  </div>
</template>
<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { getAngryEvents, gameChat } from '@/api/game'; // 使用你封装好的 TS 接口

const forgiveValue = ref(20);
const currentRound = ref(1);
const userInput = ref('');
const eventDescription = ref('');
const chatHistory = ref([]);
const loading = ref(false);
const chatScroll = ref(null);
const conversationId = ref(`session-${Math.random().toString(36).substr(2, 9)}`);

// 1. 初始化游戏：获取生气事件
const initGame = async () => {
  try {
    const data = await getAngryEvents();
    // 后端返回的是单个对象 { id, reason }
    eventDescription.value = data.reason;

    // 将原因作为 AI 的第一句话放入对话框
    chatHistory.value.push({
      role: 'ai',
      content: `（她瞪了你一眼）${data.reason}`,
      currentForgive: forgiveValue.value
    });
  } catch (error) {
    console.error("加载事件失败", error);
  }
};

// 2. 发送消息
const handleSend = async () => {
  if (!userInput.value.trim() || loading.value) return;

  const content = userInput.value;
  chatHistory.value.push({ role: 'user', content, time: new Date().toLocaleTimeString() });
  userInput.value = '';
  loading.value = true;

  // 1. 创建一个 AI 回复的占位对象，用于实时更新内容
  const aiMessage = {
    role: 'ai',
    content: '',
    thought: '',
    time: new Date().toLocaleTimeString(),
    isTyping: true // 用于显示加载状态
  };
  chatHistory.value.push(aiMessage);

  try {
    const response = await fetch('http://localhost:8080/ai/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: content, conversationId: conversationId.value }),
    });

    if (!response.body) return;

    // 2. 获取流读取器
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    // 3. 循环读取流数据
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // 解码当前数据块
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      // 4. 实时解析数据（处理 <think> 标签和正文）
      // 这里我们实时更新 aiMessage 的引用，Vue 会自动触发界面渲染
      if (fullText.includes("<think>")) {
        const parts = fullText.split("</think>");
        aiMessage.thought = parts[0].replace("<think>", "").trim();
        aiMessage.content = parts.length > 1 ? parts[1].trim() : "";
      } else {
        aiMessage.content = fullText;
      }

      scrollToBottom();
    }

    aiMessage.isTyping = false;
  } catch (error) {
    console.error("流读取失败", error);
  } finally {
    loading.value = false;
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatScroll.value) {
      chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
    }
  });
};

onMounted(() => {
  initGame();
});
</script>
<style scoped>
/* 1. 外层包裹：横向布局 */
.web-game-wrapper {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #f0f2f5;
  overflow: hidden;
}

/* 2. 左侧边栏样式 */
.side-panel {
  width: 300px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.panel-header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #1f2937;
}
.status-card {
  background: #f9fafb;
  padding: 16px;
  border-radius: 12px;
}
.label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}
.web-progress {
  background: #e5e7eb;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
}
.progress-inner {
  background: #ff4d4f;
  height: 100%;
  transition: width 0.5s;
}
.round-val {
  font-size: 24px;
  font-weight: bold;
  color: #111827;
}

.event-card {
  margin-top: auto; /* 靠下显示 */
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  padding: 16px;
  border-radius: 12px;
}
.event-tag {
  color: #52c41a;
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 4px;
}

/* 3. 右侧聊天主区 */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f4f5f7;
}
.chat-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 24px;
  font-weight: 600;
}

.chat-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 消息布局优化 */
.msg-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  max-width: 80%;
}
.user-row {
  margin-left: auto;
  flex-direction: row-reverse;
}
.ai-row {
  margin-right: auto;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.bubble {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 15px;
  position: relative;
}
.ai-row .bubble {
  background: #fff;
  color: #333;
  border-top-left-radius: 2px;
}
.user-row .bubble {
  background: #1296db;
  color: #fff;
  border-top-right-radius: 2px;
}

.web-score-tip {
  font-size: 12px;
  margin-top: 4px;
}
.p {
  color: #52c41a;
}
.m {
  color: #ff4d4f;
}

/* 4. 底部输入框优化 */
.web-input-area {
  background: #fff;
  padding: 24px;
  display: flex;
  gap: 16px;
  border-top: 1px solid #e5e7eb;
}
.web-textarea {
  flex: 1;
  height: 80px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px;
  resize: none;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.web-textarea:focus {
  border-color: #1296db;
}
.web-send-btn {
  width: 120px;
  background: #1296db;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.web-send-btn:hover {
  background: #0e81bd;
}
.web-send-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}
</style>