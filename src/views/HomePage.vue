<template>
  <div class="home-page">
    <header class="header">
      <div class="logo">AI Hub</div>
      <div class="theme-toggle">🌙</div>
    </header>
    <main class="main">
      <h1 class="title">AI 应用中心</h1>
      <div class="card-container">
        <router-link to="/ai-chat" class="card">
          <div class="card-icon">💬</div>
          <h3 class="card-title">AI聊天</h3>
          <p class="card-desc">与智能助手进行自然对话</p>
        </router-link>
        <router-link to="/sim-chat" class="card">
          <div class="card-icon">💖</div>
          <h3 class="card-title">哄哄模拟器</h3>
          <p class="card-desc">一个帮助你练习与女朋友开心聊天的小游戏</p>
        </router-link>
        <router-link to="/customer-service" class="card">
          <div class="card-icon">👥</div>
          <h3 class="card-title">智能客服</h3>
          <p class="card-desc">24小时在线的智能服务助手</p>
        </router-link>
        <router-link to="/chat-pdf" class="card">
          <div class="card-icon">📄</div>
          <h3 class="card-title">ChatPDF</h3>
          <p class="card-desc">智能文档阅读与问答系统</p>
        </router-link>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// HomePage component
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: Arial, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.logo {
  font-size: 24px;
  font-weight: bold;
  color: #4A90E2;
}

.theme-toggle {
  font-size: 20px;
  cursor: pointer;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
}

.title {
  font-size: 36px;
  color: #333;
  margin-bottom: 40px;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  justify-content: center;
}

.card {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  color: #333;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.card-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.card-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
}

.card-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}
</style>