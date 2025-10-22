// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import {
  Cloud,
  Droplets,
  Thermometer,
  Activity,
  Sun,
  TreePine,
} from "lucide-react";
import { Link } from "react-router-dom";
import WeatherWidget from "../components/WeatherWeget";
import DHT22 from "./DHT22.JSX";

const API_URL = "http://localhost:3000/data"; // URL backend Node.js

const Home = () => {
  const [sensorData, setSensorData] = useState(null);

  // Gọi API khi load trang
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.length > 0) {
          setSensorData(data[0]); // lấy bản ghi mới nhất
        }
      } catch (err) {
        console.error("Lỗi fetch dữ liệu:", err);
      }
    };

    fetchData();
    // Tự động cập nhật mỗi 5 giây
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!sensorData)
    return (
      <div className="text-center p-12 text-gray-500">
        Đang tải dữ liệu cảm biến...
      </div>
    );

  // Xử lý timestamp từ Firestore
  const timeString = sensorData.timestamp?._seconds
    ? new Date(sensorData.timestamp._seconds * 1000).toLocaleTimeString()
    : "N/A";

  return (
    <div className="bg-gray-50 p-8">
      <h2 className="text-center text-blue-600 text-3xl font-bold mb-12">
        Hệ Thống Giám Sát Nông Trại Thông Minh
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Cảm biến DHT22 */}
        <Link
          to="/dht22"
          className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition"
        >
          <div className="flex items-center gap-3 text-blue-600 mb-4">
            <Thermometer className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến DHT22</h3>
          </div>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-blue-400"
            >
              <path d="M320 576C214 576 128 490 128 384C128 292.8 258.2 109.9 294.6 60.5C300.5 52.5 309.8 48 319.8 48L320.2 48C330.2 48 339.5 52.5 345.4 60.5C381.8 109.9 512 292.8 512 384C512 490 426 576 320 576zM240 376C240 362.7 229.3 352 216 352C202.7 352 192 362.7 192 376C192 451.1 252.9 512 328 512C341.3 512 352 501.3 352 488C352 474.7 341.3 464 328 464C279.4 464 240 424.6 240 376z" />
            </svg>
            Độ ẩm không khí:{" "}
            <span className="text-green-600 font-semibold">
              {sensorData.doam}%
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-red-500"
            >
              <path d="M160 160C160 107 203 64 256 64C309 64 352 107 352 160L352 324.7C381.5 351.1 400 389.4 400 432C400 511.5 335.5 576 256 576C176.5 576 112 511.5 112 432C112 389.4 130.5 351 160 324.7L160 160zM256 496C291.3 496 320 467.3 320 432C320 405.1 303.5 382.1 280 372.7L280 344C280 330.7 269.3 320 256 320C242.7 320 232 330.7 232 344L232 372.7C208.5 382.2 192 405.2 192 432C192 467.3 220.7 496 256 496zM528 144C528 126.3 513.7 112 496 112C478.3 112 464 126.3 464 144C464 161.7 478.3 176 496 176C513.7 176 528 161.7 528 144zM416 144C416 99.8 451.8 64 496 64C540.2 64 576 99.8 576 144C576 188.2 540.2 224 496 224C451.8 224 416 188.2 416 144z" />
            </svg>
            Nhiệt độ:{" "}
            <span className="text-red-500 font-semibold">
              {sensorData.nhietdo}°C
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-gray-400"
            >
              <path d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z" />
            </svg>
            Trạng thái:{" "}
            <span className="text-gray-700 font-medium">Ổn định</span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-emerald-400"
            >
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
            </svg>
            Cập nhật: <span className="text-gray-500">{timeString}</span>
          </p>
        </Link>

        {/* Cảm biến độ ẩm đất */}
        <Link
          to="/soilmoisture"
          className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition"
        >
          <div className="flex items-center gap-3 text-indigo-600 mb-4">
            <Droplets className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến độ ẩm đất</h3>
          </div>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-blue-400"
            >
              <path d="M320 576C214 576 128 490 128 384C128 292.8 258.2 109.9 294.6 60.5C300.5 52.5 309.8 48 319.8 48L320.2 48C330.2 48 339.5 52.5 345.4 60.5C381.8 109.9 512 292.8 512 384C512 490 426 576 320 576zM240 376C240 362.7 229.3 352 216 352C202.7 352 192 362.7 192 376C192 451.1 252.9 512 328 512C341.3 512 352 501.3 352 488C352 474.7 341.3 464 328 464C279.4 464 240 424.6 240 376z" />
            </svg>
            Độ ẩm đất:{" "}
            <span className="text-blue-500 font-semibold">
              {sensorData.doamdat}%
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-green-400"
            >
              <path d="M576 96C576 204.1 499.4 294.3 397.6 315.4C389.7 257.3 363.6 205 325.1 164.5C365.2 104 433.9 64 512 64L544 64C561.7 64 576 78.3 576 96zM64 160C64 142.3 78.3 128 96 128L128 128C251.7 128 352 228.3 352 352L352 544C352 561.7 337.7 576 320 576C302.3 576 288 561.7 288 544L288 384C164.3 384 64 283.7 64 160z" />
            </svg>
            Đánh giá:{" "}
            <span className="text-yellow-600 font-medium">
              {sensorData.doamdat < 40 ? "Hơi khô" : "Ổn định"}
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-gray-400"
            >
              <path d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z" />
            </svg>
            Trạng thái:{" "}
            <span className="text-gray-700 font-medium">
              {sensorData.doamdat < 40 ? "Cần tưới sớm" : "Bình thường"}
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-emerald-400"
            >
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
            </svg>
            Cập nhật: <span className="text-gray-500">{timeString}</span>
          </p>
        </Link>

        {/* Cảm biến ánh sáng */}
        <Link
          to="/lightsensor"
          className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition"
        >
          <div className="flex items-center gap-3 text-amber-500 mb-4">
            <Sun className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến ánh sáng</h3>
          </div>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-amber-400"
            >
              <path d="M210.2 53.9C217.6 50.8 226 51.7 232.7 56.1L320.5 114.3L408.3 56.1C415 51.7 423.4 50.9 430.8 53.9C438.2 56.9 443.4 63.5 445 71.3L465.9 174.5L569.1 195.4C576.9 197 583.5 202.4 586.5 209.7C589.5 217 588.7 225.5 584.3 232.2L526.1 320L584.3 407.8C588.7 414.5 589.5 422.9 586.5 430.3C583.5 437.7 576.9 443.1 569.1 444.6L465.8 465.4L445 568.7C443.4 576.5 438 583.1 430.7 586.1C423.4 589.1 414.9 588.3 408.2 583.9L320.4 525.7L232.6 583.9C225.9 588.3 217.5 589.1 210.1 586.1C202.7 583.1 197.3 576.5 195.8 568.7L175 465.4L71.7 444.5C63.9 442.9 57.3 437.5 54.3 430.2C51.3 422.9 52.1 414.4 56.5 407.7L114.7 320L56.5 232.2C52.1 225.5 51.3 217.1 54.3 209.7C57.3 202.3 63.9 196.9 71.7 195.4L175 174.6L195.9 71.3C197.5 63.5 202.9 56.9 210.2 53.9zM239.6 320C239.6 275.6 275.6 239.6 320 239.6C364.4 239.6 400.4 275.6 400.4 320C400.4 364.4 364.4 400.4 320 400.4C275.6 400.4 239.6 364.4 239.6 320zM448.4 320C448.4 249.1 390.9 191.6 320 191.6C249.1 191.6 191.6 249.1 191.6 320C191.6 390.9 249.1 448.4 320 448.4C390.9 448.4 448.4 390.9 448.4 320z" />
            </svg>
            Cường độ:{" "}
            <span className="text-amber-500 font-semibold">
              {sensorData.anhsang} lux
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-orange-500"
            >
              <path d="M416.9 69.4C419.1 67.9 421.9 67.9 424.3 68.9C426.7 69.9 428.6 71.9 429.2 74.5L451.1 182.9C451.7 186.1 454.2 188.5 457.4 189.2L565.8 211.1C568.4 211.6 570.4 213.5 571.4 216C572.4 218.5 572.3 221.2 570.9 223.4L509.7 315.6C507.9 318.3 507.9 321.8 509.7 324.4L570.9 416.6C572.4 418.8 572.4 421.6 571.4 424C570.4 426.4 568.4 428.3 565.8 428.9L457.3 450.8C454.1 451.4 451.7 453.9 451 457.1L429.1 565.5C428.6 568.1 426.7 570.1 424.2 571.1C421.7 572.1 419 572 416.8 570.6L324.6 509.4C321.9 507.6 318.4 507.6 315.8 509.4L223.6 570.6C221.4 572.1 218.6 572.1 216.2 571.1C213.8 570.1 211.9 568.1 211.3 565.5L189.5 457.1C188.9 453.9 186.4 451.5 183.2 450.8L74.8 428.9C72.2 428.4 70.2 426.5 69.2 424C68.2 421.5 68.3 418.8 69.7 416.6L130.9 324.4C132.7 321.7 132.7 318.2 130.9 315.6L69.7 223.4C68.2 221.2 68.2 218.4 69.2 216C70.2 213.6 72.2 211.7 74.8 211.1L183.2 189.2C186.4 188.6 188.8 186.1 189.5 182.9L211.4 74.5C211.9 71.9 213.8 69.9 216.3 68.9C218.8 67.9 221.5 68 223.7 69.4L315.9 130.6C318.6 132.4 322.1 132.4 324.7 130.6L416.9 69.4zM430.4 54.1C424.1 51.5 415.5 51.1 408 56.1L320.2 114.3L232.4 56.1L232.4 56.1C225 51.2 216.4 51.5 210 54.1C203.6 56.7 197.5 62.6 195.7 71.3L174.8 174.6L71.6 195.4C62.8 197.2 57 203.5 54.4 209.8C51.8 216.1 51.4 224.7 56.4 232.2L114.6 320L56.4 407.8C51.5 415.2 51.8 423.8 54.4 430.2L54.4 430.2C57 436.5 62.8 442.8 71.6 444.6L174.8 465.5L195.7 568.7C197.5 577.5 203.8 583.3 210.1 585.9C216.4 588.5 225 588.9 232.5 583.9L320.3 525.7L408.1 583.9C415.5 588.8 424.1 588.5 430.5 585.9C436.9 583.3 443.1 577.5 444.9 568.7L465.8 465.5L569 444.6C577.8 442.8 583.6 436.5 586.2 430.2C588.8 423.9 589.2 415.3 584.2 407.8L526 320L584.2 232.2C589.1 224.8 588.8 216.2 586.2 209.8C583.6 203.4 577.8 197.2 569 195.4L465.7 174.6L444.8 71.3C443 62.6 436.7 56.8 430.4 54.1zM320.3 432C382.2 431.9 432.2 381.6 432.1 319.8C431.9 257.9 381.7 207.9 319.8 208C257.9 208.1 207.9 258.4 208.1 320.3C208.2 382.1 258.4 432.1 320.3 432zM223.7 320C222.6 284.9 240.7 251.9 270.9 234C301.2 216.1 338.7 216.1 369 234C399.2 251.9 417.3 284.9 416.2 320C417.3 355.1 399.2 388.1 369 406C338.7 423.9 301.2 423.9 270.9 406C240.7 388.1 222.6 355.1 223.7 320z" />
            </svg>
            Mức đánh giá:{" "}
            <span className="text-green-600 font-medium">
              {sensorData.anhsang > 600 ? "Tốt cho cây" : "Thiếu sáng"}
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-gray-400"
            >
              <path d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z" />
            </svg>
            Trạng thái:{" "}
            <span className="text-gray-700 font-medium">Ổn định</span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-emerald-400"
            >
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
            </svg>
            Cập nhật: <span className="text-gray-500">{timeString}</span>
          </p>
        </Link>

        {/* Mực nước */}
        <Link to ="/watersensor" className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-purple-600 mb-4">
            <Cloud className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến mực nước</h3>
          </div>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-blue-500"
            >
              <path d="M474.6 188.1C495.3 203.7 520.6 218.8 548.8 222.6C561.9 224.4 574 215.1 575.8 202C577.6 188.9 568.3 176.8 555.2 175C539.3 172.9 522 163.7 503.5 149.8C465.1 120.8 413 120.8 374.5 149.8C350.5 167.9 333.8 176.1 320 176.1C306.2 176.1 289.5 167.9 265.5 149.8C227.1 120.8 175 120.8 136.5 149.8C118 163.7 100.7 172.9 84.8 175C71.7 176.8 62.4 188.8 64.2 202C66 215.2 78 224.4 91.2 222.6C119.4 218.8 144.8 203.7 165.4 188.1C186.7 172 215.3 172 236.6 188.1C260.8 206.4 288.9 224 320 224C351.1 224 379.1 206.3 403.4 188.1C424.7 172 453.3 172 474.6 188.1zM474.6 332.1C495.3 347.7 520.6 362.8 548.8 366.6C561.9 368.4 574 359.1 575.8 346C577.6 332.9 568.3 320.8 555.2 319C539.3 316.9 522 307.7 503.5 293.8C465.1 264.8 413 264.8 374.5 293.8C350.5 311.9 333.8 320.1 320 320.1C306.2 320.1 289.5 311.9 265.5 293.8C227.1 264.8 175 264.8 136.5 293.8C118 307.7 100.7 316.9 84.8 319C71.7 320.7 62.4 332.8 64.2 346C66 359.2 78 368.4 91.2 366.6C119.4 362.8 144.8 347.7 165.4 332.1C186.7 316 215.3 316 236.6 332.1C260.8 350.4 288.9 368 320 368C351.1 368 379.1 350.3 403.4 332.1C424.7 316 453.3 316 474.6 332.1zM403.4 476.1C424.7 460 453.3 460 474.6 476.1C495.3 491.7 520.6 506.8 548.8 510.6C561.9 512.4 574 503.1 575.8 490C577.6 476.9 568.3 464.8 555.2 463C539.3 460.9 522 451.7 503.5 437.8C465.1 408.8 413 408.8 374.5 437.8C350.5 455.9 333.8 464.1 320 464.1C306.2 464.1 289.5 455.9 265.5 437.8C227.1 408.8 175 408.8 136.5 437.8C118 451.7 100.7 460.9 84.8 463C71.7 464.8 62.4 476.8 64.2 490C66 503.2 78 512.4 91.2 510.6C119.4 506.8 144.8 491.7 165.4 476.1C186.7 460 215.3 460 236.6 476.1C260.8 494.4 288.9 512 320 512C351.1 512 379.1 494.3 403.4 476.1z" />
            </svg>
            Mực nước bể:{" "}
            <span className="text-purple-600 font-semibold">
              {sensorData.khoangcach} cm
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-gray-400"
            >
              <path d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z" />
            </svg>
            Trạng thái:{" "}
            <span className="text-green-600 font-medium">
              {sensorData.khoangcach > 20 ? "Thiếu nước" : "Đủ nước"}
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-emerald-400"
            >
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
            </svg>
            Cập nhật: <span className="text-gray-500">{timeString}</span>
          </p>
        </Link>

        {/* Cảm biến mưa */}
        <Link to="/rainsensor" className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-teal-600 mb-4">
            <TreePine className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến mưa</h3>
          </div>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 inline-block fill-blue-400"
            >
              <path d="M32 400C32 479.5 96.5 544 176 544L480 544C550.7 544 608 486.7 608 416C608 364.4 577.5 319.9 533.5 299.7C540.2 286.6 544 271.7 544 256C544 203 501 160 448 160C430.3 160 413.8 164.8 399.6 173.1C375.5 127.3 327.4 96 272 96C192.5 96 128 160.5 128 240C128 248 128.7 255.9 129.9 263.5C73 282.7 32 336.6 32 400z" />
            </svg>
            Tình trạng:{" "}
            <span className="text-teal-600 font-semibold">
              {sensorData.mua > 0 ? "Có mưa" : "Trời khô"}
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-amber-400"
            >
              <path d="M210.2 53.9C217.6 50.8 226 51.7 232.7 56.1L320.5 114.3L408.3 56.1C415 51.7 423.4 50.9 430.8 53.9C438.2 56.9 443.4 63.5 445 71.3L465.9 174.5L569.1 195.4C576.9 197 583.5 202.4 586.5 209.7C589.5 217 588.7 225.5 584.3 232.2L526.1 320L584.3 407.8C588.7 414.5 589.5 422.9 586.5 430.3C583.5 437.7 576.9 443.1 569.1 444.6L465.8 465.4L445 568.7C443.4 576.5 438 583.1 430.7 586.1C423.4 589.1 414.9 588.3 408.2 583.9L320.4 525.7L232.6 583.9C225.9 588.3 217.5 589.1 210.1 586.1C202.7 583.1 197.3 576.5 195.8 568.7L175 465.4L71.7 444.5C63.9 442.9 57.3 437.5 54.3 430.2C51.3 422.9 52.1 414.4 56.5 407.7L114.7 320L56.5 232.2C52.1 225.5 51.3 217.1 54.3 209.7C57.3 202.3 63.9 196.9 71.7 195.4L175 174.6L195.9 71.3C197.5 63.5 202.9 56.9 210.2 53.9zM239.6 320C239.6 275.6 275.6 239.6 320 239.6C364.4 239.6 400.4 275.6 400.4 320C400.4 364.4 364.4 400.4 320 400.4C275.6 400.4 239.6 364.4 239.6 320zM448.4 320C448.4 249.1 390.9 191.6 320 191.6C249.1 191.6 191.6 249.1 191.6 320C191.6 390.9 249.1 448.4 320 448.4C390.9 448.4 448.4 390.9 448.4 320z" />
            </svg>
            Cường độ:{" "}
            <span className="text-gray-700 font-medium">
              {sensorData.mua} mm/h
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-emerald-400"
            >
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
            </svg>
            Cập nhật: <span className="text-gray-500">{timeString}</span>
          </p>
        </Link>

        {/* Cảm biến khí gas */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
          <div className="flex items-center gap-3 text-pink-600 mb-4">
            <Activity className="w-6 h-6" />
            <h3 className="text-lg font-bold">Cảm biến khí gas</h3>
          </div>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 inline-block fill-pink-400"
            >
              <path d="M500.5 320.5L499.8 318.6C465.8 224.8 410 140.5 337.1 72.5L333.8 69.5C330.1 66 325.1 64 320 64C314.9 64 309.9 66 306.2 69.5L302.9 72.5C230 140.5 174.2 224.8 140.2 318.6L139.5 320.5C131.9 341.3 128 363.4 128 385.6C128 490.7 214.8 576 320 576C425.2 576 512 490.7 512 385.6C512 363.4 508.1 341.4 500.5 320.5zM409.7 370C413.8 379.3 415.9 389.4 415.9 399.5C415.9 452.5 372.9 496 319.9 496C266.9 496 223.9 452.5 223.9 399.5C223.9 389.4 226 379.2 230.1 370L232 365.7C247.8 330.3 269.9 298 297.3 270.6L306.2 261.7C309.8 258.1 314.7 256.1 319.8 256.1C324.9 256.1 329.8 258.1 333.4 261.7L342.3 270.6C369.7 298 391.9 330.3 407.6 365.7L409.5 370z" />
            </svg>
            Nồng độ gas:{" "}
            <span className="text-pink-600 font-semibold">
              {sensorData.khigas} ppm
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-amber-300"
            >
              <path d="M320 64C334.7 64 348.2 72.1 355.2 85L571.2 485C577.9 497.4 577.6 512.4 570.4 524.5C563.2 536.6 550.1 544 536 544L104 544C89.9 544 76.8 536.6 69.6 524.5C62.4 512.4 62.1 497.4 68.8 485L284.8 85C291.8 72.1 305.3 64 320 64zM320 416C302.3 416 288 430.3 288 448C288 465.7 302.3 480 320 480C337.7 480 352 465.7 352 448C352 430.3 337.7 416 320 416zM320 224C301.8 224 287.3 239.5 288.6 257.7L296 361.7C296.9 374.2 307.4 384 319.9 384C332.5 384 342.9 374.3 343.8 361.7L351.2 257.7C352.5 239.5 338.1 224 319.8 224z" />
            </svg>
            Trạng thái:{" "}
            <span
              className={`font-medium ${
                sensorData.khigas > 200 ? "text-red-500" : "text-green-600"
              }`}
            >
              {sensorData.khigas > 200 ? "Nguy hiểm" : "An toàn"}
            </span>
          </p>
          <p className="flex gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-emerald-400"
            >
              <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
            </svg>
            Cập nhật: <span className="text-gray-500">{timeString}</span>
          </p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
          DỰ BÁO THỜI TIẾT HÔM NAY
        </h2>
        <WeatherWidget />
      </div>
    </div>
  );
};

export default Home;
