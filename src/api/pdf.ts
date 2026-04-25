const baseUrl = 'http://localhost:8080'

// --- 类型定义 ---

/**
 * 后端通用的 Result 返回结构
 */
export interface Result<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PdfChatRequest {
  prompt: string;
  chatId: string;
}

// --- API 封装 ---

/**
 * 上传 PDF 文件
 * 对应后端: @RequestMapping("/upload/{chatId}")
 */
export const uploadPdf = async (chatId: string, file: File): Promise<Result> => {
  try {
    const formData = new FormData();
    // 这里的 'file' 必须与后端 @RequestParam 中的名字一致
    formData.append('file', file);

    const response = await fetch(`${baseUrl}/ai/pdf/upload/${chatId}`, {
      method: 'POST',
      body: formData, // fetch 会自动设置 Content-Type 为 multipart/form-data
    });

    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};

/**
 * PDF 对话接口 (RAG)
 * 对应后端: @RequestMapping(value = "/chat", produces = "text/html;charset=utf-8")
 * 注意：由于后端返回 Flux<String>，fetch 默认会等待所有流结束后返回完整字符串
 */
export const pdfChat = async (prompt: string, chatId: string): Promise<string> => {
  try {
    // 后端接口参数是通过 @RequestParam 接收的，所以拼接到 URL
    const params = new URLSearchParams({ prompt, chatId });
    const response = await fetch(`${baseUrl}/ai/pdf/chat?${params.toString()}`, {
      method: 'POST', // 后端未显式指定方法，默认 RequestMapping 支持 POST/GET
    });

    if (!response.ok) {
      throw new Error(`Chat error! status: ${response.status}`);
    }

    // 后端返回的是纯文本流，直接获取文本内容
    return await response.text();
  } catch (error) {
    console.error('Error in PDF chat API call:', error);
    throw error;
  }
};

/**
 * 获取/预览 PDF 文件流
 * 对应后端: @GetMapping("/file/{chatId}")
 */
export const getPdfFile = async (chatId: string): Promise<string> => {
  try {
    const response = await fetch(`${baseUrl}/ai/pdf/file/${chatId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`File fetch error! status: ${response.status}`);
    }

    // 将二进制文件转为 Blob URL，方便在 Vue 页面预览 (iframe 或 pdf.js)
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching PDF file:', error);
    throw error;
  }
};