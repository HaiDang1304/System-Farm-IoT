import React from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="flex">
      <Sidebar />
      <main className=" ml-64 flex-1 bg-gray-100 p-6 min-h-screen">
        <Outlet /> 
      </main>
    </div>
  );
};

export default Layout;
