export const SENSOR_CONFIG = {
  dht22: {
    key: "dht22",
    name: "Cảm biến DHT22",
    description: "Theo dõi nhiệt độ và độ ẩm môi trường nhà kính.",
    icon: { pack: "Feather", name: "thermometer" },
    metrics: [
      { key: "nhietdo", label: "Nhiệt độ", unit: "°C", color: "#ef4444" },
      { key: "doam", label: "Độ ẩm", unit: "%", color: "#22c55e" },
    ],
    controls: [
      {
        type: "toggle",
        device: "AC",
        label: "Máy lạnh",
        description: "Bật/tắt máy lạnh để hạ nhiệt chuồng trại.",
      },
      {
        type: "toggle",
        device: "AutoDht",
        label: "Chế độ tự động",
        description: "Để hệ thống tự bật/tắt máy lạnh theo ngưỡng.",
        isAuto: true,
      },
      {
        type: "threshold",
        device: "ThresholdDht",
        label: "Ngưỡng nhiệt độ",
        unit: "°C",
        placeholder: "Ví dụ: 28",
      },
    ],
  },
  soil: {
    key: "soil",
    name: "Độ ẩm đất",
    description: "Đảm bảo độ ẩm đất phù hợp cho cây trồng.",
    icon: { pack: "Feather", name: "droplet" },
    metrics: [
      { key: "doamdat", label: "Độ ẩm đất", unit: "%", color: "#0ea5e9" },
    ],
    controls: [
      {
        type: "toggle",
        device: "WaterPump",
        label: "Bơm tưới",
        description: "Bật/tắt bơm tưới cây thủ công.",
      },
      {
        type: "toggle",
        device: "AutoDoamdat",
        label: "Tưới tự động",
        description: "Tự tưới khi độ ẩm xuống thấp.",
        isAuto: true,
      },
      {
        type: "threshold",
        device: "ThresholdDoamdat",
        label: "Ngưỡng độ ẩm",
        unit: "%",
        placeholder: "Ví dụ: 45",
      },
    ],
  },
  light: {
    key: "light",
    name: "Ánh sáng",
    description: "Giám sát cường độ ánh sáng cho cây trồng.",
    icon: { pack: "Feather", name: "sun" },
    metrics: [
      { key: "anhsang", label: "Cường độ sáng", unit: "lux", color: "#f97316" },
    ],
    controls: [
      {
        type: "toggle",
        device: "Led",
        label: "Đèn chiếu sáng",
        description: "Bật/tắt đèn LED hỗ trợ cây.",
      },
      {
        type: "toggle",
        device: "AutoLdr",
        label: "Bật đèn tự động",
        description: "Tự điều chỉnh đèn theo ánh sáng.",
        isAuto: true,
      },
      {
        type: "threshold",
        device: "ThresholdLdr",
        label: "Ngưỡng ánh sáng",
        unit: "lux",
        placeholder: "Ví dụ: 900",
      },
    ],
  },
  gas: {
    key: "gas",
    name: "Khí gas MQ-2",
    description: "Theo dõi khí gas để cảnh báo cháy nổ.",
    icon: { pack: "Feather", name: "activity" },
    metrics: [
      { key: "khigas", label: "Nồng độ khí", unit: "ppm", color: "#ec4899" },
    ],
    controls: [
      {
        type: "toggle",
        device: "Buzzer",
        label: "Còi cảnh báo",
        description: "Kích hoạt còi báo động khi phát hiện khí.",
      },
      {
        type: "toggle",
        device: "AutoMq2",
        label: "Cảnh báo tự động",
        description: "Tự bật còi khi nồng độ vượt ngưỡng.",
        isAuto: true,
      },
      {
        type: "threshold",
        device: "ThresholdMq2",
        label: "Ngưỡng khí gas",
        unit: "ppm",
        placeholder: "Ví dụ: 200",
      },
    ],
  },
  water: {
    key: "water",
    name: "Mực nước bồn",
    description: "Tránh tràn hoặc cạn bồn chứa nước.",
    icon: { pack: "Feather", name: "anchor" },
    metrics: [
      {
        key: "khoangcach",
        label: "Khoảng cách mặt nước",
        unit: "cm",
        color: "#6366f1",
      },
    ],
    controls: [
      {
        type: "toggle",
        device: "PumpTank",
        label: "Bơm bồn",
        description: "Bật/tắt bơm nước cho bồn.",
      },
      {
        type: "toggle",
        device: "AutoHcsr04",
        label: "Bơm tự động",
        description: "Tự bơm theo mực nước.",
        isAuto: true,
      },
      {
        type: "threshold",
        device: "ThresholdHcsr04",
        label: "Ngưỡng khoảng cách",
        unit: "cm",
        placeholder: "Ví dụ: 80",
      },
    ],
  },
  rain: {
    key: "rain",
    name: "Cảm biến mưa",
    description: "Tự động đóng mái che khi trời mưa.",
    icon: { pack: "Feather", name: "cloud-rain" },
    metrics: [
      { key: "mua", label: "Cường độ mưa", unit: "mm/h", color: "#38bdf8" },
    ],
    controls: [
      {
        type: "toggle",
        device: "Roof",
        label: "Mái che",
        description: "Đóng/mở mái che thủ công.",
      },
      {
        type: "toggle",
        device: "AutoMua",
        label: "Mái che tự động",
        description: "Để hệ thống tự đóng/mở theo mưa.",
        isAuto: true,
      },
    ],
  },
};

export const SENSOR_LIST = Object.values(SENSOR_CONFIG);
