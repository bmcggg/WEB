import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/NavBar";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationApi";
import styles from "./notification.module.css";

function formatTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getNotificationText(notification) {
  const name = notification.sender?.full_name || notification.sender?.username || "Ai đó";
  switch (notification.type) {
    case "REACTED":
      return `${name} đã bày tỏ cảm xúc về bài viết của bạn.`;
    case "COMMENTED":
      return `${name} đã bình luận về bài viết của bạn.`;
    case "FOLLOWED":
      return `${name} đã bắt đầu theo dõi bạn.`;
    case "MESSAGED":
      return `${name} đã gửi cho bạn một tin nhắn.`;
    default:
      return `${name} có hoạt động mới.`;
  }
}

function getNotificationLink(notification) {
  switch (notification.type) {
    case "REACTED":
    case "COMMENTED":
      return notification.post_id ? `/feed` : null;
    case "FOLLOWED":
      return notification.sender_id ? `/profile?id=${notification.sender_id}` : null;
    case "MESSAGED":
      return "/chat";
    default:
      return null;
  }
}

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getNotifications()
      .then(({ items, unreadCount: count }) => {
        if (!active) return;
        setNotifications(items);
        setUnreadCount(count);
        setError("");
      })
      .catch((err) => {
        if (active) setError(err.message || "Không thể tải thông báo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);
  const visibleNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, filter]);

  const handleMarkRead = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationRead(id);
    } catch (err) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 0 } : n))
      );
      setUnreadCount((prev) => prev + 1);
      setError(err.message || "Không thể cập nhật thông báo.");
    }
  };

  const handleMarkAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.is_read).length);
      setError(err.message || "Không thể cập nhật thông báo.");
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Thông báo</h1>
              <p className={styles.subtitle}>
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : "Bạn đã xem hết thông báo"}
              </p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${filter === "unread" ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter("unread")}
              >
                Chưa đọc
              </button>
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                Đánh dấu đã đọc
              </button>
            </div>
            {error && (
              <p className={styles.errorBanner} role="alert">
                {error}
              </p>
            )}
          </header>

          <ul className={styles.list}>
            {loading && <li className={styles.emptyState}>Đang tải thông báo...</li>}
            {!loading && visibleNotifications.length === 0 && (
              <li className={styles.emptyState}>Không có thông báo nào.</li>
            )}
            {!loading &&
              visibleNotifications.map((notification) => {
                const text = getNotificationText(notification);
                const link = getNotificationLink(notification);
                const initials = (notification.sender?.full_name || notification.sender?.username || "U")
                  .charAt(0)
                  .toUpperCase();
                const content = (
                  <div className={styles.itemInner}>
                    <div className={styles.avatar}>{initials}</div>
                    <div className={styles.body}>
                      <p className={styles.text}>{text}</p>
                      <span className={styles.time}>{formatTime(notification.created_at)}</span>
                    </div>
                    {!notification.is_read && <span className={styles.dot} aria-label="Chưa đọc" />}
                  </div>
                );

                return (
                  <li
                    key={notification.id}
                    className={`${styles.item} ${!notification.is_read ? styles.itemUnread : ""}`}
                  >
                    {link ? (
                      <Link
                        to={link}
                        className={styles.itemLink}
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={styles.itemButton}
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      </main>
    </>
  );
}
