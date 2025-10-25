import React from "react";
import ChartDHT22 from "../components/ChartDHT22";
import ChartGas from "../components/ChartGas";
import ChartLight from "../components/ChartLight";
import ChartRain from "../components/ChartRain";
import ChartSoilMoisture from "../components/ChartSoilMoisture";
import ChartWaterLevel from "../components/ChartWater";

const Dashboard = () => {
  return (
    <div className=" bg-gray-50 p-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Tổng quan Biểu đồ Cảm biến
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-64">
            <ChartDHT22 />
          </div>

          <div className="h-64">
            <ChartGas />
          </div>

          <div className="h-64">
            <ChartLight />
          </div>

          <div className="h-64">
            <ChartRain />
          </div>

          <div className="h-64">
            <ChartSoilMoisture />
          </div>

          <div className="h-64">
            <ChartWaterLevel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
