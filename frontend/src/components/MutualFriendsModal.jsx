import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAPI, assetUrl } from "../services/api";
import styles from "./NoticeModal.module.css";

export default function MutualFriendsModal({ isOpen, targetUserId, onClose }) {
  const [mutuals, setMutuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !targetUserId) return;
    setLoading(true);
    setError(null);

    fetchAPI(`/social/friends/mutual/${targetUserId}`)
      .then((res) => {
        setMutuals(res.data || []);
      })
      .catch((err) => {
        setError(err.message || "Không thể tải danh sách bạn chung.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, targetUserId]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modal}
        style={{ maxWidth: "460px", textAlign: "left", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
            🔗 Bạn chung ({mutuals.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          {loading && (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px 0" }}>
              Đang tải danh sách bạn chung...
            </p>
          )}

          {error && (
            <p style={{ textAlign: "center", color: "#fa3e3e", padding: "16px 0" }}>
              {error}
            </p>
          )}

          {!loading && !error && mutuals.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "24px 0" }}>
              Chưa có bạn chung nào giữa hai bạn.
            </p>
          )}

          {!loading && !error && mutuals.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {mutuals.map((user) => {
                const avatarStyle = user.avatar
                  ? { backgroundImage: `url('${assetUrl(user.avatar)}')` }
                  : {};
                const initial = (user.full_name || user.username || "U").charAt(0).toUpperCase();

                return (
                  <div
                    key={user.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          backgroundColor: "var(--primary)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "18px",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          ...avatarStyle,
                        }}
                      >
                        {!user.avatar && initial}
                      </div>
                      <div>
                        <Link
                          to={`/profile?id=${user.id}`}
                          onClick={onClose}
                          style={{
                            fontWeight: "600",
                            fontSize: "15px",
                            color: "var(--text-primary)",
                            textDecoration: "none",
                          }}
                        >
                          {user.full_name || user.username}
                        </Link>
                        {user.bio && (
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/profile?id=${user.id}`}
                      onClick={onClose}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        backgroundColor: "var(--bg-hover)",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      Xem hồ sơ
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
