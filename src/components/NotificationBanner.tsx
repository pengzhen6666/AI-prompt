import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getActiveNotifications, Notification } from "@/servers/notifications";
import { useUserStore } from "@/store/userStore";

const DISMISSED_NOTIFICATIONS_KEY = "dismissed_notifications";
const NO_DATA_CACHE_KEY = "notifications_no_data_timestamp";
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

export const NotificationBanner = () => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { profile } = useUserStore();

  useEffect(() => {
    const fetchNotifications = async () => {
      // 检查缓存:如果一小时内已经确认没有数据,则跳过请求
      const cachedTimestamp = localStorage.getItem(NO_DATA_CACHE_KEY);
      if (cachedTimestamp) {
        const timeSinceCache = Date.now() - parseInt(cachedTimestamp, 10);
        if (timeSinceCache < CACHE_DURATION) {
          // 缓存未过期,跳过请求
          setNotification(null);
          setIsVisible(false);
          return;
        }
      }

      const membershipCode = profile?.membership_code || "free";
      const notifications = await getActiveNotifications(membershipCode);

      if (notifications.length === 0) {
        // 记录无数据的时间戳
        localStorage.setItem(NO_DATA_CACHE_KEY, Date.now().toString());
        setNotification(null);
        setIsVisible(false);
        return;
      }

      // 只筛选 title 为 "web-top-global" 的通知
      const globalNotifications = notifications.filter(
        (n) => n.title === "web-top-global"
      );

      if (globalNotifications.length === 0) {
        // 记录无数据的时间戳
        localStorage.setItem(NO_DATA_CACHE_KEY, Date.now().toString());
        setNotification(null);
        setIsVisible(false);
        return;
      }

      // 有数据时清除缓存
      localStorage.removeItem(NO_DATA_CACHE_KEY);

      // 获取已关闭的通知 ID 列表
      const dismissedIds = JSON.parse(
        localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || "[]"
      ) as string[];

      // 找到第一个未被关闭的 web-top-global 通知
      const activeNotification = globalNotifications.find(
        (n) => !dismissedIds.includes(n.id)
      );

      if (activeNotification) {
        setNotification(activeNotification);
        setIsVisible(true);
      } else {
        setNotification(null);
        setIsVisible(false);
      }
    };

    fetchNotifications();
  }, [profile]);

  const handleDismiss = () => {
    if (!notification) return;

    // 记录已关闭的通知
    const dismissedIds = JSON.parse(
      localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || "[]"
    ) as string[];

    if (!dismissedIds.includes(notification.id)) {
      dismissedIds.push(notification.id);
      localStorage.setItem(
        DISMISSED_NOTIFICATIONS_KEY,
        JSON.stringify(dismissedIds)
      );
    }

    setIsVisible(false);
  };

  if (!isVisible || !notification) return null;

  return (
    <div className="w-full bg-[orange] py-1 px-4 flex items-center justify-center gap-4 relative">
      <p className="text-sm text-center flex-1">{notification.content}</p>
      <button
        onClick={handleDismiss}
        className="hover:bg-white/10 rounded-full p-1 transition-colors shrink-0"
        aria-label="关闭通知"
      >
        <X size={16} />
      </button>
    </div>
  );
};
