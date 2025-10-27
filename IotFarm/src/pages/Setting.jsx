import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Thermometer,
  Droplets,
  Sun,
  Waves,
  CloudRain,
  Wind,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase"; //

// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MSG_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// ====================== COMPONENT ======================
const Setting = () => {
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState({
    dht22: true,
    soilMoisture: true,
    light: false,
    waterLevel: true,
    rain: true,
    gas: false,
  });

  // ====================== LẤY UID NGƯỜI DÙNG ======================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(" User logged in:", user.uid);
        setUserId(user.uid);
        // 🔹 Tải setting hiện tại từ server
        fetchSettingsFromServer(user.uid);
      } else {
        console.warn(" Chưa đăng nhập!");
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // ====================== GỌI API LẤY CÀI ĐẶT HIỆN TẠI ======================
  const fetchSettingsFromServer = async (uid) => {
    try {
      const res = await fetch(
        `http://localhost:3000/getSettings?userId=${uid}`
      );
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(" Lỗi tải cài đặt:", err);
    }
  };

  // ====================== GỌI API CẬP NHẬT CÀI ĐẶT ======================
  const updateSettingsToServer = async (newSettings) => {
    if (!userId) return;
    try {
      await fetch("http://localhost:3000/updateSettings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          settings: {
            notifications: newSettings,
          },
        }),
      });
    } catch (err) {
      console.error(" Lỗi cập nhật setting:", err);
    }
  };

  // ====================== XỬ LÝ TOGGLE ======================
  const toggleNotification = (sensor) => {
    setNotifications((prev) => {
      const updated = { ...prev, [sensor]: !prev[sensor] };
      updateSettingsToServer(updated);
      return updated;
    });
  };

  // ====================== DANH SÁCH CẢM BIẾN ======================
  const sensors = [
    {
      id: "dht22",
      name: "DHT22",
      description: "Nhận thông báo về nhiệt độ và độ ẩm không khí",
      icon: Thermometer,
      color: "text-red-500",
    },
    {
      id: "soilMoisture",
      name: "Độ Ẩm Đất",
      description: "Nhận thông báo khi độ ẩm đất quá thấp hoặc cao",
      icon: Droplets,
      color: "text-amber-600",
    },
    {
      id: "light",
      name: "Ánh Sáng",
      description: "Nhận thông báo về cường độ ánh sáng môi trường",
      icon: Sun,
      color: "text-yellow-500",
    },
    {
      id: "waterLevel",
      name: "Mực Nước",
      description: "Nhận thông báo khi mực nước thay đổi bất thường",
      icon: Waves,
      color: "text-blue-500",
    },
    {
      id: "rain",
      name: "Mưa",
      description: "Nhận thông báo khi phát hiện mưa hoặc độ ẩm cao",
      icon: CloudRain,
      color: "text-indigo-500",
    },
    {
      id: "gas",
      name: "Gas",
      description: "Nhận cảnh báo khi phát hiện khí gas độc hại",
      icon: Wind,
      color: "text-orange-500",
    },
  ];

  // ====================== GIAO DIỆN ======================
  return (
    <div className="p-4">
      <div className="min-w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-medium text-gray-800 mb-2">
            Cài Đặt Thông Báo
          </h1>
          <p className="text-gray-600 text-shadow-md">
            Quản lý thông báo từ các cảm biến của bạn
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-semibold">Tất Cả Thông Báo</h2>
                  <p className="text-blue-100 text-sm">
                    Bật/tắt tất cả thông báo cảm biến
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={Object.values(notifications).some((v) => v)}
                  onChange={() => {
                    const allOff = !Object.values(notifications).some((v) => v);
                    const updated = {
                      dht22: allOff,
                      soilMoisture: allOff,
                      light: allOff,
                      waterLevel: allOff,
                      rain: allOff,
                      gas: allOff,
                    };
                    setNotifications(updated);
                    updateSettingsToServer(updated);
                  }}
                />
                <div className="w-14 h-7 bg-white/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
              </label>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {sensors.map((sensor) => {
              const Icon = sensor.icon;
              const isEnabled = notifications[sensor.id];

              return (
                <div
                  key={sensor.id}
                  className="p-6 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`p-3 rounded-xl bg-gray-100 ${sensor.color}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {sensor.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {sensor.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleNotification(sensor.id)}
                      className={`relative inline-flex items-center cursor-pointer transition-all duration-200 ${
                        isEnabled ? "opacity-100" : "opacity-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        readOnly
                      />
                      <div
                        className={`w-14 h-7 rounded-full peer transition-colors ${
                          isEnabled
                            ? "bg-gradient-to-r from-green-400 to-green-500"
                            : "bg-gray-300"
                        } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300/50`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 bg-white rounded-full h-6 w-6 transition-transform shadow-md ${
                            isEnabled ? "translate-x-7" : "translate-x-0"
                          }`}
                        >
                          {isEnabled ? (
                            <Bell className="w-3 h-3 text-green-500 m-1.5" />
                          ) : (
                            <BellOff className="w-3 h-3 text-gray-400 m-1.5" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Trạng Thái
              </h3>
              <p className="text-2xl font-bold text-gray-800">
                {Object.values(notifications).filter((v) => v).length}/
                {sensors.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Cảm biến đang bật thông báo
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Đang Hoạt Động</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;
