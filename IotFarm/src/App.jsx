import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import DHT22 from "./pages/DHT22";
import SoilMoistureSensor from "./pages/SoilMoistureSensor";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import LightSensor from "./pages/LightSensor";
import WaterSensor from "./pages/WaterSensor";
import RainSensor from "./pages/RainSensor";

function App() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <Router>
      <Routes>
        {/* Các route công khai */}
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/home" /> : <Login />}
        />
        <Route
          path="/register"
          element={currentUser ? <Navigate to="/home" /> : <Register />}
        />

        {/* Layout cha: chỉ vào được khi đã đăng nhập */}
        <Route
          path="/"
          element={currentUser ? <Layout /> : <Navigate to="/login" />}
        >
          <Route path="home" element={<Home />} />
          <Route path="dht22" element={<DHT22 />} />
          <Route path="soilmoisture" element={<SoilMoistureSensor />} />
          <Route path="lightsensor" element={<LightSensor/>} />
          <Route path= "watersensor" element={<WaterSensor/>} />
          <Route path="rainsensor" element={<RainSensor/>} />


          <Route path="sensors" element={<div>Trang quản lý cảm biến</div>} />
          <Route path="settings" element={<div>Trang cài đặt</div>} />
          {/* thêm các trang khác ở đây */}
        </Route>

        {/* Redirect mặc định */}
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </Router>
  );
}

export default App;
