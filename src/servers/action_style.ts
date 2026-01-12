import { supabase } from "@/supabase";

export interface ActionStyleRecord {
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url?: string; // 新增图片字段
  category: string;
  created_at: string;
  updated_at: string;
}

/**
 * 获取当前用户的动作风格列表
 */
export const getActionStyles = async (
  userId: string
): Promise<ActionStyleRecord[]> => {
  const { data, error } = await supabase
    .from("action_styles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 创建新的动作风格
 */
export const createActionStyle = async (
  userId: string,
  payload: Omit<
    ActionStyleRecord,
    "id" | "user_id" | "created_at" | "updated_at"
  >
) => {
  const { data, error } = await supabase
    .from("action_styles")
    .insert({
      ...payload,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * 删除动作风格
 */
export const deleteActionStyle = async (id: string) => {
  const { error } = await supabase.from("action_styles").delete().eq("id", id);

  if (error) throw error;
};
