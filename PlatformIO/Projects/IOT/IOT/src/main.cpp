#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <time.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// Thông tin MQTT
const char *MQTTServer = "broker.emqx.io";
const char *MQTT_Topic = "HeThongNongTraiThongMinh";
const char *MQTT_ID = "c868b704-fd6b-44b0-8e69-b6da2c63496b";
int Port = 1883;

// Khởi tạo NTPClient
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "asia.pool.ntp.org", 7 * 3600, 5000); // Cập nhật mỗi 5 giây
bool ntpSynced = false;

WiFiClient espClient;
PubSubClient client(espClient);

// Khai báo LCD
LiquidCrystal_I2C lcd(0x27, 20, 4);

// Khai báo chân cảm biến
#define DHTPIN 21
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);
#define doamdat 35
#define khigas 32
#define anhsang 34
#define trigPin 25
#define echoPin 33
#define mua 27

// Khai báo chân thiết bị
#define enPinBe 19
#define stepPinBe 18
#define enPinTuoi 5
#define stepPinTuoi 17
#define enPinMaiChe 16
#define stepPinMaiChe 4
#define dirPinMaiChe 0
#define maylanh 14
#define coi 12
#define LED_LIGHT 26

// Biến diều khiển
bool automodeDht = true;
bool automodeMq2 = true;
bool automodeLdr = true;
bool automodeHcsr04 = true;
bool automodeDoamdat = true;
bool automodeMua = true;
float nguongDht = 25;
float nguongDoamdat = 2000;
float nguongMq2 = 4000;
float nguongLdr = 100;
float nguongHcsr04 = 20;

// Biến trạng thái motor bể chứa
bool motorBeRunning = false;
unsigned long lastStepTimeBe = 0;
const unsigned long stepIntervalBe = 800;

// Biến trạng thái motor tưới
bool motorTuoiRunning = false;
unsigned long lastStepTimeTuoi = 0;
const unsigned long stepIntervalTuoi = 800;

int trangthai_muatruocdo = -1;

// Cấu trúc cho lịch bật/tắt đèn
struct Schedule
{
  int year;
  int month;
  int day;
  int hour;
  int minute;
  bool state;
  bool executed;
};
Schedule schedules[10];
int scheduleCount = 0;

// Biến để ngăn xung đột
bool checkingSchedules = false;

// Kết nối WiFi
void WIFIConnect()
{
  Serial.println("Connecting to SSID: Wokwi-GUEST");
  WiFi.begin("Wokwi-GUEST", "");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("");
    Serial.print("WiFi connected, IP address: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("WiFi connection failed!");
  }
}

// Kết nối lại MQTT
void MQTT_Reconnect()
{
  while (!client.connected())
  {
    if (client.connect(MQTT_ID))
    {
      Serial.print("MQTT Topic: ");
      Serial.print(MQTT_Topic);
      Serial.println(" connected");
      client.subscribe(MQTT_Topic);
      client.subscribe("HeThongNongTraiThongMinh/DHT22/Control/AC");
      client.subscribe("HeThongNongTraiThongMinh/DHT22/Control/automodeDht");
      client.subscribe("HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht");
      client.subscribe("HeThongNongTraiThongMinh/KhiGas/Control/BUZZER");
      client.subscribe("HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2");
      client.subscribe("HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/LED");

      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/automodeLdr");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr");
      client.subscribe("HeThongNongTraiThongMinh/HCSR04/Control/MOTOR");
      client.subscribe("HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04");
      client.subscribe("HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/ScheduleLed");
      client.subscribe("HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed");

      client.subscribe("HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat");
      client.subscribe("HeThongNongTraiThongMinh/Doamdat/Control/MOTOR");
      client.subscribe("HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay");
      client.subscribe("HeThongNongTraiThongMinh/Mua/Control/automodeMua");
      client.subscribe("HeThongNongTraiThongMinh/Mua/Control/Maiche");
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 2 seconds");
      delay(2000);
    }
  }
}

// Điều khiển motor bơm nước bể chứa
void controlStepperMotorHo(bool state)
{
  if (state && !motorBeRunning)
  {
    digitalWrite(enPinBe, LOW);
    motorBeRunning = true;
    Serial.println("Motor ho boi da BAT");
  }
  else if (!state && motorBeRunning)
  {
    digitalWrite(enPinBe, HIGH);
    motorBeRunning = false;
    Serial.println("Motor ho boi da TAT");
  }
}

// Tạo xung bước không chặn
void runStepperMotorHo()
{
  if (motorBeRunning)
  {
    unsigned long currentTime = micros();
    if (currentTime - lastStepTimeBe >= stepIntervalBe)
    {
      digitalWrite(stepPinBe, !digitalRead(stepPinBe));
      lastStepTimeBe = currentTime;
    }
  }
}

// Điều khiển motor tưới cây
void controlStepperMotorTuoi(bool state)
{
  if (state && !motorTuoiRunning)
  {
    digitalWrite(enPinTuoi, LOW);
    motorTuoiRunning = true;
    Serial.println("Motor tuoi cay da BAT");
  }
  else if (!state && motorTuoiRunning)
  {
    digitalWrite(enPinTuoi, HIGH);
    motorTuoiRunning = false;
    Serial.println("Motor tuoi day da TAT");
  }
}

// Tạo xung bước không chặn
void runStepperMotorTuoi()
{
  if (motorTuoiRunning)
  {
    unsigned long currentTime = micros();
    if (currentTime - lastStepTimeTuoi >= stepIntervalTuoi)
    {
      digitalWrite(stepPinTuoi, !digitalRead(stepPinTuoi));
      lastStepTimeTuoi = currentTime;
    }
  }
}

// Điều khiển motor mái che
void dieuKhienMaiChe(int trangthai_mua)
{
  digitalWrite(enPinMaiChe, LOW); // Bật máy che

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

  // Quay một số bước
  for (int i = 0; i < 200; i++)
  {
    digitalWrite(stepPinMaiChe, HIGH);
    delayMicroseconds(800); // Điều chỉnh tốc độ
    digitalWrite(stepPinMaiChe, LOW);
    delayMicroseconds(800);
  }

  digitalWrite(enPinMaiChe, HIGH); // Tắt động cơ sau khi quay xong
}

// Xử lý tin nhắn MQTT
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
  for (int i = 0; i < length; i++)
  {
    stMessage += (char)message[i];
  }
  Serial.println("Noi dung: " + stMessage);

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
      Serial.println("Danh sach lich hien tai (so luong: " + String(scheduleCount) + "):");
      for (int i = 0; i < scheduleCount; i++)
      {
        Serial.println("Lich " + String(i) + ": " + String(schedules[i].year) + "/" +
                       String(schedules[i].month) + "/" + String(schedules[i].day) + " " +
                       String(schedules[i].hour) + ":" + String(schedules[i].minute) + " - " +
                       (schedules[i].state ? "ON" : "OFF") + ", executed: " + String(schedules[i].executed));
      }
    }
    else
    {
      Serial.println("Da dat gioi han 10 lich");
    }
  }
  else if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/DeleteScheduleLed")
  {
    Serial.println("Nhan lenh xoa lich tai vi tri: " + stMessage + ", bo qua vi cleanupSchedules da xu ly");
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/AC")
  {
    if (stMessage == "AC_ON")
    {
      digitalWrite(maylanh, HIGH);
      Serial.println("Dieu hoa da BAT");
    }
    else if (stMessage == "AC_OFF")
    {
      digitalWrite(maylanh, LOW);
      Serial.println("Dieu hoa da TAT");
    }
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/automodeDht")
  {
    automodeDht = (stMessage == "ON");
    Serial.println("Chuc nang tu dong DHT22: " + String(automodeDht ? "bat" : "tat"));
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/DHT22/Control/ThresholdDht")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 10 && newThreshold <= 50)
    {
      nguongDht = newThreshold;
      Serial.println("Nguong DHT22 moi: " + String(nguongDht));
    }
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/BUZZER")
  {
    if (stMessage == "BUZZER_ON")
    {
      digitalWrite(coi, HIGH);
      tone(coi, 1000);
      Serial.println("Coi da BAT");
    }
    else if (stMessage == "BUZZER_OFF")
    {
      digitalWrite(coi, LOW);
      noTone(coi);
      Serial.println("Coi da TAT");
    }
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/automodeMq2")
  {
    automodeMq2 = (stMessage == "ON");
    Serial.println("Chuc nang tu dong MQ2: " + String(automodeMq2 ? "bat" : "tat"));
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/KhiGas/Control/ThresholdMq2")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 0)
    {
      nguongMq2 = newThreshold;
      Serial.println("Nguong khi gas moi: " + String(nguongMq2));
    }
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/LED")
  {
    if (stMessage == "LIGHT_ON")
    {
      digitalWrite(LED_LIGHT, HIGH);
      automodeLdr = false;
      Serial.println("Den da BAT");
    }
    else if (stMessage == "LIGHT_OFF")
    {
      digitalWrite(LED_LIGHT, LOW);
      automodeLdr = false;
      Serial.println("Den da TAT");
    }
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/automodeLdr")
  {
    automodeLdr = (stMessage == "ON");
    Serial.println("Chuc nang tu dong LDR: " + String(automodeLdr ? "bat" : "tat"));
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/LDR/Control/ThresholdLdr")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 0 && newThreshold <= 1000)
    {
      nguongLdr = newThreshold;
      Serial.println("Ngưỡng LDR mới: " + String(nguongLdr));
    }
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/MOTOR")
  {
    controlStepperMotorHo(stMessage == "MOTOR_ON");
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/automodeHcsr04")
  {
    automodeHcsr04 = (stMessage == "ON");
    Serial.println("Chuc nang tu dong HCSR04: " + String(automodeHcsr04 ? "bat" : "tat"));
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/HCSR04/Control/ThresholdHcsr04")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 20 && newThreshold <= 50)
    {
      nguongHcsr04 = newThreshold;
      Serial.println("Ngưỡng HCSR04 mới: " + String(nguongHcsr04));
    }
  }
  else if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/automodeDoamdat")
  {
    automodeDoamdat = (stMessage == "ON");
    Serial.println("Chuc nang tu dong do am dat: " + String(automodeDoamdat ? "bat" : "tat"));
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/nguongbatmaybomtuoicay")
  {
    float newThreshold = stMessage.toFloat();
    if (newThreshold >= 0 && newThreshold <= 4095)
    {
      nguongDoamdat = newThreshold;
      Serial.println("Ngưỡng độ ẩm đất mới: " + String(nguongDoamdat));
    }
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/Doamdat/Control/MOTOR")
  {
    controlStepperMotorTuoi(stMessage == "MOTOR_ON");
    automodeDoamdat = false; // Giữ chế độ thủ công
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/Mua/Control/automodeMua")
  {
    automodeMua = (stMessage == "ON");
    Serial.println("Chuc nang tu dong may che: " + String(automodeMua ? "bat" : "tat"));
  }

  else if (String(topic) == "HeThongNongTraiThongMinh/Mua/Control/Maiche")
  {
    automodeMua = false; // Giữ chế độ thủ công

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

void setup()
{
  Serial.begin(115200);

  Serial.println("Testing buzzer on GPIO 12");
  digitalWrite(coi, HIGH);
  delay(1000);
  digitalWrite(coi, LOW);
  Serial.println("Buzzer test completed");

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Đang kết nối WiFi");

  WIFIConnect();
  if (WiFi.status() == WL_CONNECTED)
  {
    client.setServer(MQTTServer, Port);
    client.setCallback(callback);
    timeClient.begin();
    delay(2000);

    for (int j = 0; j < 5; j++)
    {
      timeClient.forceUpdate();
      if (timeClient.getEpochTime() > 1000000000)
      {
        ntpSynced = true;
        Serial.println("Dong bo NTP thanh cong, Thoi gian: " + timeClient.getFormattedTime() +
                       ", Epoch: " + String(timeClient.getEpochTime()));
        break;
      }
      else
      {
        Serial.println("Dong bo NTP that bai, lan " + String(j + 1));
        delay(1000);
      }
    }
    if (!ntpSynced)
    {
      Serial.println("Khong the dong bo thoi gian NTP! Su dung thoi gian mo phong.");
    }
  }
  else
  {
    Serial.println("Khong co ket noi WiFi, khong the dong bo NTP!");
  }

  dht.begin();
  pinMode(maylanh, OUTPUT);
  pinMode(coi, OUTPUT);

  pinMode(echoPin, INPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(anhsang, INPUT);
  pinMode(LED_LIGHT, OUTPUT);

  pinMode(stepPinBe, OUTPUT);
  pinMode(enPinBe, OUTPUT);
  digitalWrite(enPinBe, HIGH);

  pinMode(doamdat, INPUT);
  pinMode(mua, INPUT);
  pinMode(stepPinTuoi, OUTPUT);
  pinMode(enPinTuoi, OUTPUT);
  digitalWrite(enPinTuoi, HIGH);

  pinMode(stepPinMaiChe, OUTPUT);
  pinMode(enPinMaiChe, OUTPUT);
  pinMode(dirPinMaiChe, OUTPUT);
  digitalWrite(enPinMaiChe, HIGH);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi da ket noi");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
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
      digitalWrite(LED_LIGHT, schedules[i].state ? HIGH : LOW);
      automodeLdr = false;
      schedules[i].executed = true;
      Serial.println("Thuc thi lich: " + String(schedules[i].year) + "/" +
                     String(schedules[i].month) + "/" + String(schedules[i].day) + " " +
                     String(schedules[i].hour) + ":" + String(schedules[i].minute) + " - " +
                     (schedules[i].state ? "BAT" : "TAT") + ", LED pin: " + String(digitalRead(LED_LIGHT)));
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

void loop()
{
  delay(10);
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

  runStepperMotorHo();
  runStepperMotorTuoi();

  checkingSchedules = true;
  checkingSchedules = false;

  static unsigned long lastSend = 0;
  if (millis() - lastSend > 2000)
  {
    lastSend = millis();

    checkSchedules();
    cleanupSchedules();

    // Đọc sensor
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
    long duration = pulseIn(echoPin, HIGH);
    float khoangcach = duration * 0.034 / 2;

    // Điều hòa
    if (!isnan(nhietdo) && automodeDht)
    {
      digitalWrite(maylanh, nhietdo > nguongDht ? HIGH : LOW);
      Serial.println("Dieu hoa dang " + String(nhietdo > nguongDht ? "bat" : "tat"));
    }

    // Gas → coi
    if (!isnan(mq2_value) && automodeMq2)
    {
      if (mq2_value > nguongMq2)
      {
        digitalWrite(coi, HIGH);
        Serial.println("Coi bat do khi gas vuot nguong: " + String(mq2_value));
      }
      else
      {
        digitalWrite(coi, LOW);
        Serial.println("Coi tat do khi gas duoi nguong: " + String(mq2_value));
      }
    }

    if (ldr_value < nguongLdr)
    {
      digitalWrite(LED_LIGHT, HIGH);
      Serial.println("Den bat do anh sang thap hoac anh sang thap va co chuyen dong");
    }
    else
    {
      digitalWrite(LED_LIGHT, LOW);
      Serial.println("Den tat");
    }

    if (!isnan(khoangcach) && automodeHcsr04)
    {
      if (khoangcach > nguongHcsr04)
      {
        controlStepperMotorHo(true); // Bật motor nếu khoảng cách lớn hơn ngưỡng
        Serial.println("Motor hồ bơi bật do khoảng cách: " + String(khoangcach) + " cm");
      }
      else
      {
        controlStepperMotorHo(false); // Tắt motor nếu khoảng cách nhỏ hơn ngưỡng
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
        !isnan(doamdat_value) && !isnan(khoangcach) &&
        !isnan(trangthai_mua))
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

      StaticJsonDocument<2048> doc;
      doc["nhietdo"] = nhietdo;
      doc["doam"] = doam;
      doc["khigas"] = mq2_value;
      doc["anhsang"] = ldr_value;
      doc["doamdat"] = doamdat_value;
      doc["khoangcach"] = khoangcach;
      doc["mua"] = trangthai_mua;
      doc["automodeDht"] = automodeDht;
      doc["nguongbatmaylanh"] = nguongDht;
      doc["automodeMq2"] = automodeMq2;
      doc["nguongbatcoi"] = nguongMq2;
      doc["automodeLdr"] = automodeLdr;
      doc["nguongLdr"] = nguongLdr;
      doc["ledState"] = digitalRead(LED_LIGHT);
      doc["automodeHcsr04"] = automodeHcsr04;
      doc["nguongbatmaybomho"] = nguongHcsr04;
      doc["automodeDoamdat"] = automodeDoamdat;
      doc["nguongbatmaybomtuoicay"] = nguongDoamdat;
      doc["automodeMua"] = automodeMua;

      char buffer[2048];
      serializeJson(doc, buffer);
      client.publish(MQTT_Topic, buffer);
    }
    else
    {
      Serial.println("Doc du lieu that bai!");
    }
  }
}