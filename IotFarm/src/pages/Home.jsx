// src/pages/Home.jsx
import React from "react";
import {
  Cloud,
  Droplets,
  Thermometer,
  Activity,
  Zap,
  TreePine,
  Sun,
} from "lucide-react";
import WeatherWidget from "../components/WeatherWeget";
import WeatherChart from "../components/WeatherChart";

const Home = () => {
  return (
    <div className="bg-gray-50 p-8 ">
      
      <h2 className="text-center text-blue-600 text-3xl font-bold mb-12">
         Hệ Thống Giám Sát Nông Trại Thông Minh
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <Thermometer className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến DHT22</h3>
          </div>
          <p>💧 Độ ẩm không khí: <span className="text-green-600 font-semibold">75%</span></p>
          <p>🌡️ Nhiệt độ: <span className="text-red-500 font-semibold">28°C</span></p>
          <p>📊 Trạng thái: <span className="text-gray-700 font-medium">Ổn định</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">5 giây trước</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-indigo-600 mb-4">
            <Droplets className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến độ ẩm đất</h3>
          </div>
          <p>💧 Độ ẩm đất: <span className="text-blue-500 font-semibold">42%</span></p>
          <p>🌱 Đánh giá: <span className="text-yellow-600 font-medium">Hơi khô</span></p>
          <p>📊 Trạng thái: <span className="text-gray-700 font-medium">Cần tưới sớm</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">10 giây trước</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-amber-500 mb-4">
            <Sun className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến ánh sáng</h3>
          </div>
          <p>☀️ Cường độ: <span className="text-amber-500 font-semibold">650 lux</span></p>
          <p>🌞 Mức đánh giá: <span className="text-green-600 font-medium">Tốt cho cây</span></p>
          <p>📊 Trạng thái: <span className="text-gray-700 font-medium">Ổn định</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">3 giây trước</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-purple-600 mb-4">
            <Cloud className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến mực nước</h3>
          </div>
          <p>🌊 Mực nước bể: <span className="text-purple-600 font-semibold">65%</span></p>
          <p>📏 Khoảng cách đến mực: <span className="text-gray-700 font-medium">25 cm</span></p>
          <p>📊 Trạng thái: <span className="text-green-600 font-medium">Đủ nước</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">8 giây trước</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-teal-600 mb-4">
            <TreePine className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến mưa</h3>
          </div>
          <p>🌧️ Tình trạng: <span className="text-teal-600 font-semibold">Có mưa nhẹ</span></p>
          <p>📊 Đánh giá: <span className="text-gray-700 font-medium">Đang ẩm</span></p>
          <p>📏 Cường độ: <span className="text-gray-700 font-medium">12 mm/h</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">2 phút trước</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-pink-600 mb-4">
            <Activity className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến khí gas</h3>
          </div>
          <p>🔥 Nồng độ gas: <span className="text-pink-600 font-semibold">0.04%</span></p>
          <p>⚠️ Trạng thái: <span className="text-red-500 font-medium">Nguy hiểm</span></p>
          <p>📊 Đánh giá: <span className="text-gray-700 font-medium">Cần xử lý gấp</span></p>
          <p>⏱ Cập nhật: <span className="text-gray-500">1 phút trước</span></p>
        </div>

      </div>

      <div className="mt-12">
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
            DỰ BÁO THỜI TIẾT HÔM NAY
          </h2>
        </div>
        <WeatherWidget />
        <WeatherChart />
      </div>
    </div>
    
  );
};

export default Home;
