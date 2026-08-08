import React, { useState, useRef, useEffect } from 'react';
import { api, useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import './Profile.css';

// XP helpers
function getLevel(xp) { return Math.floor((xp || 0) / 100) + 1; }
function getLevelProgress(xp) { return (xp || 0) % 100; }
function getNextLevelXp(xp) { return 100 - getLevelProgress(xp); }

const LEVEL_TITLES = [
  'Rookie', 'Hustler', 'Builder', 'Maker', 'Achiever',
  'Champion', 'Veteran', 'Legend', 'Master', 'Grand Master',
];
function getLevelTitle(level) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [activeTab, setActiveTab] = useState('profile');
  const avatarInputRef = useRef(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion');
      return;
    }
    if (!deletePassword) {
      toast.error('Password is required');
      return;
    }

    setDeleting(true);
    try {
      const res = await api.delete('/auth/account', {
        data: { password: deletePassword },
      });
      toast.success(res.data.message || 'Account scheduled for deletion.');
      setShowDeleteModal(false);
      logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request account deletion');
    } finally {
      setDeleting(false);
    }
  };


  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar || '');
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  const xp = user?.xp || 0;
  const streak = user?.streak || 0;
  const level = getLevel(xp);
  const levelProgress = getLevelProgress(xp);
  const levelTitle = getLevelTitle(level);
  const nextLevelXp = getNextLevelXp(xp);
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setIsUploadingAvatar(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/uploads/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        const newAvatarUrl = res.data.url;
        setAvatarUrl(newAvatarUrl);
        setAvatarPreview(newAvatarUrl);
        await updateProfile({ name: (name || user?.name || '').trim(), avatar: newAvatarUrl, bio: (bio || user?.bio || '').trim() });
        toast.success('Avatar updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to upload avatar');
      setAvatarPreview(avatarUrl || user?.avatar || ''); 
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), avatar: avatarUrl.trim(), bio: bio.trim() });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="profile-page page-container animate-fadeIn">
      {/* Hero Banner */}
      <div className="profile-hero">
        <div className="profile-hero-bg" />
        <div className="profile-hero-content">
          {/* Avatar */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {avatarPreview ? (
                <img src={avatarPreview} alt={user?.name} onError={() => setAvatarPreview('')} />
              ) : (
                <span className="profile-avatar-initials">{initials}</span>
              )}
            </div>
            <div className="profile-level-ring">
              <span className="profile-level-num">{level}</span>
            </div>
          </div>

          {/* Hero Info */}
          <div className="profile-hero-info">
            <h1 className="profile-name">{user?.name}</h1>
            <span className="profile-level-title">{levelTitle}</span>
            {user?.bio && <p className="profile-bio-preview">{user.bio}</p>}
            <div className="profile-meta-row">
              <span className="profile-meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Joined {joinDate}
              </span>
              <span className="profile-meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="profile-stats-row">
        <div className="profile-stat-card">
          <div className="profile-stat-icon">⚡</div>
          <div className="profile-stat-value">{xp}</div>
          <div className="profile-stat-label">Total XP</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon">🔥</div>
          <div className="profile-stat-value">{streak}</div>
          <div className="profile-stat-label">Day Streak</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon">🏆</div>
          <div className="profile-stat-value">{level}</div>
          <div className="profile-stat-label">Level</div>
        </div>
        <div className="profile-stat-card xp-progress-card">
          <div className="profile-stat-icon-text">To Lv {level + 1}</div>
          <div className="profile-xp-bar-wrap">
            <div className="profile-xp-bar-fill" style={{ width: `${levelProgress}%` }} />
          </div>
          <div className="profile-xp-bar-sub">{levelProgress}/100 XP · {nextLevelXp} more to go</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          ✏️ Edit Profile
        </button>
        <button
          className={`profile-tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏅 Achievements
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <div className="profile-card card">
          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-form-section">
              <h3 className="profile-section-title">Avatar</h3>
              <p className="profile-section-sub">Upload a new profile picture</p>
              <div className="profile-avatar-editor">
                <div className="profile-avatar-edit-wrap">
                  <div 
                    className="profile-avatar-sm" 
                    onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                    title="Click to change profile picture"
                  >
                    {isUploadingAvatar && (
                      <div className="profile-avatar-uploading-overlay">
                        <span className="spinner spinner-sm" />
                      </div>
                    )}
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="preview" 
                        onError={() => setAvatarPreview('')} 
                        style={{ opacity: isUploadingAvatar ? 0.5 : 1 }} 
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="profile-avatar-edit-badge"
                    onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                    title="Upload Avatar"
                    disabled={isUploadingAvatar}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    ref={avatarInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    style={{ marginBottom: '0.4rem' }}
                  >
                    {isUploadingAvatar ? 'Uploading...' : 'Choose Image'}
                  </button>
                  <p className="profile-input-hint">Allowed formats: JPG, PNG, WEBP, GIF. Max size 5MB.</p>
                </div>
              </div>
            </div>

            <div className="profile-form-section">
              <h3 className="profile-section-title">Basic Info</h3>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Display Name</label>
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
                <span className="profile-input-hint">Email cannot be changed</span>
              </div>
            </div>

            <div className="profile-form-section">
              <h3 className="profile-section-title">Bio</h3>
              <p className="profile-section-sub">Tell your teammates a little about yourself</p>
              <div className="form-group">
                <textarea
                  id="profile-bio"
                  className="form-input profile-bio-textarea"
                  placeholder="e.g. Full-stack developer passionate about productivity tools. I love building things that help teams ship faster. ☕"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  rows={4}
                />
                <span className="profile-input-hint" style={{ textAlign: 'right', display: 'block' }}>{bio.length}/300</span>
              </div>
            </div>

            <button
              id="profile-save"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: '100%' }}
            >
              {saving ? (
                <><div className="spinner spinner-sm" /> Saving...</>
              ) : (
                <>💾 Save Changes</>
              )}
            </button>
          </form>

          {/* ── Danger Zone ─────────────────────────────────────────────────── */}
          <div className="danger-zone-card" style={{ marginTop: '2.5rem' }}>
            <div className="danger-zone-header">
              <span className="danger-zone-icon">⚠️</span>
              <div>
                <h3 className="danger-zone-title">Danger Zone</h3>
                <p className="danger-zone-desc">
                  Deactivate your account with a 15-day restore window. Permanent deletion occurs automatically after 15 days.
                </p>
              </div>
            </div>
            <button
              id="delete-account-btn"
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setDeletePassword('');
                setDeleteConfirmText('');
                setShowDeleteModal(true);
              }}
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="⚠️ Delete Account Confirmation"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-account-btn"
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE' || !deletePassword}
              >
                {deleting ? (
                  <><div className="spinner spinner-sm" /> Deactivating...</>
                ) : (
                  'Confirm & Delete Account'
                )}
              </button>
            </>
          }
        >
          <div className="delete-modal-content">
            <div className="delete-modal-alert">
              <strong>Account Deactivation & Grace Period:</strong>
              <ul>
                <li>Your account will be <strong>deactivated immediately</strong> and logged out everywhere.</li>
                <li>Your data will be retained for <strong>15 days</strong>. You can restore access by simply logging back in within 15 days.</li>
                <li>After 15 days, your account and all associated data will be <strong>permanently deleted</strong>.</li>
              </ul>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Confirm Your Password *</label>
              <input
                id="delete-account-password"
                type="password"
                className="form-input"
                placeholder="Enter current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Type <strong style="color: #ef4444;">DELETE</strong> to confirm *
              </label>
              <input
                id="delete-account-confirm-text"
                type="text"
                className="form-input"
                placeholder="Type DELETE in capital letters"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        </Modal>
      )}


      {activeTab === 'achievements' && (
        <div className="profile-achievements">
          <AchievementBadge
            icon="🌱"
            title="First Steps"
            desc="Complete your first task"
            unlocked={xp >= 10}
          />
          <AchievementBadge
            icon="⚡"
            title="Getting Started"
            desc="Reach 50 XP"
            unlocked={xp >= 50}
          />
          <AchievementBadge
            icon="🔥"
            title="On Fire"
            desc="Maintain a 3-day streak"
            unlocked={streak >= 3}
          />
          <AchievementBadge
            icon="💎"
            title="Century Club"
            desc="Earn 100 XP"
            unlocked={xp >= 100}
          />
          <AchievementBadge
            icon="🚀"
            title="Rockstar"
            desc="Reach Level 5"
            unlocked={level >= 5}
          />
          <AchievementBadge
            icon="🏆"
            title="Week Warrior"
            desc="Maintain a 7-day streak"
            unlocked={streak >= 7}
          />
          <AchievementBadge
            icon="👑"
            title="500 Club"
            desc="Earn 500 XP"
            unlocked={xp >= 500}
          />
          <AchievementBadge
            icon="🌟"
            title="Legend"
            desc="Reach Level 10"
            unlocked={level >= 10}
          />
        </div>
      )}
    </div>
  );
}

function AchievementBadge({ icon, title, desc, unlocked }) {
  return (
    <div className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="achievement-icon">{icon}</div>
      <div className="achievement-info">
        <div className="achievement-title">{title}</div>
        <div className="achievement-desc">{desc}</div>
      </div>
      <div className="achievement-status">
        {unlocked ? (
          <span className="achievement-check">✓</span>
        ) : (
          <span className="achievement-lock">🔒</span>
        )}
      </div>
    </div>
  );
}
