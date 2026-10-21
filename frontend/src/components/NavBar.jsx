import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import styles from "./navbar.module.css";

export default function Navbar({ compact = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const chatRef = useRef(null);
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("fella_user") || "{}") || {};
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    if (!chatOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!chatRef.current?.contains(event.target)) setChatOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setChatOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [chatOpen]);

  const handleLogout = () => {
    localStorage.removeItem("fella_token");
    localStorage.removeItem("fella_user");
    navigate("/login");
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.logo} onClick={() => navigate("/feed")}>
        Fella
      </div>

      <div className={styles.userInfo}>
        <div className={styles.chatMenu} ref={chatRef}>
          <button
            type="button"
            className={`${styles.chatLink}${chatOpen || location.pathname === "/chat" ? ` ${styles.chatLinkActive}` : ""}`}
            aria-label="Tin nhắn"
            aria-expanded={chatOpen}
            aria-controls="chat-popover"
            onClick={() => setChatOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3C6.9 3 3 6.4 3 10.7c0 2.3 1.2 4.3 3.2 5.7L5.5 21l5-2.1c.5.1 1 .1 1.5.1 5.1 0 9-3.4 9-7.7S17.1 3 12 3Zm-4 8.7a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
            </svg>
            <span>Tin nhắn</span>
          </button>

          {chatOpen && (
            <section
              className={styles.chatPopover}
              id="chat-popover"
              aria-label="Tin nhắn"
            >
              <header className={styles.chatPopoverHeader}>
                <h2>Đoạn chat</h2>
                <button
                  type="button"
                  className={styles.expandChatButton}
                  onClick={() => {
                    setChatOpen(false);
                    navigate("/chat");
                  }}
                  aria-label="Mở rộng chat toàn trang"
                  title="Mở rộng chat toàn trang"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 4h6v6M20 4l-8 8M10 20H4v-6m0 6 8-8" />
                  </svg>
                </button>
              </header>
              <div className={styles.chatPopoverSearch}>Tìm kiếm trên Messenger</div>
              <div className={styles.chatPopoverEmpty}>
                <span className={styles.chatPopoverIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3C7 3 3 6.4 3 10.6c0 2.3 1.2 4.3 3.2 5.7L5.5 21l5-2.1c.5.1 1 .1 1.5.1 5 0 9-3.4 9-7.6S17 3 12 3Z" />
                    <path d="m7.5 13.5 3-3 2.2 1.7 3.8-4" />
                  </svg>
                </span>
                <strong>Chưa có đoạn chat nào</strong>
                <span>Các cuộc trò chuyện sẽ xuất hiện ở đây.</span>
              </div>
            </section>
          )}
        </div>

        {!compact && (
          <Link to="/profile" className={styles.userProfileLink}>
            <div
              className={`${styles.avatar} ${styles.avatarSm}`}
              style={
                user.avatar ? { backgroundImage: `url('${user.avatar}')` } : {}
              }
            >
              {!user.avatar &&
                (user.full_name || user.username || "U")
                  .charAt(0)
                  .toUpperCase()}
            </div>
            <span className={styles.userName}>
              {user.full_name || user.username || "Xin chào!"}
            </span>
          </Link>
        )}

        <button onClick={handleLogout} className={styles.btnLogout}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
