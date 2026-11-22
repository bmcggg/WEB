import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAPI, assetUrl } from "../services/api";

export default function WidgetFriendSuggestions({ onNotice }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentMap, setSentMap] = useState({});

  useEffect(() => {
    let active = true;
    fetchAPI("/social/friends/suggestions?limit=4")
      .then((res) => {
        if (active) setSuggestions(res.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAddFriend = async (id, name) => {
    try {
      await fetchAPI(`/social/friends/request/${id}`, { method: "POST" });
      setSentMap((prev) => ({ ...prev, [id]: true }));
      if (onNotice) {
        onNotice({
          type: "success",
          title: "Đã gửi lời mời!",
          message: `Lời mời kết bạn đã được gửi tới ${name}.`,
        });
      }
    } catch (err) {
      if (onNotice) {
        onNotice({
          type: "error",
          title: "Lỗi gửi lời mời",
          message: err.message || "Không thể gửi lời mời kết bạn.",
        });
      }
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        padding: "16px",
        boxShadow: "var(--shadow)",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
          Gợi ý kết bạn
        </h4>
        <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>
          Thuật toán Graph
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {suggestions.map((user) => {
          const avatarStyle = user.avatar
            ? { backgroundImage: `url('${assetUrl(user.avatar)}')` }
            : {};
          const initial = (user.full_name || user.username || "U").charAt(0).toUpperCase();
          const isSent = sentMap[user.id];

          return (
            <div
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                <Link to={`/profile?id=${user.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "var(--primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "16px",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      flexShrink: 0,
                      ...avatarStyle,
                    }}
                  >
                    {!user.avatar && initial}
                  </div>
                </Link>

                <div style={{ minWidth: 0 }}>
                  <Link
                    to={`/profile?id=${user.id}`}
                    style={{
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.full_name || user.username}
                  </Link>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {user.mutual_count > 0 ? `🔗 ${user.mutual_count} bạn chung` : "Gợi ý cho bạn"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddFriend(user.id, user.full_name || user.username)}
                disabled={isSent}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isSent ? "var(--bg-hover)" : "var(--primary)",
                  color: isSent ? "var(--text-secondary)" : "#fff",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: isSent ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background-color 0.15s ease",
                }}
              >
                {isSent ? "Đã gửi" : "Thêm bạn"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
