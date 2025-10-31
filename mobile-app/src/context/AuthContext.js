import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { auth, db } from "../services/firebase";

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);

  const googleConfig = Constants.expoConfig?.extra?.googleAuth ?? {};

  const [googleRequest, , promptGoogleLogin] = Google.useIdTokenAuthRequest({
    clientId: googleConfig.expoClientId || googleConfig.webClientId,
    iosClientId: googleConfig.iosClientId,
    androidClientId: googleConfig.androidClientId,
    webClientId: googleConfig.webClientId,
    expoClientId: googleConfig.expoClientId,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await firebaseUser.reload();
        } catch (error) {
          console.warn("Không thể tải lại trạng thái người dùng:", error);
        }

        if (firebaseUser.emailVerified) {
          setUser(firebaseUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const persistUserProfile = async (firebaseUser, providerType, extra = {}) => {
    if (!firebaseUser?.uid) return;

    const displayName =
      extra.name ||
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "Người dùng mới";

    const profilePayload = {
      uid: firebaseUser.uid,
      name: displayName,
      email: extra.email || firebaseUser.email || "",
      photo: extra.photo ?? firebaseUser.photoURL ?? "",
      type: extra.type || providerType,
      role: extra.role || "user",
      emailVerified: firebaseUser.emailVerified ?? false,
      lastLogin: new Date().toISOString(),
      ...extra,
    };

    await setDoc(doc(db, "users", firebaseUser.uid), profilePayload, {
      merge: true,
    });
  };

  const login = async (email, password) => {
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      await credential.user.reload();

      if (!credential.user.emailVerified) {
        await signOut(auth);
        throw new Error(
          "Email chưa được xác minh. Vui lòng kiểm tra hộp thư và xác nhận tài khoản."
        );
      }

      await persistUserProfile(credential.user, "password");
      setUser(credential.user);
      return credential.user;
    } catch (error) {
      console.warn("Auth login error:", error);
      if (error?.code === "auth/network-request-failed") {
        throw new Error(
          "Lỗi mạng khi kết nối tới Firebase. Vui lòng kiểm tra kết nối Internet và thời gian hệ thống."
        );
      }
      throw error;
    }
  };

  const register = async (email, password) => {
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await persistUserProfile(credential.user, "password", {
        createdAt: new Date().toISOString(),
        type: "password",
      });
      await sendEmailVerification(credential.user);
      await signOut(auth);
      setUser(null);
      return credential.user;
    } catch (error) {
      console.warn("Auth register error:", error);
      if (error?.code === "auth/network-request-failed") {
        throw new Error(
          "Lỗi mạng khi kết nối tới Firebase. Vui lòng kiểm tra kết nối Internet và thử lại."
        );
      }
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    if (!googleRequest) {
      throw new Error("Google Sign-In chưa sẵn sàng. Vui lòng thử lại sau.");
    }

    try {
      setAuthError(null);
      const result = await promptGoogleLogin();

      if (!result || result.type !== "success") {
        throw new Error("Đăng nhập Google đã bị hủy hoặc không nhận token.");
      }

      const idToken = result.params?.id_token;
      if (!idToken) {
        throw new Error("Không nhận được token từ Google.");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const authResult = await signInWithCredential(auth, credential);

      await persistUserProfile(authResult.user, "google", {
        type: "google",
      });
      setUser(authResult.user);
      return authResult.user;
    } catch (error) {
      console.warn("Auth Google login error:", error);
      setAuthError(error);
      if (error?.code === "auth/network-request-failed") {
        throw new Error(
          "Lỗi mạng khi kết nối tới Firebase. Vui lòng kiểm tra kết nối Internet và thử lại."
        );
      }
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      register,
      loginWithGoogle,
      logout,
      authError,
    }),
    [user, initializing, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
};
