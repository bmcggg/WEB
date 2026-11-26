import useVideoCall from './useVideoCall';
import VideoCallDialog from './VideoCallDialog';
import videoStyles from './videoCall.module.css';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/NavBar";
import { assetUrl, readUser } from "../../services/api";
import {
  createConversation,
  getConversations,
  getMessages,
  markConversationRead,
  searchUsers,
  sendMessage,
} from "../../services/chatApi";
import styles from "./chat.module.css";

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
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [startingUserId, setStartingUserId] = useState(null);
  const videoCall = useVideoCall();
  const messagesEndRef = useRef(null);

  const applyConversations = useCallback((list) => {
    setConversations(list);
    setSelectedId((prev) =>
      prev != null && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? null)
    );
    setError("");
  }, []);

  useEffect(() => {
    let active = true;

    getConversations()
      .then((list) => {
        if (active) applyConversations(list);
      })
      .catch((err) => {
        if (active) setError(err.message || "Không thể tải danh sách cuộc trò chuyện.");
      })
      .finally(() => {
        if (active) setLoadingConversations(false);
      });

    return () => {
      active = false;
    };
  }, [applyConversations]);

  useEffect(() => {
    if (selectedId == null) return undefined;
    let active = true;

    getMessages(selectedId)
      .then((msgs) => {
        if (!active) return;
        setMessagesByConversation((prev) => ({
          ...prev,
          [selectedId]: Array.isArray(msgs) ? msgs : [],
        }));
      })
      .catch((err) => {
        if (!active) return;
        setMessagesByConversation((prev) => ({ ...prev, [selectedId]: [] }));
        setError(err.message || "Không thể tải tin nhắn.");
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!newChatOpen || !userQuery.trim()) return undefined;

    let active = true;
    const timer = setTimeout(() => {
      if (active) setSearchingUsers(true);
      searchUsers(userQuery.trim())
        .then((result) => {
          if (active) setUsers(result);
        })
        .catch((err) => {
          if (active) setError(err.message || "Không thể tìm kiếm người dùng.");
        })
        .finally(() => {
          if (active) setSearchingUsers(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [newChatOpen, userQuery]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const selectedMessages = selectedId == null ? [] : messagesByConversation[selectedId] || [];
  const loadingMessages =
    selectedId != null && !Object.prototype.hasOwnProperty.call(messagesByConversation, selectedId);

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
    setNewChatOpen(false);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
    markConversationRead(id).catch(() => {});
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || selectedId == null || sending) return;

    setSending(true);
    setError("");
    try {
      const newMessage = await sendMessage(selectedId, text);
      if (!newMessage) throw new Error("Máy chủ không trả về tin nhắn.");

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
    } catch (err) {
      setError(err.message || "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  const handleStartConversation = async (user) => {
    if (startingUserId != null) return;
    setStartingUserId(user.id);
    setError("");

    try {
      const conversation = await createConversation({ participant_id: user.id });
      const list = await getConversations();
      applyConversations(list);
      if (conversation?.id != null) setSelectedId(conversation.id);
      setMobileChatOpen(true);
      setNewChatOpen(false);
      setUserQuery("");
      setUsers([]);
    } catch (err) {
      setError(err.message || "Không thể tạo cuộc trò chuyện.");
    } finally {
      setStartingUserId(null);
    }
  };

  const handleUserQueryChange = (event) => {
    const value = event.target.value;
    setUserQuery(value);
    if (!value.trim()) {
      setUsers([]);
      setSearchingUsers(false);
    }
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
      {videoCall.call.phase === 'idle' && videoCall.error && <p role="status" className={videoStyles.notice}>{videoCall.error}</p>}
      {videoCall.call.phase !== 'idle' && <VideoCallDialog
        call={videoCall.call}
        error={videoCall.error}
        conversation={conversations.find((item) => item.id === videoCall.call.conversationId)}
        onAccept={videoCall.accept}
        onClose={videoCall.close}
      />}
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
              <button
                type="button"
                className={styles.newChatToggle}
                onClick={() => setNewChatOpen((prev) => !prev)}
              >
                {newChatOpen ? "Đóng" : "+ Cuộc trò chuyện mới"}
              </button>
              {error && (
                <p className={styles.errorBanner} role="alert">
                  {error}
                </p>
              )}
              {newChatOpen && (
                <div className={styles.newChatPanel}>
                  <input
                    className={styles.search}
                    type="text"
                    placeholder="Tìm người dùng để nhắn tin"
                    value={userQuery}
                    onChange={handleUserQueryChange}
                  />
                  {searchingUsers && <p className={styles.hint}>Đang tìm kiếm...</p>}
                  {!searchingUsers && userQuery.trim() && users.length === 0 && (
                    <p className={styles.hint}>Không tìm thấy người dùng.</p>
                  )}
                  <ul className={styles.userResults}>
                    {users.map((user) => (
                      <li key={user.id} className={styles.userResult}>
                        <div
                          className={styles.resultAvatar}
                          style={
                            user.avatar
                              ? { backgroundImage: `url('${assetUrl(user.avatar)}')` }
                              : undefined
                          }
                        >
                          {(user.full_name || user.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>
                            {user.full_name || user.username}
                          </span>
                          <span className={styles.userSub}>@{user.username}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.startBtn}
                          disabled={startingUserId != null}
                          onClick={() => handleStartConversation(user)}
                        >
                          Chat
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                          <div
                            className={styles.avatar}
                            style={
                              display.avatar
                                ? { backgroundImage: `url('${assetUrl(display.avatar)}')` }
                                : undefined
                            }
                          >
                            {!display.avatar && display.initials}
                          </div>
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
                  <button
                    type="button"
                    className={videoStyles.callButton}
                    disabled={!videoCall.online || videoCall.call.phase !== 'idle'}
                    onClick={() => videoCall.start(selectedConversation.id)}
                  >
                    Gọi video
                  </button>
                </header>

                <div className={styles.messages}>
                  {loadingMessages && selectedMessages.length === 0 && (
                    <div className={styles.emptyState}>Đang tải tin nhắn...</div>
                  )}
                  {!loadingMessages && selectedMessages.length === 0 && (
                    <div className={styles.emptyState}>Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</div>
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
                    disabled={!draft.trim() || sending}
                  >
                    {sending ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                {loadingConversations
                  ? "Đang tải..."
                  : "Chọn một cuộc trò chuyện để bắt đầu nhắn tin"}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
