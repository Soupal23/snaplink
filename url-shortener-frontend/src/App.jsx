import React, { useState } from 'react';
import axios from 'axios';
import { Link2, Copy, Check, BarChart2, ExternalLink, Zap } from 'lucide-react';
import './App.css';
import './index.css';

const API_BASE_URL = 'http://localhost:5000/api/url';

export default function App() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Stats state
  const [statsCode, setStatsCode] = useState('');
  const [statsResult, setStatsResult] = useState(null);
  const [statsError, setStatsError] = useState('');

  const handleShorten = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    // Prevent full URLs in custom code
    if (customCode.includes('/') || customCode.includes('http')) {
      setError('Custom alias should only be a simple slug (e.g., "my-link"), without "http" or slashes.');
      setLoading(false);
      return;
    }

    try {
      const payload = { originalUrl };
      if (customCode.trim()) payload.customCode = customCode.trim();

      const response = await axios.post(`${API_BASE_URL}/shorten`, payload);
      setResult(response.data);
      // Inputs stays populated for reviewing what was submitted
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resets inputs, results, and errors
  const handleReset = () => {
    setOriginalUrl('');
    setCustomCode('');
    setResult(null);
    setError('');
  };

  const handleFetchStats = async (e) => {
    e.preventDefault();
    setStatsError('');
    setStatsResult(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/stats/${statsCode.trim()}`);
      setStatsResult(response.data);
    } catch (err) {
      setStatsError(err.response?.data?.message || 'No statistics found for this short code.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetStats = () => {
    setStatsCode('');
    setStatsResult(null);
    setStatsError('');
  };

  return (
    <div className="container">
      <header className="header">

        <div className="logo-row">
          <Link2 size={30} color="#f5a623" />
          <h1 className="title">SnapLink</h1>
        </div>
        <p className="subtitle"> plug a long link into a short jack, then trace its clicks</p>
      </header>

      <main className="main-content">
        {/* Shortener Section */}
        <div className="card">
          <span className="screw-tl" />
          <span className="screw-br" />
          <h2 className="card-title">
            <Zap size={16} className="module-icon" /> &mdash; Shorten or Create Alias  &mdash;
          </h2>
          <form onSubmit={handleShorten} className="form-stack">
            <div className="input-group">
              <label className="input-label">Original Link</label>
              <input
                type="url"
                required
                placeholder="https://example.com/my-very-long-link"
                value={originalUrl}
                onChange={(e) => {
                  setOriginalUrl(e.target.value);
                  if (result) setResult(null); // Optional: clears old result card when typing a new link
                }}
                className="styled-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Alias (optional)</label>
              <input
                type="text"
                placeholder="e.g., my-custom-link"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="styled-input"
              />
            </div>

            <div className="button-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Patching...' : 'Patch It ▸'}
              </button>
              
              {(originalUrl || customCode || result || error) && (
                <button type="button" onClick={handleReset} className="btn-clear">
                  Clear
                </button>
              )}
          </div>
          </form>

          {error && <div className="error-box">{error}</div>}

          {result && (
            <div className="patch-result">
              <div className="patch-track">
                <span className="jack">IN</span>
                <span className="cable-line" />
                <span className="jack">OUT</span>
              </div>

              <div className="result-box">
                <div className="result-row">
                  <div>
                    <p className="result-label">
                      <span className="led-small" /> Linked
                    </p>
                    <a href={result.shortUrl} target="_blank" rel="noreferrer" className="short-url-link">
                      {result.shortUrl} <ExternalLink size={14} />
                    </a>
                  </div>
                  <button onClick={() => copyToClipboard(result.shortUrl)} className="copy-btn">
                    {copied ? <Check size={16} color="#3fbfae" /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="meta-text">Short code: <strong>{result.urlCode}</strong></p>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Section */}
        <div className="card">
          <span className="screw-tl" />
          <span className="screw-br" />
          <h2 className="card-title">
            <BarChart2 size={16} className="module-icon" /> &mdash; Trace &mdash; 
          </h2>
          
          <form onSubmit={handleFetchStats} className="form-stack">
            <div className="input-group">
              <input
                type="text"
                required
                placeholder="Enter short code (e.g., my-custom-link)"
                value={statsCode}
                onChange={(e) => {
                  setStatsCode(e.target.value);
                  if (statsResult) setStatsResult(null); // Clears previous result when typing new code
                }}
                className="styled-input"
              />
            </div>

            <div className="button-group">
              <button type="submit" className="btn-secondary">
                Query ▸
              </button>
              
              {(statsCode || statsResult || statsError) && (
                <button type="button" onClick={handleResetStats} className="btn-clear">
                  Clear
                </button>
              )}
            </div>
          </form>

          {statsError && <div className="error-box">{statsError}</div>}

          {statsResult && (
            <div className="stats-box">
              <div className="stat-metric">
                <span className="stat-number">{statsResult.clicks}</span>
                <span className="stat-label">Clicks</span>
              </div>
              <div className="stats-details">
                <p><strong>Origin:</strong> <span className="truncate">{statsResult.originalUrl}</span></p>
                <p><strong>Short:</strong> {statsResult.shortUrl}</p>
                <p>
                  <strong>Created:</strong>{' '}
                  {statsResult.date || statsResult.createdAt
                    ? new Date(statsResult.date || statsResult.createdAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
