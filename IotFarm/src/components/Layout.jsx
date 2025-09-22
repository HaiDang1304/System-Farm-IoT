import React from "react";
import Sidebar from "./Sidebar";

const Layout = ({ children, setIsAuth }) => {
  return (
    <div className="flex">
      <Sidebar setIsAuth={setIsAuth} />

      <main className=" ml-64 flex-1 bg-gray-100 p-6 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
