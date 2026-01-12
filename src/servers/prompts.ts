import { supabase } from "../supabase";
import type { Prompt, PromptDisplay, PromptQueryParams } from "../types/prompt";

/**
 * 将数据库 Prompt 转换为前端展示格式
 */
function transformPrompt(prompt: Prompt): PromptDisplay {
  return {
    id: prompt.id,
    url: prompt.url,
    title: prompt.title,
    prompt: prompt.prompt,
    negative: prompt.negative || undefined,
    model: prompt.model,
    author: prompt.author,
    likes: prompt.likes || 0,
    tags: prompt.tags,
    aspectRatio: prompt.aspect_ratio,
    copywritingResults: prompt.copywriting_results,
    urls: prompt.urls,
  };
}

// Shuffle array utility
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * 获取所有 prompts
 */
export async function getAllPrompts(
  params: PromptQueryParams = {}
): Promise<PromptDisplay[]> {
  try {
    let query = supabase.from("prompts").select("*").eq("is_public", true);

    if (params.author) {
      query = query.eq("author", params.author);
    }

    // Apply stable ordering for reliable pagination
    query = query
      .order("likes", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply server-side pagination
    if (params.offset !== undefined || params.limit !== undefined) {
      const start = params.offset || 0;
      const end = params.limit ? start + params.limit - 1 : start + 19; // Default limit 20
      query = query.range(start, end);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取 prompts 失败:", error);
      throw error;
    }

    return (data || []).map(transformPrompt);
  } catch (error) {
    console.error("getAllPrompts error:", error);
    return [];
  }
}

/**
 * 按分类筛选 prompts
 */
export async function getPromptsByCategory(
  category: string,
  params: PromptQueryParams = {}
): Promise<PromptDisplay[]> {
  try {
    if (category === "全部") {
      return getAllPrompts(params);
    }

    let query = supabase
      .from("prompts")
      .select("*")
      .contains("tags", [category])
      .order("likes", { ascending: false })
      .order("created_at", { ascending: false });

    // 应用分页
    if (params.offset !== undefined || params.limit !== undefined) {
      const start = params.offset || 0;
      const end = params.limit ? start + params.limit - 1 : start + 19;
      query = query.range(start, end);
    }

    const { data, error } = await query;

    if (error) {
      console.error("按分类获取 prompts 失败:", error);
      throw error;
    }

    return (data || []).map(transformPrompt);
  } catch (error) {
    console.error("getPromptsByCategory error:", error);
    return [];
  }
}

/**
 * 搜索 prompts
 */
export async function searchPrompts(
  searchQuery: string,
  category?: string
): Promise<PromptDisplay[]> {
  try {
    let query = supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false });

    // 如果有分类筛选
    if (category && category !== "全部") {
      query = query.contains("tags", [category]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("搜索 prompts 失败:", error);
      throw error;
    }

    // 前端过滤(因为 Supabase 的全文搜索需要额外配置)
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = (data || []).filter((item) => {
      return (
        item.prompt.toLowerCase().includes(lowerQuery) ||
        item.title.toLowerCase().includes(lowerQuery) ||
        item.model.toLowerCase().includes(lowerQuery) ||
        item.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
      );
    });

    return filtered.map(transformPrompt);
  } catch (error) {
    console.error("searchPrompts error:", error);
    return [];
  }
}

/**
 * 更新 prompt 点赞数
 */
export async function updatePromptLikes(
  promptId: string,
  increment: number = 1
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("increment_likes", {
      row_id: promptId,
      increment_amount: increment,
    });

    if (error) {
      console.error("更新点赞数失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("updatePromptLikes error:", error);
    return false;
  }
}

/**
 * 获取单个 prompt 详情
 */
export async function getPromptById(
  promptId: string
): Promise<PromptDisplay | null> {
  try {
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", promptId)
      .single();

    if (error) {
      console.error("获取 prompt 详情失败:", error);
      return null;
    }

    return data ? transformPrompt(data) : null;
  } catch (error) {
    console.error("getPromptById error:", error);
    return null;
  }
}

/**
 * 获取所有唯一的 tags
 */
export async function getAllTags(
  params: PromptQueryParams = {}
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("prompts")
      .select("tags")
      .eq("author", params.author || "");

    if (error) {
      console.error("获取 tags 失败:", error);
      throw error;
    }

    // Count tag frequencies
    const tagCount: Record<string, number> = {};
    (data || []).forEach((item) => {
      (item.tags || []).forEach((tag: string) => {
        if (tag) {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      });
    });

    // Filter by minCount
    const minCount = params.minCount || 0;
    const filteredTags = Object.keys(tagCount).filter(
      (tag) => tagCount[tag] >= minCount
    );

    return filteredTags.sort();
  } catch (error) {
    console.error("getAllTags error:", error);
    return [];
  }
}

/**
 * 获取所有提示词的原始内容
 * 仅返回 [{prompt: 'xx'}] 格式
 */
export async function getRawPrompts(): Promise<{ prompt: string }[]> {
  try {
    const { data, error } = await supabase
      .from("prompts")
      .select("prompt")
      .eq("is_public", true);

    if (error) {
      console.error("获取原始提示词失败:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getRawPrompts error:", error);
    return [];
  }
}
