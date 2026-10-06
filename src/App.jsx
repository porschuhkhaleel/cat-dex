import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Auth/LoginForm";
import Signup from "./components/Auth/SignUpForm";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import CameraCapture from "./components/Camera/CameraCapture";
import Collection from "./components/Collection";
import { useAuth } from "./contexts/AuthContext";

function Home() {
  const { logout } = useAuth();
  const [tab, setTab] = useState("camera");

  const tabClass = (active) =>
    `px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
      active ? "bg-white text-black" : "text-white/70"
    }`;

  return (
    <div className="h-full">
      {tab === "camera" ? <CameraCapture /> : <Collection />}

      <button
        onClick={logout}
        className="fixed top-4 right-4 z-40 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1.5"
      >
        Log out
      </button>

      <nav className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex gap-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 p-1.5 shadow-lg">
          <button className={tabClass(tab === "camera")} onClick={() => setTab("camera")}>
            Camera
          </button>
          <button className={tabClass(tab === "collection")} onClick={() => setTab("collection")}>
            Collection
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}