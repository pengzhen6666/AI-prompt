import { supabase } from "@/supabase";

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "error";
  target_audience: "all" | "ultra" | "pro" | "free";
  is_active: boolean;
  priority: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 获取当前激活的通知列表
 * @param membershipCode 用户会员等级 (free/pro/ultra)
 * @returns 符合条件的通知列表,按优先级降序排序
 */
export const getActiveNotifications = async (
  membershipCode: string = "free"
): Promise<Notification[]> => {
  const now = new Date().toISOString();

  // 查询激活的通知
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("is_active", true)
    .lte("start_date", now)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  if (!data) return [];

  // 前端过滤:检查结束时间和目标受众
  const filtered = data.filter((notification) => {
    // 检查结束时间
    if (notification.end_date && notification.end_date < now) {
      return false;
    }

    // 检查目标受众
    const audience = notification.target_audience;
    if (audience === "all") return true;
    if (audience === membershipCode) return true;

    return false;
  });

  return filtered;
};
