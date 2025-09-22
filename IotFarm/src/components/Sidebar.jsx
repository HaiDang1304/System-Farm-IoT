import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const Sidebar = ({ setIsAuth }) => {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    signOut(auth).catch(() => {});
    localStorage.removeItem("auth");

    navigate("/login");
  };
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col fixed h-screen">
      <div className="p-6 text-2xl font-bold border-b border-gray-700">
        IoT Farm
      </div>

      <nav className="flex-1 p-4 overflow-y-auto space-y-2">
        <button
          onClick={() => navigate("/home")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          Trang chủ
        </button>
        <button
          onClick={() => navigate("/sensors")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          Quản lý cảm biến
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          Cài đặt
        </button>
      </nav>

      <div className="p-4 border-t border-gray-700 text-center">
        {user && (
          <>
            <div className="flex items-center justify-center gap-3 mb-4">
              <img
                src={user.photo}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <p className="font-semibold">{user.name}</p>
            </div>

            <button
              className="text-sm text-white px-6 py-2 rounded-2xl font-bold bg-red-600 hover:bg-red-700 transition"
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
