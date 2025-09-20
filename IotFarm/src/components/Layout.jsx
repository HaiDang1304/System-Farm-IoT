import React from "react";
import Sidebar from "./Sidebar";

const Layout = ({ children, setIsAuth }) => {
  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar setIsAuth={setIsAuth} />

      {/* Nội dung chính */}
      <main className="flex-1 bg-gray-100 p-6 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
