import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/NavBar";
import styles from "./notification.module.css";

// Mock data shaped to match DB table: notifications (+ joined sender info).
// type: REACTED | COMMENTED | FOLLOWED | MESSAGED
// Replace loaders/actions with fetchAPI calls when backend is ready.
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: "REACTED",
    sender_id: 2,
    receiver_id: 1,
    post_id: 101,
    comment_id: null,
    message_id: null,
    is_read: 0,
    created_at: "2026-11-19T03:30:00Z",
    sender: { id: 2, username: "minhanh", full_name: "Nguyễn Minh Anh", avatar: null },
  },
  {
    id: 2,
    type: "COMMENTED",
    sender_id: 3,
    receiver_id: 1,
    post_id: 101,
    comment_id: 55,
    message_id: null,
    is_read: 0,
    created_at: "2026-11-19T02:10:00Z",
    sender: { id: 3, username: "quocbao", full_name: "Trần Quốc Bảo", avatar: null },
  },
  {
    id: 3,
    type: "FOLLOWED",
    sender_id: 4,
    receiver_id: 1,
    post_id: null,
    comment_id: null,
    message_id: null,
    is_read: 1,
    created_at: "2026-11-18T14:05:00Z",
    sender: { id: 4, username: "thuha", full_name: "Lê Thu Hà", avatar: null },
  },
  {
    id: 4,
    type: "MESSAGED",
    sender_id: 5,
    receiver_id: 1,
    post_id: null,
    comment_id: null,
    message_id: 403,
    is_read: 1,
    created_at: "2026-11-18T09:20:00Z",
    sender: { id: 5, username: "duclong", full_name: "Phạm Đức Long", avatar: null },
  },
];

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

async function fetchNotifications() {
  // TODO: return fetchAPI('/notifications');
  return MOCK_NOTIFICATIONS.map((n) => ({ ...n }));
}

async function markNotificationRead(id) {
  // TODO: return fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' });
  return { id, ok: true };
}

async function markAllNotificationsRead() {
  // TODO: return fetchAPI('/notifications/read-all', { method: 'PATCH' });
  return { ok: true };
}

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((data) => {
        if (!active) return;
        setNotifications(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, filter]);

  const handleMarkRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    markNotificationRead(id).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    markAllNotificationsRead().catch(() => {});
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
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã xem hết thông báo"}
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
