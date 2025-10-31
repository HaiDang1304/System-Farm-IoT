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
const char *mqtt_server = "b090ce6170974214b61d8a91f41c4da7.s1.eu.hivemq.cloud";
const int mqtt_port = 8883; // TLS
const char *mqtt_user = "Tezzz";
const char *mqtt_pass = "Haidang1304";
const char *MQTT_Topic = "HeThongNongTraiThongMinh";
const char *MQTT_ID = "esp32-farm01";

WiFiClientSecure espClient;
PubSubClient client(espClient);

/**** NTP ****/
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "asia.pool.ntp.org", 7 * 3600, 10000); // GMT+7
bool ntpSynced = false;

/**** LCD ****/
LiquidCrystal_I2C lcd(0x27, 20, 4);

/**** Pin mapping ****/
// 1) Cảm biến
#define DHTPIN 23
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

#define doamdat 34
#define khigas 35
#define anhsang 32
#define trigPin 26
#define echoPin 25
#define mua 5 // Button -> GND (LOW = mưa)

// 2) Thiết bị chấp hành
#define coi 19
#define led 33
#define dieuhoa 18

// 3) Stepper (A4988)
#define stepPinBe 27
#define enPinBe 14

#define stepPinTuoi 0
#define enPinTuoi 17

#define stepPinMaiChe 2
#define dirPinMaiChe 4
#define enPinMaiChe 16

/**** Cấu hình / trạng thái ****/
bool automodeDht = true;     // điều hoà theo nhiệt độ
bool automodeMq2 = true;     // còi theo gas
bool automodeLdr = true;     // đèn theo ánh sáng
bool automodeHcsr04 = true;  // bơm bể theo mực nước
bool automodeDoamdat = true; // bơm tưới theo ẩm đất
bool automodeMua = true;     // mái che theo mưa
bool manualAC = false;       // false = tự động, true = thủ công
bool acState = false;        // lưu trạng thái hiện tại

bool manualLed = false;     // true khi LED đang được điều khiển thủ công
bool manualMotorBe = false; // true = đang điều khiển thủ công

float nguongDht = 25.0;    // °C
int nguongMq2 = 2500;      // raw 0..4095
int nguongLdr = 1200;      // dùng LDR đảo
int nguongDoamdat = 2048;  // đất khô khi < nguongDoamdat
float nguongHcsr04 = 20.0; // cm

// Stepper non-blocking
bool motorBeRunning = false;
unsigned long lastStepTimeBe = 0;
const unsigned long stepIntervaBe = 800; // us

bool motorTuoiRunning = false;
unsigned long lastStepTimeTuoi = 0;
const unsigned long stepIntervalTuoi = 800; // us

int trangthai_muatruocdo = -1;
bool rainSensorState = false;
int lastRainButtonReading = HIGH;
bool rainButtonLatched = false;
unsigned long lastRainButtonChange = 0;
const unsigned long RAIN_DEBOUNCE_DELAY = 50;

/**** Lịch bật/tắt đèn ****/
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
  Serial.println("Kết nối SSID: Wokwi-GUEST");
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
      Serial.println("Kết nối MQTT");

      // Sub kênh điều khiển
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
void controlStepperMotorBe(bool on)
{
  if (on && !motorBeRunning)
  {
    digitalWrite(enPinBe, LOW);
    motorBeRunning = true;
    Serial.println("[TANK] BẬT BƠM BỂ");
  }
  else if (!on && motorBeRunning)
  {
    digitalWrite(enPinBe, HIGH);
    motorBeRunning = false;
    Serial.println("[TANK] TẮT BƠM BỂ");
  }
}

void runStepperMotorBe()
{
  if (motorBeRunning)
  {
    unsigned long currentTime = micros();
    if (currentTime - lastStepTimeBe >= stepIntervaBe)
    {
      digitalWrite(stepPinBe, !digitalRead(stepPinBe));
      lastStepTimeBe = currentTime;
    }
  }
}

void controlStepperMotorTuoi(bool on)
{
  if (on && !motorTuoiRunning)
  {
    digitalWrite(enPinTuoi, LOW);
    motorTuoiRunning = true;
    Serial.println("[IRR] BẬT BƠM TƯỚI");
  }
  else if (!on && motorTuoiRunning)
  {
    digitalWrite(enPinTuoi, HIGH);
    motorTuoiRunning = false;
    Serial.println("[IRR] TẮT BƠM TƯỚI");
  }
}

void runStepperMotorTuoi()
{
  if (motorTuoiRunning)
  {
    unsigned long now = micros();
    if (now - lastStepTimeTuoi >= stepIntervalTuoi)
    {
      digitalWrite(stepPinTuoi, !digitalRead(stepPinTuoi));
      lastStepTimeTuoi = now;
    }
  }
}

void dieuKhienMaiChe(int trangthai_mua)
{
  digitalWrite(enPinMaiChe, LOW);
  if (trangthai_mua == 1)
  {
    Serial.println("KHÔNG MƯA - MỞ MÁI CHE");
    digitalWrite(dirPinMaiChe, HIGH); // Chiều thuận (mở mái che)
  }
  else
  {
    Serial.println("TRỜI MƯA - THU MÁI CHE");
    digitalWrite(dirPinMaiChe, LOW); // Chiều ngược (thu mái che)
  }

  for (int i = 0; i < 200; i++)
  {
    digitalWrite(stepPinMaiChe, HIGH);
    delayMicroseconds(800);
    digitalWrite(stepPinMaiChe, LOW);
    delayMicroseconds(800);
  }

  digitalWrite(enPinMaiChe, HIGH);
}

/**** MQTT callback ****/
void callback(char *topic, byte *message, unsigned int length)
{
  if (checkingSchedules)
  {
    Serial.println("BỎ QUA LỆNH MQTT KHI ĐANG KIỂM TRA LỊCH");
    return;
  }

  Serial.print("TIN NHẮN CHỦ ĐỀ CẬP NHẬT: ");
  Serial.println(topic);
  String stMessage;
  for (unsigned i = 0; i < length; i++)
  {
    stMessage += (char)message[i];
  }
  Serial.println("Noi dung: " + stMessage);

  // ----------- BẬT / TẮT LED NGAY LẬP TỨC -----------
  if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/LED")
  {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, stMessage);
    if (error)
    {
      Serial.println("Lỗi parse JSON LED: " + String(error.c_str()));
      return;
    }

    String device = doc["device"];
    String action = doc["action"];

    if (device.equalsIgnoreCase("LED"))
    {
      manualLed = true; // bật chế độ thủ công

      if (action.equalsIgnoreCase("ON"))
      {
        digitalWrite(led, HIGH);
        Serial.println(" ĐÈN ĐÃ BẬT (THỦ CÔNG)");
      }
      else if (action.equalsIgnoreCase("OFF"))
      {
        digitalWrite(led, LOW);
        Serial.println(" ĐÈN ĐÃ TẮT (THỦ CÔNG)");
      }
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr")
  {
    Serial.println(" NHẬN LỆNH NGƯỠNG ÁNH SÁNG " + stMessage);

    int newThreshold;
    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, stMessage);

    if (!error && doc.containsKey("action"))
    {
      newThreshold = doc["action"].as<int>();
    }
    else
    {

      newThreshold = stMessage.toInt();
    }

    if (newThreshold >= 0 && newThreshold <= 4095)
    {
      nguongLdr = newThreshold;
      Serial.println(" NGƯỠNG ÁNH SÁNG CẬP NHẬT " + String(nguongLdr));
    }
    else
    {
      Serial.println(" NGƯỠNG KHÔNG HỢP LỆ " + String(newThreshold) + " (PHẢI TỪ 0-4095)");
    }
  }

  // ----------- DHT / AC -----------
  if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/AC")
  {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, stMessage);
    if (!err)
    {
      String action = doc["action"];
      manualAC = true; // bật chế độ thủ công
      if (action == "ON")
      {
        digitalWrite(dieuhoa, HIGH);
        acState = true;
      }
      else if (action == "OFF")
      {
        digitalWrite(dieuhoa, LOW);
        acState = false;
      }
      Serial.println("CÀI ĐẶT AC THỦ CÔNG: " + String(acState ? "BẬT" : "TẮT"));
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/ACMode")
  {
    manualAC = (stMessage == "MANUAL");
    Serial.println("CHẾ ĐỘ AC: " + String(manualAC ? "THỦ CÔNG" : "TỰ ĐỘNG"));
  }

  if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= -10 && newThreshold <= 50)
    {
      nguongDht = newThreshold;
      Serial.println("NGƯỠNG NHIỆT ĐỘ, ĐỘ ẨM CẬP NHẬT:  " + String(nguongDht));
    }
  }

  // ----------- Gas / buzzer -----------
  if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/BUZZER")
  {
    Serial.println(" NHẬN LỆNH CÒI: " + stMessage);

    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, stMessage);

    if (error)
    {
      Serial.println("Loi parse JSON BUZZER: " + String(error.c_str()));
      return;
    }

    String action = doc["action"] | "";

    if (action.equalsIgnoreCase("ON"))
    {
      tone(coi, 1000);
      Serial.println(" CÒI ĐÃ BẬT");
    }
    else if (action.equalsIgnoreCase("OFF"))
    {
      noTone(coi);
      digitalWrite(coi, LOW);
      Serial.println(" CÒI ĐÃ TẮT");
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2")
  {
    Serial.println(" NHẬN LỆNH TỰ ĐỘNG KHÍ GAS " + stMessage);

    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, stMessage);

    if (!error)
    {
      String action = doc["action"] | "";
      automodeMq2 = action.equalsIgnoreCase("ON");
      Serial.println(" CHẾ ĐỘ TỰ ĐỘNG KHÍ GAS: " + String(automodeMq2 ? "BẬT" : "TẮT"));
    }
    else
    {
      // Fallback: nếu là string đơn giản "ON"/"OFF"
      automodeMq2 = (stMessage == "ON");
      Serial.println(" CHẾ ĐỘ TỰ ĐỘNG KHÍ GAS: " + String(automodeMq2 ? "BẬT" : "TẮT"));
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2")
  {
    Serial.println(" NHẬN LỆNH NGƯỠNG KHÍ GAS " + stMessage);

    StaticJsonDocument<128> doc;
    DeserializationError error = deserializeJson(doc, stMessage);

    int newThreshold;
    if (!error && doc.containsKey("action"))
    {
      newThreshold = doc["action"].as<int>();
    }
    else
    {
      newThreshold = stMessage.toInt();
    }

    if (newThreshold >= 0 && newThreshold <= 4095)
    {
      nguongMq2 = newThreshold;
      Serial.println(" NGƯỠNG KHÍ GAS MỚI " + String(nguongMq2));

      StaticJsonDocument<2048> publicDoc;
      publicDoc["khigas"] = analogRead(khigas);
      publicDoc["nguongbatcoi"] = nguongMq2;
      publicDoc["automodeMq2"] = automodeMq2;
    }
    else
    {
      Serial.println(" NGƯỠNG KHÔNG HỢP LỆ " + String(newThreshold));
    }
  }

  // ----------- HC-SR04 / bơm bể -----------
  if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/MOTOR")
  {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, stMessage);
    if (err)
    {
      Serial.println("Loi parse JSON MOTOR: " + String(err.c_str()));
      return;
    }

    String device = doc["device"] | "";
    String action = doc["action"] | "";

    if (device.equalsIgnoreCase("PumpTank"))
    {
      manualMotorBe = true; // bật chế độ thủ công
      if (action.equalsIgnoreCase("ON"))
      {
        controlStepperMotorBe(true);
        Serial.println("MÁY BƠM BỂ BẬT(THỦ CÔNG)");
      }
      else if (action.equalsIgnoreCase("OFF"))
      {
        controlStepperMotorBe(false);
        Serial.println("MÁY BƠM BỂ TẮT(THỦ CÔNG)");
      }
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04")
  {
    automodeHcsr04 = (stMessage == "ON");
    Serial.println("CHỨC NĂNG TỰ ĐỘNG MỰC NƯỚC: " + String(automodeHcsr04 ? "BẬT" : "TẮT"));
    if (automodeHcsr04)
      manualMotorBe = false; // auto mode → reset manual
  }

  if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04")
  {
    nguongHcsr04 = stMessage.toFloat();
    Serial.println("NGƯỠNG MÁY BƠM BỂ MỚI: " + String(nguongHcsr04));
  }

  // ----------- Độ ẩm đất / bơm tưới -----------
  if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat")
  {
    automodeDoamdat = (stMessage == "ON");
    Serial.println("CHỨC NĂNG TỰ ĐỘNG ĐỘ ẨM ĐẤT: " + String(automodeDoamdat ? "BẬT" : "TẮT"));
  }

  if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 0 && newThreshold <= 4095)
    {
      nguongDoamdat = newThreshold;
      Serial.println("NGƯỠNG ĐỘ ẨM ĐẤT MỚI: " + String(nguongDoamdat));
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/MOTOR")
  {
    automodeDoamdat = false;
    StaticJsonDocument<128> doc;
    if (deserializeJson(doc, stMessage))
      return;

    String action = doc["action"] | "";
    if (action == "ON")
    {
      controlStepperMotorTuoi(true);
      Serial.println("BẬT MÁY BƠM TƯỚI ");
    }
    else if (action == "OFF")
    {
      controlStepperMotorTuoi(false);
      Serial.println("TẮT MÁY BƠM TƯỚI ");
    }
  }

  // ----------- Mưa / mái che -----------
  if (String(topic) == "HeThongNongTraiThongMinh/Mua/Control/automodeMua")
  {
    automodeMua = (stMessage == "ON");
    Serial.println("CHỨC NĂNG TỰ ĐỘNG MÁY CHE: " + String(automodeMua ? "BẬT" : "TẮT"));
  }
  if (String(topic) == "HeThongNongTraiThongMinh/Mua/Control/Maiche")
  {
    automodeMua = false;

    StaticJsonDocument<200> doc;
    deserializeJson(doc, stMessage);
    String action = doc["action"];

    if (action == "ON")
    {
      dieuKhienMaiChe(1);
      Serial.println("MÁI CHE ĐÃ MỞ");
    }
    else if (action == "OFF")
    {
      dieuKhienMaiChe(0);
      Serial.println("MÁY CHE ĐÃ ĐÓNG");
    }
  }
}

void updateRainSensorToggle()
{
  int reading = digitalRead(mua);

  if (reading != lastRainButtonReading)
  {
    lastRainButtonChange = millis();
    lastRainButtonReading = reading;
  }

  if ((millis() - lastRainButtonChange) > RAIN_DEBOUNCE_DELAY)
  {
    if (reading == LOW && !rainButtonLatched)
    {
      rainButtonLatched = true;
      rainSensorState = !rainSensorState;
      Serial.println(rainSensorState ? "CẢM BIẾN MƯA ĐÃ BẬT" : "CẢM BIẾN MƯA ĐÃ TẮT");
    }
    else if (reading == HIGH && rainButtonLatched)
    {
      rainButtonLatched = false;
    }
  }
}

void checkSchedules()
{
  if (!ntpSynced)
  {
    Serial.println("NTP CHƯA ĐỒNG BỘ, BỎ QUA KIỂM TRA LỊCH");
    return;
  }

  time_t now = timeClient.getEpochTime();
  if (now < 1000000000)
  {
    Serial.println("THỜI GIAN KHÔNG HỢP LỆ: " + String(now));
    return;
  }

  timeClient.update();
  struct tm *timeinfo = localtime(&now);
  int currentYear = timeinfo->tm_year + 1900;
  int currentMonth = timeinfo->tm_mon + 1;
  int currentDay = timeinfo->tm_mday;
  int currentHour = timeClient.getHours();
  int currentMinute = timeClient.getMinutes();
  int currentSecond = timeClient.getSeconds();

  bool logPrinted = false;
  if (scheduleCount > 0)
  {
    Serial.println("KIỂM TRA LỊCH: " + String(currentYear) + "/" +
                   String(currentMonth) + "/" + String(currentDay) + " " +
                   String(currentHour) + ":" + String(currentMinute) + ":" +
                   String(currentSecond) + ", Millis: " + String(millis()));
    Serial.println("SỐ LƯỢNG LỊCH: " + String(scheduleCount));
    logPrinted = true;
  }
  for (int i = 0; i < scheduleCount; i++)
  {
    Serial.println("KIỂM TRA LỊCH " + String(i) + ": " + String(schedules[i].year) + "/" +
                   String(schedules[i].month) + "/" + String(schedules[i].day) + " " +
                   String(schedules[i].hour) + ":" + String(schedules[i].minute) + " - " +
                   (schedules[i].state ? "BẬT" : "TẮT") + ", executed: " + String(schedules[i].executed));
    if (!schedules[i].executed &&
        schedules[i].year == currentYear &&
        schedules[i].month == currentMonth &&
        schedules[i].day == currentDay &&
        schedules[i].hour == currentHour &&
        schedules[i].minute == currentMinute)
    {
      digitalWrite(led, schedules[i].state ? HIGH : LOW);
      automodeLdr = false;
      schedules[i].executed = true;
      Serial.println("THỰC HIỆN LỊCH: " + String(schedules[i].year) + "/" +
                     String(schedules[i].month) + "/" + String(schedules[i].day) + " " +
                     String(schedules[i].hour) + ":" + String(schedules[i].minute) + " - " +
                     (schedules[i].state ? "BẬT" : "TẮT") + ", LED pin: " + String(digitalRead(led)));
    }
  }
}

void cleanupSchedules()
{
  int i = 0;
  while (i < scheduleCount)
  {
    if (schedules[i].executed)
    {
      char indexStr[10];
      snprintf(indexStr, sizeof(indexStr), "%d", i);
      client.publish("HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed", indexStr);
      Serial.println("GỬI LỆNH XÓA LỊCH TẠI VỊ TRí: " + String(i));
      for (int j = i; j < scheduleCount - 1; j++)
      {
        schedules[j] = schedules[j + 1];
      }
      scheduleCount--;
      Serial.println("SAU KHI XÓA, SỐ LƯỢNG LỊCH: " + String(scheduleCount));
      if (scheduleCount > 0)
      {
        Serial.println("DANH SÁCH LỊCH CÒN LẠI:");
        for (int k = 0; k < scheduleCount; k++)
        {
          Serial.println("LỊCH " + String(k) + ": " + String(schedules[k].year) + "/" +
                         String(schedules[k].month) + "/" + String(schedules[k].day) + " " +
                         String(schedules[k].hour) + ":" + String(schedules[k].minute) + " - " +
                         (schedules[k].state ? "BẬT" : "TẮT") + ", executed: " + String(schedules[k].executed));
        }
      }
      else
      {
        Serial.println("KHÔNG CÓ LỊCH NÀO.");
      }
    }
    else
    {
      i++;
    }
  }
}

/**** Setup ****/
void setup()
{
  Serial.begin(115200);

  // I/O
  pinMode(coi, OUTPUT);
  digitalWrite(coi, LOW);
  pinMode(led, OUTPUT);
  digitalWrite(led, LOW);
  pinMode(dieuhoa, OUTPUT);
  digitalWrite(dieuhoa, LOW);

  pinMode(trigPin, OUTPUT);
  digitalWrite(trigPin, LOW);
  pinMode(echoPin, INPUT);
  pinMode(doamdat, INPUT);
  pinMode(khigas, INPUT);
  pinMode(anhsang, INPUT);
  pinMode(mua, INPUT_PULLUP); // nhấn = LOW (mưa)

  pinMode(stepPinBe, OUTPUT);
  pinMode(enPinBe, OUTPUT);
  digitalWrite(enPinBe, HIGH);
  pinMode(stepPinTuoi, OUTPUT);
  pinMode(enPinTuoi, OUTPUT);
  digitalWrite(enPinTuoi, HIGH);
  pinMode(stepPinMaiChe, OUTPUT);
  pinMode(dirPinMaiChe, OUTPUT);
  pinMode(enPinMaiChe, OUTPUT);
  digitalWrite(enPinMaiChe, HIGH);

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Dang ket noi WiFi...");

  // WiFi + MQTT
  WIFIConnect();
  espClient.setInsecure(); // demo
  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(2048);
  client.setCallback(callback);

  // NTP sync ban đầu
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
  {
    MQTT_Reconnect();
  }
  if (!checkingSchedules)
  {
    client.loop();
  }

  updateRainSensorToggle();

  static unsigned long lastNTPCheck = 0;
  if (millis() - lastNTPCheck > 30000 && !ntpSynced)
  {
    timeClient.forceUpdate();
    if (timeClient.getEpochTime() > 1000000000)
    {
      ntpSynced = true;
      Serial.println("ĐỒNG BỘ NTP THÀNH CÔNG: " + timeClient.getFormattedTime());
    }
    lastNTPCheck = millis();
  }

  runStepperMotorBe();
  runStepperMotorTuoi();

  checkingSchedules = true;
  checkingSchedules = false;

  static unsigned long lastNTP = 0;
  if (millis() - lastNTP > 5000)
  {
    lastNTP = millis();

    checkSchedules();
    cleanupSchedules();

    // ---- Đọc sensor ----
    float nhietdo = dht.readTemperature();
    float doam = dht.readHumidity();
    int mq2_value = analogRead(khigas);
    int raw_ldr_value = analogRead(anhsang);
    int ldr_value = 4095 - raw_ldr_value;
    int doamdat_value = analogRead(doamdat);
    float doamdat_percent = (static_cast<float>(doamdat_value) / 4095.0f) * 100.0f;
    if (doamdat_percent < 0.0f)
    {
      doamdat_percent = 0.0f;
    }
    else if (doamdat_percent > 100.0f)
    {
      doamdat_percent = 100.0f;
    }
    int trangthai_mua = rainSensorState ? 1 : 0;

    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    long dur = pulseIn(echoPin, HIGH, 30000UL);
    float khoangcach = dur * 0.034f / 2.0;

    // ---- Điều khiển tự động (và log giống console cũ) ----
    if (!isnan(nhietdo) && automodeDht && !manualAC)
    { // chỉ tự động khi không manual
      bool shouldAC = nhietdo > nguongDht;
      digitalWrite(dieuhoa, shouldAC ? HIGH : LOW);
      acState = shouldAC;
    }

    // Tự động điều khiển còi theo nồng độ gas
    if (!isnan(mq2_value) && automodeMq2)
    {
      static bool lastBuzzerState = false; // Lưu trạng thái trước đó

      if (mq2_value > nguongMq2 && !lastBuzzerState)
      {
        tone(coi, 1000);
        lastBuzzerState = true;
        Serial.println("TỰ ĐỘNG BẬT COI - KHÍ GAS: " + String(mq2_value) + " > " + String(nguongMq2));
      }
      else if (mq2_value <= nguongMq2 && lastBuzzerState)
      {
        noTone(coi);
        digitalWrite(coi, LOW);
        lastBuzzerState = false;
        Serial.println("TỰ ĐỘNG TẮT CÒI - KHÍ GAS: " + String(mq2_value) + " <= " + String(nguongMq2));
      }
    }
    else if (!automodeMq2)
    {
      // Khi tắt chế độ tự động, không làm gì (giữ nguyên trạng thái manual)
      // Serial.println("⏸️ Che do tu dong da tat");
    }

    if (!isnan(ldr_value) && automodeLdr && !manualLed)
    {
      digitalWrite(led, ldr_value < nguongLdr ? HIGH : LOW);
      Serial.println("ĐÈN ĐANG " + String(ldr_value < nguongLdr ? "BẬT" : "TẮT"));
    }

    if (!isnan(khoangcach) && automodeHcsr04 && !manualMotorBe)
    {
      if (khoangcach > nguongHcsr04)
      {
        controlStepperMotorBe(true); // Bật motor nếu khoảng cách lớn hơn ngưỡng
        Serial.println("KHOẢNG CÁCH MỰC NƯỚC: " + String(khoangcach) + " cm");
      }
      else
      {
        controlStepperMotorBe(false); // Tắt motor nếu khoảng cách nhỏ hơn ngưỡng
        Serial.println("KHOẢNG CÁCH MỰC NƯỚC: " + String(khoangcach) + " cm");
      }
    }

    if (!isnan(doamdat_value) && automodeDoamdat)
    {
      controlStepperMotorTuoi(doamdat_value < nguongDoamdat);
    }

    Serial.print("CẢM BIẾN MƯA: ");
    Serial.println(trangthai_mua);

    if (automodeMua)
    {
      if (trangthai_mua != trangthai_muatruocdo)
      {
        trangthai_muatruocdo = trangthai_mua;
        dieuKhienMaiChe(trangthai_mua);
      }
    }

    if (!isnan(nhietdo) && !isnan(doam) &&
        !isnan(mq2_value) && !isnan(ldr_value) &&
        !isnan(doamdat_value) && !isnan(khoangcach) && !isnan(trangthai_mua))
    {
      Serial.print("Nhiệt độ: ");
      Serial.print(nhietdo);
      Serial.print("*C, ");
      Serial.print("Độ ẩm: ");
      Serial.print(doam);
      Serial.print("%, ");
      Serial.print("Khí gas: ");
      Serial.print(mq2_value);
      Serial.print(", ");
      Serial.print("Cường độ ánh sáng: ");
      Serial.print(ldr_value);
      Serial.print("lux, ");
      Serial.print("Độ ẩm đất: ");
      Serial.print(doamdat_percent, 1);
      Serial.print("%, ");
      Serial.print("Khoảng cách: ");
      Serial.print(khoangcach);
      Serial.print("cm, ");
      Serial.print("Mưa: ");
      Serial.println(trangthai_mua);

      // ---- Publish MQTT (JSON) ----
      StaticJsonDocument<2048> doc;
      doc["nhietdo"] = nhietdo;
      doc["doam"] = doam;
      doc["khigas"] = mq2_value;
      doc["anhsang"] = ldr_value;
      doc["doamdat"] = doamdat_value;
      doc["doamdatPercent"] = doamdat_percent;
      doc["khoangcach"] = khoangcach;
      doc["mua"] = trangthai_mua;
      doc["automodeDht"] = automodeDht;
      doc["nguongbatdieuhoa"] = nguongDht;
      doc["automodeMq2"] = automodeMq2;
      doc["nguongbatcoi"] = nguongMq2;
      doc["automodeLdr"] = automodeLdr;
      doc["nguongLdr"] = nguongLdr;
      doc["ledState"] = digitalRead(led);
      doc["automodeHcsr04"] = automodeHcsr04;
      doc["nguongbatmaybomho"] = nguongHcsr04;
      doc["automodeDoamdat"] = automodeDoamdat;
      doc["nguongbatmaybomtuoicay"] = nguongDoamdat;
      doc["automodeMua"] = automodeMua;

      char out[2048];
      serializeJson(doc, out);
      client.publish(MQTT_Topic, out);
    }
    else
    {
      Serial.println("Loi doc sensor, bo qua MQTT publish");
    }
  }
}
