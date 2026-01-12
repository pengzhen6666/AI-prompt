import { supabase } from "@/supabase";
import { MarketingPersonaResult } from "./ai";

export interface MarketingPersonaRecord extends MarketingPersonaResult {
  id: string;
  user_id: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketingStrategy {
  id: string;
  name: string;
  type: "points_consumption" | "registration_points" | "notifications" | string;
  config: {
    free?: number | any;
    pro?: number | any;
    ultra?: number | any;
    [key: string]: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 获取当前用户的营销人格列表
 */
export const getMarketingPersonas = async (
  userId: string
): Promise<MarketingPersonaRecord[]> => {
  const { data, error } = await supabase
    .from("marketing_personas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 创建新的营销人格
 */
export const createMarketingPersona = async (
  userId: string,
  payload: Omit<
    MarketingPersonaRecord,
    "id" | "user_id" | "created_at" | "updated_at"
  >
) => {
  const { data, error } = await supabase
    .from("marketing_personas")
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
 * 删除营销人格
 */
export const deleteMarketingPersona = async (id: string) => {
  const { error } = await supabase
    .from("marketing_personas")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

/**
 * 切换激活状态
 * 注意：同一时间只能有一个激活。
 */
export const togglePersonaActive = async (
  userId: string,
  id: string,
  currentStatus: boolean
) => {
  // 如果是要切成激活，先取消所有其他的激活
  if (!currentStatus) {
    await supabase
      .from("marketing_personas")
      .update({ is_active: false })
      .eq("user_id", userId);
  }

  const { data, error } = await supabase
    .from("marketing_personas")
    .update({ is_active: !currentStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * 获取当前激活的人设
 */
export const getActivePersona = async (
  userId: string
): Promise<MarketingPersonaRecord | null> => {
  const { data, error } = await supabase
    .from("marketing_personas")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching active persona:", error);
    return null;
  }
  return data;
};

/**
 * 获取所有激活的营销策略
 */
export const getMarketingStrategies = async (): Promise<
  MarketingStrategy[]
> => {
  const { data, error } = await supabase
    .from("marketing_strategies")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching marketing strategies:", error);
    return [];
  }
  return data || [];
};
