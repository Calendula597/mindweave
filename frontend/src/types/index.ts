export interface LLMConfig {
  api_key: string;
  model: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UploadResult {
  filename: string;
  saved_as: string;
  file_path: string;
  message: string;
}

export type SidebarItem = {
  id: string;
  icon: string;
  label: string;
};

export type ViewMode = 'chat' | 'upload' | 'config';
