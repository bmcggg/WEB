import React, { useEffect, useRef, useState } from "react";
import { fetchAPI, assetUrl } from "../services/api";
import styles from "./NoticeModal.module.css";

export default function SocialGraphModal({ isOpen, targetUserId, onClose }) {
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !targetUserId) return;
    setLoading(true);
    setError(null);

    fetchAPI(`/social/graph/${targetUserId}`)
      .then((res) => {
        setData(res.data || { nodes: [], edges: [] });
      })
      .catch((err) => {
        setError(err.message || "Không thể tải đồ thị mạng lưới bạn bè.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, targetUserId]);

  // Vẽ đồ thị quả bóng tròn trên Canvas
  useEffect(() => {
    if (loading || !data.nodes.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Phân bổ tọa độ hình tròn quanh nút trung tâm (me)
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const nodesWithPos = data.nodes.map((node, index) => {
      if (node.group === "me") {
        return { ...node, x: centerX, y: centerY };
      }
      const otherCount = data.nodes.length - 1;
      const angle = (index / otherCount) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    const nodeMap = new Map(nodesWithPos.map((n) => [n.id, n]));

    ctx.clearRect(0, 0, width, height);

    // 1. Vẽ các đường nối (Edges)
    ctx.lineWidth = 1.5;
    data.edges.forEach((edge) => {
      const source = nodeMap.get(edge.from);
      const target = nodeMap.get(edge.to);
      if (source && target) {
        ctx.beginPath();
        ctx.strokeStyle = edge.label === "bạn bè" ? "rgba(24, 119, 242, 0.6)" : "rgba(66, 183, 42, 0.4)";
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    });

    // 2. Vẽ các nút tròn (Nodes)
    nodesWithPos.forEach((node) => {
      ctx.beginPath();
      const nodeRadius = node.group === "me" ? 28 : 20;
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = node.group === "me" ? "#1877f2" : "#42b72a";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Vẽ chữ cái đại diện
      ctx.fillStyle = "#ffffff";
      ctx.font = node.group === "me" ? "bold 16px sans-serif" : "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const initial = (node.label || "U").charAt(0).toUpperCase();
      ctx.fillText(initial, node.x, node.y);

      // Nhãn tên phía dưới
      ctx.fillStyle = "var(--text-primary, #1c1e21)";
      ctx.font = "12px sans-serif";
      ctx.fillText(node.label.length > 10 ? node.label.slice(0, 10) + "…" : node.label, node.x, node.y + nodeRadius + 14);
    });
  }, [loading, data]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modal}
        style={{ maxWidth: "680px", width: "95%", textAlign: "left", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "14px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
              🌐 Mạng lưới đồ thị bạn bè (Graph Database Visualizer)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
              Dữ liệu được truy vấn trực tiếp từ bảng Graph Node & Edge bằng cú pháp SQL MATCH()
            </p>
          </div>
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

        {loading && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px 0" }}>
            Đang tải dữ liệu đồ thị mạng lưới...
          </p>
        )}

        {error && (
          <p style={{ textAlign: "center", color: "#fa3e3e", padding: "30px 0" }}>
            {error}
          </p>
        )}

        {!loading && !error && data.nodes.length <= 1 && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px 0" }}>
            Chưa có đủ liên kết bạn bè để hiển thị mạng lưới đồ thị.
          </p>
        )}

        {!loading && !error && data.nodes.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <canvas
              ref={canvasRef}
              width={620}
              height={380}
              style={{
                borderRadius: "8px",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                maxWidth: "100%",
              }}
            />
            <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#1877f2", display: "inline-block" }} />
                Tài khoản đang xem
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#42b72a", display: "inline-block" }} />
                Bạn bè trực tiếp
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "16px", height: "2px", backgroundColor: "#1877f2", display: "inline-block" }} />
                Liên kết bạn bè (Cạnh Graph)
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
