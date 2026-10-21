import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./feed.module.css";

const people = [
  { name: "Minh Anh", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces" },
  { name: "Quốc Bảo", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces" },
  { name: "Linh Đan", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=faces" },
  { name: "Hoàng Nam", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces" },
  { name: "Thu Hà", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces" },
];

const initialPosts = [
  { id: 1, person: people[0], time: "32 phút", text: "Một buổi sáng thật chill ☀️ Cà phê ngon, nhạc hay và một chút thời gian dành cho chính mình. Chúc mọi người một ngày thật nhiều năng lượng nhé!", image: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1000&auto=format&fit=crop", likes: 128, comments: 18, tag: "#morningvibes" },
  { id: 2, person: people[1], time: "1 giờ", text: "Cuối tuần trốn phố một chút 🌿 Có ai nhận ra đây là đâu không?", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1000&auto=format&fit=crop", likes: 86, comments: 12 },
  { id: 3, person: people[2], time: "3 giờ", text: "Những khoảnh khắc nhỏ làm nên một ngày tuyệt vời 💛", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1000&auto=format&fit=crop", likes: 54, comments: 7 },
];

const Icon = ({ name, size = 22 }) => {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></>,
    store: <><path d="M3 10v10h18V10M2 4h20l-2 6H4zM9 20v-6h6v6"/></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    like: <path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm0 0 4-8a3 3 0 0 1 3 3v3h5a2 2 0 0 1 2 2l-2 9a2 2 0 0 1-2 2H7"/>,
    comment: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>,
    share: <><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 12v8h14v-8"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

function Avatar({ person, size = "" }) {
  return <img className={`${styles.avatar} ${size ? styles[size] : ""}`} src={person.avatar} alt="" />;
}

export default function Feed() {
  const [posts, setPosts] = useState(initialPosts);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState([]);
  const visiblePosts = useMemo(() => posts.filter((post) => `${post.person.name} ${post.text}`.toLowerCase().includes(query.toLowerCase())), [posts, query]);

  const publish = () => {
    if (!draft.trim()) return;
    setPosts([{ id: Date.now(), person: { name: "Bạn", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377dade?w=120&h=120&fit=crop&crop=faces" }, time: "Vừa xong", text: draft.trim(), likes: 0, comments: 0 }, ...posts]);
    setDraft("");
  };
  const toggleLike = (id) => setLiked((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return <div className={styles.app}>
    <header className={styles.topbar}>
      <div className={styles.brandGroup}><Link to="/feed" className={styles.brand}>f</Link><label className={styles.search}><Icon name="search" size={19}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm trên Fella" /></label></div>
      <nav className={styles.mainNav} aria-label="Điều hướng"><a className={styles.navActive} href="#home" aria-label="Trang chủ"><Icon name="home"/></a><a href="#friends" aria-label="Bạn bè"><Icon name="users"/></a><a href="#video" aria-label="Video"><Icon name="video"/></a><a href="#market" aria-label="Marketplace"><Icon name="store"/></a><a href="#groups" aria-label="Nhóm"><Icon name="grid"/></a></nav>
      <div className={styles.topActions}><button className={styles.circleButton} aria-label="Menu"><Icon name="grid"/></button><button className={styles.circleButton} aria-label="Tin nhắn">✉</button><button className={styles.circleButton} aria-label="Thông báo">♧<i/></button><Avatar person={{ name:"Bạn", avatar:"https://images.unsplash.com/photo-1535713875002-d1d0cf377dade?w=120&h=120&fit=crop&crop=faces" }}/></div>
    </header>

    <div className={styles.layout}>
      <aside className={styles.leftSidebar}>
        <a className={styles.profileShortcut} href="#profile"><Avatar person={{ name:"Bạn", avatar:"https://images.unsplash.com/photo-1535713875002-d1d0cf377dade?w=120&h=120&fit=crop&crop=faces" }}/><strong>Nguyễn Minh</strong></a>
        <a href="#friends"><span className={styles.shortcutIcon}>👥</span><strong>Bạn bè</strong></a><a href="#memories"><span className={styles.shortcutIcon}>🕘</span><strong>Kỷ niệm</strong></a><a href="#saved"><span className={styles.shortcutIcon}>🔖</span><strong>Đã lưu</strong></a><a href="#groups"><span className={styles.shortcutIcon}>👨‍👩‍👧‍👦</span><strong>Nhóm</strong></a><a href="#video"><span className={styles.shortcutIcon}>▶️</span><strong>Video</strong></a><a href="#market"><span className={styles.shortcutIcon}>🛍️</span><strong>Marketplace</strong></a><a href="#more"><span className={styles.shortcutIcon}>⌄</span><strong>Xem thêm</strong></a>
        <div className={styles.sidebarRule}/><h3>Lối tắt của bạn</h3><a href="#design"><span className={styles.groupThumb}>🎨</span><strong>Hội mê thiết kế</strong></a><a href="#travel"><span className={styles.groupThumb}>🏕️</span><strong>Đi đâu cuối tuần?</strong></a><a href="#coffee"><span className={styles.groupThumb}>☕</span><strong>Chuyện cà phê</strong></a>
        <p className={styles.legal}>Quyền riêng tư · Điều khoản · Quảng cáo · Cookie · Fella © 2025</p>
      </aside>

      <main className={styles.feed}>
        <section className={styles.stories} aria-label="Tin"><article className={`${styles.story} ${styles.createStory}`}><img src="https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=300&h=480&fit=crop" alt=""/><button>+</button><strong>Tạo tin</strong></article>{people.slice(0,4).map((person, i) => <article className={styles.story} key={person.name}><img src={`https://images.unsplash.com/photo-${["1500530855697-b586d89ba3ee","1501785888041-af3ef285b470","1470252649378-9c29740c9fa8","1500534623283-312aade485b7"][i]}?w=300&h=480&fit=crop`} alt=""/><Avatar person={person} size="storyAvatar"/><strong>{person.name}</strong></article>)}</section>

        <section className={styles.composer}><div className={styles.composeTop}><Avatar person={{ name:"Bạn", avatar:"https://images.unsplash.com/photo-1535713875002-d1d0cf377dade?w=120&h=120&fit=crop&crop=faces" }}/><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) publish(); }} placeholder="Minh ơi, bạn đang nghĩ gì thế?" /></div><div className={styles.composeDivider}/><div className={styles.composeActions}><button><span>📹</span> Video trực tiếp</button><button><span>🖼️</span> Ảnh/video</button><button><span>😊</span> Cảm xúc/hoạt động</button>{draft.trim() && <button className={styles.publishButton} onClick={publish}>Đăng</button>}</div></section>

        <div className={styles.feedHeading}><h2>Bài viết mới</h2><button>⚙ Bộ lọc</button></div>
        {visiblePosts.map((post) => { const isLiked = liked.includes(post.id); return <article className={styles.post} key={post.id}><header className={styles.postHeader}><Avatar person={post.person}/><div className={styles.author}><strong>{post.person.name}</strong><span>{post.time} · 🌐</span></div><button className={styles.more} aria-label="Tùy chọn">···</button></header><p className={styles.postText}>{post.text} {post.tag && <a href="#tag">{post.tag}</a>}</p>{post.image && <img className={styles.postImage} src={post.image} alt="Ảnh bài viết"/>}<div className={styles.reactionSummary}><span className={styles.likeBubble}>👍</span><span> {post.likes + (isLiked ? 1 : 0)}</span><span className={styles.commentCount}>{post.comments} bình luận · 4 lượt chia sẻ</span></div><div className={styles.postDivider}/><div className={styles.postActions}><button className={isLiked ? styles.liked : ""} onClick={() => toggleLike(post.id)}><Icon name="like"/> Thích</button><button><Icon name="comment"/> Bình luận</button><button><Icon name="share"/> Chia sẻ</button></div><div className={styles.commentBox}><Avatar person={{ name:"Bạn", avatar:"https://images.unsplash.com/photo-1535713875002-d1d0cf377dade?w=120&h=120&fit=crop&crop=faces" }}/><input placeholder="Viết bình luận..."/></div></article>; })}
      </main>

      <aside className={styles.rightSidebar}><div className={styles.sponsoredHeader}><h3>Được tài trợ</h3><button aria-label="Tùy chọn">···</button></div><a className={styles.ad} href="#ad"><img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=360&h=240&fit=crop" alt="Đồng hồ phong cách tối giản"/><div><strong>Thời gian cho điều quan trọng</strong><span>timeless.vn</span></div></a><div className={styles.sideDivider}/><div className={styles.contactsHeader}><h3>Người liên hệ</h3><div><button aria-label="Tìm kiếm">⌕</button><button aria-label="Tùy chọn">···</button></div></div>{people.map((person, i) => <a className={styles.contact} href="#chat" key={person.name}><span className={styles.onlineAvatar}><Avatar person={person}/><i className={i < 3 ? styles.online : ""}/></span><strong>{person.name}</strong></a>)}</aside>
    </div>
  </div>;
}
