import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

export default function Settings() {
  const { token, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/user/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to retrieve user profile');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setProfileError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPasswordStatus({ type: 'error', message: 'Please fill out both password fields.' });
      return;
    }
    
    setIsUpdating(true);
    setPasswordStatus({ type: '', message: '' });

    try {
      const response = await fetch('http://localhost:8000/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.detail || 'Failed to update password');
      }

      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
      setOldPassword('');
      setNewPassword('');

    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div className="panel-header">
        <h3>Account Settings</h3>
      </div>

      {loading ? (
        <div className="processing-hud" style={{ padding: '3rem' }}>
          <div className="cyber-spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--primary)', fontWeight: '500' }}>Loading profile...</p>
        </div>
      ) : profileError ? (
        <div className="alert-panel" style={{ marginTop: '2rem' }}>
          <p>{profileError}</p>
        </div>
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <div className="settings-section" style={{ marginBottom: '3rem' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem' }}>
              Profile Information
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Account ID</label>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', color: 'var(--text)' }}>
                  #{profile.id}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Username</label>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', color: 'var(--text)' }}>
                  {profile.username}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Full Name</label>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', color: 'var(--text)' }}>
                  {profile.full_name}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Registered Email</label>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', color: 'var(--text)' }}>
                  {profile.email}
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h4 style={{ color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem' }}>
              Security Settings
            </h4>
            
            <form onSubmit={handlePasswordUpdate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                <div className="form-group">
                  <label htmlFor="old_password" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Current Password</label>
                  <input
                    id="old_password"
                    type="password"
                    className="cyber-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="new_password" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>New Password</label>
                  <input
                    id="new_password"
                    type="password"
                    className="cyber-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                {passwordStatus.message && (
                  <div style={{
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem',
                    background: passwordStatus.type === 'error' ? 'rgba(255, 68, 68, 0.1)' : 'rgba(0, 200, 83, 0.1)',
                    color: passwordStatus.type === 'error' ? 'var(--danger)' : 'var(--success)',
                    border: `1px solid ${passwordStatus.type === 'error' ? 'rgba(255, 68, 68, 0.3)' : 'rgba(0, 200, 83, 0.3)'}`
                  }}>
                    {passwordStatus.message}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="cyber-button" 
                  disabled={isUpdating}
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                >
                  {isUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
