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

const ChartLight = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Cường độ ánh sáng",
        data: [],
        borderColor: "rgba(255, 206, 86, 1)",
        backgroundColor: "rgba(255, 206, 86, 0.2)",
        tension: 0.3,
      },
    ],
  });

  const fetchData = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      if (Array.isArray(data)) {
        const labels = data
          .map((item) =>
            item.timestamp
              ? new Date(item.timestamp._seconds * 1000).toLocaleTimeString("vi-VN")
              : "Không có"
          )
          .reverse();

        const ldrValues = data.map((item) => item.anhsang).reverse();

        setChartData({
          labels,
          datasets: [
            { ...chartData.datasets[0], data: ldrValues },
          ],
        });
      }
    } catch (error) {
      console.error("❌ Lỗi tải dữ liệu ánh sáng:", error);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 20000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mt-5">
      <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">
        Biểu đồ Cường độ ánh sáng
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
            y: { beginAtZero: true, title: { display: true, text: "Giá trị ánh sáng" } },
          },
        }}
      />
    </div>
  );
};

export default ChartLight;


