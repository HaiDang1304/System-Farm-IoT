import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  db,
  doc,
  setDoc,
} from "../firebase";
import Swal from "sweetalert2";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");

  // ====== Xử lý nhập liệu ======
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ====== Xử lý đăng ký ======
  const handleRegister = async (e) => {
    e.preventDefault();

    // Kiểm tra mật khẩu
    if (form.password !== form.confirmPassword) {
      setMessage("Mật khẩu không khớp!");
      return;
    }
    const passwordRegex = /^[A-Za-z0-9]{6,}$/;
    if (!passwordRegex.test(form.password)) {
      setMessage(
        "Mật khẩu phải có ít nhất 6 ký tự và chỉ bao gồm chữ cái và số."
      );
      return;
    }

    try {
      // Tạo tài khoản Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      // Gửi email xác minh
      await sendEmailVerification(user);

      // Lưu thông tin vào Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          photo: user.photoURL || "https://ibb.co/gMKLy4v5",
          type: "email",
          role: "user",
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Đăng xuất để chờ xác minh
      await auth.signOut();

      // Thông báo
      Swal.fire({
        icon: "success",
        title: "Đăng ký thành công!",
        text: "Vui lòng kiểm tra email để xác minh trước khi đăng nhập.",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/login");
      });
    } catch (error) {
      let errorMsg = "Đã xảy ra lỗi. Vui lòng thử lại.";
      if (error.code === "auth/email-already-in-use") {
        errorMsg =
          "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Email không hợp lệ. Vui lòng nhập lại.";
      } else if (error.code === "auth/weak-password") {
        errorMsg = "Mật khẩu quá yếu. Hãy chọn mật khẩu mạnh hơn.";
      }

      Swal.fire({
        icon: "error",
        title: "Lỗi đăng ký",
        text: errorMsg,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-100 to-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-center text-green-600 mb-2">
          Hệ Thống Quản Lý Nông Trại
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Tạo tài khoản mới để bắt đầu
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-300 focus:outline-none"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-300 focus:outline-none"
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-300 focus:outline-none"
            required
          />

          {message && (
            <p className="text-center text-sm text-red-500">{message}</p>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Đăng ký
          </button>

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
