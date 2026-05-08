import React from 'react';
import '../App.css';

export default function UserGuide() {
  const guideSections = [
    {
      title: "1. Uploading Media",
      desc: "To begin deepfake detection, navigate to the Dashboard via the sidebar. You can upload a media file directly from your device (click the dashed box) or provide a direct web URL link. The system accepts standard image and video formats (.mp4, .jpg, .png).",
      img: "/guide/uploading_media.png",
      alt: "Uploading Media view"
    },
    {
      title: "2. Analysis Process",
      desc: "Once the target media is ready, click 'Run AI Analysis'. The system will process frames using advanced predictive models to highlight high-probability face manipulations over the original media. This might take a few moments for longer videos.",
      img: "/guide/analysis_process.png",
      alt: "Scanning Process View"
    },
    {
      title: "3. Interpreting Results",
      desc: "The final verdict will report either REAL or FAKE alongside a Confidence Level. A higher confidence score indicates the model's certainty. For video files, a frame-by-frame distribution outline helps visualize which exact moments triggered the detection anomalies.",
      img: "/guide/results_verdict.png",
      alt: "Results Verdict View"
    },
    {
      title: "4. Account Settings",
      desc: "Manage your credentials in the Settings page. Ensure your profile information is correct and establish a strong password to protect your analysis logs and data.",
      img: "/guide/setting.png",
      alt: "Settings View"
    }
  ];

  return (
    <div className="glass-panel" style={{ width: '100%', padding: '2.5rem' }}>
      <div className="panel-header" style={{ marginBottom: '2rem' }}>
        <h3>System User Guide</h3>
      </div>
      
      <div className="guide-content" style={{ color: 'var(--text)', lineHeight: '1.6' }}>
        
        {guideSections.map((section, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
            alignItems: 'center',
            gap: '3rem',
            marginBottom: '3rem',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
                {section.title}
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.7' }}>
                {section.desc}
              </p>
            </div>
            
            <div style={{ flex: 1.2, textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
              <img 
                src={section.img} 
                alt={section.alt} 
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  borderRadius: '10px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  objectFit: 'cover'
                }} 
              />
            </div>
          </div>
        ))}

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>
            5. Best Practices
          </h4>
          <ul style={{ color: 'var(--text-muted)', marginLeft: '1.5rem', fontSize: '1rem', lineHeight: '1.7' }}>
            <li style={{ marginBottom: '0.8rem' }}>Ensure the subject's face is clearly visible and well-lit for optimal detection.</li>
            <li style={{ marginBottom: '0.8rem' }}>Avoid extremely low-resolution inputs which may trigger false flags or errors.</li>
            <li style={{ marginBottom: '0.8rem' }}>Check the <strong>Archive Logs</strong> tab frequently to correlate past findings on similar media types.</li>
            <li>Ensure you update a secure password within the <strong>Settings</strong> tab manually.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
