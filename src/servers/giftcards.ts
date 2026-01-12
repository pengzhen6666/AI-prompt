import { supabase } from "@/supabase";

// 兑换礼品卡
export const redeemGiftCardServerAPI = async (
  cardNumber: string,
  userId: string
) => {
  try {
    // 1. 查询礼品卡信息
    const { data: giftCard, error: giftCardError } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("card_number", cardNumber)
      .single();

    if (giftCardError || !giftCard) {
      return { data: null, error: { message: "礼品卡不存在" } };
    }

    // 2. 验证礼品卡状态
    if (giftCard.status !== "active") {
      return { data: null, error: { message: "礼品卡已被使用或已失效" } };
    }

    // 3. 检查是否过期
    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      return { data: null, error: { message: "礼品卡已过期" } };
    }

    // 4. 获取用户当前余额
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileError || !userProfile) {
      return { data: null, error: { message: "获取用户信息失败" } };
    }

    const currentBalance = Number(userProfile.balance) || 0;
    const newBalance = currentBalance + Number(giftCard.amount);

    // 5. 更新礼品卡状态
    const { error: updateGiftCardError } = await supabase
      .from("gift_cards")
      .update({
        status: "redeemed",
        redeemed_by: userId,
        redeemed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", giftCard.id);

    if (updateGiftCardError) {
      return { data: null, error: { message: "更新礼品卡状态失败" } };
    }

    // 6. 更新用户余额
    const { error: updateBalanceError } = await supabase
      .from("user_profiles")
      .update({ balance: newBalance })
      .eq("id", userId);

    if (updateBalanceError) {
      return { data: null, error: { message: "更新余额失败" } };
    }

    // 7. 创建交易记录
    const { error: transactionError } = await supabase
      .from("balance_transactions")
      .insert({
        user_id: userId,
        amount: giftCard.amount,
        type: "gift_card",
        reference_id: giftCard.id,
        description: `兑换礼品卡: ${cardNumber}`,
        balance_before: currentBalance,
        balance_after: newBalance,
      });

    if (transactionError) {
      console.error("创建交易记录失败:", transactionError);
      // 不阻止兑换流程,仅记录错误
    }

    return {
      data: {
        amount: giftCard.amount,
        newBalance,
      },
      error: null,
    };
  } catch (error) {
    console.error("兑换礼品卡失败:", error);
    return { data: null, error: { message: "兑换失败,请稍后重试" } };
  }
};
