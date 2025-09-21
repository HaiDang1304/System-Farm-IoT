import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Register from "./pages/Register"; 

function App() {
  const [isAuth, setIsAuth] = React.useState(!!localStorage.getItem("auth"));

  return (
    <Router>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />

        {/* Register */}
        <Route path="/register" element={<Register />} />

        {/* Home */}
        <Route
          path="/home"
          element={
            isAuth ? (
              <Layout setIsAuth={setIsAuth}>
                <Home />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Sensors */}
        <Route
          path="/sensors"
          element={
            isAuth ? (
              <Layout setIsAuth={setIsAuth}>
                <div>Trang quản lý cảm biến</div>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
