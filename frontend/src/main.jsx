import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import './styles/style.css';
import { initTheme } from "./utils/theme";

// Khởi tạo giao diện Sáng / Tối từ localStorage
initTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
