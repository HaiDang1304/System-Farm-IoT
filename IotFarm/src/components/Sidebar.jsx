import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Sidebar = ({ setIsAuth }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));

  // Hàm xử lý URL ảnh Google
  const fixGooglePhotoUrl = (photoUrl) => {
    if (!photoUrl) {
      return "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    }

    // Loại bỏ khoảng trắng
    let cleanUrl = photoUrl.trim().replace(/\s+/g, "");

    // Kiểm tra nếu là URL Google Photos
    if (cleanUrl.includes("googleusercontent.com")) {
      // Loại bỏ phần /a-/ và thay bằng /a/
      cleanUrl = cleanUrl.replace("/a-/", "/a/");

      // Đảm bảo có size parameter (s96-c hoặc s400-c)
      if (!cleanUrl.includes("=s")) {
        cleanUrl = cleanUrl.split("=")[0] + "=s400-c";
      }
    }

    return cleanUrl;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userRef);

        let userData;
        if (docSnap.exists()) {
          const data = docSnap.data();
          userData = {
            name: data.name || data.email?.split("@")[0] || "Người dùng mới",
            photo: fixGooglePhotoUrl(data.photo || currentUser.photoURL),
          };
        } else {
          userData = {
            name:
              currentUser.displayName ||
              currentUser.email?.split("@")[0] ||
              "Người dùng mới",
            email: currentUser.email,
            photo: fixGooglePhotoUrl(currentUser.photoURL),
          };
        }

        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        console.log("User photo URL:", userData.photo);
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("auth");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Đăng xuất thất bại:", error);
    }
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col fixed h-screen">
      <div className="p-6 text-lg font-medium text-emerald-400 border-b border-gray-700 text-center">
        Hệ Thống Nông Nghiệp
      </div>

      <nav className="flex-1 p-4 overflow-y-auto space-y-2">
        <button
          onClick={() => navigate("/home")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 items-center"
        >
          <div className="flex gap-2 items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 inline-block mr-2 fill-current"
            >
              <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z" />
            </svg>
            <p className="text-md font-medium">Trang chủ</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/sensors")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          <div className="flex gap-2 items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-current"
            >
              <path d="M296.5 69.2C311.4 62.3 328.6 62.3 343.5 69.2L562.1 170.2C570.6 174.1 576 182.6 576 192C576 201.4 570.6 209.9 562.1 213.8L343.5 314.8C328.6 321.7 311.4 321.7 296.5 314.8L77.9 213.8C69.4 209.8 64 201.3 64 192C64 182.7 69.4 174.1 77.9 170.2L296.5 69.2zM112.1 282.4L276.4 358.3C304.1 371.1 336 371.1 363.7 358.3L528 282.4L562.1 298.2C570.6 302.1 576 310.6 576 320C576 329.4 570.6 337.9 562.1 341.8L343.5 442.8C328.6 449.7 311.4 449.7 296.5 442.8L77.9 341.8C69.4 337.8 64 329.3 64 320C64 310.7 69.4 302.1 77.9 298.2L112 282.4zM77.9 426.2L112 410.4L276.3 486.3C304 499.1 335.9 499.1 363.6 486.3L527.9 410.4L562 426.2C570.5 430.1 575.9 438.6 575.9 448C575.9 457.4 570.5 465.9 562 469.8L343.4 570.8C328.5 577.7 311.3 577.7 296.4 570.8L77.9 469.8C69.4 465.8 64 457.3 64 448C64 438.7 69.4 430.1 77.9 426.2z" />
            </svg>
            <p className="text-md font-medium">Quản lý cảm biến</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/settings")}
          className="w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          <div className="flex gap-2 items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-6 h-6 fill-current"
            >
              <path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z" />
            </svg>
            <p className="text-md font-medium">Cài đặt</p>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-gray-700 text-center">
        {user && (
          <>
            <div className="flex items-center justify-center gap-3 mb-4">
              <img
                src={user.photo}
                alt={user.name}
                onError={(e) => {
                  e.target.src =
                    "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                }}
                className="w-10 h-10 rounded-full border-2 border-white object-cover"
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
