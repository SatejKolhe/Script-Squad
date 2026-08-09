import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import './Chat.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Connect socket
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-user-room', user._id);
    });

    socket.on('chat-message', (message) => {
      setMessages((prev) => [...prev, message]);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.user._id === message.from?._id || c.user._id === message.from) {
            return { ...c, lastMessage: message, unreadCount: c.unreadCount + 1 };
          }
          return c;
        })
      );
    });

    socket.on('chat-typing', ({ from }) => {
      setTypingUsers((prev) => ({ ...prev, [from]: true }));
    });

    socket.on('chat-stop-typing', ({ from }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[from];
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, [user._id]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages when selecting a user
  const selectConversation = async (conv) => {
    setSelectedUser(conv.user);
    try {
      const res = await api.get(`/chat/messages/${conv.user._id}`);
      setMessages(res.data.data);
      // Mark as read
      await api.patch(`/chat/messages/read/${conv.user._id}`);
      setConversations((prev) =>
        prev.map((c) => (c.user._id === conv.user._id ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      toast.error('Failed to load messages');
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    try {
      const res = await api.post('/chat/messages', {
        to: selectedUser._id,
        text: newMessage.trim(),
      });
      setMessages((prev) => [...prev, res.data.data]);
      setNewMessage('');
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.user._id === selectedUser._id ? { ...c, lastMessage: res.data.data } : c
        )
      );
      // Stop typing indicator
      socketRef.current?.emit('chat-stop-typing', { to: selectedUser._id, from: user._id });
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Typing indicator
  const handleTyping = () => {
    if (!selectedUser) return;
    socketRef.current?.emit('chat-typing', { to: selectedUser._id, from: user._id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('chat-stop-typing', { to: selectedUser._id, from: user._id });
    }, 2000);
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const getInitials = (name) =>
    name?.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page-container animate-fadeIn chat-page">
      <div className="chat-layout">
        {/* Left: Conversations */}
        <div className={`chat-sidebar ${selectedUser ? 'chat-sidebar-hidden-mobile' : ''}`}>
          <div className="chat-sidebar-header">
            <h2 className="chat-sidebar-title">Chat</h2>
            <span className="chat-sidebar-sub">Team messages</span>
          </div>

          {loading ? (
            <div className="chat-conv-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 6 }} />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="chat-empty-sidebar">
              <div className="chat-empty-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p>No team members yet</p>
              <span className="chat-empty-sub">Add team members to start chatting.</span>
            </div>
          ) : (
            <div className="chat-conv-list">
              {conversations.map((conv) => (
                <button
                  key={conv.user._id}
                  className={`chat-conv-item ${selectedUser?._id === conv.user._id ? 'active' : ''}`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className="chat-conv-avatar">
                    {conv.user.avatar ? (
                      <img src={conv.user.avatar} alt={conv.user.name} />
                    ) : (
                      getInitials(conv.user.name)
                    )}
                  </div>
                  <div className="chat-conv-info">
                    <div className="chat-conv-name">{conv.user.name}</div>
                    <div className="chat-conv-preview">
                      {typingUsers[conv.user._id] ? (
                        <span className="chat-typing-text">typing...</span>
                      ) : conv.lastMessage ? (
                        <>
                          {conv.lastMessage.from === user._id || conv.lastMessage.from?._id === user._id ? 'You: ' : ''}
                          {conv.lastMessage.text?.slice(0, 35)}
                          {conv.lastMessage.text?.length > 35 ? '...' : ''}
                        </>
                      ) : (
                        <span className="chat-no-msg">No messages yet</span>
                      )}
                    </div>
                  </div>
                  <div className="chat-conv-right">
                    {conv.lastMessage && (
                      <span className="chat-conv-time">{formatTime(conv.lastMessage.createdAt)}</span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="chat-unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Messages */}
        <div className={`chat-main ${!selectedUser ? 'chat-main-empty' : ''}`}>
          {!selectedUser ? (
            <div className="chat-no-selection">
              <div className="chat-no-selection-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <p>Select a conversation</p>
              <span>Choose a team member to start chatting.</span>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="chat-main-header">
                <button className="chat-back-btn" onClick={() => setSelectedUser(null)}>
                  ← Back
                </button>
                <div className="chat-conv-avatar chat-conv-avatar-sm">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} />
                  ) : (
                    getInitials(selectedUser.name)
                  )}
                </div>
                <div>
                  <div className="chat-header-name">{selectedUser.name}</div>
                  {typingUsers[selectedUser._id] && (
                    <div className="chat-header-typing">typing...</div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-messages-empty">
                    <p>No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = (msg.from === user._id) || (msg.from?._id === user._id);
                    const showDate = idx === 0 || formatDate(msg.createdAt) !== formatDate(messages[idx - 1].createdAt);
                    return (
                      <React.Fragment key={msg._id || idx}>
                        {showDate && (
                          <div className="chat-date-divider">
                            <span>{formatDate(msg.createdAt)}</span>
                          </div>
                        )}
                        <div className={`chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                          <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                            <div className="chat-bubble-text">{msg.text}</div>
                            <div className="chat-bubble-time">{formatTime(msg.createdAt)}</div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="chat-input-bar" onSubmit={handleSend}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  autoComplete="off"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!newMessage.trim() || sending}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
