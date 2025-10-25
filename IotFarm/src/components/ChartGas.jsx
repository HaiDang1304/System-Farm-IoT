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

const API_URL = "http://localhost:3000/data";

const ChartGas = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Khí gas (MQ-2)",
        data: [],
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.3,
      },
    ],
  });

  // Lấy dữ liệu từ Node.js server
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

        const khigas = data.map((item) => item.khigas).reverse();

        setChartData({
          labels,
          datasets: [
            { ...chartData.datasets[0], data: khigas },
          ],
        });
      }
    } catch (error) {
      console.error(" Lỗi tải dữ liệu biểu đồ khí gas:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // cập nhật mỗi 5 giây
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mt-5">
      <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">
        Biểu đồ Khí Gas
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
            y: { beginAtZero: true, title: { display: true, text: "MQ-2 value" } },
          },
        }}
      />
    </div>
  );
};

export default ChartGas;
