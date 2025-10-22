import { useEffect, useState } from "react";
import CharRain from "../components/ChartRain";

const API_URL = "http://localhost:3000/data";
const CONTROL_URL = "http://localhost:3000/control";

const RainSensor = () => {
  const [sensorData, setSensorData] = useState({ mua: 0 });
  const [rainState, setRainState] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

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

  const toggleMotor = async (state) => {
    setRainState(state);
    try {
      await fetch(CONTROL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device: "Roof",
          action: state ? "ON" : "OFF",
        }),
      });
      speak(`Máy che đã được ${state ? "mở" : "đóng"}`);
    } catch (error) {
      console.error("Error controlling cover:", error);
      alert("Lỗi khi điều khiển máy che");
    }
  };

  useEffect(() => {
    if (!autoMode) return; // chỉ hoạt động khi bật auto

    // Nếu trời mưa => mở máy che
    if (sensorData.mua === 1 && !rainState) {
      toggleMotor(true);
    }

    // Nếu trời khô => đóng máy che
    if (sensorData.mua === 0 && rainState) {
      toggleMotor(false);
    }
  }, [sensorData.mua]); // chỉ theo dõi thay đổi của cảm biến

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const dat = await res.json();

        if (Array.isArray(dat) && dat.length > 0) {
          const latest = dat[0]; // phần tử mới nhất
          setSensorData({ mua: latest.mua });
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu cảm biến mưa:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-3xl font-bold text-blue-500 text-center">
        Giám Sát Phát Hiện Mưa Và Máy Che
      </h2>
      <p className="text-md text-gray-500 text-center mt-2">
        Giám sát hệ thống mưa và điều khiển máy che
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 mt-6 h-[150px]">
          <p className="text-lg font-medium">Trạng thái thời tiết</p>
          <p
            className={`mt-4 text-lg font-medium ${
              sensorData.mua === 1 ? "text-blue-600" : "text-gray-500"
            }`}
          >
            {sensorData.mua === 1 ? "Trời đang mưa " : "Trời khô ráo "}
          </p>
        </div>

        <div className="flex-1 bg-white p-6 rounded-xl shadow border border-gray-200 mt-6 h-[150px]">
          <div className="flex gap-2 items-center justify-between">
            <div className=" gap-3 items-center">
              <p className="text-lg font-medium">Trạng thái máy che</p>
              <span>{rainState ? "Đang mở" : "Đang đóng"}</span>
            </div>
            <button
              onClick={() => toggleMotor(!rainState)}
              className="px-6 py-2 rounded-lg text-white bg-fuchsia-500 hover:bg-fuchsia-600"
            >
              {rainState ? "Đóng máy che" : "Mở máy che"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-lg font-medium">Chế độ tự động</p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={autoMode}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setAutoMode(isChecked);
                speak(`Đã ${isChecked ? "bật" : "tắt"} chế độ tự động`);
              }}
            />

            <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-fuchsia-500 transition duration-300"></div>
            <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 peer-checked:translate-x-7"></div>
          </label>
        </div>
        <div>
          <button className="px-6 py-2 rounded-lg text-white bg-fuchsia-500 hover:bg-fuchsia-600">
            Điều khiển bằng giọng nói
          </button>
        </div>
      </div>

      <CharRain />
    </div>
  );
};

export default RainSensor;
