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

bool manualLed = false; // true khi LED đang được điều khiển thủ công

float nguongDht = 25.0;    // °C
int nguongMq2 = 2500;      // raw 0..4095
int nguongLdr = 1200;      // dùng LDR đảo
int nguongDoamdat = 2000;  // đất khô khi < nguongDoamdat
float nguongHcsr04 = 20.0; // cm

// Stepper non-blocking
bool motorBeRunning = false;
unsigned long lastStepTimeBe = 0;
const unsigned long stepIntervaBe = 800; // us

bool motorTuoiRunning = false;
unsigned long lastStepTimeTuoi = 0;
const unsigned long stepIntervalTuoi = 800; // us

int trangthai_muatruocdo = -1;

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
    Serial.println("[TANK] BẬT bơm bể");
  }
  else if (!on && motorBeRunning)
  {
    digitalWrite(enPinBe, HIGH);
    motorBeRunning = false;
    Serial.println("[TANK] TẮT bơm bể");
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
    Serial.println("[IRR] BẬT bơm tưới");
  }
  else if (!on && motorTuoiRunning)
  {
    digitalWrite(enPinTuoi, HIGH);
    motorTuoiRunning = false;
    Serial.println("[IRR] TẮT bơm tưới");
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
    Serial.println("Troi mua - Quay mo may che");
    digitalWrite(dirPinMaiChe, HIGH); // Chiều thuận (mở mái che)
  }
  else
  {
    Serial.println("Khong mua - Quay thu may che");
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
    Serial.println("Bo qua callback vi dang kiem tra lich");
    return;
  }

  Serial.print("Message arrived on topic: ");
  Serial.println(topic);
  String stMessage;
  for (unsigned i = 0; i < length; i++)
  {
    stMessage += (char)message[i];
  }
  Serial.println("Noi dung: " + stMessage);

  // ----------- LỊCH BẬT/TẮT ĐÈN -----------
  if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/ScheduleLed")
  {
    if (scheduleCount < 10)
    {
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, stMessage);
      if (error)
      {
        Serial.println("Loi parse JSON lich: " + String(error.c_str()));
        return;
      }
      if (!doc.containsKey("year") || !doc.containsKey("month") || !doc.containsKey("day") ||
          !doc.containsKey("hour") || !doc.containsKey("minute") || !doc.containsKey("state"))
      {
        Serial.println("JSON thieu truong du lieu");
        return;
      }
      schedules[scheduleCount] = {
          doc["year"], doc["month"], doc["day"],
          doc["hour"], doc["minute"], doc["state"],
          false};
      Serial.println("Lich moi da duoc them: " + String(schedules[scheduleCount].year) + "/" +
                     String(schedules[scheduleCount].month) + "/" + String(schedules[scheduleCount].day) + " " +
                     String(schedules[scheduleCount].hour) + ":" + String(schedules[scheduleCount].minute) + " - " +
                     (schedules[scheduleCount].state ? "ON" : "OFF"));
      scheduleCount++;
    }
    else
    {
      Serial.println("Da dat gioi han 10 lich");
    }
  }

  // ----------- XÓA LỊCH LED -----------
  if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed")
  {
    Serial.println("Nhan lenh xoa lich tai vi tri: " + stMessage + ", bo qua vi cleanupSchedules da xu ly");
  }

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
        Serial.println("💡 Đèn LED đã BẬT (thủ công)");
      }
      else if (action.equalsIgnoreCase("OFF"))
      {
        digitalWrite(led, LOW);
        Serial.println("💡 Đèn LED đã TẮT (thủ công)");
      }
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
      Serial.println("AC manual set: " + String(acState ? "ON" : "OFF"));
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/ACMode")
  {
    manualAC = (stMessage == "MANUAL");
    Serial.println("AC mode: " + String(manualAC ? "MANUAL" : "AUTO"));
  }

  if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= -10 || newThreshold <= 50)
    {
      nguongDht = newThreshold;
      Serial.println("Nguong DHT22 da duoc cap nhat: " + String(nguongDht));
    }
  }

  // ----------- Gas / buzzer -----------
  if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/BUZZER")
  {
    if (stMessage == "BUZZER_ON")
    {
      digitalWrite(coi, HIGH);
      tone(coi, 1000); // Phat tin hieu am thanh 1kHz
      Serial.println("Coi da BAT");
    }
    if (stMessage == "BUZZER_OFF")
    {
      digitalWrite(coi, LOW);
      noTone(coi); // Ngung phat tin hieu am thanh
      Serial.println("Coi da TAT");
    }
  }

  if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2")
  {
    automodeMq2 = (stMessage == "ON");
    Serial.println("Chuc nang tu dong MQ2: " + String(automodeMq2 ? "ON" : "OFF"));
  }
  if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 0 || newThreshold <= 4095)
    {
      nguongMq2 = newThreshold;
      Serial.println("Nguong MQ2 da duoc cap nhat: " + String(nguongMq2));
    }
  }

  // // ----------- LDR -----------
  // if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/LED")
  // {
  //   if (stMessage == "LIGHT_ON")
  //   {
  //     digitalWrite(led, HIGH);
  //     automodeLdr = false;
  //     Serial.println("Den da BAT");
  //   }
  //   else if (stMessage == "LIGHT_OFF")
  //   {
  //     digitalWrite(led, LOW);
  //     automodeLdr = false;
  //     Serial.println("Den da TAT");
  //   }
  // }

  // if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/automodeLdr")
  // {
  //   automodeLdr = (stMessage == "ON");
  //   Serial.println("Chuc nang tu dong LDR: " + String(automodeLdr ? "ON" : "OFF"));
  // }

  // if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr")
  // {
  //   float newThreshold = stMessage.toFloat();
  //   if (newThreshold >= 0 && newThreshold <= 1000)
  //   {
  //     nguongLdr = newThreshold;
  //     Serial.println("Ngưỡng LDR mới: " + String(nguongLdr));
  //   }
  // }

  // ----------- HC-SR04 / bơm bể -----------
  if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/MOTOR")
  {
    controlStepperMotorBe(stMessage == "MOTOR_ON");
  }
  if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04")
  {
    automodeHcsr04 = (stMessage == "ON");
    Serial.println("Chuc nang tu dong HCSR04: " + String(automodeHcsr04 ? "ON" : "OFF"));
  }
  if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04")
  {
    nguongHcsr04 = stMessage.toFloat();
  }

  // ----------- Độ ẩm đất / bơm tưới -----------
  if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat")
  {
    automodeDoamdat = (stMessage == "ON");
    Serial.println("Chuc nang tu dong Doamdat: " + String(automodeDoamdat ? "ON" : "OFF"));
  }
  if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 0 && newThreshold <= 4095)
    {
      nguongDoamdat = newThreshold;
      Serial.println("Ngưỡng độ ẩm đất mới: " + String(nguongDoamdat));
    }
  }

  // ----------- Độ ẩm đất / bơm tưới -----------
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
      Serial.println("💧 Bật bơm tưới");
    }
    else if (action == "OFF")
    {
      controlStepperMotorTuoi(false);
      Serial.println("💧 Tắt bơm tưới");
    }
  }

  // ----------- Mưa / mái che -----------
  if (String(topic) == "HeThongNongTraiThongMinh/Mua/Control/automodeMua")
  {
    automodeMua = (stMessage == "ON");
    Serial.println("Chuc nang tu dong Mua: " + String(automodeMua ? "ON" : "OFF"));
  }
  if (String(topic) == "HeThongNongTraiThongMinh/Mua/Control/Maiche")
  {
    automodeMua = false;
    if (stMessage == "ON")
    {
      dieuKhienMaiChe(1);
      Serial.println("Mai che da BAT");
    }
    else if (stMessage == "OFF")
    {
      dieuKhienMaiChe(0);
      Serial.println("Mai che da TAT");
    }
  }
}

void checkSchedules()
{
  if (!ntpSynced)
  {
    Serial.println("NTP chua dong bo, bo qua kiem tra lich");
    return;
  }

  time_t now = timeClient.getEpochTime();
  if (now < 1000000000)
  {
    Serial.println("Thoi gian khong hop le: " + String(now));
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
    Serial.println("Kiem tra lich tai: " + String(currentYear) + "/" +
                   String(currentMonth) + "/" + String(currentDay) + " " +
                   String(currentHour) + ":" + String(currentMinute) + ":" +
                   String(currentSecond) + ", Millis: " + String(millis()));
    Serial.println("So luong lich: " + String(scheduleCount));
    logPrinted = true;
  }
  for (int i = 0; i < scheduleCount; i++)
  {
    Serial.println("Kiem tra lich " + String(i) + ": " + String(schedules[i].year) + "/" +
                   String(schedules[i].month) + "/" + String(schedules[i].day) + " " +
                   String(schedules[i].hour) + ":" + String(schedules[i].minute) + " - " +
                   (schedules[i].state ? "ON" : "OFF") + ", executed: " + String(schedules[i].executed));
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
      Serial.println("Thuc thi lich: " + String(schedules[i].year) + "/" +
                     String(schedules[i].month) + "/" + String(schedules[i].day) + " " +
                     String(schedules[i].hour) + ":" + String(schedules[i].minute) + " - " +
                     (schedules[i].state ? "BAT" : "TAT") + ", LED pin: " + String(digitalRead(led)));
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
      Serial.println("Gui lenh xoa lich tai vi tri: " + String(i));
      for (int j = i; j < scheduleCount - 1; j++)
      {
        schedules[j] = schedules[j + 1];
      }
      scheduleCount--;
      Serial.println("Sau khi xoa, so luong lich: " + String(scheduleCount));
      if (scheduleCount > 0)
      {
        Serial.println("Danh sach lich con lai:");
        for (int k = 0; k < scheduleCount; k++)
        {
          Serial.println("Lich " + String(k) + ": " + String(schedules[k].year) + "/" +
                         String(schedules[k].month) + "/" + String(schedules[k].day) + " " +
                         String(schedules[k].hour) + ":" + String(schedules[k].minute) + " - " +
                         (schedules[k].state ? "ON" : "OFF") + ", executed: " + String(schedules[k].executed));
        }
      }
      else
      {
        Serial.println("Khong con lich nao.");
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

  static unsigned long lastNTPCheck = 0;
  if (millis() - lastNTPCheck > 30000 && !ntpSynced)
  {
    timeClient.forceUpdate();
    if (timeClient.getEpochTime() > 1000000000)
    {
      ntpSynced = true;
      Serial.println("Dong bo NTP thanh cong: " + timeClient.getFormattedTime());
    }
    lastNTPCheck = millis();
  }

  runStepperMotorBe();
  runStepperMotorTuoi();

  checkingSchedules = true;
  checkingSchedules = false;

  static unsigned long lastNTP = 0;
  if (millis() - lastNTP > 2000)
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
    int trangthai_mua = digitalRead(mua);

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

    if (!isnan(mq2_value) && automodeMq2)
    {
      if (mq2_value > nguongMq2)
      {
        digitalWrite(coi, HIGH);
        Serial.println("Coi bat do khi gas vuot nguong: ") + String(mq2_value);
      }
      else
      {
        digitalWrite(coi, LOW);
        Serial.println("Coi tat do khi gas duoi nguong: ") + String(mq2_value);
      }
    }

    if (!isnan(ldr_value) && automodeLdr && !manualLed)
    {
      digitalWrite(led, ldr_value > nguongLdr ? HIGH : LOW);
      Serial.println("Den dang " + String(ldr_value > nguongLdr ? "ON" : "OFF"));
    }

    if (!isnan(khoangcach) && automodeHcsr04)
    {
      if (khoangcach > nguongHcsr04)
      {
        controlStepperMotorBe(true); // Bật motor nếu khoảng cách lớn hơn ngưỡng
        Serial.println("Motor hồ bơi bật do khoảng cách: " + String(khoangcach) + " cm");
      }
      else
      {
        controlStepperMotorBe(false); // Tắt motor nếu khoảng cách nhỏ hơn ngưỡng
        Serial.println("Motor hồ bơi tắt do khoảng cách: " + String(khoangcach) + " cm");
      }
    }

    if (!isnan(doamdat_value) && automodeDoamdat)
    {
      controlStepperMotorTuoi(doamdat_value < nguongDoamdat);
    }

    Serial.print("Rain sensor: ");
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
      Serial.print("Nhiet do: ");
      Serial.print(nhietdo);
      Serial.print(" *C, ");
      Serial.print("Do am: ");
      Serial.print(doam);
      Serial.print(" %, ");
      Serial.print("Khi gas: ");
      Serial.print(mq2_value);
      Serial.print(", ");
      Serial.print("Cuong do anh sang: ");
      Serial.print(ldr_value);
      Serial.print(", ");
      Serial.print("Do am dat: ");
      Serial.print(doamdat_value);
      Serial.print(", ");
      Serial.print("Khoang cach: ");
      Serial.print(khoangcach);
      Serial.print(" cm, ");
      Serial.print("Mua: ");
      Serial.println(trangthai_mua);

      // ---- Publish MQTT (JSON) ----
      StaticJsonDocument<2048> doc;
      doc["nhietdo"] = nhietdo;
      doc["doam"] = doam;
      doc["khigas"] = mq2_value;
      doc["anhsang"] = ldr_value;
      doc["doamdat"] = doamdat_value;
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