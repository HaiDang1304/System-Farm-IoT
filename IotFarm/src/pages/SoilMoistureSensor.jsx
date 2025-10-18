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

  // 🔊 Hàm nói
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

  // 🧠 Hàm điều khiển máy bơm (gửi lệnh đến server)
  const handleTogglePump = (forceState = null) => {
    const newState = forceState !== null ? forceState : !isPumpOn;
    const action = newState ? "ON" : "OFF";

    fetch(CONTROL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device: "WaterPump", action }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Lỗi khi gửi lệnh điều khiển");
        return res.json();
      })
      .then((data) => {
        console.log("Lệnh điều khiển gửi thành công:", data);
        setIsPumpOn(newState);
        speak(`Máy bơm đã ${newState ? "bật" : "tắt"}`);
      })
      .catch((error) => {
        console.error("Lỗi khi gửi lệnh điều khiển:", error);
      });
  };

  // 🌱 Lấy dữ liệu cảm biến định kỳ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        const newData = Array.isArray(data) ? data[0] : data;
        setSensorData(newData);
        console.log("Độ ẩm đất:", newData.doamdat);

        if (autoMode) {
          if (newData.doamdat <= threshold && !isPumpOn) {
            handleTogglePump(true); // bật máy bơm
          } else if (newData.doamdat > threshold && isPumpOn) {
            handleTogglePump(false); // tắt máy bơm
          }
        }
      } catch (error) {
        console.error("Lỗi không fetch được dữ liệu:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoMode, isPumpOn, threshold]);

  // 🎙️ Điều khiển bằng giọng nói
  const startVoiceControl = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Trình duyệt của bạn không hỗ trợ điều khiển giọng nói.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Lệnh giọng nói:", transcript);

      if (transcript.includes("bật máy bơm")) {
        handleTogglePump(true);
      } else if (transcript.includes("tắt máy bơm")) {
        handleTogglePump(false);
      } else if (transcript.includes("bật chế độ tự động")) {
        setAutoMode(true);
        speak("Đã bật chế độ tự động tưới nước.");
      } else if (transcript.includes("tắt chế độ tự động")) {
        setAutoMode(false);
        speak("Đã tắt chế độ tự động tưới nước.");
      } else {
        speak("Tôi không hiểu lệnh, vui lòng nói lại.");
      }
    };

    recognition.onerror = (event) => {
      console.error("Lỗi nhận dạng giọng nói:", event.error);
    };

    recognition.start();
    speak("Xin chào Đại Ca, tôi đang lắng nghe lệnh điều khiển máy bơm.");
  };

  const handleToggleAuto = () => {
    const newState = !isAutoMode;
    setIsAutoMode(newState);
    const msg = newState
      ? " Đã bật chế độ tự động."
      : " Đã tắt chế độ tự động.";
    setVoiceMessage(msg);
    speak(msg);
  };

  // ⚙️ Cập nhật ngưỡng tự động
  const updateThreshold = () => {
    const newValue = parseInt(inputThreshold);
    if (isNaN(newValue)) {
      alert("Vui lòng nhập giá trị hợp lệ!");
      return;
    }
    setThreshold(newValue);
    setInputThreshold("");
    speak(`Đã cập nhật ngưỡng tự động là ${newValue}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-3xl font-semibold text-blue-500 text-center">
        Giám Sát Độ Ẩm Đất
      </h2>
      <p className="text-md text-gray-500 text-center mt-2">
        Bằng cảm biến độ ẩm đất
      </p>
      <p className="text-2xl font-medium mt-3">Thông tin độ ẩm đất</p>

      <div className="flex flex-wrap gap-4 mt-4 min-h-full">
        {/* --- Độ ẩm đất --- */}
        <div className="flex-1 bg-blue-200 rounded-xl py-10">
          <div className="flex items-center ml-5">
            <p className="text-lg px-2 font-medium">Độ ẩm đất hiện tại:</p>
            <span className="text-2xl text-red-500 font-semibold">
              {sensorData.doamdat}%
            </span>
          </div>
        </div>

        {/* --- Trạng thái bơm --- */}
        <div className="flex-1 bg-green-200 rounded-xl py-10">
          <div className="flex justify-between items-center px-4">
            <div className="flex items-center space-x-2">
              <p className="text-lg font-medium">Trạng thái bơm tới:</p>
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
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              {isPumpOn ? "Tắt Máy Bơm" : "Bật Máy Bơm"}
            </button>
          </div>
        </div>
      </div>

      {/* --- Chế độ tự động & giọng nói --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 mt-6">
        <div className="mt-6 flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <p className="text-lg font-medium">Chế độ tự động</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoMode}
                onChange={() => setAutoMode(!autoMode)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-purple-500 transition duration-300"></div>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 peer-checked:translate-x-6"></div>
            </label>
          </div>
          <button
            onClick={startVoiceControl}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
          >
            Điều khiển giọng nói
          </button>
        </div>

        {/* --- Cập nhật ngưỡng --- */}
        <div className="flex items-center justify-between mt-6 gap-4">
          <div className="flex items-center text-center gap-4">
            <p className="text-lg font-medium">Cập nhật ngưỡng</p>
            <input
              type="number"
              value={inputThreshold}
              onChange={(e) => setInputThreshold(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 mt-2 w-48"
              placeholder="Ngưỡng (%)"
            />
          </div>
          <button
            onClick={updateThreshold}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Cập nhật
          </button>
        </div>

        <p className="text-lg font-medium mt-6">
          Ngưỡng hiện tại:{" "}
          <span className="text-blue-600 font-semibold">{threshold}</span>
        </p>
        <ChartSoilMoisture />
      </div>
    </div>
  );
};

export default SoilMoistureSensor;
