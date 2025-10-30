import { API_BASE_URL } from "../config";

const defaultHeaders = {
  "Content-Type": "application/json",
};

const withUrl = (path) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

export const fetchSensorData = async () => {
  const response = await fetch(withUrl("/data"));
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu (HTTP ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [data];
};

export const sendControlCommand = async ({ device, action }) => {
  const response = await fetch(withUrl("/control"), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ device, action }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Gửi lệnh thất bại (HTTP ${response.status})`.trim()
    );
  }

  return response.json();
};

export const sendThresholdValue = async (device, value) => {
  return sendControlCommand({ device, action: String(value) });
};

export const fetchNotificationSettings = async (userId) => {
  if (!userId) {
    throw new Error("Thiếu userId để tải cài đặt.");
  }

  const response = await fetch(
    withUrl(`/getSettings?userId=${encodeURIComponent(userId)}`)
  );

  if (!response.ok) {
    throw new Error(`Không thể tải cài đặt (HTTP ${response.status})`);
  }

  return response.json();
};

export const updateNotificationSettings = async (userId, notifications) => {
  if (!userId) {
    throw new Error("Thiếu userId để tải cài đặt.");
  }

  const response = await fetch(withUrl("/updateSettings"), {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({
      userId,
      settings: {
        notifications,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Cập nhật cài đặt thất bại (HTTP ${response.status})`.trim()
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
};
