import React, { useState, useRef, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

export default function Dashboard() {
  const { token } = useContext(AuthContext);
  const [inputType, setInputType] = useState('file'); // 'file' or 'url'
  
  const [file, setFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Review State
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  
  // Animation state for confidence counter
  const [displayConfidence, setDisplayConfidence] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (result) {
      let start = 0;
      const end = result.confidence * 100;
      const duration = 1500;
      const increment = end / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayConfidence(end);
          clearInterval(timer);
        } else {
          setDisplayConfidence(start);
        }
      }, 16);
      
      return () => clearInterval(timer);
    } else {
      setDisplayConfidence(0);
    }
  }, [result]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    setResult(null);
    
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!selectedFile.type.startsWith('video/') && !selectedFile.type.startsWith('image/') && !hasValidExt) {
      setError('Invalid format. Access denied. Please provide image or video.');
      return;
    }
    
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    
    setFile(selectedFile);
    setMediaPreview(URL.createObjectURL(selectedFile));
  };

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setMediaUrl(value);
    setResult(null);
    if (!value) {
      setMediaPreview(null);
    } else {
      setMediaPreview(value);
    }
  };

  const clearInput = () => {
    setFile(null);
    setMediaUrl('');
    if (file && mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submitReview = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment: reviewComment })
      });
      if (response.ok) {
        setReviewSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const analyzeMedia = async () => {
    if (inputType === 'file' && !file) return;
    if (inputType === 'url' && !mediaUrl.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    setError(null);
    
    const formData = new FormData();
    if (inputType === 'file') {
      formData.append('file', file);
    } else {
      formData.append('url', mediaUrl);
    }
    
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers,
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Analysis uplink failed. Verify backend server.');
      }
      
      setTimeout(() => {
        setResult(data);
        setIsLoading(false);
      }, 1500);
      
    } catch (err) {
      console.error("Fetch Error:", err);
      if (err.message.includes('Failed to fetch')) {
        setError('Server Offline: The backend deepfake API (localhost:8000) is unreachable.');
      } else {
        setError(err.message || 'Network anomaly detected. Analysis aborted.');
      }
      setIsLoading(false);
    }
  };

  const isVideo = file?.type?.startsWith('video') || mediaUrl.match(/\.(mp4|webm|avi|mov)$/i);

  return (
    <div className="layout-dashboard">
      <div className="media-column">
        <div className={`glass-panel media-panel ${mediaPreview ? 'has-media' : ''}`}>
          <div className="panel-header no-print">
            <h3>Input Source</h3>
          </div>

          {!mediaPreview ? (
            <div className="input-flow no-print">
              <div className="tab-container">
                <button 
                  className={`tab-btn ${inputType === 'file' ? 'active' : ''}`}
                  onClick={() => { setInputType('file'); setError(null); }}
                >
                  Local File
                </button>
                <div className="tab-divider"></div>
                <button 
                  className={`tab-btn ${inputType === 'url' ? 'active' : ''}`}
                  onClick={() => { setInputType('url'); setError(null); }}
                >
                  Web URL
                </button>
              </div>

              <div className="input-section">
                {inputType === 'file' ? (
                  <div 
                    className={`upload-area ${isDragging ? 'drag-active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="upload-icon">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <div className="upload-text">Drag & Drop Media</div>
                    <p className="upload-hint">Supports .mp4, .jpg, .png</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="video/*,image/*" 
                      className="file-input" 
                    />
                  </div>
                ) : (
                  <div className="url-input-area">
                    <svg className="url-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    <input 
                      type="url" 
                      className="url-input" 
                      placeholder="Enter media URL..."
                      value={mediaUrl}
                      onChange={handleUrlChange}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="preview-container">
              <div className="preview-wrapper">
                {isVideo ? (
                  <video src={mediaPreview} className="media-preview" autoPlay loop muted playsInline />
                ) : (
                  <img 
                    src={mediaPreview} 
                    className="media-preview" 
                    alt="Analysis target" 
                    onError={() => setError('Warning: Unable to load asset from provided source.')} 
                  />
                )}
                
                {isLoading && (
                  <div className="processing-hud" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.8)', borderRadius: '12px' }}>
                    <div className="cyber-spinner"></div>
                  </div>
                )}
              </div>
              
              {!isLoading && (
                  <button className="btn-clear absolute-clear no-print" title="Abort & Clear" onClick={clearInput}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                  </button>
              )}
            </div>
          )}
        </div>

        {/* Forensic Panel (Shows when result exists) */}
        {result?.metadata && (
          <div className="glass-panel forensic-panel">
            <div className="panel-header">
              <h3>Forensic Details</h3>
            </div>
            <div className="metadata-grid">
              {Object.entries(result.metadata).map(([key, value]) => (
                <div className="meta-item" key={key}>
                  <span className="meta-key">{key.replace(/_/g, ' ').toUpperCase()}</span>
                  <span className="meta-val">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Evidence Image (GradCAM / Boxes) */}
        {result?.overlay_image && (
          <div className="glass-panel evidence-panel">
            <div className="panel-header">
              <h3>Visual Evidence</h3>
            </div>
            <div className="evidence-img-container">
              <img src={result.overlay_image} className="evidence-img" alt="Facial Highlights" />
            </div>
          </div>
        )}
      </div>

      <div className="side-panel">
        
        {error && (
          <div className="glass-panel alert-panel no-print">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"></path></svg>
            <div>{error}</div>
          </div>
        )}

        {!mediaPreview && !error && (
            <div className="glass-panel instruction-panel no-print">
              <div className="instruction-icon" style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Awaiting Media</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload a file or provide a URL to begin analysis.</p>
            </div>
        )}

        {mediaPreview && !result && (
          <div className={`glass-panel action-panel no-print ${isLoading ? 'is-loading' : ''}`}>
            {!isLoading ? (
              <>
                <div className="asset-info" style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                  <span className="badge" style={{ display: 'block', color: 'var(--primary)', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Media Uploaded</span>
                  <div className="str-trunc">{inputType === 'file' ? file?.name : mediaUrl}</div>
                </div>
                <button className="btn btn-primary scan-btn" onClick={analyzeMedia}>
                  Analyze
                </button>
              </>
            ) : (
              <div className="processing-hud" style={{ textAlign: 'center' }}>
                <div className="cyber-spinner" style={{ margin: '0 auto 1rem' }}></div>
                <div className="processing-text">
                  <div className="text-glow" style={{ fontWeight: '600', color: 'var(--primary)' }}>Analyzing Media</div>
                  <div className="data-stream" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Running deepfake detection model...</div>
                </div>
              </div>
            )}
          </div>
        )}

        {result && (
          <>
            <div className={`glass-panel result-hud ${result.prediction.toLowerCase()}`}>
                <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                  <h3>Analysis Results</h3>
                </div>
                
                <div className="verdict-block" style={{ marginTop: '1rem' }}>
                  <div className="verdict-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verdict</div>
                  <div className="verdict-value">{result.prediction}</div>
                </div>

                <div className="confidence-block">
                  <div className="confidence-label">
                    <span>Confidence Level</span>
                    <span className="confidence-percent">{displayConfidence.toFixed(1)}%</span>
                  </div>
                  <div className="confidence-bar-bg no-print">
                    <div className="confidence-bar-fill" style={{width: `${displayConfidence}%`}}></div>
                  </div>
                </div>
            </div>

            {result.timeline && result.timeline.length > 0 && (
              <div className="glass-panel timeline-panel">
                <div className="panel-header">
                  <h3>Timeline Analysis</h3>
                </div>
                <div className="timeline-graph">
                  {result.timeline.map((point, idx) => (
                    <div key={idx} className={`timeline-bar ${point.label.toLowerCase()}`} title={`Sec: ${point.sec}s | Conf: ${(point.confidence*100).toFixed(1)}%`}>
                      <div className="bar-fill" style={{height: `${Math.max(10, point.confidence * 100)}%`}}></div>
                      <span className="bar-label">{point.sec}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVIEW WIDGET */}
            <div className="glass-panel no-print" style={{ padding: '1.5rem' }}>
              <div className="panel-header">
                <h3>Leave Feedback</h3>
              </div>
              {reviewSubmitted ? (
                <div style={{ color: 'var(--success)', textAlign: 'center', padding: '1rem' }}>
                   ✓ Thank you for your feedback.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg 
                        key={star} 
                        onClick={() => setRating(star)}
                        style={{ cursor: 'pointer', fill: star <= rating ? 'var(--primary)' : 'none', stroke: 'var(--primary)' }}
                        width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={reviewComment} 
                    onChange={e => setReviewComment(e.target.value)} 
                    placeholder="Enter process remarks..." 
                    style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '4px' }}
                  />
                  <button className="btn btn-primary scan-btn" onClick={submitReview}>
                    Submit
                  </button>
                </div>
              )}
            </div>

            <div className="action-row no-print" style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem'}}>
              <button className="btn btn-primary" onClick={() => window.print()}>
                  Export PDF
              </button>

              <button className="btn btn-outline" onClick={clearInput}>
                  Scan New Media
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
