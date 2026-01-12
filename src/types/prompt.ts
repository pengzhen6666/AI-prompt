import { XHSResult } from "@/servers/ai";

// Prompt 数据类型定义
export interface Prompt {
  id: string;
  url: string;
  title: string;
  prompt: string;
  negative: string | null;
  model: string;
  author: string;
  likes: number;
  tags: string[];
  aspect_ratio: string;
  created_at: string;
  updated_at: string;
  copywriting_results?: XHSResult[];
  urls?: string[];
}

// 用于前端展示的 Prompt 类型(兼容现有代码)
export interface PromptDisplay {
  id: number | string;
  url: string;
  title: string;
  prompt: string;
  negative?: string;
  model: string;
  author: string;
  likes: number;
  tags: string[];
  aspectRatio: string;
  copywritingResults?: XHSResult[];
  urls?: string[];
  thumbnailUrl?: string;
}

// 查询参数类型
export interface PromptQueryParams {
  category?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  author?: "Nano Banana" | "Background Wall";
  minCount?: number;
}
