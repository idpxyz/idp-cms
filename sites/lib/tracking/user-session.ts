/**
 * 用户身份识别和会话管理
 * 用于ClickHouse埋点数据收集
 */

interface UserSession {
  userId: string;
  deviceId: string;
  sessionId: string;
  timestamp: number;
}

/**
 * 生成唯一设备ID
 */
function generateDeviceId(): string {
  if (typeof window === "undefined") return "";

  // 尝试从localStorage获取现有设备ID
  const existingDeviceId = localStorage.getItem("device_id");
  if (existingDeviceId) {
    return existingDeviceId;
  }

  // 生成新设备ID
  const deviceId =
    "dev_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  localStorage.setItem("device_id", deviceId);
  return deviceId;
}

/**
 * 生成会话ID
 */
function generateSessionId(): string {
  if (typeof window === "undefined") return "";

  // 检查是否已有会话ID且未过期（30分钟）
  const existingSession = sessionStorage.getItem("session_data");
  if (existingSession) {
    try {
      const sessionData = JSON.parse(existingSession);
      const now = Date.now();
      if (now - sessionData.timestamp < 30 * 60 * 1000) {
        // 30分钟
        return sessionData.sessionId;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  // 生成新会话ID
  const sessionId =
    "sess_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  const sessionData = {
    sessionId,
    timestamp: Date.now(),
  };
  sessionStorage.setItem("session_data", JSON.stringify(sessionData));
  return sessionId;
}

/**
 * 生成用户ID（匿名用户）
 */
function generateUserId(): string {
  if (typeof window === "undefined") return "";

  // 尝试从localStorage获取现有用户ID
  const existingUserId = localStorage.getItem("user_id");
  if (existingUserId) {
    return existingUserId;
  }

  // 生成新用户ID
  const userId =
    "user_" + Math.random().toString(36).substr(2, 12) + "_" + Date.now();
  localStorage.setItem("user_id", userId);
  return userId;
}

/**
 * 获取当前用户会话信息
 */
export function getUserSession(): UserSession {
  if (typeof window === "undefined") {
    return {
      userId: "",
      deviceId: "",
      sessionId: "",
      timestamp: Date.now(),
    };
  }

  return {
    userId: generateUserId(),
    deviceId: generateDeviceId(),
    sessionId: generateSessionId(),
    timestamp: Date.now(),
  };
}

/**
 * 更新会话时间戳
 */
export function updateSessionTimestamp(): void {
  if (typeof window === "undefined") return;

  const existingSession = sessionStorage.getItem("session_data");
  if (existingSession) {
    try {
      const sessionData = JSON.parse(existingSession);
      sessionData.timestamp = Date.now();
      sessionStorage.setItem("session_data", JSON.stringify(sessionData));
    } catch (e) {
      // 忽略错误，会在下次调用时重新生成
    }
  }
}

/**
 * 清除会话数据（用于用户登出等场景）
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem("session_data");
}
