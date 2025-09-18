#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ==== Pin mapping ====
#define PIN_DHT      15
#define DHTTYPE      DHT22

#define PIN_SOIL_A   34   // Độ ẩm đất (ADC)
#define PIN_PH_A     35   // pH (ADC)
#define PIN_LDR_A    33   // Ánh sáng Analog
#define PIN_RAIN_D   4    // Rain digital D0 (tùy bạn có dùng hay không)
#define PIN_RAIN_A   32   // Rain analog A0  (tùy)

#define PIN_TRIG     12   // HC-SR04
#define PIN_ECHO     14

#define I2C_SDA      21
#define I2C_SCL      22

// ==== LCD 20x4 I2C ====
LiquidCrystal_I2C lcd(LCD_ADDR, 20, 4);

// ==== DHT ====
DHT dht(PIN_DHT, DHTTYPE);

// ==== WiFi / MQTT (đổi thông tin của bạn) ====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* MQTT_HOST = "broker.emqx.io";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp32-farm-01";
const char* TOPIC_PUB = "farm/zone1/sensors";

WiFiClient espClient;
PubSubClient mqtt(espClient);

// ==== Thông số bể nước để quy đổi % ====
const float TANK_HEIGHT_CM = 30.0f;  // chiều cao bể (ví dụ 30cm)

// ==== Hàm tiện ích ====
int adcToPercent(int adc, int adcWet, int adcDry) {
  // adcWet: giá trị ADC khi ướt; adcDry: khi khô (cần hiệu chuẩn thực tế)
  adc = constrain(adc, min(adcWet, adcDry), max(adcWet, adcDry));
  float pct = 100.0f * (1.0f - (float)(adc - adcWet) / (float)(adcDry - adcWet));
  return (int)round(constrain(pct, 0.0f, 100.0f));
}

// pH: công thức xấp xỉ, nhớ hiệu chuẩn 2 điểm ngoài đời (pH4 & pH7)
float voltageToPH(float v) { return 7.0f + (2.5f - v) / 0.18f; }

// Đo khoảng cách bằng HC-SR04 (cm)
float readUltrasonicCM(uint8_t trig, uint8_t echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000); // timeout 30ms ~ 5m
  if (duration == 0) return NAN;
  return duration * 0.034f / 2.0f;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(300);
  }
}

void ensureMqtt() {
  if (mqtt.connected()) return;
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  uint32_t t0 = millis();
  while (!mqtt.connected() && millis() - t0 < 10000) {
    mqtt.connect(MQTT_CLIENT_ID);
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);

  // I2C & LCD
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(2,0); lcd.print("Farm IoT Booting");

  // Pins
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_RAIN_D, INPUT);

  dht.begin();

  // WiFi + MQTT (không bắt buộc để mô phỏng đọc sensor)
  ensureWifi();
  ensureMqtt();

  lcd.setCursor(0,1);
  lcd.print("WiFi: ");
  lcd.print(WiFi.status() == WL_CONNECTED ? "OK " : "FAIL");
  lcd.setCursor(0,2);
  lcd.print("MQTT: ");
  lcd.print(mqtt.connected() ? "OK " : "FAIL");
  delay(1000);
}

void loop() {
  // ==== Đọc DHT ====
  float t = dht.readTemperature(); // C
  float h = dht.readHumidity();    // %

  // ==== Soil moisture (ADC) ====
  int soilAdc = analogRead(PIN_SOIL_A);
  int soilPct = adcToPercent(soilAdc, /*adcWet=*/1100, /*adcDry=*/3200);

  // ==== pH (ADC) ====
  int phAdc = analogRead(PIN_PH_A);
  float phV  = phAdc * (3.3f / 4095.0f);
  float ph   = voltageToPH(phV);

  // ==== LDR (ADC) ====
  int ldrAdc = analogRead(PIN_LDR_A);

  // ==== Rain ====
  bool rainDigital = digitalRead(PIN_RAIN_D) == LOW; // nhiều module: LOW = có mưa
  int  rainAdc     = analogRead(PIN_RAIN_A);

  // ==== HC-SR04 mực nước ====
  float dist = readUltrasonicCM(PIN_TRIG, PIN_ECHO); // khoảng cách tới mặt nước
  float waterLevel = NAN, waterPct = NAN;
  if (!isnan(dist)) {
    waterLevel = max(0.0f, TANK_HEIGHT_CM - dist);
    waterPct   = constrain((waterLevel / TANK_HEIGHT_CM) * 100.0f, 0.0f, 100.0f);
  }

  // ==== Hiển thị LCD 20x4 ====
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("T:");  isnan(t) ? lcd.print("--") : lcd.print(t,1);
  lcd.print("C H:"); isnan(h) ? lcd.print("--") : lcd.print(h,0); lcd.print("%");

  lcd.setCursor(0,1);
  lcd.print("Soil:"); lcd.print(soilPct); lcd.print("%  pH:");
  isnan(ph) ? lcd.print("--") : lcd.print(ph,1);

  lcd.setCursor(0,2);
  lcd.print("LDR:"); lcd.print(ldrAdc);
  lcd.print(" Rain:"); lcd.print(rainDigital ? "YES" : "NO");

  lcd.setCursor(0,3);
  lcd.print("Water:");
  if (isnan(waterLevel)) { lcd.print("--"); }
  else { lcd.print(waterLevel,0); lcd.print("cm "); }
  lcd.print("(");
  if (isnan(waterPct)) lcd.print("--");
  else lcd.print((int)round(waterPct));
  lcd.print("%)");

  // ==== Đóng gói JSON ====
  StaticJsonDocument<512> doc;
  doc["ts"] = millis();
  if (!isnan(t)) doc["temp"] = t;
  if (!isnan(h)) doc["hum"]  = h;
  doc["soil"]["adc"] = soilAdc;
  doc["soil"]["pct"] = soilPct;
  doc["ph"]["adc"]   = phAdc;
  doc["ph"]["value"] = ph;
  doc["light"]["adc"]= ldrAdc;
  doc["rain"]["d0"]  = rainDigital;
  doc["rain"]["adc"] = rainAdc;
  if (!isnan(dist))       doc["water"]["dist_cm"] = dist;
  if (!isnan(waterLevel)) doc["water"]["level_cm"]= waterLevel;
  if (!isnan(waterPct))   doc["water"]["pct"]     = (int)round(waterPct);

  // In Serial
  serializeJson(doc, Serial);
  Serial.println();

  // ==== MQTT publish (nếu có WiFi/MQTT) ====
  ensureWifi();
  ensureMqtt();
  if (WiFi.status() == WL_CONNECTED && mqtt.connected()) {
    char payload[512];
    size_t n = serializeJson(doc, payload, sizeof(payload));
    mqtt.publish(TOPIC_PUB, payload, n);
    mqtt.loop();
  }

  delay(1500);
}
