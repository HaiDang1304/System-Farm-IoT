// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import {
  Cloud,
  Droplets,
  Thermometer,
  Activity,
  Sun,
  TreePine,
} from "lucide-react";
import WeatherWidget from "../components/WeatherWeget";

const API_URL = "http://localhost:3000/data"; // URL backend Node.js

const Home = () => {
  const [sensorData, setSensorData] = useState(null);

  // Gọi API khi load trang
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.length > 0) {
          setSensorData(data[0]); // lấy bản ghi mới nhất
        }
      } catch (err) {
        console.error("Lỗi fetch dữ liệu:", err);
      }
    };

    fetchData();
    // Tự động cập nhật mỗi 5 giây
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!sensorData)
    return (
      <div className="text-center p-12 text-gray-500">
        Đang tải dữ liệu cảm biến...
      </div>
    );

  // Xử lý timestamp từ Firestore
  const timeString = sensorData.timestamp?._seconds
    ? new Date(sensorData.timestamp._seconds * 1000).toLocaleTimeString()
    : "N/A";

  return (
    <div className="bg-gray-50 p-8">
      <h2 className="text-center text-blue-600 text-3xl font-bold mb-12">
        Hệ Thống Giám Sát Nông Trại Thông Minh
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

        {/* Cảm biến DHT22 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <Thermometer className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến DHT22</h3>
          </div>
          <p>
            💧 Độ ẩm không khí:{" "}
            <span className="text-green-600 font-semibold">
              {sensorData.doam}%
            </span>
          </p>
          <p>
            🌡️ Nhiệt độ:{" "}
            <span className="text-red-500 font-semibold">
              {sensorData.nhietdo}°C
            </span>
          </p>
          <p>📊 Trạng thái: <span className="text-gray-700 font-medium">Ổn định</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">{timeString}</span></p>
        </div>

        {/* Cảm biến độ ẩm đất */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-indigo-600 mb-4">
            <Droplets className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến độ ẩm đất</h3>
          </div>
          <p>
            💧 Độ ẩm đất:{" "}
            <span className="text-blue-500 font-semibold">
              {sensorData.doamdat}%
            </span>
          </p>
          <p>
            🌱 Đánh giá:{" "}
            <span className="text-yellow-600 font-medium">
              {sensorData.doamdat < 40 ? "Hơi khô" : "Ổn định"}
            </span>
          </p>
          <p>
            📊 Trạng thái:{" "}
            <span className="text-gray-700 font-medium">
              {sensorData.doamdat < 40 ? "Cần tưới sớm" : "Bình thường"}
            </span>
          </p>
          <p>⏱ Cập nhật: <span className="text-gray-500">{timeString}</span></p>
        </div>

        {/* Cảm biến ánh sáng */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-amber-500 mb-4">
            <Sun className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến ánh sáng</h3>
          </div>
          <p>
            ☀️ Cường độ:{" "}
            <span className="text-amber-500 font-semibold">
              {sensorData.anhsang} lux
            </span>
          </p>
          <p>
            🌞 Mức đánh giá:{" "}
            <span className="text-green-600 font-medium">
              {sensorData.anhsang > 600 ? "Tốt cho cây" : "Thiếu sáng"}
            </span>
          </p>
          <p>📊 Trạng thái: <span className="text-gray-700 font-medium">Ổn định</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">{timeString}</span></p>
        </div>

        {/* Mực nước */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-purple-600 mb-4">
            <Cloud className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến mực nước</h3>
          </div>
          <p>
            🌊 Mực nước bể:{" "}
            <span className="text-purple-600 font-semibold">
              {sensorData.khoangcach} cm
            </span>
          </p>
          <p>
            📊 Trạng thái:{" "}
            <span className="text-green-600 font-medium">
              {sensorData.khoangcach > 20 ? "Thiếu nước" : "Đủ nước"}
            </span>
          </p>
          <p>⏱ Cập nhật: <span className="text-gray-500">{timeString}</span></p>
        </div>

        {/* Cảm biến mưa */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-teal-600 mb-4">
            <TreePine className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến mưa</h3>
          </div>
          <p>
            🌧️ Tình trạng:{" "}
            <span className="text-teal-600 font-semibold">
              {sensorData.mua > 0 ? "Có mưa" : "Trời khô"}
            </span>
          </p>
          <p>📊 Cường độ: <span className="text-gray-700 font-medium">{sensorData.mua} mm/h</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">{timeString}</span></p>
        </div>

        {/* Cảm biến khí gas */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-pink-600 mb-4">
            <Activity className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến khí gas</h3>
          </div>
          <p>
            🔥 Nồng độ gas:{" "}
            <span className="text-pink-600 font-semibold">
              {sensorData.khigas} ppm
            </span>
          </p>
          <p>
            ⚠️ Trạng thái:{" "}
            <span
              className={`font-medium ${
                sensorData.khigas > 200 ? "text-red-500" : "text-green-600"
              }`}
            >
              {sensorData.khigas > 200 ? "Nguy hiểm" : "An toàn"}
            </span>
          </p>
          <p>⏱ Cập nhật: <span className="text-gray-500">{timeString}</span></p>
        </div>

      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
          DỰ BÁO THỜI TIẾT HÔM NAY
        </h2>
        <WeatherWidget />
      </div>
    </div>
  );
};

export default Home;
