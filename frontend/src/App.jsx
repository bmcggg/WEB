import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Feed from "./pages/feed/Feed";
import Profile from "./pages/profile/Profile";
import SavedPosts from "./pages/feed/SavedPosts";
import SessionGuard from "./components/SessionGuard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/feed" element={<SessionGuard><Feed /></SessionGuard>} />
        <Route path="/profile" element={<SessionGuard><Profile /></SessionGuard>} />
        <Route path="/saved" element={<SessionGuard><SavedPosts /></SessionGuard>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
