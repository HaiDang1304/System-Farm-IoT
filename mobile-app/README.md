# IoT Farm Mobile App

Ứng dụng di động React Native (Expo) để giám sát và điều khiển hệ thống IoT nông trại. Ứng dụng kết nối trực tiếp với backend Node.js (API `/data`, `/control`) và Firebase Authentication giống phiên bản web hiện có.

## Tính năng chính

- Đăng nhập/đăng ký bằng email & mật khẩu (yêu cầu xác minh email).
- Đăng nhập nhanh bằng Google, đồng bộ hồ sơ vào Firestore.
- Bảng điều khiển tổng quan: hiển thị số liệu mới nhất và biểu đồ xu hướng cảm biến.
- Danh sách cảm biến với thông tin chi tiết và điều khiển thiết bị (máy lạnh, bơm tưới, đèn, còi, mái che…).
- Thiết lập ngưỡng điều khiển gửi trực tiếp tới backend để Publish MQTT.

## Khởi chạy

```bash
cd mobile-app
npm install        # chạy lại nếu có cập nhật phụ thuộc
npm start          # mở menu Expo
```

Sau đó chọn một trong các tùy chọn:

- `w` chạy trên trình duyệt (chỉ kiểm tra giao diện).
- `a` / `i` chạy trên Android Emulator hoặc iOS Simulator.
- Quét QR bằng ứng dụng **Expo Go** trên thiết bị thật.

## Cấu hình bắt buộc

### 1. API backend

Ứng dụng đọc cấu hình từ `app.json > expo.extra.apiBaseUrl` hoặc biến môi trường `EXPO_PUBLIC_API_BASE_URL`.

- Nếu chạy trên thiết bị/emulator, **không dùng `localhost`**. Thay bằng IP LAN của máy đang chạy backend, ví dụ:

```jsonc
"extra": {
  "apiBaseUrl": "http://192.168.1.50:3000",
  "refreshInterval": 5000
}
```

- Sau khi sửa, chạy lại `npm start --clear`.

### 2. Firebase

Thông tin Firebase dùng chung với ứng dụng web (`src/services/firebase.js`). Nếu bạn đổi project, cập nhật các khóa trong file này.

### 3. Google Sign-In (tùy chọn)

1. Kích hoạt Google Sign-In trong Firebase Console, tạo OAuth Client ID cho Web, Android, iOS (và Expo nếu cần).
2. Cập nhật `app.json`:

```jsonc
"extra": {
  "googleAuth": {
    "expoClientId": "GOOGLE_EXPO_CLIENT_ID.apps.googleusercontent.com",
    "androidClientId": "GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    "iosClientId": "GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com",
    "webClientId": "GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

3. Khởi động lại Metro bundler (`npm start --clear`) để Expo nhận giá trị mới.

## Cách hoạt động

1. Sau khi đăng nhập, ứng dụng gọi `GET /data` (mặc định mỗi 5 giây) để cập nhật số liệu cảm biến.
2. Khi gửi lệnh điều khiển hoặc cập nhật ngưỡng, ứng dụng `POST /control` với payload dạng:

```json
{
  "device": "WaterPump",
  "action": "ON"
}
```

Backend sẽ publish lên MQTT topic tương ứng.

## Ghi chú vận hành

- Ứng dụng chưa đồng bộ trạng thái thiết bị theo thời gian thực; trạng thái bật/tắt được cập nhật cục bộ sau khi gửi lệnh.
- Biểu đồ xu hướng hiển thị dựa trên số bản ghi `/data` trả về (mặc định 10 bản ghi mới nhất).
- Khi thêm cảm biến/thiết bị mới, cập nhật `src/services/sensorConfig.js` để bổ sung UI và điều khiển.

## Mở rộng tiếp theo

- Đồng bộ trạng thái thiết bị từ Firestore/MQTT để phản ánh chính xác khi có thay đổi từ bên ngoài.
- Thêm thông báo đẩy khi cảm biến vượt ngưỡng (Firebase Cloud Messaging).
- Bổ sung scheduler điều khiển đèn (dựa trên topic `ScheduleLed`, `DeleteScheduleLed`).
