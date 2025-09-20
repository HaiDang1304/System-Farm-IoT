// src/components/WeatherWidget.jsx
import React, { useEffect, useState } from "react";

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const apiKey = "556ef494745ba7d8f7f8a7e599f8a872"; 
        const city = "Vinh Long, VN";
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=vi`;

        const response = await fetch(url);
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error("Lỗi khi gọi API thời tiết:", error);
      }
    };

    fetchWeather();
  }, []);

  if (!weather) return <p>Đang tải dự báo thời tiết...</p>;

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 flex items-center gap-4">
      <img
        src={`http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
        alt="weather icon"
        className="w-16 h-16"
      />
      <div>
        <h3 className="text-xl font-semibold">{weather.name}</h3>
        <p className="text-gray-700">
          {weather.weather[0].description}
        </p>
        <p className="text-blue-600 font-bold text-lg">
          🌡 {Math.round(weather.main.temp)}°C
        </p>
        <p>💧 Độ ẩm: {weather.main.humidity}%</p>
        <p>💨 Gió: {weather.wind.speed} m/s</p>
      </div>
    </div>
  );
};

export default WeatherWidget;
