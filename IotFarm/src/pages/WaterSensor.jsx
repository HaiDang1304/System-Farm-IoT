import React, { useEffect, useState, useRef } from "react";
import ChartWaterLevel from "../components/ChartWater";

const API_URL = "http://localhost:3000/data";
const CONTROL_URL = "http://localhost:3000/control";

const WaterSensor = () => {
  const [sensorData, setSensorData] = useState({ khoangcach: 0 });
  const [motorState, setMotorState] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [nguongMotor, setNguongMotor] = useState(100); // mặc định 100cm
  const [thresholdInput, setThresholdInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  const recognitionRef = useRef(null);

  // ======== Nói ra thông báo ========
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

  // ======== Điều khiển motor ========
  const toggleMotor = async (state) => {
    setMotorState(state);
    try {
      await fetch(CONTROL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device: "PumpTank",
          action: state ? "ON" : "OFF",
        }),
      });
      speak(`Motor đã ${state ? "bật" : "tắt"}`);
    } catch (error) {
      console.error("Error controlling motor:", error);
      alert("Lỗi khi điều khiển motor");
    }
  };

  // ======== Cập nhật ngưỡng ========
  const handleThresholdUpdate = async () => {
    const value = parseInt(thresholdInput);

   
    if (isNaN(value) || value < 0 || value > 400) {
      alert(" Vui lòng nhập giá trị hợp lệ (0-400 cm)!");
      return;
    }

    try {
      const res = await fetch(CONTROL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device: "ThresholdHcsr04", 
          action: value, 
        }),
      });

      if (!res.ok) {
        throw new Error(`Server trả lỗi ${res.status}`);
      }

      const data = await res.json();
      console.log("Đã cập nhật ngưỡng mực nước:", data);

      setNguongMotor(value);
      speak(`Ngưỡng motor đã được đặt thành ${value} cm`);
      setThresholdInput("");
    } catch (error) {
      console.error("Lỗi cập nhật ngưỡng:", error);
    
    }
  };

  // ======== Lấy dữ liệu cảm biến ========
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
    const interval = setInterval(fetchData, 30000); // cap nhat moi 30 giay
    return () => clearInterval(interval);
  }, []);

  // ======== Auto Mode theo ngưỡng ========
  useEffect(() => {
    if (autoMode) {
      if (sensorData.khoangcach >= nguongMotor && !motorState)
        toggleMotor(true);
      if (sensorData.khoangcach < nguongMotor && motorState) toggleMotor(false);
    }
  }, [sensorData, autoMode]);

  // ======== Voice Control ========
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window))
      return;

    if (!recognitionRef.current) {
      const Recognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recog = new Recognition();
      recog.lang = "vi-VN";
      recog.continuous = true;

      recog.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript
          .trim()
          .toLowerCase();
        let msg = "";

        if (transcript.includes("bật motor")) {
          if (!motorState) toggleMotor(true);
          msg = "Đã bật motor";
        } else if (transcript.includes("tắt motor")) {
          if (motorState) toggleMotor(false);
          msg = "Đã tắt motor";
        } else if (transcript.includes("bật tự động")) {
          setAutoMode(true);
          msg = "Đã bật chế độ tự động";
        } else if (transcript.includes("tắt tự động")) {
          setAutoMode(false);
          msg = "Đã tắt chế độ tự động";
        } else {
          msg = "Không nhận diện được lệnh!";
        }

        setVoiceMessage(msg);
        speak(msg);
      };

      recog.onend = () => {
        if (isListening) recog.start();
      };

      recognitionRef.current = recog;
    }

    if (isListening) recognitionRef.current.start();
    else recognitionRef.current.stop();
  }, [isListening, motorState]);

  return (
    <div className="p-4">
      <h2 className="text-3xl font-bold text-blue-500 text-center">
        Giám Sát Mực Nước
      </h2>
      <p className="text-md text-gray-500 text-center mt-2">
        Theo dõi mực nước và điều khiển motor
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        {/* Hiển thị mực nước */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <p className="text-lg font-medium mb-3">Khoảng cách đến mặt nước</p>
          <span className="text-2xl text-red-500 font-semibold">
            {sensorData.khoangcach} cm
          </span>
        </div>

        {/* Trạng thái motor */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <p className="text-lg font-medium mb-3">Trạng thái motor</p>
          <button
            onClick={() => toggleMotor(!motorState)}
            disabled={autoMode}
            className={`px-6 py-2 rounded-lg text-white ${
              motorState
                ? autoMode
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
                : autoMode
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {motorState ? "Tắt Motor" : "Bật Motor"}
          </button>
        </div>
      </div>

      {/* Auto Mode & Voice Control */}
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
              <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-cyan-400 transition duration-300"></div>
              <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 peer-checked:translate-x-7"></div>
            </label>
          </div>
          <button
            onClick={() => setIsListening(!isListening)}
            className={`px-6 py-2 rounded-lg text-white ${
              isListening
                ? "bg-gray-400 animate-pulse"
                : "bg-cyan-400 hover:bg-cyan-500"
            }`}
          >
            {isListening ? "Ngừng nghe giọng nói" : "Điều khiển bằng giọng nói"}
          </button>
        </div>

        {/* Ngưỡng motor */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-lg font-medium">Ngưỡng kích hoạt motor (cm)</p>
            <input
              type="number"
              placeholder="Nhập ngưỡng nước"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="min-w-[300px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <p className="text-lg font-medium">
              Ngưỡng hiện tại: {nguongMotor}
            </p>
          </div>
          <button
            onClick={handleThresholdUpdate}
            className="bg-cyan-400 text-white rounded-xl px-6 py-2 hover:bg-cyan-500 transition w-full sm:w-auto"
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

      <ChartWaterLevel />
    </div>
  );
};

export default WaterSensor;


