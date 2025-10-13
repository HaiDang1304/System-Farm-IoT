import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:3000/data";

const DHT22 = () => {
  const [sensorData, setSensorData] = useState({ nhietdo: 0, doam: 0 });

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setSensorData(data))
      .catch((err) => console.error("Lỗi fetch dữ liệu:", err));
  }, []);

  return (
    <div>
      <div className="p-4">
        <h2 className="text-3xl font-medium text-blue-500 text-center ">
          Giám Sát Nhiệt Độ & Độ Ẩm
        </h2>
        <p className="text-md text-gray-400 text-center mt-2 ">
          Theo dõi nhiệt độ và độ ẩm (Mát Bơm, Kho Đông)
        </p>
        <div className="flex flex-wrap gap-4 mb-2 min-w-full mt-6">
          <div className="flex-1 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <p>Nhiệt Độ</p>
            <span className="text-red-500 font-semibold">
              {sensorData.nhietdo}0°C
            </span>
          </div>
          <div className="flex-1 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <p>Độ Ẩm</p>
            <span className="text-green-600 font-semibold">
              {sensorData.doam}0%
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-5">
          <div className=" flex gap-2">
            <p className="text-xl font-medium">Chế độ tự động</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-13 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 transition-colors duration-300"></div>
              <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 peer-checked:translate-x-full"></div>
            </label>
          </div>
          <div className=" flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-10 h-10 fill-gray-400"
            >
              <path d="M320 64C267 64 224 107 224 160L224 288C224 341 267 384 320 384C373 384 416 341 416 288L416 160C416 107 373 64 320 64zM176 248C176 234.7 165.3 224 152 224C138.7 224 128 234.7 128 248L128 288C128 385.9 201.3 466.7 296 478.5L296 528L248 528C234.7 528 224 538.7 224 552C224 565.3 234.7 576 248 576L392 576C405.3 576 416 565.3 416 552C416 538.7 405.3 528 392 528L344 528L344 478.5C438.7 466.7 512 385.9 512 288L512 248C512 234.7 501.3 224 488 224C474.7 224 464 234.7 464 248L464 288C464 367.5 399.5 432 320 432C240.5 432 176 367.5 176 288L176 248z" />
            </svg>

            <button className="bg-blue-500 px-6 py-2 rounded-xl cursor-pointer text-white  ">
              Điều khiển giọng nói
            </button>
          </div>
        </div>
        <div>
            <p>Trạng thái máy lạnh</p>
            <button className="bg-blue-500 rounded-xl px-4 py-2 text-white">Bật máy lạnh</button>
        </div>
      </div>
    </div>
  );
};

export default DHT22;
