import { supabase } from "@/supabase";

export interface FaceStyleRecord {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 获取当前用户的人脸风格列表
 */
export const getFaceStyles = async (
  userId: string
): Promise<FaceStyleRecord[]> => {
  const { data, error } = await supabase
    .from("face_styles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 创建新的人脸风格
 */
export const createFaceStyle = async (
  userId: string,
  payload: Omit<FaceStyleRecord, "id" | "user_id" | "created_at" | "updated_at">
) => {
  const { data, error } = await supabase
    .from("face_styles")
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
 * 删除人脸风格
 */
export const deleteFaceStyle = async (id: string) => {
  const { error } = await supabase.from("face_styles").delete().eq("id", id);

  if (error) throw error;
};
