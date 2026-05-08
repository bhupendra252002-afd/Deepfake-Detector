import React, { useContext } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import './App.css';

// Pages
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import History from './pages/History';
import UserGuide from './pages/UserGuide';
import Settings from './pages/Settings';

// SVG Icons
const Icons = {
  Dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>,
  History: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Guide: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
  Settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Logout: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
};

export default function App() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  }

  // Protected Route Wrapper
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/auth" />;
    }
    return children;
  };

  return (
    <div className="app-container app-layout-wrapper">

      {/* Sidebar Navigation */}
      {user && (
        <nav className="sidebar no-print">
          <div className="sidebar-header">
            <h2 className="brand-title" style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
              Deepfake<span>Detector</span>
            </h2>
          </div>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              {Icons.Dashboard} <span>Scanner Dashboard</span>
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              {Icons.History} <span>Archive Logs</span>
            </NavLink>
            <NavLink to="/guide" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              {Icons.Guide} <span>System Guide</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              {Icons.Settings} <span>Settings</span>
            </NavLink>
          </div>

          <div className="sidebar-footer">
            <button className="nav-link logout-btn" onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent' }}>
              {Icons.Logout} <span>Sign Out</span>
            </button>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <div className={`main-view ${!user ? 'full-width' : ''}`}>

        {/* Header - Minimal if logged in, full if not */}
        <header className="no-print view-header">
          {(!user || location.pathname === '/') && (
            <h1 className="brand-title" style={{ fontSize: user ? '2rem' : '3rem', marginBottom: '0.5rem' }}>
              Deepfake Detector
            </h1>
          )}
          <p style={{ color: 'var(--text-muted)' }}>Advanced Media Analysis Platform</p>
        </header>

        {/* Print Only Header */}
        <div className="print-only-header">
          <h1>Deepfake Detector Analysis Report</h1>
          <p>Confidential System Analysis</p>
          <hr />
        </div>

        <main className="main-content">
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />

            <Route path="/guide" element={
              <ProtectedRoute>
                <UserGuide />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>

    </div>
  );
}
