import { useNavigate, Link } from "react-router-dom";
import styles from "./navbar.module.css";
import { assetUrl, readUser } from '../services/api';

export default function Navbar({ compact = false }) {
  const navigate = useNavigate();
  const user = readUser() || {};

  const handleLogout = () => {
    localStorage.removeItem("fella_token");
    localStorage.removeItem("fella_user");
    navigate("/login");
  };

  return (
    <header className={styles.navbar}>
      <Link className={styles.logo} to="/feed">
        Fella
      </Link>

      <form className={styles.search} role="search" onSubmit={(event) => {
        event.preventDefault();
        const query = new FormData(event.currentTarget).get('q').trim();
        if (query) navigate('/search?' + new URLSearchParams({ q: query }));
      }}>
        <input type="search" name="q" aria-label="Tìm người dùng hoặc bài viết" placeholder="Tìm kiếm trên Fella" maxLength={100} required />
        <button type="submit">Tìm</button>
      </form>

      <div className={styles.userInfo}>
        <Link to="/saved" className={styles.userProfileLink}>Đã lưu</Link>
        <Link to="/chat" className={styles.chatLink}>Trò chuyện</Link>
        <Link to="/notifications" className={styles.Notifications}>Thông báo</Link>
        {!compact && (
          <Link to="/profile" className={styles.userProfileLink}>
            <div
              className={`${styles.avatar} ${styles.avatarSm}`}
              style={
                user.avatar ? { backgroundImage: `url('${assetUrl(user.avatar)}')` } : {}
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
