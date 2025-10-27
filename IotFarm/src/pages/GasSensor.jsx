import React, { useEffect, useState } from "react";
import ChartGas from "../components/ChartGas";

const API_URL = "http://localhost:3000/data";
const CONTROL_URL = "http://localhost:3000/control";

const GasSensor = () => {
  const [sensorData, setSensorData] = useState({
    khigas: 0,
    nguongbatcoi: 2500,
  });
  const [threshold, setThreshold] = useState("");
  const [isBuzzerOn, setIsBuzzerOn] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
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
        const deviceData = Array.isArray(data) ? data[0] : data;
        setSensorData({
          khigas: deviceData.khigas || 0,
          nguongbatcoi: deviceData.nguongbatcoi || 2500,
        });
      } catch (err) {
        console.error("Lỗi fetch dữ liệu:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Tự động phát cảnh báo khi vượt ngưỡng
  useEffect(() => {
    if (!isAutoMode) return;
    const { khigas, nguongbatcoi } = sensorData;

    if (khigas >= nguongbatcoi && !isBuzzerOn) {
      handleToggleBuzzer(true);
      const msg = `Cảnh báo! Nồng độ khí gas ${khigas} ppm vượt ngưỡng ${nguongbatcoi} ppm. Còi đã được bật tự động.`;
      setVoiceMessage(msg);
      speak(msg);
    } else if (khigas < nguongbatcoi && isBuzzerOn) {
      handleToggleBuzzer(false);
      const msg = `Nồng độ khí gas ${khigas} ppm đã trở về an toàn dưới ${nguongbatcoi} ppm. Còi đã được tắt.`;
      setVoiceMessage(msg);
      speak(msg);
    }
  }, [sensorData.khigas, isAutoMode, sensorData.nguongbatcoi]);

  // Bật/tắt còi báo động
  const handleToggleBuzzer = (forcedState) => {
    const action =
      forcedState !== undefined
        ? forcedState
          ? "ON"
          : "OFF"
        : isBuzzerOn
        ? "OFF"
        : "ON";

    fetch(`${CONTROL_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device: "Buzzer",
        action: action,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server trả lỗi ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Lệnh còi đã gửi:", data);
        setIsBuzzerOn(action === "ON");
      })
      .catch((err) => {
        console.error("Lỗi gửi lệnh còi:", err);
        setVoiceMessage("Lỗi kết nối server. Kiểm tra backend!");
        speak("Lỗi kết nối. Vui lòng thử lại.");
      });
  };

  // Chế độ tự động
  const handleToggleAuto = () => {
    const newState = !isAutoMode;
    const action = newState ? "ON" : "OFF";

    console.log("Gửi lệnh tự động:", action);

    fetch(`${CONTROL_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device: "AutoMq2",
        action: action,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server trả lỗi ${res.status}`);
        return res.json();
      })
      .then(() => {
        console.log("Lệnh tự động đã gửi thành công:", action);
        setIsAutoMode(newState);
        const msg = newState
          ? "Đã bật chế độ tự động phát hiện khí gas."
          : "Đã tắt chế độ tự động phát hiện khí gas.";
        setVoiceMessage(msg);
        speak(msg);
      })
      .catch((err) => {
        console.error("Lỗi gửi lệnh tự động:", err);
        setVoiceMessage("Lỗi kết nối server. Kiểm tra backend!");
        speak("Lỗi kết nối. Vui lòng thử lại.");
      });
  };

  // Cập nhật ngưỡng
  const handleUpdateThreshold = () => {
    if (threshold === "" || isNaN(threshold)) {
      alert("Vui lòng nhập giá trị hợp lệ!");
      return;
    }
    const newThreshold = parseFloat(threshold);
    if (newThreshold < 0 || newThreshold > 4095) {
      alert("Ngưỡng phải trong khoảng 0-4095!");
      return;
    }

    fetch(`${CONTROL_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device: "ThresholdMq2",
        action: threshold,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server trả lỗi ${res.status}`);
        return res.json();
      })
      .then(() => {
        setSensorData((prev) => ({ ...prev, nguongbatcoi: newThreshold }));
        const msg = `Đã cập nhật ngưỡng kích hoạt còi: ${threshold} ppm`;
        setVoiceMessage(msg);
        speak(msg);
        setThreshold("");
      })
      .catch((err) => {
        console.error("Lỗi cập nhật ngưỡng:", err);
        setVoiceMessage("Lỗi kết nối server. Kiểm tra backend!");
        speak("Lỗi kết nối. Vui lòng thử lại.");
      });
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
    setVoiceMessage("Đang lắng nghe... Hãy nói lệnh của bạn.");
    speak("Đang lắng nghe lệnh của bạn");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Lệnh giọng nói:", transcript);
      setIsListening(false);

      let msg = "";

      if (transcript.includes("bật còi")) {
        handleToggleBuzzer(true);
        msg = "Đã bật còi theo lệnh giọng nói.";
      } else if (transcript.includes("tắt còi")) {
        handleToggleBuzzer(false);
        msg = "Đã tắt còi theo lệnh giọng nói.";
      } else if (transcript.includes("bật tự động")) {
        setIsAutoMode(true);
        msg = "Đã bật chế độ tự động.";
      } else if (transcript.includes("tắt tự động")) {
        setIsAutoMode(false);
        msg = "Đã tắt chế độ tự động.";
      } else if (
        transcript.includes("mức khí gas") ||
        transcript.includes("giá trị khí gas") ||
        transcript.includes("khí gas bao nhiêu")
      ) {
        msg = `Mức khí gas hiện tại là ${sensorData.khigas}.`;
      } else {
        msg = "Không nhận diện được lệnh, vui lòng thử lại!";
      }

      setVoiceMessage(msg);
      speak(msg);
    };

    recognition.onerror = (event) => {
      console.error("Lỗi giọng nói:", event.error);
      const msg = "Lỗi khi nhận giọng nói, vui lòng thử lại!";
      setVoiceMessage(msg);
      speak(msg);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
  };

  // Xác định mức độ nguy hiểm
  const getGasLevel = () => {
    const { khigas, nguongbatcoi } = sensorData;
    if (khigas < nguongbatcoi * 0.5) {
      return { level: "An toàn", color: "text-green-600", bg: "bg-green-50" };
    }
    if (khigas < nguongbatcoi) {
      return {
        level: "Cảnh báo",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
      };
    }
    return { level: "Nguy hiểm", color: "text-red-600", bg: "bg-red-50" };
  };

  const gasLevel = getGasLevel();

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-semibold text-orange-500 text-center">
        Giám Sát Nồng Độ Khí Gas (MQ-2)
      </h2>
      <p className="text-md text-gray-500 text-center mt-2">
        Hệ thống cảnh báo và xử lý khí gas tự động
      </p>

      {/* Dữ liệu cảm biến */}
      <div className="mt-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              gasLevel.level === "Nguy hiểm"
                ? "bg-red-100 animate-pulse"
                : gasLevel.level === "Cảnh báo"
                ? "bg-yellow-100"
                : "bg-green-100"
            }`}
          >
            <svg
              className={`w-10 h-10 ${
                gasLevel.level === "Nguy hiểm"
                  ? "text-red-500"
                  : gasLevel.level === "Cảnh báo"
                  ? "text-yellow-500"
                  : "text-green-500"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-600 font-medium mb-2">
            Nồng độ khí gas (analog value)
          </p>
          <span
            className={`text-5xl font-bold block mb-4 ${
              gasLevel.level === "Nguy hiểm"
                ? "text-red-500"
                : gasLevel.level === "Cảnh báo"
                ? "text-yellow-500"
                : "text-green-500"
            }`}
          >
            {sensorData.khigas}
          </span>
          <div className={`inline-block px-6 py-2 rounded-full ${gasLevel.bg}`}>
            <span className={`text-lg font-semibold ${gasLevel.color}`}>
              {gasLevel.level}
            </span>
          </div>
        </div>
      </div>

      {/* Điều khiển còi */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Chế độ tự động */}
          <div className="flex items-center gap-4">
            <svg
              className="w-6 h-6 text-purple-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
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
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            {isListening ? "Đang nghe..." : "Điều khiển bằng giọng nói"}
          </button>
        </div>

        {/* Còi báo động */}
        <div className="flex items-center justify-between mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isBuzzerOn ? "bg-red-100 animate-pulse" : "bg-gray-200"
              }`}
            >
              <svg
                className={`w-8 h-8 ${
                  isBuzzerOn ? "text-red-600" : "text-gray-400"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                Trạng thái còi báo động:
              </p>
              <p
                className={`text-2xl font-semibold ${
                  isBuzzerOn ? "text-red-600" : "text-gray-500"
                }`}
              >
                {isBuzzerOn ? "Đang kêu" : "Im lặng"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleBuzzer()}
            disabled={isAutoMode}
            className={`px-6 py-3 rounded-lg text-white transition duration-200 font-semibold ${
              isBuzzerOn
                ? isAutoMode
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-500 hover:bg-gray-600"
                : isAutoMode
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isBuzzerOn ? "Tắt còi" : "Bật còi"}
          </button>
        </div>
      </div>

      {/* Ngưỡng kích hoạt */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <svg
            className="w-6 h-6 text-blue-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
          </svg>
          <p className="text-lg font-medium text-gray-700">
            Ngưỡng kích hoạt còi (0-4095)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="number"
            min="0"
            max="4095"
            step="100"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Nhập ngưỡng..."
            className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleUpdateThreshold}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
          >
            Cập nhật
          </button>
        </div>
        <p className="mt-4 text-lg font-semibold text-gray-800">
          Ngưỡng hiện tại:{" "}
          <span className="text-blue-500">{sensorData.nguongbatcoi}</span>
        </p>
      </div>

      {/* Hiển thị trạng thái giọng nói */}
      {voiceMessage && (
        <div
          className={`mt-6 p-4 border rounded-lg text-center text-gray-700 ${
            voiceMessage.includes("Cảnh báo") ||
            voiceMessage.includes("Nguy hiểm")
              ? "bg-red-50 border-red-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <svg
            className={`w-5 h-5 inline-block mr-2 ${
              voiceMessage.includes("Cảnh báo") ||
              voiceMessage.includes("Nguy hiểm")
                ? "text-red-500"
                : "text-blue-500"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          {voiceMessage}
        </div>
      )}
      <ChartGas />
    </div>
  );
};

export default GasSensor;
