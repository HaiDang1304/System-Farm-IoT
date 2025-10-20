import React, { useEffect, useState } from "react";
import ChartLDR from "../components/ChartLight";

const API_URL = "http://localhost:3000/data";
const CONTROL_URL = "http://localhost:3000/control";

const LightSensor = () => {
  const [sensorData, setSensorData] = useState({ anhsang: 0 });
  const [ledState, setLedState] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [nguongLdr, setNguongLdr] = useState(1200);
  const [thresholdInput, setThresholdInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  // Hàm nói giọng nói
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setSensorData(Array.isArray(data) ? data[0] : data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Chế độ tự động bật/tắt đèn
  useEffect(() => {
    if (!autoMode) return;
    if (sensorData.anhsang < nguongLdr && !ledState) toggleLed(true);
    else if (sensorData.anhsang >= nguongLdr && ledState) toggleLed(false);
  }, [sensorData, autoMode, nguongLdr]);

  // Hàm bật/tắt đèn
  const toggleLed = async (state) => {
    setLedState(state);
    try {
      await fetch(CONTROL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: "Led", action: state ? "ON" : "OFF" }),
      });
      speak(`Đèn đã ${state ? "bật" : "tắt"}`);
    } catch (err) {
      console.error("Lỗi khi điều khiển đèn:", err);
      alert("Gửi lệnh thất bại, kiểm tra server.");
    }
  };

  // Cập nhật ngưỡng ánh sáng
  const handleUpdateThreshold = () => {
    const value = parseInt(thresholdInput);
    if (!isNaN(value)) {
      setNguongLdr(value);
      speak(`Ngưỡng ánh sáng đã được cập nhật thành ${value} lux`);
      setThresholdInput("");
    } else alert("Vui lòng nhập số hợp lệ!");
  };

  // Giọng nói điều khiển
  const startVoiceControl = () => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      alert("Trình duyệt không hỗ trợ Speech Recognition!");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.start();
    setIsListening(true);
    setVoiceMessage("Đang lắng nghe...");

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      let msg = "";

      if (command.includes("bật đèn")) {
        if (!ledState) {
          toggleLed(true);
          msg = "Đã bật đèn theo lệnh giọng nói.";
        } else {
          msg = "Đèn đang bật rồi, không cần bật thêm.";
          speak(msg);
        }
      } else if (command.includes("tắt đèn")) {
        if (ledState) {
          toggleLed(false);
          msg = "Đã tắt đèn theo lệnh giọng nói.";
        } else {
          msg = "Đèn đang tắt rồi, không cần tắt thêm.";
          speak(msg);
        }
      } else if (command.includes("bật tự động")) {
        setAutoMode(true);
        msg = "Đã bật chế độ tự động.";
      } else if (command.includes("tắt tự động")) {
        setAutoMode(false);
        msg = "Đã tắt chế độ tự động.";
      } else {
        msg = "Không nhận diện được lệnh, vui lòng thử lại!";
        speak(msg);
      }

      setVoiceMessage(msg);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setVoiceMessage("Lỗi khi nhận giọng nói!");
      speak("Lỗi khi nhận giọng nói!");
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-3xl font-bold text-blue-500 text-center">
        Giám Sát Điều Khiển Ánh Sáng
      </h2>
      <p className="text-md text-gray-500 text-center mt-2">
        Theo dõi cường độ ánh sáng và điều khiển bóng đèn
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <p className="text-lg font-medium mb-3">Cường độ ánh sáng</p>
          <span className="text-2xl text-red-500 font-semibold">
            {sensorData.anhsang} lux
          </span>
        </div>
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <p className="text-lg font-medium mb-3">Trạng thái đèn</p>
          <button
            onClick={() => toggleLed(!ledState)}
            disabled={autoMode}
            className={`px-6 py-2 rounded-lg text-white ${
              ledState
                ? autoMode
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
                : autoMode
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {ledState ? "Tắt Đèn" : "Bật Đèn"}
          </button>
        </div>
      </div>

      {/* Điều khiển */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-lg font-medium">Chế độ tự động</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoMode}
                onChange={(e) => setAutoMode(e.target.checked)}
              />
              <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-amber-400 transition duration-300"></div>
              <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 peer-checked:translate-x-7"></div>
            </label>
          </div>
          <button
            onClick={startVoiceControl}
            className={`px-6 py-2 rounded-lg text-white ${
              isListening
                ? "bg-gray-400 animate-pulse"
                : "bg-amber-400 hover:bg-amber-500"
            }`}
          >
            {isListening ? "Đang nghe..." : "Điều khiển bằng giọng nói"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-lg font-medium">Ngưỡng ánh sáng</p>
            <input
              type="number"
              placeholder="Nhập ngưỡng ánh sáng"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="min-w-[300px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <p className="text-lg font-medium">Ngưỡng hiện tại: {nguongLdr}</p>
          </div>
          <button
            onClick={handleUpdateThreshold}
            className="bg-amber-400 text-white rounded-xl px-6 py-2 hover:bg-amber-500 transition w-full sm:w-auto"
          >
            Cập nhật
          </button>
        </div>

        {voiceMessage && (
          <div className="mt-4 p-4 bg-gray-100 border rounded-lg text-center text-gray-700">
            {voiceMessage}
          </div>
        )}
      </div>
      <ChartLDR />
    </div>
  );
};

export default LightSensor;
