import { LoginType, RegisterType, UserProfile } from "@/types";
import { supabase } from "@/supabase";
// 注册
export const registerUserServerAPI = async (data: RegisterType) => {
  return await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.username || "",
        invitation_code: data.invitation_code || "",
      },
    },
  });
};
// 登陆
export const loginUserServerAPI = async (data: LoginType) => {
  return await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
};
// 获取用户信息 (优化版：减少网络请求)
export const getUserInfoServerAPI = async (passedUser?: any) => {
  let user = passedUser;

  if (!user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user;
  }

  if (!user) return { data: { user: null, profile: null } };

  // 1. 获取基础资料
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile && profile.membership_code) {
    // 2. 手动查询会员等级详情
    const { data: level } = await supabase
      .from("membership_levels")
      .select("*")
      .eq("code", profile.membership_code)
      .single();
    if (level) {
      profile.membership_level = level;
    }
  }

  return { data: { user, profile: profile as UserProfile } };
};

// 更新用户资料
export const updateUserProfileServerAPI = async (updates: {
  avatar_url?: string;
  full_name?: string;
  username?: string;
}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};
// 登出
export const logoutUserServerAPI = async () => {
  return await supabase.auth.signOut();
};
