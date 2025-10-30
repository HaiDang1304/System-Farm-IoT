import { useEffect, useState } from "react";
import ChartSoilMoisture from "../components/ChartSoilMoisture";

const API_URL = "http://localhost:3000/data";
const CONTROL_URL = "http://localhost:3000/control";

const SoilMoistureSensor = () => {
  const [sensorData, setSensorData] = useState({ doamdat: 0 });
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [threshold, setThreshold] = useState(2000);
  const [inputThreshold, setInputThreshold] = useState("");

  // Nói bằng giọng nói
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const vi = voices.find((v) => v.lang === "vi-VN");
    if (vi) utter.voice = vi;
    utter.lang = "vi-VN";
    window.speechSynthesis.speak(utter);
  };

  // Gửi lệnh điều khiển
  const handleTogglePump = (forceState = null) => {
    const newState = forceState !== null ? forceState : !isPumpOn;
    const action = newState ? "ON" : "OFF";

    fetch(CONTROL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device: "WaterPump", action }),
    })
      .then((res) => res.json())
      .then(() => {
        setIsPumpOn(newState);
        speak(`Máy bơm đã ${newState ? "bật" : "tắt"}`);
      })
      .catch((err) => console.error(err));
  };

  // Lấy dữ liệu định kỳ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        const newData = Array.isArray(data) ? data[0] : data;
        setSensorData(newData);

        if (autoMode) {
          if (newData.doamdat <= threshold && !isPumpOn) handleTogglePump(true);
          if (newData.doamdat > threshold && isPumpOn) handleTogglePump(false);
        }
      } catch (err) {
        console.error("Lỗi fetch:", err);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, [autoMode, isPumpOn, threshold]);

  // Nhận lệnh giọng nói
  const startVoiceControl = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Trình duyệt không hỗ trợ giọng nói.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.onresult = (e) => {
      const cmd = e.results[0][0].transcript.toLowerCase();
      if (cmd.includes("bật máy bơm")) handleTogglePump(true);
      else if (cmd.includes("tắt máy bơm")) handleTogglePump(false);
      else if (cmd.includes("bật tự động")) {
        setAutoMode(true);
        speak("Đã bật chế độ tự động tưới nước.");
      } else if (cmd.includes("tắt tự động")) {
        setAutoMode(false);
        speak("Đã tắt chế độ tự động.");
      } else speak("Không hiểu lệnh, xin hãy nói lại.");
    };
    recognition.start();
    speak("Xin chào Đại Ca, tôi đang lắng nghe.");
  };

  // Cập nhật ngưỡng
  const updateThreshold = async () => {
    const newValue = parseInt(inputThreshold);
    if (isNaN(newValue) || newValue < 0 || newValue > 4095) {
      alert("Giá trị phải từ 0-4095");
      return;
    }
    try {
      await fetch(CONTROL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: "ThresholdDoamdat", action: newValue }),
      });
      setThreshold(newValue);
      setInputThreshold("");
      speak(`Đã cập nhật ngưỡng là ${newValue}`);
    } catch (err) {
      console.error("Lỗi cập nhật ngưỡng:", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 mx-auto">
      {/* Header */}
      <h2 className="text-2xl sm:text-3xl font-semibold text-blue-600 text-center">
        Giám Sát Độ Ẩm Đất
      </h2>
      <p className="text-sm sm:text-base text-gray-500 text-center mt-2">
        Theo dõi và điều khiển hệ thống tưới nước thông minh
      </p>

      {/* 2 khối đầu: độ ẩm & trạng thái bơm */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Độ ẩm */}
        <div className="bg-blue-100 rounded-xl p-6 flex flex-col justify-center">
          <p className="text-lg font-medium mb-2">Độ ẩm đất hiện tại:</p>
          <p className="text-3xl font-bold text-blue-600 text-center">
            {sensorData.doamdat}%
          </p>
        </div>

        {/* Trạng thái bơm */}
        <div className="bg-green-100 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <p className="text-lg font-medium">Trạng thái máy bơm:</p>
            <p
              className={`font-semibold ${
                isPumpOn ? "text-green-700" : "text-red-600"
              }`}
            >
              {isPumpOn ? "Đang bật" : "Đang tắt"}
            </p>
          </div>
          <button
            onClick={() => handleTogglePump()}
            className="w-full py-2 mt-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            {isPumpOn ? "Tắt Máy Bơm" : "Bật Máy Bơm"}
          </button>
        </div>
      </div>

      {/* Khu vực điều khiển */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md mt-8">
        {/* Auto & Voice */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <p className="text-lg font-medium">Chế độ tự động</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoMode}
                onChange={() => setAutoMode(!autoMode)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-purple-500 transition"></div>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-6 transition"></div>
            </label>
          </div>

          <button
            onClick={startVoiceControl}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition w-full sm:w-auto"
          >
             Điều khiển giọng nói
          </button>
        </div>

        {/* Ngưỡng */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <label className="text-lg font-medium">Cập nhật ngưỡng:</label>
            <input
              type="number"
              value={inputThreshold}
              onChange={(e) => setInputThreshold(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-40"
              placeholder="0 - 4095"
            />
          </div>

          <button
            onClick={updateThreshold}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition w-full sm:w-auto"
          >
            Cập nhật
          </button>
        </div>

        <p className="mt-4 text-center sm:text-left text-lg font-medium">
          Ngưỡng hiện tại:{" "}
          <span className="text-blue-600 font-semibold">{threshold}</span>
        </p>

        {/* Biểu đồ */}
        <div className="mt-8">
          <ChartSoilMoisture />
        </div>
      </div>
    </div>
  );
};

export default SoilMoistureSensor;
