import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

// SVG Icon for Delete
const TrashIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function History() {
  const { token } = useContext(AuthContext);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to retrieve history');
        }
        const data = await response.json();
        setHistoryItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchHistory();
    }
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete history item');
      }
      
      // Update local state to remove the deleted item
      setHistoryItems(prevItems => prevItems.filter(item => item.id !== id));
    } catch (err) {
      alert("Error deleting history log: " + err.message);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', padding: '2rem' }}>
      <div className="panel-header">
        <h3>Analysis History</h3>
      </div>
      
      {loading ? (
        <div className="processing-hud" style={{ padding: '3rem' }}>
          <div className="cyber-spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--primary)', fontWeight: '500' }}>Loading history...</p>
        </div>
      ) : error ? (
        <div className="alert-panel">
          <p>{error}</p>
        </div>
      ) : historyItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p>You haven't scanned any media yet.</p>
        </div>
      ) : (
        <div className="history-table-container" style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>MEDIA</th>
                <th style={{ padding: '1rem' }}>TARGET</th>
                <th style={{ padding: '1rem' }}>VERDICT</th>
                <th style={{ padding: '1rem' }}>CONFIDENCE</th>
                <th style={{ padding: '1rem' }}>TIMESTAMP</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {historyItems.map((item) => {
                const mediaUrl = (() => {
                  if (!item.metadata_json) return null;
                  try {
                    const meta = JSON.parse(item.metadata_json);
                    return meta.media_url ? `http://localhost:8000${meta.media_url}` : null;
                  } catch(e) { return null; }
                })();

                // Very basic check if media url looks like an image or video, though we only create thumbnails for imagery to keep it simple.
                // We'll just show the thumbnail if it has a common image extension or video preview if we could (fallback to a neat button).
                const isImage = mediaUrl && mediaUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i);

                return (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    {mediaUrl ? (
                      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                        {isImage ? (
                          <img src={mediaUrl} alt="Media thumbnail" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '10px', color: 'var(--text)', textAlign: 'center' }}>
                            VIEW<br/>MEDIA
                          </div>
                        )}
                      </a>
                    ) : (
                      <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>N/A</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>
                    <div className="str-trunc" style={{ maxWidth: '200px' }} title={item.target}>{item.target}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      color: item.prediction.toLowerCase() === 'fake' ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {item.prediction.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text)' }}>{(item.confidence * 100).toFixed(1)}%</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      title="Delete Log"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        opacity: '0.8',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '1'}
                      onMouseOut={e => e.currentTarget.style.opacity = '0.8'}
                    >
                      {TrashIcon}
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
