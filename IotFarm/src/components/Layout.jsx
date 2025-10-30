import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";

const Layout = () => {
  const [isOpen, setIsOpen] = useState(false); 

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Nội dung chính */}
      <main className="flex-1 p-4 md:ml-64 transition-all duration-300">
        {/* Nút mở menu chỉ hiện trên mobile */}
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden mb-4 p-2 bg-white rounded shadow text-gray-700"
        >
          <Menu size={24} />
        </button>

        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
