import express from "express";
import cors from "cors";
import mqtt from "mqtt";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// ====== KHỞI TẠO FIREBASE TỪ ENV ======
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.firestore();

// ====== KHỞI TẠO EXPRESS SERVER ======
const app = express();
app.use(cors());
app.use(express.json());

// ====== KẾT NỐI MQTT ======
const options = {
  host: process.env.MQTT_HOST,
  port: Number(process.env.MQTT_PORT),
  protocol: "mqtts",
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("Đã kết nối tới HiveMQ Cloud!");
  client.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (!err) console.log(` Subscribed topic: ${process.env.MQTT_TOPIC}`);
  });
});

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(" Nhận dữ liệu:", payload);

    await db.collection("sensorData").add({
      ...payload,
      topic,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Lưu Firebase thành công!");
  } catch (err) {
    console.error(" Lỗi khi lưu:", err);
  }
});

// ====== API CHO FRONTEND ======
app.get("/data", async (req, res) => {
  try {
    const snapshot = await db
      .collection("sensorData")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== BẢNG MAP CÁC THIẾT BỊ → TOPIC ======
const topicMap = {
  // --- DHT22 ---
  "AC": "HeThongNongTraiThongMinh/DHT22/Control/AC",
  "AutoDht": "HeThongNongTraiThongMinh/DHT22/Control/automodeDht",
  "ThresholdDht": "HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht",

  // --- KHÍ GAS MQ2 ---
  "Buzzer": "HeThongNongTraiThongMinh/KhiGas/Control/BUZZER",
  "AutoMq2": "HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2",
  "ThresholdMq2": "HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2",

  // --- ÁNH SÁNG (LDR) ---
  "Led": "HeThongNongTraiThongMinh/LDR/Control/LED",
  "AutoLdr": "HeThongNongTraiThongMinh/LDR/Control/automodeLdr",
  "ThresholdLdr": "HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr",
  "ScheduleLed": "HeThongNongTraiThongMinh/LDR/Control/ScheduleLed",
  "DeleteScheduleLed": "HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed",

  // --- MỰC NƯỚC (HCSR04) ---
  "PumpTank": "HeThongNongTraiThongMinh/HCSR04/Control/MOTOR",
  "AutoHcsr04": "HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04",
  "ThresholdHcsr04": "HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04",

  // --- ĐỘ ẨM ĐẤT ---
  "WaterPump": "HeThongNongTraiThongMinh/Doamdat/Control/MOTOR",
  "AutoDoamdat": "HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat",
  "ThresholdDoamdat": "HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay",

  // --- MÁI CHE MƯA ---
  "Roof": "HeThongNongTraiThongMinh/Mua/Control/Maiche",
  "AutoMua": "HeThongNongTraiThongMinh/Mua/Control/automodeMua",
};

// ====== API ĐIỀU KHIỂN THIẾT BỊ ======
app.post("/control", (req, res) => {
  const { device, action } = req.body;

  if (!device || !action) {
    return res.status(400).json({ error: "Thiếu tham số device hoặc action" });
  }

  const topic = topicMap[device];
  if (!topic) {
    return res.status(400).json({ error: `Không tìm thấy topic cho thiết bị: ${device}` });
  }

  const message = JSON.stringify({ device, action });

  client.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error(" Lỗi publish:", err);
      return res.status(500).json({ error: "Không gửi được lệnh MQTT" });
    }

    console.log(` Gửi MQTT: ${topic} -> ${message}`);
    res.json({ success: true, topic, sent: message });
  });
});



// ====== KHỞI CHẠY SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server đang chạy tại http://localhost:${PORT}`);
});
