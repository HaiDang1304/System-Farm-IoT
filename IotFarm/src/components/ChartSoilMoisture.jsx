import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

const API_URL = "http://localhost:3000/data"; // Node.js API

const ChartSoilMoisture = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Do am dat (%)",
        data: [],
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.3,
      },
    ],
  });

  const fetchData = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      if (Array.isArray(data)) {
        // Lay thoi gian tu timestamp
        const labels = data
          .map((item) =>
            item.timestamp
              ? new Date(item.timestamp._seconds * 1000).toLocaleTimeString("vi-VN")
              : "Không có"
          )
          .reverse();

        // Lay du lieu do am dat
        const soilMoisture = data
          .map((item) => {
            if (typeof item.doamdatPercent === "number") {
              return Number(item.doamdatPercent.toFixed(1));
            }
            if (typeof item.doamdat === "number") {
              const percent = (item.doamdat / 4095) * 100;
              const clamped = Math.min(100, Math.max(0, percent));
              return Number(clamped.toFixed(1));
            }
            return null;
          })
          .reverse();

        setChartData({
          labels,
          datasets: [
            { ...chartData.datasets[0], data: soilMoisture },
          ],
        });
      }
    } catch (error) {
      console.error("❌ Lỗi tải dữ liệu biểu đồ độ ẩm đất:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // cap nhat moi 30 giay
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mt-5">
      <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">
        Biểu đồ Độ ẩm đất
      </h2>
      <Line
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                usePointStyle: true,
                boxWidth: 12,
              },
            },
          },
          scales: {
            x: { title: { display: true, text: "Thời gian" } },
            y: { beginAtZero: true, title: { display: true, text: "Do am dat (%)" } },
          },
        }}
      />
    </div>
  );
};

export default ChartSoilMoisture;









