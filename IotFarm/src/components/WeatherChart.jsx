// src/components/WeatherChart.jsx
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const WeatherChart = () => {
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    const fetchWeather = async () => {
      const apiKey = "556ef494745ba7d8f7f8a7e599f8a872";
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=Vinh Long,vn&appid=${apiKey}&units=metric&lang=vi`;
      try {
        const res = await fetch(url);
        const data = await res.json();

        const chartData = data.list.slice(0, 8).map(item => ({
          time: new Date(item.dt * 1000).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          temp: item.main.temp,
          humidity: item.main.humidity,
        }));

        setForecast(chartData);
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu thời tiết:", err);
      }
    };

    fetchWeather();
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-center text-blue-600">Dự báo nhiệt độ (24h)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={forecast}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis unit="°C" />
          <Tooltip />
          <Line type="monotone" dataKey="temp" stroke="#ff7300" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeatherChart;
