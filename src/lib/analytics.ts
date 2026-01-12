import { supabase } from "@/supabase";
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "analytics_device_id";

// 获取或创建设备 ID (用于计算 UV)
export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const analytics = {
  /**
   * 上报通用事件
   */
  async trackEvent(
    eventType: "page_view" | "click",
    metadata: {
      page_path?: string;
      button_id?: string;
      properties?: Record<string, any>;
    }
  ) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      const eventData = {
        event_type: eventType,
        page_path: metadata.page_path || window.location.pathname,
        button_id: metadata.button_id || null,
        user_id: user?.id || null,
        device_id: getDeviceId(),
        properties: metadata.properties || {},
      };

      const { error } = await supabase
        .from("analytics_events")
        .insert(eventData);

      if (error) {
        // 静默处理埋点错误，不影响正向业务
        console.warn("Analytics tracking failed:", error.message);
      }
    } catch (e) {
      console.warn("Analytics error:", e);
    }
  },

  /**
   * 上报 PV
   */
  trackPageView(path?: string) {
    this.trackEvent("page_view", { page_path: path });
  },

  /**
   * 上报按钮点击
   */
  trackClick(buttonId: string, properties?: Record<string, any>) {
    this.trackEvent("click", { button_id: buttonId, properties });
  },
};
