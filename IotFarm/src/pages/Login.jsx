import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  provider,
  signInWithPopup,
  db,
  doc,
  setDoc,
  signInWithEmailAndPassword,
} from "../firebase";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const Login = () => {
  const [email, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await user.reload();

      if (!user.emailVerified) {
        await Swal.fire({
          icon: "warning",
          title: "Email chưa xác minh",
          text: "Vui lòng kiểm tra hộp thư và xác minh email trước khi đăng nhập.",
        });
       await auth.signOut(); 
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Đăng nhập thành công!",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        navigate("/home", { replace: true });
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Đăng nhập thất bại",
        text: error.message,
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      let photoURL = user.photoURL;
      if (photoURL && photoURL.includes("/a/")) {
        photoURL = photoURL.replace("/a/", "/a-/");
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photo: photoURL,
          type: "google",
          role: "user",
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      );

      Swal.fire({
        icon: "success",
        title: "Đăng nhập Google thành công!",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        navigate("/home", { replace: true });
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Lỗi đăng nhập Google",
        text: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-green-100">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-140">
        <h2 className="text-3xl font-extrabold text-center text-blue-600 mb-2">
          Hệ Thống Quản Lí Nông Trại
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Vui lòng đăng nhập để tiếp tục
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Nhập vào Email"
            value={email}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg outline-none transition"
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg outline-none transition"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Đăng nhập
          </button>
          <p className="text-center mt-4 text-sm">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </form>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300" />
          <span className="px-3 text-gray-500 text-sm">hoặc</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 p-3 rounded-lg hover:bg-gray-100 transition"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="font-medium">Đăng nhập với Google</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
