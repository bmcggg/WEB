import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/NavBar";
import PostCard from "../../components/PostCard";
import { fetchAPI } from "../../services/api";
import styles from './feed.module.css';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();
  let user = null;
  try { user = JSON.parse(localStorage.getItem("fella_user") || "null"); } catch { user = null; }

  useEffect(() => {
    const token = localStorage.getItem("fella_token");
    if (!token || !user) {
      navigate("/login");
      return;
    }
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await fetchAPI("/posts");
      setPosts(response.data || []);
    } catch (err) {
      console.error(err);
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung bài viết!");
      return;
    }
    try {
      await fetchAPI("/posts", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          content: content,
          privacy: "PUBLIC",
        }),
      });
      setContent("");
      loadPosts();
    } catch (err) {
      alert("Đăng bài thất bại: " + err.message);
    }
  };

  return (
    <div>
      <Navbar />
      <main className={styles.feedContainer}>
        <div className={styles.createPostCard}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bạn đang nghĩ gì thế?"
          ></textarea>
          <div className={styles.postActions}>
            <button onClick={handleCreatePost} className={styles.btnPost}>
              Đăng bài
            </button>
          </div>
        </div>

        <div id="postsContainer">
          {loading ? (
            <p className={styles.statusText}>
              Đang tải bài viết...
            </p>
          ) : loadError ? (
            <p className={styles.statusText} role="alert" style={{ color: "red" }}>Lỗi: {loadError}</p>
          ) : posts.length === 0 ? (
            <p className={styles.statusText}>
              Chưa có bài viết nào.
            </p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </main>
    </div>
  );
}
