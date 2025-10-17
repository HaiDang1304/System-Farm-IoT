import ChartDHT22 from "../components/ChartDHT22";
import DHT22 from "./DHT22";

const SoilMoistureSensor = () => {
  return (
    <div className="p-4">
      <h2 className="text-3xl font-semibold text-blue-500 text-center">
        Soil Moisture Sensor Page
      </h2>
      <p className="text-2xl font-medium mt-3">Thông tin độ ẩm đất</p>
      <div className="flex flex-wrap gap-4 mt-4 min-h-full">
        <div className="flex-1 bg-blue-200 rounded-xl py-10">
          <p className="text-lg px-2 font-medium"> Độ ẩm đất (%):</p>
        </div>
        <div className="flex-1 bg-green-200 rounded-xl py-10">
          <div className="flex justify-between items-center px-2">
            <p className="text-lg px-2 font-medium">Trạng thái bơm tới: </p>
            <button className=" px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">Bật /Tắt </button>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 mt-6">
        <div className="mt-6 flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4 ">
            <p className="text-lg font-medium ">Chế độ tự động</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-purple-500 transition duration-300"></div>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 peer-checked:translate-x-6"></div>
            </label>
          </div>
          <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
            Điều khiển giọng nói
          </button>
        </div>
        <div className="flex items-center justify-between mt-6 gap-4">
          <div className="flex items-center text-center gap-4">
            <p className="text-lg font-medium ">Cập nhật ngưỡng</p>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2 mt-2 w-48"
              placeholder="Ngưỡng (%)"
            />
          </div>
          <button className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            Cập nhật
          </button>
        </div>
        <p className="text-lg font-medium mt-6">Ngưỡng hiện tại: </p>
        <ChartDHT22 />
      </div>
    </div>
  );
};

export default SoilMoistureSensor;
