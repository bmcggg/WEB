import Navbar from "../../components/NavBar";
import styles from "./chat.module.css";

export default function Chat() {
  return (
    <div className={styles.chatPage}>
      <Navbar />

      <main className={styles.chatLayout}>
        <aside className={styles.sidebar} aria-label="Danh sách đoạn chat">
          <div className={styles.sidebarHeader}>
            <div>
              <h1>Đoạn chat</h1>
              <p>Kết nối với bạn bè</p>
            </div>
            <button
              className={styles.newChatButton}
              type="button"
              aria-label="Tạo đoạn chat mới"
              title="Tạo đoạn chat mới"
              disabled
            >
              +
            </button>
          </div>

          <label className={styles.searchBox}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
            <input type="search" placeholder="Tìm kiếm trên Messenger" disabled />
          </label>

          <div className={styles.emptyConversations}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path d="M24 5C13.5 5 5 12.7 5 22.2c0 5.2 2.6 9.7 6.8 12.7L10 43l9.1-4.4c1.6.4 3.2.6 4.9.6 10.5 0 19-7.7 19-17.1S34.5 5 24 5Z" />
                <path d="m14.5 28.5 7-7.5 5.1 4 7-7.5-7 11-5.1-4-7 4Z" />
              </svg>
            </div>
            <h2>Chưa có đoạn chat nào</h2>
            <p>Các cuộc trò chuyện của bạn sẽ xuất hiện ở đây.</p>
          </div>
        </aside>

        <section className={styles.conversation} aria-label="Nội dung trò chuyện">
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon} aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <path d="M32 6C17.1 6 5 16.9 5 30.3c0 7.3 3.7 13.7 9.7 18.1L12 59l13-6.3c2.2.6 4.6.9 7 .9 14.9 0 27-10.9 27-24.3S46.9 6 32 6Z" />
                <path d="m17.5 39.2 10-10.7 7.3 5.7 10-10.7-10 15.7-7.3-5.7-10 5.7Z" />
              </svg>
            </div>
            <h2>Chào mừng đến với Tin nhắn</h2>
            <p>Chọn một đoạn chat để bắt đầu trò chuyện với bạn bè.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
