const baseUrl = 'http://localhost:8080'

// --- 类型定义 ---

export interface AngryEvent {
  id: number;
  reason: string;
}

export interface GameChatRequest {
  prompt: string;
  conversationId: string;
}

// --- API 封装 ---

/**
 * 获取随机的生气事件（初始化游戏）
 */
export const getAngryEvents = async (): Promise<AngryEvent> => {
  try {
    const response = await fetch(`${baseUrl}/ai/angry-events`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching angry events:', error);
    throw error;
  }
};

/**
 * 游戏对话接口
 * 注意：后端返回 Flux<String>，fetch 默认会等待所有流结束后返回完整字符串
 */
export const gameChat = async (data: GameChatRequest): Promise<string> => {
  try {
    const response = await fetch(`${baseUrl}/ai/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 因为后端返回的是 Flux<String>，如果是纯文本流，直接 .text() 即可获取完整内容
    return await response.text();
  } catch (error) {
    console.error('Error in game chat API call:', error);
    throw error;
  }
};