import express from "express";
import cors from "cors";
import mqtt from "mqtt";
import admin from "firebase-admin";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fetch from "node-fetch";

dotenv.config();

// ====== KHỞI TẠO FIREBASE ======
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}
const db = admin.firestore();

// ====== KHỞI TẠO EXPRESS SERVER ======
const app = express();
app.use(cors());
app.use(express.json());

// ====== MQTT CONNECT ======
const options = {
  host: process.env.MQTT_HOST,
  port: Number(process.env.MQTT_PORT),
  protocol: "mqtts",
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

const client = mqtt.connect(options);

client.on("connect", () => {
  console.log(" Đã kết nối tới HiveMQ Cloud!");
  client.subscribe(process.env.MQTT_TOPIC, (err) => {
    if (!err) console.log(` Subscribed: ${process.env.MQTT_TOPIC}`);
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
    console.error("Lỗi khi lưu:", err);
  }
});

// ====== API LẤY DỮ LIỆU MỚI ======
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
  AC: "HeThongNongTraiThongMinh/DHT22/Control/AC",
  AutoDht: "HeThongNongTraiThongMinh/DHT22/Control/automodeDht",
  ThresholdDht: "HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht",

  // --- KHÍ GAS MQ2 ---
  Buzzer: "HeThongNongTraiThongMinh/KhiGas/Control/BUZZER",
  AutoMq2: "HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2",
  ThresholdMq2: "HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2",

  // --- ÁNH SÁNG (LDR) ---
  Led: "HeThongNongTraiThongMinh/LDR/Control/LED",
  AutoLdr: "HeThongNongTraiThongMinh/LDR/Control/automodeLdr",
  ThresholdLdr: "HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr",
  ScheduleLed: "HeThongNongTraiThongMinh/LDR/Control/ScheduleLed",
  DeleteScheduleLed: "HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed",

  // --- MỰC NƯỚC (HCSR04) ---
  PumpTank: "HeThongNongTraiThongMinh/HCSR04/Control/MOTOR",
  AutoHcsr04: "HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04",
  ThresholdHcsr04: "HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04",

  // --- ĐỘ ẨM ĐẤT ---
  WaterPump: "HeThongNongTraiThongMinh/Doamdat/Control/MOTOR",
  AutoDoamdat: "HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat",
  ThresholdDoamdat:
    "HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay",

  // --- MÁI CHE MƯA ---
  Roof: "HeThongNongTraiThongMinh/Mua/Control/Maiche",
  AutoMua: "HeThongNongTraiThongMinh/Mua/Control/automodeMua",
};

// ====== API ĐIỀU KHIỂN THIẾT BỊ ======
app.post("/control", (req, res) => {
  const { device, action } = req.body;

  if (!device || !action) {
    return res.status(400).json({ error: "Thiếu tham số device hoặc action" });
  }

  const topic = topicMap[device];
  if (!topic) {
    return res
      .status(400)
      .json({ error: `Không tìm thấy topic cho thiết bị: ${device}` });
  }

  const thresholdDevices = new Set([
    "ThresholdDht",
    "ThresholdMq2",
    "ThresholdLdr",
    "ThresholdHcsr04",
    "ThresholdDoamdat",
  ]);

  const message = thresholdDevices.has(device)
    ? String(action)
    : JSON.stringify({ device, action });

  client.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error(" Lỗi publish:", err);
      return res.status(500).json({ error: "Không gửi được lệnh MQTT" });
    }

    console.log(` Gửi MQTT: ${topic} -> ${message}`);
    res.json({ success: true, topic, sent: message });
  });
});

app.post("/updateSettings", async (req, res) => {
  try {
    const { userId, settings } = req.body;
    console.log("🔧 Cập nhật settings cho:", userId, settings);

    if (!userId || !settings)
      return res.status(400).json({ error: "Thiếu userId hoặc settings" });

    await db.collection("users").doc(userId).set(settings, { merge: true });

    res.json({ success: true, message: "Đã cập nhật thành công!" });
  } catch (err) {
    console.error("Lỗi khi cập nhật settings:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/getSettings", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Thiếu userId" });
    const userDoc = await db.collection("users").doc(userId).get();
    res.json(userDoc.exists ? userDoc.data() : { notifications: {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== NODEMAILER CONFIG ======
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ====== GỬI MAIL ======
const sendAlertMail = async (subject, alerts, recipients) => {
  if (!recipients || recipients.length === 0) return;

  // Nếu alerts là chuỗi thì biến thành mảng
  if (typeof alerts === "string") alerts = [alerts];

  // Hàm phụ chọn màu icon dựa theo loại cảnh báo
  const getColor = (msg) => {
    if (msg.includes("Nhiệt độ")) return "#ef4444"; // đỏ
    if (msg.includes("Khí gas")) return "#f59e0b"; // vàng
    if (msg.includes("Ánh sáng")) return "#facc15"; // vàng sáng
    if (msg.includes("Mực nước")) return "#3b82f6"; // xanh dương
    if (msg.includes("Độ ẩm đất")) return "#10b981"; // xanh lá
    if (msg.includes("mưa")) return "#6366f1"; // tím
    return "#6b7280"; // xám mặc định
  };

  // Tạo HTML nội dung email
  const htmlContent = `
  <div style="font-family: 'Poppins', sans-serif; background-color: #f9fafb; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
      <div style="background: linear-gradient(to right, #3b82f6, #6366f1); padding: 20px; color: white; text-align: center;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0;"> Cảnh Báo Cảm Biến Nông Trại</h1>
        <p style="font-size: 14px; opacity: 0.9;">Hệ thống vừa phát hiện các giá trị vượt ngưỡng an toàn</p>
      </div>
      <div style="padding: 20px;">
        ${alerts
          .map(
            (msg) => `
          <div style="display: flex; align-items: center; background-color: ${getColor(
            msg
          )}10; border-left: 6px solid ${getColor(
              msg
            )}; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${getColor(
              msg
            )}; margin-right: 10px;"></div>
            <p style="margin: 0; font-size: 15px; color: #111827;">${msg}</p>
          </div>
        `
          )
          .join("")}
        <div style="margin-top: 24px; text-align: center; font-size: 13px; color: #6b7280;">
          <p> Kiểm tra lại thiết bị để đảm bảo an toàn và hoạt động ổn định.</p>
          <p>Trân trọng,<br><b>Hệ thống Nông Trại Thông Minh</b></p>
        </div>
      </div>
      <div style="background: #f3f4f6; text-align: center; padding: 12px; font-size: 12px; color: #9ca3af;">
        &copy; ${new Date().getFullYear()} SmartFarm IoT. All rights reserved.
      </div>
    </div>
  </div>`;

  const mailOptions = {
    from: `"Hệ thống Nông Trại Thông Minh " <${process.env.MAIL_USER}>`,
    to: recipients.join(","),
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` Gửi cảnh báo đến ${recipients.length} tài khoản`);
  } catch (err) {
    console.error(" Lỗi gửi mail:", err);
  }
};

// ====== KIỂM TRA NGƯỠNG VÀ GỬI MAIL ======
const checkThresholdAndNotify = async () => {
  try {
    const res = await fetch("http://localhost:3000/data");
    const dataArr = await res.json();
    const data = dataArr[0];
    if (!data) return console.log("Không có dữ liệu để kiểm tra.");

    const alerts = [];

    if (data.nhietdo > data.nguongbatdieuhoa)
      alerts.push(
        `Nhiệt độ cao: ${data.nhietdo}°C > ${data.nguongbatdieuhoa}°C`
      );
    if (data.khigas > data.nguongbatcoi)
      alerts.push(`Khí gas vượt ngưỡng: ${data.khigas} > ${data.nguongbatcoi}`);
    if (data.anhsang < data.nguongLdr)
      alerts.push(`Ánh sáng yếu: ${data.anhsang} < ${data.nguongLdr}`);
    if (data.khoangcach > data.nguongbatmaybomho)
      alerts.push(
        `Mực nước thấp: ${data.khoangcach} > ${data.nguongbatmaybomho}`
      );
    if (data.doamdat < data.nguongbatmaybomtuoicay)
      alerts.push(
        ` Độ ẩm đất thấp: ${data.doamdat} < ${data.nguongbatmaybomtuoicay}`
      );
    if (data.mua === 1) alerts.push(` Phát hiện mưa!`);

    if (alerts.length === 0) return;

    // Lấy danh sách user trong Firestore
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => doc.data());

    // Lọc theo cài đặt thông báo
    const recipients = users
      .filter((u) => {
        if (!u.email) return false;
        const n = u.notifications || {};
        return (
          (alerts.some((a) => a.includes("Nhiệt độ")) && n.dht22) ||
          (alerts.some((a) => a.includes("Khí gas")) && n.gas) ||
          (alerts.some((a) => a.includes("Ánh sáng")) && n.light) ||
          (alerts.some((a) => a.includes("Mực nước")) && n.waterLevel) ||
          (alerts.some((a) => a.includes("Độ ẩm đất")) && n.soilMoisture) ||
          (alerts.some((a) => a.includes("mưa")) && n.rain)
        );
      })
      .map((u) => u.email);

    await sendAlertMail(
      " Cảnh báo cảm biến nông trại",
      alerts, // truyền mảng trực tiếp
      recipients
    );
  } catch (err) {
    console.error(" Lỗi khi kiểm tra cảm biến:", err);
  }
};

// ====== CHẠY KIỂM TRA ĐỊNH KỲ ======
setInterval(checkThresholdAndNotify, 30 * 1000); // 30s 1 lần

// ====== KHỞI CHẠY SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server đang chạy tại http://localhost:${PORT}`);
});
