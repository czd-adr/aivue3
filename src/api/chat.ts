const baseUrl = 'http://localhost:8080'

export interface ChatRequest {
  prompt: string;
  conversationId?: string;
}

export interface ChatResponse {
  content: string;
  conversationId: string;
  isNewSession: boolean;
}

export const chat = async (data: ChatRequest): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error in chat API call:', error);
    throw error;
  }
}

export const getChatHistory = async (conversationId: string): Promise<HistoryResponse> => {
  try {
    // ✅ 使用 encodeURIComponent 防止 ID 中包含特殊字符
    const url = `${baseUrl}/ai/history?conversationId=${encodeURIComponent(conversationId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // ✅ 404 表示会话不存在，返回空数组而不是抛错
      if (response.status === 404) {
        return {
          conversationId,
          messages: []
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
}
export const chatStream = async (data: ChatRequest): Promise<any> => {
  const response = await fetch(`${baseUrl}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/plain', // 🔥 告诉后端我们要纯文本流
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  // 🔥 返回 AsyncGenerator，支持 for await...of 循环
  return (async function* () {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          yield chunk; // 🔥 逐块产出数据
        }
      }
    } finally {
      reader.releaseLock(); // 🔥 确保释放锁
    }
  })();
};