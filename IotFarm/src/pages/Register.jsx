import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  db,
  doc,
  setDoc,
} from "../firebase";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("❌ Mật khẩu không khớp.");
      return;
    }
    const passwordRegex = /^[A-Za-z0-9]{6,}$/;
    if (!passwordRegex.test(password)) {
      setMessage(
        "❌ Mật khẩu phải có ít nhất 6 ký tự và chỉ bao gồm chữ cái và số."
      );
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await auth.signOut();

      await sendEmailVerification(user);

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          photo: user.photoURL || "",
          type: "email",
          role: "user",
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

  

      Swal.fire({
        icon: "success",
        title: "Đăng ký thành công!",
        text: "Vui lòng kiểm tra email để xác nhận trước khi đăng nhập.",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/login"); 
      });
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      Swal.fire({
        icon: "error",
        title: "Lỗi đăng ký",
        text: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-green-100">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-140">
        <h2 className="text-3xl font-extrabold text-center text-green-600 mb-2">
          Hệ Thống Quản Lí Nông Trại
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Vui lòng đăng ký tài khoản mới
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg outline-none transition"
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg outline-none transition"
            required
          />
          <input
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg outline-none transition"
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Đăng ký
          </button>

          {message && (
            <p className="text-center mt-3 text-sm text-red-500">{message}</p>
          )}

          <p className="text-center mt-4 text-sm">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-green-600 hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
