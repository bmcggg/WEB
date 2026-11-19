import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/NavBar";
import { readUser } from "../../services/api";
import styles from "./chat.module.css";

// Mock data shaped to match DB tables: conversations, conversation_members, messages.
// Replace loaders/actions with fetchAPI calls when backend is ready.
const MOCK_USERS = {
  2: { id: 2, username: "minhanh", full_name: "Nguyễn Minh Anh", avatar: null },
  3: { id: 3, username: "quocbao", full_name: "Trần Quốc Bảo", avatar: null },
  4: { id: 4, username: "thuha", full_name: "Lê Thu Hà", avatar: null },
  5: { id: 5, username: "duclong", full_name: "Phạm Đức Long", avatar: null },
};

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    type: "DIRECT",
    name: null,
    created_at: "2026-11-10T08:00:00Z",
    updated_at: "2026-11-19T03:24:00Z",
    members: [{ conversation_id: 1, user_id: 2, user: MOCK_USERS[2] }],
    last_message: {
      id: 104,
      sender_id: 2,
      conversation_id: 1,
      content: "Mai đi cafe không bạn?",
      sent_at: "2026-11-19T03:24:00Z",
    },
    unread_count: 2,
  },
  {
    id: 2,
    type: "DIRECT",
    name: null,
    created_at: "2026-11-08T08:00:00Z",
    updated_at: "2026-11-18T13:10:00Z",
    members: [{ conversation_id: 2, user_id: 3, user: MOCK_USERS[3] }],
    last_message: {
      id: 203,
      sender_id: 3,
      conversation_id: 2,
      content: "Ok mình gửi file sau.",
      sent_at: "2026-11-18T13:10:00Z",
    },
    unread_count: 0,
  },
  {
    id: 3,
    type: "DIRECT",
    name: null,
    created_at: "2026-11-05T08:00:00Z",
    updated_at: "2026-11-17T08:02:00Z",
    members: [{ conversation_id: 3, user_id: 4, user: MOCK_USERS[4] }],
    last_message: {
      id: 303,
      sender_id: 4,
      conversation_id: 3,
      content: "Cảm ơn bạn nhiều nha!",
      sent_at: "2026-11-17T08:02:00Z",
    },
    unread_count: 0,
  },
  {
    id: 4,
    type: "DIRECT",
    name: null,
    created_at: "2026-11-01T08:00:00Z",
    updated_at: "2026-11-16T02:22:00Z",
    members: [{ conversation_id: 4, user_id: 5, user: MOCK_USERS[5] }],
    last_message: {
      id: 403,
      sender_id: 5,
      conversation_id: 4,
      content: "Hẹn gặp cuối tuần.",
      sent_at: "2026-11-16T02:22:00Z",
    },
    unread_count: 0,
  },
];

const MOCK_MESSAGES_BY_CONVERSATION = {
  1: [
    { id: 101, sender_id: 2, conversation_id: 1, parent_message_id: null, content: "Chào bạn, dạo này thế nào rồi?", sent_at: "2026-11-19T02:10:00Z", media: [] },
    { id: 102, sender_id: null, conversation_id: 1, parent_message_id: null, content: "Mình ổn, đang làm project web nè.", sent_at: "2026-11-19T02:15:00Z", media: [] },
    { id: 103, sender_id: 2, conversation_id: 1, parent_message_id: null, content: "Nghe hay đó, cố lên nhé!", sent_at: "2026-11-19T02:18:00Z", media: [] },
    { id: 104, sender_id: 2, conversation_id: 1, parent_message_id: null, content: "Mai đi cafe không bạn?", sent_at: "2026-11-19T03:24:00Z", media: [] },
  ],
  2: [
    { id: 201, sender_id: null, conversation_id: 2, parent_message_id: null, content: "Bạn có tài liệu buổi học hôm trước không?", sent_at: "2026-11-18T13:01:00Z", media: [] },
    { id: 202, sender_id: 3, conversation_id: 2, parent_message_id: null, content: "Có chứ, để mình tìm lại đã.", sent_at: "2026-11-18T13:05:00Z", media: [] },
    { id: 203, sender_id: 3, conversation_id: 2, parent_message_id: null, content: "Ok mình gửi file sau.", sent_at: "2026-11-18T13:10:00Z", media: [] },
  ],
  3: [
    { id: 301, sender_id: 4, conversation_id: 3, parent_message_id: null, content: "Bạn review giúp mình bài post được không?", sent_at: "2026-11-17T07:30:00Z", media: [] },
    { id: 302, sender_id: null, conversation_id: 3, parent_message_id: null, content: "Được nha, mình xem xong góp ý liền.", sent_at: "2026-11-17T07:45:00Z", media: [] },
    { id: 303, sender_id: 4, conversation_id: 3, parent_message_id: null, content: "Cảm ơn bạn nhiều nha!", sent_at: "2026-11-17T08:02:00Z", media: [] },
  ],
  4: [
    { id: 401, sender_id: null, conversation_id: 4, parent_message_id: null, content: "Cuối tuần này có rảnh không?", sent_at: "2026-11-16T02:00:00Z", media: [] },
    { id: 402, sender_id: 5, conversation_id: 4, parent_message_id: null, content: "Rảnh nha, đi đâu đó không?", sent_at: "2026-11-16T02:20:00Z", media: [] },
    { id: 403, sender_id: 5, conversation_id: 4, parent_message_id: null, content: "Hẹn gặp cuối tuần.", sent_at: "2026-11-16T02:22:00Z", media: [] },
  ],
};

function formatListTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatMessageTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function getConversationDisplay(conversation, currentUserId) {
  if (conversation.type === "GROUP") {
    const name = conversation.name || "Nhóm chat";
    return { name, avatar: null, initials: name.charAt(0).toUpperCase() };
  }
  const otherMember =
    (conversation.members || []).find((m) => m.user_id !== currentUserId) ||
    (conversation.members || [])[0];
  const user = otherMember?.user || {};
  const name = user.full_name || user.username || "Người dùng";
  return {
    name,
    avatar: user.avatar || null,
    initials: name.charAt(0).toUpperCase(),
  };
}

async function fetchConversations() {
  // TODO: return fetchAPI('/conversations');
  return MOCK_CONVERSATIONS.map((c) => ({ ...c }));
}

async function fetchMessages(conversationId, currentUserId) {
  // TODO: return fetchAPI(`/conversations/${conversationId}/messages`);
  const list = MOCK_MESSAGES_BY_CONVERSATION[conversationId] || [];
  return list.map((m) => ({
    ...m,
    sender_id: m.sender_id == null ? currentUserId : m.sender_id,
  }));
}

async function sendMessage(conversationId, senderId, content) {
  // TODO: return fetchAPI(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
  return {
    id: Date.now(),
    sender_id: senderId,
    conversation_id: conversationId,
    parent_message_id: null,
    content,
    sent_at: new Date().toISOString(),
    media: [],
  };
}

async function markConversationRead(conversationId) {
  // TODO: return fetchAPI(`/conversations/${conversationId}/read`, { method: 'POST' });
  return { conversation_id: conversationId, ok: true };
}

export default function Chat() {
  const currentUser = readUser() || {};
  const currentUserId = currentUser.id != null ? Number(currentUser.id) : null;

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchConversations()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        setSelectedId((prev) => prev ?? (list[0]?.id ?? null));
      })
      .finally(() => {
        if (active) setLoadingConversations(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    if (Object.prototype.hasOwnProperty.call(messagesByConversation, selectedId)) return;
    let active = true;
    fetchMessages(selectedId, currentUserId)
      .then((msgs) => {
        if (!active) return;
        setMessagesByConversation((prev) => ({ ...prev, [selectedId]: msgs }));
      })
      .catch(() => {
        if (!active) return;
        setMessagesByConversation((prev) => ({ ...prev, [selectedId]: [] }));
      });
    return () => {
      active = false;
    };
  }, [selectedId, currentUserId, messagesByConversation]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const selectedMessages = messagesByConversation[selectedId] || [];
  const loadingMessages =
    selectedId != null &&
    !Object.prototype.hasOwnProperty.call(messagesByConversation, selectedId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, selectedMessages.length]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const display = getConversationDisplay(c, currentUserId);
      return display.name.toLowerCase().includes(q);
    });
  }, [conversations, query, currentUserId]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setMobileChatOpen(true);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
    markConversationRead(id).catch(() => {});
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || selectedId == null) return;
    const newMessage = await sendMessage(selectedId, currentUserId, text);

    setMessagesByConversation((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMessage],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              last_message: {
                id: newMessage.id,
                sender_id: newMessage.sender_id,
                conversation_id: newMessage.conversation_id,
                content: newMessage.content,
                sent_at: newMessage.sent_at,
              },
              updated_at: newMessage.sent_at,
            }
          : c
      )
    );
    setDraft("");
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.shell}>
          <aside
            className={`${styles.sidebar} ${
              mobileChatOpen ? styles.sidebarHiddenMobile : ""
            }`}
          >
            <div className={styles.sidebarHeader}>
              <h1 className={styles.title}>Đoạn chat</h1>
              <input
                className={styles.search}
                type="text"
                placeholder="Tìm kiếm cuộc trò chuyện"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ul className={styles.conversationList}>
              {loadingConversations && (
                <li className={styles.emptyState}>Đang tải cuộc trò chuyện...</li>
              )}
              {!loadingConversations &&
                filteredConversations.map((conversation) => {
                  const display = getConversationDisplay(conversation, currentUserId);
                  const last = conversation.last_message;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className={`${styles.conversationItem} ${
                          conversation.id === selectedId ? styles.conversationItemActive : ""
                        }`}
                        onClick={() => handleSelect(conversation.id)}
                      >
                        <div className={styles.avatarWrap}>
                          <div className={styles.avatar}>{display.initials}</div>
                        </div>
                        <div className={styles.conversationMeta}>
                          <div className={styles.conversationTop}>
                            <span className={styles.conversationName}>{display.name}</span>
                            <span className={styles.conversationTime}>
                              {formatListTime(last?.sent_at || conversation.updated_at)}
                            </span>
                          </div>
                          <div className={styles.conversationBottom}>
                            <span
                              className={`${styles.lastMessage} ${
                                conversation.unread_count ? styles.lastMessageUnread : ""
                              }`}
                            >
                              {last?.content || "Chưa có tin nhắn"}
                            </span>
                            {conversation.unread_count > 0 && (
                              <span className={styles.unreadBadge}>
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              {!loadingConversations && filteredConversations.length === 0 && (
                <li className={styles.emptyState}>Không tìm thấy cuộc trò chuyện</li>
              )}
            </ul>
          </aside>

          <section
            className={`${styles.chatPanel} ${
              mobileChatOpen ? styles.chatPanelActiveMobile : ""
            }`}
          >
            {selectedConversation ? (
              <>
                <header className={styles.chatHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setMobileChatOpen(false)}
                  >
                    Quay lại
                  </button>
                  <div className={styles.avatarWrap}>
                    <div className={styles.avatar}>
                      {getConversationDisplay(selectedConversation, currentUserId).initials}
                    </div>
                  </div>
                  <div className={styles.chatHeaderInfo}>
                    <div className={styles.chatHeaderName}>
                      {getConversationDisplay(selectedConversation, currentUserId).name}
                    </div>
                    <div className={styles.chatHeaderStatus}>
                      {selectedConversation.type === "GROUP" ? "Nhóm trò chuyện" : "Trò chuyện trực tiếp"}
                    </div>
                  </div>
                </header>

                <div className={styles.messages}>
                  {loadingMessages && selectedMessages.length === 0 && (
                    <div className={styles.emptyState}>Đang tải tin nhắn...</div>
                  )}
                  {selectedMessages.map((message) => {
                    const isMe = currentUserId != null && message.sender_id === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`${styles.messageRow} ${
                          isMe ? styles.messageRowMe : styles.messageRowThem
                        }`}
                      >
                        <div
                          className={`${styles.bubble} ${
                            isMe ? styles.bubbleMe : styles.bubbleThem
                          }`}
                        >
                          <span>{message.content}</span>
                          <span className={styles.messageTime}>
                            {formatMessageTime(message.sent_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className={styles.composer}>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Nhập tin nhắn..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                  />
                  <button
                    type="button"
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={!draft.trim()}
                  >
                    Gửi
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                {loadingConversations ? "Đang tải..." : "Chọn một cuộc trò chuyện để bắt đầu nhắn tin"}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
