import React, { useEffect, useState } from "react";
import ChartDHT22 from "../components/ChartDHT22";

const API_URL = "http://localhost:3000/data";
const CONTROL_URL = "http://localhost:3000/control";

const DHT22 = () => {
  const [sensorData, setSensorData] = useState({ nhietdo: 0, doam: 0 });
  const [threshold, setThreshold] = useState("");
  const [currentThreshold, setCurrentThreshold] = useState(25);
  const [isACOn, setIsACOn] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  // Hàm phát giọng nói phản hồi
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find((v) => v.lang === "vi-VN");
    if (vietnameseVoice) utter.voice = vietnameseVoice;
    utter.lang = "vi-VN";
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  };

  // Lấy dữ liệu cảm biến
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setSensorData(Array.isArray(data) ? data[0] : data);
      } catch (err) {
        console.error(" Lỗi fetch dữ liệu:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000); // cap nhat moi 30 giay
    return () => clearInterval(interval);
  }, []);

  //  Tự động bật/tắt điều hòa
  useEffect(() => {
    if (!isAutoMode) return;
    const { nhietdo } = sensorData;
    if (nhietdo >= currentThreshold && !isACOn) {
      handleToggleAC(true);
      const msg = ` Nhiệt độ ${nhietdo}°C ≥ ${currentThreshold}°C → bật điều hòa.`;
      setVoiceMessage(msg);
      speak(msg); //  Phát giọng nói
    } else if (nhietdo < currentThreshold && isACOn) {
      handleToggleAC(false);
      const msg = ` Nhiệt độ ${nhietdo}°C < ${currentThreshold}°C → tắt điều hòa.`;
      setVoiceMessage(msg);
      speak(msg); //  Phát giọng nói
    }
  }, [sensorData, isAutoMode, currentThreshold]);

  // Bật/tắt điều hòa
  const handleToggleAC = () => {
    const action = isACOn ? "OFF" : "ON"; // nếu đang bật thì tắt, nếu đang tắt thì bật

    fetch("http://localhost:3000/control", {
      method: "POST", // PHẢI LÀ POST
      headers: {
        "Content-Type": "application/json", // backend mong đợi JSON
      },
      body: JSON.stringify({ device: "AC", action }), // gửi device + action
    })
      .then((res) => {
        if (!res.ok) {
          // kiểm tra server có trả lỗi không
          throw new Error(`Server trả lỗi ${res.status}`);
        }
        return res.json(); // parse JSON trả về từ server
      })
      .then((data) => {
        console.log("Lệnh điều hòa đã gửi:", data);
        setIsACOn(!isACOn); // cập nhật trạng thái nút
      })
      .catch((err) => {
        console.error("Lỗi gửi lệnh điều hòa:", err);
        alert("Gửi lệnh thất bại. Kiểm tra server và MQTT.");
      });
  };

  //  Chế độ tự động
  const handleToggleAuto = () => {
    const newState = !isAutoMode;
    setIsAutoMode(newState);
    const msg = newState
      ? " Đã bật chế độ tự động."
      : " Đã tắt chế độ tự động.";
    setVoiceMessage(msg);
    speak(msg);
  };

  //  Cập nhật ngưỡng
  const handleUpdateThreshold = async () => {
    if (threshold === "" || isNaN(threshold)) {
      alert(" Vui lòng nhập giá trị hợp lệ!");
      return;
    }

    const newThreshold = parseFloat(threshold);

    try {
      const res = await fetch("http://localhost:3000/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device: "ThresholdDht", 
          action: newThreshold, 
        }),
      });

      if (!res.ok) {
        throw new Error(`Server trả lỗi ${res.status}`);
      }

      const data = await res.json();
      console.log(" Đã cập nhật ngưỡng:", data);

      // Cập nhật state frontend
      setCurrentThreshold(newThreshold);
      const msg = ` Đã cập nhật ngưỡng điều hòa: ${newThreshold}°C`;
      setVoiceMessage(msg);
      speak(msg);
      setThreshold("");
    } catch (err) {
      console.error(" Lỗi cập nhật ngưỡng:", err);
    }
  };

  const handleVoiceControl = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Trình duyệt không hỗ trợ giọng nói!");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.start();
    setIsListening(true);
    setVoiceMessage(" Đang lắng nghe... Hãy nói lệnh của bạn.");
    speak("Đang lắng nghe lệnh của bạn");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log(" Lệnh giọng nói:", transcript);
      setIsListening(false);

      let msg = "";
      if (transcript.includes("bật điều hòa")) {
        handleToggleAC(true);
        msg = "Đã bật điều hòa theo lệnh giọng nói.";
      } else if (transcript.includes("tắt điều hòa")) {
        handleToggleAC(false);
        msg = "Đã tắt điều hòa theo lệnh giọng nói.";
      } else if (transcript.includes("bật tự động")) {
        setIsAutoMode(true);
        msg = "Đã bật chế độ tự động.";
      } else if (transcript.includes("tắt tự động")) {
        setIsAutoMode(false);
        msg = " Đã tắt chế độ tự động.";
      } else {
        msg = "Không nhận diện được lệnh, vui lòng thử lại!";
      }

      setVoiceMessage(msg);
      speak(msg);
    };

    recognition.onerror = (event) => {
      console.error(" Lỗi giọng nói:", event.error);
      const msg = " Lỗi khi nhận giọng nói, vui lòng thử lại!";
      setVoiceMessage(msg);
      speak(msg);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-3xl font-semibold text-blue-500 text-center">
        Giám Sát Nhiệt Độ & Độ Ẩm
      </h2>
      <p className="text-md text-gray-500 text-center mt-2">
        Theo dõi môi trường - Kho Đông / Máy Lạnh
      </p>

      {/* Dữ liệu cảm biến */}
      <div className="flex flex-wrap gap-4 mt-6">
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <p className="text-gray-600 font-medium">Nhiệt Độ</p>
          <span className="text-2xl text-red-500 font-semibold">
            {sensorData.nhietdo}°C
          </span>
        </div>
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <p className="text-gray-600 font-medium">Độ Ẩm</p>
          <span className="text-2xl text-green-600 font-semibold">
            {sensorData.doam}%
          </span>
        </div>
      </div>

      {/* Điều khiển điều hòa */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Chế độ tự động */}
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium text-gray-700">
              Chế độ tự động
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAutoMode}
                onChange={handleToggleAuto}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-purple-500 transition duration-300"></div>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 peer-checked:translate-x-6"></div>
            </label>
          </div>

          {/* Điều khiển giọng nói */}
          <button
            onClick={handleVoiceControl}
            className={`px-6 py-3 rounded-lg text-white transition duration-300 flex items-center gap-2 ${
              isListening
                ? "bg-gray-400 animate-pulse"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isListening ? "Đang nghe..." : "Điều khiển bằng giọng nói"}
          </button>
        </div>

        {/* Điều hòa */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-4">
            <p className="text-lg font-medium text-gray-700">
              Trạng thái điều hòa:
            </p>
            <p
              className={`text-2xl font-semibold ${
                isACOn ? "text-green-600" : "text-gray-500"
              }`}
            >
              {isACOn ? "Đang bật" : "Đang tắt"}
            </p>
          </div>
          <button
            onClick={() => handleToggleAC()}
            disabled={isAutoMode}
            className={`px-6 py-2 rounded-lg text-white transition duration-200 ${
              isACOn
                ? isAutoMode
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-400 hover:bg-gray-500"
                : isAutoMode
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {isACOn ? "Tắt điều hòa" : "Bật điều hòa"}
          </button>
        </div>
      </div>

      {/* Ngưỡng nhiệt độ */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mt-5">
        <p className="text-lg font-medium text-gray-700 mb-3">
          Ngưỡng kích hoạt điều hòa (°C)
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="number"
            min="10"
            max="50"
            step="0.5"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Nhập ngưỡng..."
            className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleUpdateThreshold}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            Cập nhật
          </button>
        </div>
        <p className="mt-4 text-lg font-semibold text-gray-800">
          Ngưỡng hiện tại:{" "}
          <span className="text-blue-500">{currentThreshold}</span> °C
        </p>
      </div>

      {/* Hiển thị trạng thái giọng nói */}
      {voiceMessage && (
        <div className="mt-6 p-4 bg-gray-100 border rounded-lg text-center text-gray-700">
          {voiceMessage}
        </div>
      )}

      {/* Biểu đồ */}
      <ChartDHT22 />
    </div>
  );
};

export default DHT22;


