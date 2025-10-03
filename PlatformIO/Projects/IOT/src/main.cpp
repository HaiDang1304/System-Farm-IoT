#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <time.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

/**** MQTT ****/
// HiveMQ
const char* mqtt_server = "b090ce6170974214b61d8a91f41c4da7.s1.eu.hivemq.cloud"; 
const int mqtt_port = 8883;  // TLS
const char* mqtt_user = "Tezzz";
const char* mqtt_pass = "Haidang1304";
const char* MQTT_Topic = "HeThongNongTraiThongMinh";
const char* MQTT_ID = "esp32-farm01";

WiFiClientSecure espClient;
PubSubClient client(espClient);

/**** NTP ****/
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "asia.pool.ntp.org", 7 * 3600, 10000); // GMT+7
bool ntpSynced = false;

LiquidCrystal_I2C lcd(0x27, 20, 4);

/**** Pin mapping CHUẨN HÓA THEO SƠ ĐỒ WOKWI BẠN GỬI ****/
// 1) Cảm biến
#define DHTPIN 23 // DHT22 DATA nối ESP32 GPIO23
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

#define SOIL_PIN 34 // Độ ẩm đất (POT) -> ADC34
#define GAS_PIN 35  // MQ2 AOUT -> ADC35
#define LDR_PIN 32  // LDR AO -> ADC32
#define TRIG_PIN 26 // HC-SR04 TRIG -> GPIO26
#define ECHO_PIN 25 // HC-SR04 ECHO -> GPIO25
#define RAIN_PIN 5  // Nút nhấn (giả lập mưa) -> GPIO5, kéo xuống GND khi nhấn

// 2) Thiết bị chấp hành
#define BUZZER_PIN 19   // Buzzer -> GPIO19
#define LIGHT_PIN 33    // LED qua điện trở -> GPIO33
#define AC_RELAY_PIN 18 // Relay IN -> GPIO18 (máy lạnh)

// 3) Động cơ bước (A4988)
//   - Bơm bể (drv1): STEP=27, ENABLE=14 (DIR mắc cứng ở A4988, không điều khiển trong mô phỏng)
#define PUMP_TANK_STEP 27
#define PUMP_TANK_EN 14

//   - Tưới cây (drv2): STEP=0 (lưu ý pin strap – đừng giữ mức thấp khi reset), ENABLE=17
#define PUMP_IRR_STEP 0
#define PUMP_IRR_EN 17

//   - Mái che (drv3): STEP=2, DIR=4, ENABLE=16
#define ROOF_STEP 2
#define ROOF_DIR 4
#define ROOF_EN 16

/**** Biến cấu hình / trạng thái ****/
bool automodeDht = true;    // điều hoà theo DHT
bool automodeMq2 = true;    // còi theo gas
bool automodeLdr = true;    // đèn theo ánh sáng
bool automodeHcsr04 = true; // bơm bể theo mực nước
bool automodeSoil = true;   // bơm tưới theo ẩm đất
bool automodeRain = true;   // mái che theo mưa

float thTempAC = 25.0;  // °C – ngưỡng bật AC
int thGas = 2500;       // raw 0..4095 – ngưỡng gas
int thLdr = 1200;       // raw 0..4095 (LDR đảo): nhỏ -> tối
int thSoil = 2000;      // raw 0..4095 – đất khô khi < thSoil (tùy cảm biến)
float thWaterCm = 20.0; // cm – dưới mức này coi như đầy, trên thì bật bơm bể

// Stepper (không chặn)
bool pumpTankRunning = false; // bơm bể
unsigned long lastStepTank = 0;
const unsigned long stepItvTank = 800; // us

bool pumpIrrRunning = false; // bơm tưới
unsigned long lastStepIrr = 0;
const unsigned long stepItvIrr = 800; // us

int lastRainState = -1; // để phát hiện cạnh đổi trạng thái mưa

/**** Lịch bật/tắt đèn (đủ dùng cho báo cáo) ****/
struct Schedule
{
  int year, month, day, hour, minute;
  bool state, executed;
};
Schedule schedules[10];
int scheduleCount = 0;
bool checkingSchedules = false;

/**** WiFi ****/
static void WIFIConnect()
{
  Serial.println("Connecting to SSID: Wokwi-GUEST");
  WiFi.begin("Wokwi-GUEST", "");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40)
  {
    delay(250);
    Serial.print('.');
    attempts++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.print("WiFi OK, IP: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("WiFi FAILED!");
  }
}

/**** MQTT ****/
static void MQTT_Reconnect()
{
  while (!client.connected())
  {
    if (client.connect(MQTT_ID, mqtt_user, mqtt_pass))
    {
      Serial.println("MQTT connected");
      // Sub các kênh điều khiển
      client.subscribe("HeThongNongTraiThongMinh/DHT22/Control/AC");
      client.subscribe("HeThongNongTraiThongMinh/DHT22/Control/automodeDht");
      client.subscribe("HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht");

      client.subscribe("HeThongNongTraiThongMinh/KhiGas/Control/BUZZER");
      client.subscribe("HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2");
      client.subscribe("HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2");

      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/LED");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/automodeLdr");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/ScheduleLed");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed");

      client.subscribe("HeThongNongTraiThongMinh/HCSR04/Control/MOTOR");
      client.subscribe("HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04");
      client.subscribe("HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04");

      client.subscribe("HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat");
      client.subscribe("HeThongNongTraiThongMinh/Doamdat/Control/MOTOR");
      client.subscribe("HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay");

      client.subscribe("HeThongNongTraiThongMinh/Mua/Control/automodeMua");
      client.subscribe("HeThongNongTraiThongMinh/Mua/Control/Maiche");
    }
    else
    {
      Serial.print("MQTT fail rc=");
      Serial.println(client.state());
      delay(1500);
    }
  }
}

/**** Stepper helpers ****/
static inline void pumpTankControl(bool on)
{
  if (on && !pumpTankRunning)
  {
    digitalWrite(PUMP_TANK_EN, LOW); // enable A4988
    pumpTankRunning = true;
    Serial.println("[TANK] BẬT bơm bể");
  }
  else if (!on && pumpTankRunning)
  {
    digitalWrite(PUMP_TANK_EN, HIGH); // disable
    pumpTankRunning = false;
    Serial.println("[TANK] TẮT bơm bể");
  }
}

static inline void pumpTankRun()
{
  if (!pumpTankRunning)
    return;
  unsigned long now = micros();
  if (now - lastStepTank >= stepItvTank)
  {
    digitalWrite(PUMP_TANK_STEP, !digitalRead(PUMP_TANK_STEP));
    lastStepTank = now;
  }
}

static inline void pumpIrrControl(bool on)
{
  if (on && !pumpIrrRunning)
  {
    digitalWrite(PUMP_IRR_EN, LOW);
    pumpIrrRunning = true;
    Serial.println("[IRR] BẬT bơm tưới");
  }
  else if (!on && pumpIrrRunning)
  {
    digitalWrite(PUMP_IRR_EN, HIGH);
    pumpIrrRunning = false;
    Serial.println("[IRR] TẮT bơm tưới");
  }
}

static inline void pumpIrrRun()
{
  if (!pumpIrrRunning)
    return;
  unsigned long now = micros();
  if (now - lastStepIrr >= stepItvIrr)
  {
    digitalWrite(PUMP_IRR_STEP, !digitalRead(PUMP_IRR_STEP));
    lastStepIrr = now;
  }
}

static void roofMove(int rainState /*1=mưa,0=không*/)
{
  // bật EN, chọn chiều, quay 200 bước (demo)
  digitalWrite(ROOF_EN, LOW);
  digitalWrite(ROOF_DIR, rainState ? HIGH : LOW); // mưa -> mở mái (HIGH), ngược lại thu mái
  for (int i = 0; i < 200; i++)
  {
    digitalWrite(ROOF_STEP, HIGH);
    delayMicroseconds(800);
    digitalWrite(ROOF_STEP, LOW);
    delayMicroseconds(800);
  }
  digitalWrite(ROOF_EN, HIGH);
  Serial.println(rainState ? "[ROOF] MỞ mái che (mưa)" : "[ROOF] THU mái che (tạnh)");
}

/**** MQTT callback ****/
void callback(char *topic, byte *message, unsigned int length)
{
  if (checkingSchedules)
    return;
  String payload;
  payload.reserve(length + 1);
  for (unsigned i = 0; i < length; i++)
    payload += (char)message[i];
  Serial.printf("MQTT <- %s : %s\n", topic, payload.c_str());

  String t(topic);
  // ----------- LED & lịch -----------
  if (t == "HeThongNongTraiThongMinh/LDR/Control/ScheduleLed")
  {
    if (scheduleCount < 10)
    {
      StaticJsonDocument<256> doc;
      auto err = deserializeJson(doc, payload);
      if (err)
      {
        Serial.println("Parse schedule fail");
        return;
      }
      if (!(doc.containsKey("year") && doc.containsKey("month") && doc.containsKey("day") && doc.containsKey("hour") && doc.containsKey("minute") && doc.containsKey("state")))
      {
        Serial.println("Schedule thiếu field");
        return;
      }
      schedules[scheduleCount] = {doc["year"], doc["month"], doc["day"], doc["hour"], doc["minute"], doc["state"], false};
      Serial.printf("+ Lịch %d/%d %d:%d -> %s\n", (int)doc["day"], (int)doc["month"], (int)doc["hour"], (int)doc["minute"], (bool)doc["state"] ? "ON" : "OFF");
      scheduleCount++;
    }
    return;
  }
  if (t == "HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed")
  {
    // client UI sẽ xoá; ta đã dọn sau khi executed.
    return;
  }

  // ----------- DHT / AC -----------
  if (t == "HeThongNongTraiThongMinh/DHT22/Control/AC")
  {
    if (payload == "AC_ON")
      digitalWrite(AC_RELAY_PIN, HIGH);
    if (payload == "AC_OFF")
      digitalWrite(AC_RELAY_PIN, LOW);
    return;
  }
  if (t == "HeThongNongTraiThongMinh/DHT22/Control/automodeDht")
  {
    automodeDht = (payload == "ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht")
  {
    thTempAC = payload.toFloat();
    return;
  }

  // ----------- Gas / buzzer -----------
  if (t == "HeThongNongTraiThongMinh/KhiGas/Control/BUZZER")
  {
    if (payload == "BUZZER_ON")
      digitalWrite(BUZZER_PIN, HIGH);
    if (payload == "BUZZER_OFF")
      digitalWrite(BUZZER_PIN, LOW);
    return;
  }
  if (t == "HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2")
  {
    automodeMq2 = (payload == "ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2")
  {
    thGas = payload.toInt();
    return;
  }

  // ----------- LDR -----------
  if (t == "HeThongNongTraiThongMinh/LDR/Control/LED")
  {
    automodeLdr = false;
    if (payload == "LIGHT_ON")
      digitalWrite(LIGHT_PIN, HIGH);
    if (payload == "LIGHT_OFF")
      digitalWrite(LIGHT_PIN, LOW);
    return;
  }
  if (t == "HeThongNongTraiThongMinh/LDR/Control/automodeLdr")
  {
    automodeLdr = (payload == "ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr")
  {
    thLdr = payload.toInt();
    return;
  }

  // ----------- HC-SR04 / bơm bể -----------
  if (t == "HeThongNongTraiThongMinh/HCSR04/Control/MOTOR")
  {
    pumpTankControl(payload == "MOTOR_ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04")
  {
    automodeHcsr04 = (payload == "ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04")
  {
    thWaterCm = payload.toFloat();
    return;
  }

  // ----------- Độ ẩm đất / bơm tưới -----------
  if (t == "HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat")
  {
    automodeSoil = (payload == "ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/Doamdat/Control/MOTOR")
  {
    automodeSoil = false;
    pumpIrrControl(payload == "MOTOR_ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay")
  {
    thSoil = payload.toInt();
    return;
  }

  // ----------- Mưa / mái che -----------
  if (t == "HeThongNongTraiThongMinh/Mua/Control/automodeMua")
  {
    automodeRain = (payload == "ON");
    return;
  }
  if (t == "HeThongNongTraiThongMinh/Mua/Control/Maiche")
  {
    automodeRain = false;
    if (payload == "ON")
      roofMove(1);
    if (payload == "OFF")
      roofMove(0);
    return;
  }
}

/**** Lịch đèn ****/
static void checkSchedules()
{
  if (!ntpSynced || scheduleCount == 0)
    return;
  time_t now = timeClient.getEpochTime();
  if (now < 1000000000)
    return;
  timeClient.update();
  struct tm *tmv = localtime(&now);
  int cy = tmv->tm_year + 1900, cm = tmv->tm_mon + 1, cd = tmv->tm_mday, ch = tmv->tm_hour, cmin = tmv->tm_min;
  for (int i = 0; i < scheduleCount; i++)
  {
    if (!schedules[i].executed && schedules[i].year == cy && schedules[i].month == cm && schedules[i].day == cd && schedules[i].hour == ch && schedules[i].minute == cmin)
    {
      digitalWrite(LIGHT_PIN, schedules[i].state ? HIGH : LOW);
      automodeLdr = false;
      schedules[i].executed = true;
      Serial.printf("[SCHEDULE] %04d-%02d-%02d %02d:%02d -> %s\n", cy, cm, cd, ch, cmin, schedules[i].state ? "ON" : "OFF");
    }
  }
}

static void cleanupSchedules()
{
  int i = 0;
  while (i < scheduleCount)
  {
    if (schedules[i].executed)
    {
      char idx[6];
      snprintf(idx, sizeof(idx), "%d", i);
      client.publish("HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed", idx);
      for (int j = i; j < scheduleCount - 1; j++)
        schedules[j] = schedules[j + 1];
      scheduleCount--;
    }
    else
      i++;
  }
}

/**** Setup ****/
void setup()
{
  Serial.begin(115200);

  // I/O
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(LIGHT_PIN, OUTPUT);
  digitalWrite(LIGHT_PIN, LOW);
  pinMode(AC_RELAY_PIN, OUTPUT);
  digitalWrite(AC_RELAY_PIN, LOW);

  pinMode(TRIG_PIN, OUTPUT);
  digitalWrite(TRIG_PIN, LOW);
  pinMode(ECHO_PIN, INPUT);
  pinMode(SOIL_PIN, INPUT);
  pinMode(GAS_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT_PULLUP); // button sang GND -> nhấn = LOW (mưa)

  pinMode(PUMP_TANK_STEP, OUTPUT);
  pinMode(PUMP_TANK_EN, OUTPUT);
  digitalWrite(PUMP_TANK_EN, HIGH);
  pinMode(PUMP_IRR_STEP, OUTPUT);
  pinMode(PUMP_IRR_EN, OUTPUT);
  digitalWrite(PUMP_IRR_EN, HIGH);
  pinMode(ROOF_STEP, OUTPUT);
  pinMode(ROOF_DIR, OUTPUT);
  pinMode(ROOF_EN, OUTPUT);
  digitalWrite(ROOF_EN, HIGH);

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Dang ket noi WiFi...");

  // WiFi + MQTT
  WIFIConnect();
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(2048);
  client.setCallback(callback);

  // NTP (nỗ lực sync ban đầu)
  timeClient.begin();
  for (int i = 0; i < 8; i++)
  {
    timeClient.forceUpdate();
    if (timeClient.getEpochTime() > 1000000000)
    {
      ntpSynced = true;
      break;
    }
    delay(500);
  }

  dht.begin();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(WiFi.status() == WL_CONNECTED ? "WiFi OK" : "WiFi FAIL");
  if (WiFi.status() == WL_CONNECTED)
  {
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
  }
}

/**** Loop ****/
void loop()
{
  if (!client.connected())
    MQTT_Reconnect();
  client.loop();

  // chạy stepper không chặn
  pumpTankRun();
  pumpIrrRun();

  // Thử sync NTP lại nếu chưa xong
  static unsigned long lastNTP = 0;
  if (!ntpSynced && millis() - lastNTP > 30000UL)
  {
    lastNTP = millis();
    timeClient.forceUpdate();
    if (timeClient.getEpochTime() > 1000000000)
      ntpSynced = true;
  }

  // Nhịp đo/điều khiển 2s
  static unsigned long lastTick = 0;
  if (millis() - lastTick < 2000)
    return;
  lastTick = millis();

  // ---- Đọc sensor ----
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  int gasRaw = analogRead(GAS_PIN);
  int ldrRaw = analogRead(LDR_PIN); // 0..4095 (sáng lớn)
  int ldrInv = 4095 - ldrRaw;       // đảo lại: lớn = tối
  int soilRaw = analogRead(SOIL_PIN);

  // HC-SR04 đo khoảng cách (cm)
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000UL); // timeout 30ms ~ 5m
  float distCm = (dur > 0) ? dur * 0.034f / 2.0f : NAN;

  // Rain button: nhấn = mưa (LOW)
  int rainState = (digitalRead(RAIN_PIN) == LOW) ? 1 : 0;

  // ---- Điều khiển tự động ----
  if (!isnan(t) && automodeDht)
  {
    digitalWrite(AC_RELAY_PIN, (t > thTempAC) ? HIGH : LOW);
  }
  if (automodeMq2)
  {
    digitalWrite(BUZZER_PIN, (gasRaw > thGas) ? HIGH : LOW);
  }
  if (automodeLdr)
  {
    digitalWrite(LIGHT_PIN, (ldrInv > thLdr) ? HIGH : LOW);
  }
  if (!isnan(distCm) && automodeHcsr04)
  {
    pumpTankControl(distCm > thWaterCm); // xa mặt nước -> bơm bể ON
  }
  if (automodeSoil)
  {
    pumpIrrControl(soilRaw < thSoil); // đất khô -> bơm tưới ON
  }
  if (automodeRain)
  {
    if (rainState != lastRainState)
    {
      lastRainState = rainState;
      roofMove(rainState);
    }
  }

  // ---- Hiển thị LCD (gọn) ----
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  if (!isnan(t))
    lcd.print(t, 1);
  lcd.print(" H:");
  if (!isnan(h))
    lcd.print(h, 0);
  lcd.setCursor(0, 1);
  lcd.print("LDR:");
  lcd.print(ldrInv);
  lcd.print(" Soil:");
  lcd.print(soilRaw);
  lcd.setCursor(0, 2);
  lcd.print("Gas:");
  lcd.print(gasRaw);
  lcd.print(" W:");
  if (!isnan(distCm))
    lcd.print(distCm, 0);
  lcd.setCursor(0, 3);
  lcd.print("Rain:");
  lcd.print(rainState ? "YES" : "NO ");
  lcd.print(" LED:");
  lcd.print(digitalRead(LIGHT_PIN));

  // ---- Lịch đèn ----
  checkingSchedules = true;
  checkSchedules();
  cleanupSchedules();
  checkingSchedules = false;

  // ---- Publish MQTT ----
  StaticJsonDocument<1024> doc;
  doc["nhietdo"] = t;
  doc["doam"] = h;
  doc["khigas"] = gasRaw;
  doc["anhsang"] = ldrInv;
  doc["doamdat"] = soilRaw;
  doc["khoangcach"] = distCm;
  doc["mua"] = rainState;
  doc["led"] = (int)digitalRead(LIGHT_PIN);
  doc["auto"]["dht"] = automodeDht;
  doc["th"]["t_ac"] = thTempAC;
  doc["auto"]["mq2"] = automodeMq2;
  doc["th"]["gas"] = thGas;
  doc["auto"]["ldr"] = automodeLdr;
  doc["th"]["ldr"] = thLdr;
  doc["auto"]["hcsr04"] = automodeHcsr04;
  doc["th"]["water_cm"] = thWaterCm;
  doc["auto"]["soil"] = automodeSoil;
  doc["th"]["soil"] = thSoil;
  doc["auto"]["rain"] = automodeRain;
  char out[1024];
  serializeJson(doc, out);
  
  if (client.publish(MQTT_Topic, out)) {
    Serial.println("[PUBLISH] Gửi thành công!");
  } else {
    Serial.print("[PUBLISH] Thất bại! State: ");
    Serial.println(client.state());
  }
}