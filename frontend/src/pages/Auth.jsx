import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../App.css'; 

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    // OAuth2 uses form data for login
    let bodyData;
    let headers = {};
    
    if (isLogin) {
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 expects 'username' instead of email
      formData.append('password', password);
      bodyData = formData;
      headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
    } else {
      bodyData = JSON.stringify({ 
          username: username, 
          full_name: fullName, 
          email: email, 
          password: password 
      });
      headers = {
        'Content-Type': 'application/json',
      };
    }

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers,
        body: bodyData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed.');
      }

      login(data.access_token);
      navigate('/'); // redirect to dashboard/home after success

    } catch (err) {
      setError(err.message || 'Network anomaly detected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-panel">
        <div className="panel-header" style={{ borderBottom: 'none', justifyContent: 'center' }}>
          <h3>{isLogin ? 'Sign In Platform' : 'Create Account'}</h3>
        </div>
        
        {error && (
          <div className="glass-panel alert-panel" style={{marginBottom: '1rem', padding: '0.5rem'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"></path></svg>
            <span style={{marginLeft: '10px'}}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required={!isLogin} 
                  placeholder="johndoe88"
                />
              </div>
              <div className="input-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required={!isLogin} 
                  placeholder="John Doe"
                />
              </div>
            </>
          )}
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="name@company.com"
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary scan-btn" disabled={loading} style={{marginTop: '1rem', width: '100%'}}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-toggle" style={{marginTop: '1.5rem', textAlign: 'center'}}>
          <span style={{color: 'var(--text-muted)'}}>
            {isLogin ? "Need an account?" : "Already have an account?"}
          </span>
          <button 
            type="button" 
            style={{marginLeft: '10px', color: 'var(--primary)', background: 'transparent', fontWeight: '500'}}
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
