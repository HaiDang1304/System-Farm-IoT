import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, signInWithPopup, db, doc, setDoc } from "../firebase";

const Login = ({ setIsAuth }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Đăng nhập tài khoản thường
  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "1234") {
      localStorage.setItem("auth", "true");
      setIsAuth(true);
      navigate("/home");
    } else {
      alert("Sai tài khoản hoặc mật khẩu!");
    }
  };

  // Đăng nhập bằng Google
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // ✅ Lưu trạng thái vào localStorage
      localStorage.setItem("auth", "true");
      localStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
        })
      );

      // ✅ Lưu thông tin user vào Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
          lastLogin: new Date().toISOString(),
        },
        { merge: true } // merge: cập nhật nếu user đã tồn tại
      );

      setIsAuth(true);
      navigate("/home");
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-96"
      >
        <h2 className="text-2xl font-bold text-center mb-6">Đăng nhập</h2>

        {/* Form đăng nhập thường */}
        <input
          type="text"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded mb-4"
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded mb-4"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition"
        >
          Đăng nhập
        </button>

        {/* Divider */}
        <div className="my-4 text-center text-gray-500">hoặc</div>

        {/* Nút đăng nhập Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 p-3 rounded hover:bg-gray-100"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Đăng nhập với Google
        </button>
      </form>
    </div>
  );
};

export default Login;
