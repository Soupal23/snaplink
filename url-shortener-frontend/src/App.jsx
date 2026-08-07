import React, { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Link2, Copy, Check, BarChart2, ExternalLink, Zap, Clock, Hash, LogOut, User } from 'lucide-react';
import './App.css';
import './index.css';

// Context & Route Protection
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; 

const API_BASE_URL = 'http://localhost:5000/api/url';

// -------------------------------------------------------------
// 1. Main SnapLink Dashboard (Your custom styled UI)
// -------------------------------------------------------------
// function MainDashboard() {
//   const { user, token, logout } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const [originalUrl, setOriginalUrl] = useState('');
//   const [customCode, setCustomCode] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState('');
//   const [copied, setCopied] = useState(false);

//   // Stats state
//   const [statsCode, setStatsCode] = useState('');
//   const [statsResult, setStatsResult] = useState(null);
//   const [statsError, setStatsError] = useState('');

//   // TTL & Limit integration
//   const [expiresInHours, setExpiresInHours] = useState('');
//   const [maxClicks, setMaxClicks] = useState('');

//   // Axios config helper to attach JWT token
//   const getAuthHeaders = () => {
//     const activeToken = token || localStorage.getItem('token');
//     return activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {};
//   };

//   const handleShorten = async (e) => {
//     e.preventDefault();

//     if (customCode.includes('/') || customCode.includes('http')) {
//       setError('Custom alias should only be a simple slug (e.g., "my-link"), without "http" or slashes.');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setResult(null);

//     try {
//       const payload = { originalUrl };
//       if (customCode.trim()) payload.customCode = customCode.trim();
//       if (expiresInHours) payload.expiresInHours = Number(expiresInHours);
//       if (maxClicks) payload.maxClicks = Number(maxClicks);

//       // Sent with Auth Header
//       const response = await axios.post(`${API_BASE_URL}/shorten`, payload, getAuthHeaders());
//       setResult(response.data);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Something went wrong. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleReset = () => {
//     setOriginalUrl('');
//     setCustomCode('');
//     setExpiresInHours('');
//     setMaxClicks('');
//     setResult(null);
//     setError('');
//   };

//   const handleFetchStats = async (e) => {
//     e.preventDefault();
//     setStatsError('');
//     setStatsResult(null);

//     try {
//       const response = await axios.get(`${API_BASE_URL}/stats/${statsCode.trim()}`, getAuthHeaders());
//       setStatsResult(response.data);
//     } catch (err) {
//       setStatsError(err.response?.data?.message || 'No statistics found for this short code.');
//     }
//   };

//   const copyToClipboard = (text) => {
//     navigator.clipboard.writeText(text);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   const handleResetStats = () => {
//     setStatsCode('');
//     setStatsResult(null);
//     setStatsError('');
//   };

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   return (
//     <div className="container">
//       {/* Top Bar with User Info & Logout */}
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', fontSize: '0.9rem' }}>
//           <User size={16} />
//           <span>Logged in as <strong>{user?.username || user?.email || 'User'}</strong></span>
//         </div>
//         <button onClick={handleLogout} className="btn-clear" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
//           <LogOut size={14} /> Logout
//         </button>
//       </div>

//       <header className="header">
//         <div className="logo-row">
//           <Link2 size={30} color="#f5a623" />
//           <h1 className="title">SnapLink</h1>
//         </div>
//         <p className="subtitle">plug a long link into a short jack, then trace its clicks</p>
//       </header>

//       <main className="main-content">
//         {/* Shortener Section */}
//         <div className="card">
//           <span className="screw-tl" />
//           <span className="screw-br" />
//           <h2 className="card-title">
//             <Zap size={16} className="module-icon" /> &mdash; Shorten or Create Alias &mdash;
//           </h2>
//           <form onSubmit={handleShorten} className="form-stack">
//             <div className="input-group">
//               <label className="input-label">Original Link</label>
//               <input
//                 type="url"
//                 required
//                 placeholder="https://example.com/my-very-long-link"
//                 value={originalUrl}
//                 onChange={(e) => {
//                   setOriginalUrl(e.target.value);
//                   if (result) setResult(null);
//                 }}
//                 className="styled-input"
//               />
//             </div>

//             <div className="input-group">
//               <label className="input-label">Alias (optional)</label>
//               <input
//                 type="text"
//                 placeholder="e.g., my-custom-link"
//                 value={customCode}
//                 onChange={(e) => setCustomCode(e.target.value)}
//                 className="styled-input"
//               />
//             </div>

//             <div className="input-row" style={{ display: 'flex', gap: '1rem' }}>
//               <div className="input-group" style={{ flex: 1 }}>
//                 <label className="input-label"><Clock size={12} /> Expires In (Hours)</label>
//                 <input
//                   type="number"
//                   min="1"
//                   placeholder="e.g., 24 (Optional)"
//                   value={expiresInHours}
//                   onChange={(e) => setExpiresInHours(e.target.value)}
//                   className="styled-input"
//                 />
//               </div>

//               <div className="input-group" style={{ flex: 1 }}>
//                 <label className="input-label"><Hash size={12} /> Max Clicks</label>
//                 <input
//                   type="number"
//                   min="1"
//                   placeholder="e.g., 100 (Optional)"
//                   value={maxClicks}
//                   onChange={(e) => setMaxClicks(e.target.value)}
//                   className="styled-input"
//                 />
//               </div>
//             </div>

//             <div className="button-group">
//               <button type="submit" disabled={loading} className="btn-primary">
//                 {loading ? 'Patching...' : 'Patch It ▸'}
//               </button>

//               {(originalUrl || customCode || expiresInHours || maxClicks || result || error) && (
//                 <button type="button" onClick={handleReset} className="btn-clear">
//                   Clear
//                 </button>
//               )}
//             </div>
//           </form>

//           {error && <div className="error-box">{error}</div>}

//           {result && (
//             <div className="patch-result">
//               <div className="patch-track">
//                 <span className="jack">IN</span>
//                 <span className="cable-line" />
//                 <span className="jack">OUT</span>
//               </div>

//               <div className="result-box">
//                 <div className="result-row">
//                   <div>
//                     <p className="result-label">
//                       <span className="led-small" /> Linked
//                     </p>
//                     <a href={result.shortUrl} target="_blank" rel="noreferrer" className="short-url-link">
//                       {result.shortUrl} <ExternalLink size={14} />
//                     </a>
//                   </div>
//                   <button onClick={() => copyToClipboard(result.shortUrl)} className="copy-btn">
//                     {copied ? <Check size={16} color="#3fbfae" /> : <Copy size={16} />}
//                     {copied ? 'Copied' : 'Copy'}
//                   </button>
//                 </div>
//                 <p className="meta-text">Short code: <strong>{result.urlCode || result.shortCode}</strong></p>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Analytics Section */}
//         <div className="card">
//           <span className="screw-tl" />
//           <span className="screw-br" />
//           <h2 className="card-title">
//             <BarChart2 size={16} className="module-icon" /> &mdash; Trace &mdash;
//           </h2>

//           <form onSubmit={handleFetchStats} className="form-stack">
//             <div className="input-group">
//               <input
//                 type="text"
//                 required
//                 placeholder="Enter short code (e.g., my-custom-link)"
//                 value={statsCode}
//                 onChange={(e) => {
//                   setStatsCode(e.target.value);
//                   if (statsResult) setStatsResult(null);
//                 }}
//                 className="styled-input"
//               />
//             </div>

//             <div className="button-group">
//               <button type="submit" className="btn-secondary">
//                 Query ▸
//               </button>

//               {(statsCode || statsResult || statsError) && (
//                 <button type="button" onClick={handleResetStats} className="btn-clear">
//                   Clear
//                 </button>
//               )}
//             </div>
//           </form>

//           {statsError && <div className="error-box">{statsError}</div>}

//           {statsResult && (
//             <div className="stats-box">
//               <div className="stat-metric">
//                 <span className="stat-number">{statsResult.clicks}</span>
//                 <span className="stat-label">Clicks</span>
//               </div>
//               <div className="stats-details">
//                 <p><strong>Origin:</strong> <span className="truncate">{statsResult.originalUrl}</span></p>
//                 <p><strong>Short:</strong> {statsResult.shortUrl}</p>
//                 <p>
//                   <strong>Created:</strong>{' '}
//                   {statsResult.date || statsResult.createdAt
//                     ? new Date(statsResult.date || statsResult.createdAt).toLocaleDateString()
//                     : 'N/A'}
//                 </p>
//                 {statsResult.expiresAt && (
//                   <p>
//                     <strong>Expires:</strong>{' '}
//                     {new Date(statsResult.expiresAt).toLocaleString()}
//                   </p>
//                 )}
//                 {statsResult.maxClicks !== null && statsResult.maxClicks !== undefined && (
//                   <p>
//                     <strong>Max Clicks Allowed:</strong> {statsResult.maxClicks}
//                   </p>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }

// -------------------------------------------------------------
// 2. Main App with Auth Provider & React Router
// -------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}