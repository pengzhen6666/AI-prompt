const GUEST_USAGE_KEY = "guest_ai_usage";
const MAX_GUEST_DAILY_USAGE = import.meta.env.VITE_MAX_GUEST_DAILY_USAGE || 0;

interface GuestUsage {
  count: number;
  lastUsedDate: string; // YYYY-MM-DD
}

/**
 * 获取当前的游客使用情况
 */
export function getGuestUsage(): GuestUsage {
  const stored = localStorage.getItem(GUEST_USAGE_KEY);
  const today = new Date().toISOString().split("T")[0];

  if (!stored) {
    return { count: 0, lastUsedDate: today };
  }

  try {
    const usage: GuestUsage = JSON.parse(stored);
    if (usage.lastUsedDate !== today) {
      return { count: 0, lastUsedDate: today };
    }
    return usage;
  } catch (e) {
    console.error("Failed to parse guest usage", e);
    return { count: 0, lastUsedDate: today };
  }
}

/**
 * 检查游客是否还有剩余次数
 */
export function canGuestUseAI(): boolean {
  const usage = getGuestUsage();
  return usage.count < MAX_GUEST_DAILY_USAGE;
}

/**
 * 增加游客的使用次数
 */
export function incrementGuestUsage(): void {
  const usage = getGuestUsage();
  const today = new Date().toISOString().split("T")[0];

  const newUsage: GuestUsage = {
    count: usage.count + 1,
    lastUsedDate: today,
  };

  localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(newUsage));
}

/**
 * 获取剩余次数
 */
export function getRemainingGuestUsage(): number {
  const usage = getGuestUsage();
  return Math.max(0, MAX_GUEST_DAILY_USAGE - usage.count);
}
