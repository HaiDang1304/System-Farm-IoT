import express from "express";
import cors from "cors";
import mqtt from "mqtt";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { createRequire } from "module"; // 👈 thêm dòng này

// Tạo hàm require dùng trong môi trường ES Module
const require = createRequire(import.meta.url);
const serviceAccount = require("./firebase-key.json"); // 👈 dùng được rồi

dotenv.config();

// ====== KHỞI TẠO FIREBASE ======
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.firestore();

// ====== KHỞI TẠO EXPRESS SERVER ======
const app = express();
app.use(cors());
app.use(express.json());

// ====== KẾT NỐI MQTT (HiveMQ Cloud) ======
const options = {
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  protocol: "mqtts",
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("✅ Đã kết nối tới HiveMQ Cloud!");
  client.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (!err) console.log(`📡 Subscribed topic: ${process.env.MQTT_TOPIC}`);
  });
});

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log("📥 Nhận dữ liệu:", payload);

    // Lưu vào Firestore
    await db.collection("sensorData").add({
      ...payload,
      topic,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Lưu Firebase thành công!");
  } catch (err) {
    console.error("❌ Lỗi khi lưu:", err);
  }
});

// ====== API CHO FRONTEND ======
app.get("/data", async (req, res) => {
  try {
    const snapshot = await db.collection("sensorData").orderBy("timestamp", "desc").limit(10).get();
    const data = snapshot.docs.map(doc => doc.data());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== KHỞI CHẠY SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
