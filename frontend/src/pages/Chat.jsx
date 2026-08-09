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
      setMessages((prev) => {
        // Prevent socket echo duplication if message is already optimistically rendered
        if (prev.some(m => m._id === message._id)) return prev;
        
        // Also need to know if the message belongs to current selectedChat
        // (For robust UX, ideally we'd check if the message belongs to the active conversation)
        return [...prev, message];
      });
      setConversations((prev) =>
        prev.map((c) => {
          if (message.toGroup && c.isGroup && c.group._id === message.toGroup) {
            return { ...c, lastMessage: message, unreadCount: c.unreadCount + 1 };
          } else if (!message.toGroup && !c.isGroup && (c.user._id === message.from?._id || c.user._id === message.from)) {
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

  // Load messages when selecting a user/group
  const selectConversation = async (conv) => {
    const isGroup = conv.isGroup;
    const target = isGroup ? { ...conv.group, isGroup: true } : conv.user;
    setSelectedUser(target);
    try {
      const endpoint = isGroup 
        ? `/chat/messages/${conv.group._id}?isGroup=true` 
        : `/chat/messages/${conv.user._id}`;
      const res = await api.get(endpoint);
      setMessages(res.data.data);
      if (!isGroup) {
        await api.patch(`/chat/messages/read/${conv.user._id}`);
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (isGroup && c.isGroup && c.group._id === conv.group._id) return { ...c, unreadCount: 0 };
          if (!isGroup && !c.isGroup && c.user._id === conv.user._id) return { ...c, unreadCount: 0 };
          return c;
        })
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
        to: selectedUser.isGroup ? undefined : selectedUser._id,
        toGroup: selectedUser.isGroup ? selectedUser._id : undefined,
        text: newMessage.trim(),
      });
      setMessages((prev) => {
        if (prev.some(m => m._id === res.data.data._id)) return prev;
        return [...prev, res.data.data];
      });
      setNewMessage('');
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) => {
          if (selectedUser.isGroup && c.isGroup && c.group._id === selectedUser._id) {
            return { ...c, lastMessage: res.data.data };
          }
          if (!selectedUser.isGroup && !c.isGroup && c.user._id === selectedUser._id) {
            return { ...c, lastMessage: res.data.data };
          }
          return c;
        })
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.15rem' }}>Messages</h2>
            </div>
            <span className="chat-sidebar-sub">Team collaboration & chat</span>
          </div>

          {loading ? (
            <div className="chat-conv-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 6 }} />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="chat-empty-sidebar">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: '#94a3b8' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No team conversations</p>
              <span className="chat-empty-sub">Add team members to start chatting.</span>
            </div>
          ) : (
            <div className="chat-conv-list">
              {conversations.map((conv) => {
                const target = conv.isGroup ? conv.group : conv.user;
                return (
                  <button
                    key={target._id}
                    className={`chat-conv-item ${selectedUser?._id === target._id ? 'active' : ''}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="chat-conv-avatar">
                      {conv.isGroup ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                      ) : target.avatar ? (
                        <img 
                          src={target.avatar} 
                          alt={target.name} 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        getInitials(target.name)
                      )}
                    </div>
                    <div className="chat-conv-info">
                      <div className="chat-conv-name">{target.name}</div>
                      <div className="chat-conv-preview">
                        {typingUsers[target._id] ? (
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
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Messages */}
        <div className={`chat-main ${!selectedUser ? 'chat-main-empty' : ''}`}>
          {!selectedUser ? (
            <div className="chat-no-selection">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 700 }}>Select a conversation</p>
              <span>Choose a team member or group to start chatting.</span>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="chat-main-header">
                <button className="chat-back-btn" onClick={() => setSelectedUser(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Back
                </button>
                <div className="chat-conv-avatar chat-conv-avatar-sm">
                  {selectedUser.isGroup ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  ) : selectedUser.avatar ? (
                    <img 
                      src={selectedUser.avatar} 
                      alt={selectedUser.name} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
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
                    <p style={{ margin: 0 }}>No messages yet. Start the conversation!</p>
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
                            {selectedUser.isGroup && !isMine && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {msg.from?.name}
                              </div>
                            )}
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
