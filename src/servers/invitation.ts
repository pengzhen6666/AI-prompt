import { supabase } from "@/supabase";

/**
 * 校验并使用邀请码 (RPC版本)
 * @param userId 新注册用户ID
 * @param code 邀请码
 */
export const applyInvitationCode = async (userId: string, code: string) => {
  if (!code) return { error: "邀请码不能为空" };

  try {
    const { data, error } = await supabase.rpc("use_invitation_code", {
      p_user_id: userId,
      p_code: code,
    });

    if (error) {
      console.error("Error applying invitation code via RPC:", error);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error("Apply invitation code exception:", error);
    return { error: error.message || "激活失败" };
  }
};

/**
 * 注册前预校验邀请码
 * @param code 邀请码
 */
export const checkInvitationCode = async (code: string) => {
  if (!code) return { error: "邀请码不能为空" };

  try {
    const { data, error } = await supabase
      .from("invitation_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !data) {
      return { error: "邀请码无效" };
    }

    // 校验状态
    if (data.status !== "active") {
      return { error: "邀请码当前不可用 (已禁用或已过期)" };
    }

    // 校验有效期
    if (data.expires_at) {
      const expires = new Date(data.expires_at);
      if (expires < new Date()) {
        return { error: "邀请码已过期" };
      }
    }

    // 校验使用次数
    if (data.max_uses > 0 && data.used_count >= data.max_uses) {
      return { error: "邀请码已达到使用上限" };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error("Check invitation code error:", error);
    return { error: "校验邀请码时发生错误" };
  }
};
