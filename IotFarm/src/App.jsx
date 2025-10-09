import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Register from "./pages/Register";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <Router>
      <Routes>
      
        <Route path="/login" element={currentUser ? <Navigate to="/home" /> : <Login />}/>

        <Route path="/register" element={currentUser ? <Navigate to="/home" /> : <Register />} />
        <Route path="/home" element={ currentUser ? ( <Layout> <Home /> </Layout> ) : ( <Navigate to="/login" /> ) } />

      
        <Route path="/sensors" element={ currentUser ? ( <Layout> <div>Trang quản lý cảm biến</div> </Layout> ) : ( <Navigate to="/login" /> )  }/>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
