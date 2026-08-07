import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Dashboard() {
  const { user, token, logout } = useContext(AuthContext);

  // Shorten form state
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('');
  const [maxClicks, setMaxClicks] = useState('');
  const [shortenedResult, setShortenedResult] = useState(null);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState('');

  // Trace form state
  const [traceCode, setTraceCode] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');

  // Handle URL Shortening
  const handleShorten = async (e) => {
    e.preventDefault();
    setShortenError('');
    setShortenedResult(null);
    setShortenLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/url/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalUrl,
          customCode: customAlias || undefined,
          expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
          maxClicks: maxClicks ? Number(maxClicks) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to shorten URL');
      setShortenedResult(data);
    } catch (err) {
      setShortenError(err.message);
    } finally {
      setShortenLoading(false);
    }
  };

  // Handle Analytics Query
  const handleTrace = async (e) => {
    e.preventDefault();
    setTraceError('');
    setAnalyticsData(null);
    setTraceLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/url/analytics/${traceCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch analytics');
      setAnalyticsData(data);
    } catch (err) {
      setTraceError(err.message);
    } finally {
      setTraceLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navUser}>
          <span style={styles.userDot}></span>
          Logged in as <strong>{user?.username || user?.email || 'User'}</strong>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          ↳ Logout
        </button>
      </nav>

      {/* Main Layout Container */}
      <main style={styles.container}>
        {/* Header Hero */}
        <header style={styles.header}>
          <h1 style={styles.brandTitle}>🔗 SnapLink</h1>
          <p style={styles.brandSubtitle}>
            Plug a long link into a short jack, then trace its clicks.
          </p>
        </header>

        <div style={styles.grid}>
          {/* Section 1: Shorten / Create Alias Card */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>⚡ Shorten or Create Alias</h2>

            {shortenError && <div style={styles.errorBanner}>{shortenError}</div>}

            <form onSubmit={handleShorten} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Original Link *</label>
                <input
                  type="url"
                  required
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://example.com/my-very-long-url"
                  style={styles.input}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Alias (Optional)</label>
                  <input
                    type="text"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value)}
                    placeholder="e.g., my-custom-link"
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Expires In (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    placeholder="e.g., 24"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Max Clicks (Optional)</label>
                <input
                  type="number"
                  min="1"
                  value={maxClicks}
                  onChange={(e) => setMaxClicks(e.target.value)}
                  placeholder="e.g., 100"
                  style={styles.input}
                />
              </div>

              <button type="submit" disabled={shortenLoading} style={styles.primaryBtn}>
                {shortenLoading ? 'Patching...' : 'Patch It ▶'}
              </button>
            </form>

            {/* Shorten Result Display */}
            {shortenedResult && (
              <div style={styles.resultBox}>
                <span style={styles.resultLabel}>Shortened Link Created:</span>
                <a
                  href={shortenedResult.shortUrl || `http://localhost:5000/${shortenedResult.shortCode}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.resultLink}
                >
                  {shortenedResult.shortUrl || `http://localhost:5000/${shortenedResult.shortCode}`}
                </a>
              </div>
            )}
          </section>

          {/* Section 2: Trace Analytics Card */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>📊 Trace Analytics</h2>

            {traceError && <div style={styles.errorBanner}>{traceError}</div>}

            <form onSubmit={handleTrace} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Short Code / Alias</label>
                <input
                  type="text"
                  required
                  value={traceCode}
                  onChange={(e) => setTraceCode(e.target.value)}
                  placeholder="Enter short code (e.g., my-custom-link)"
                  style={styles.input}
                />
              </div>

              <button type="submit" disabled={traceLoading} style={styles.secondaryBtn}>
                {traceLoading ? 'Querying...' : 'Query ▶'}
              </button>
            </form>

            {/* Analytics Output */}
            {analyticsData && (
              <div style={styles.analyticsBox}>
                <div style={styles.statRow}>
                  <span>Total Clicks:</span>
                  <strong>{analyticsData.clicks ?? analyticsData.clickCount ?? 0}</strong>
                </div>
                <div style={styles.statRow}>
                  <span>Original URL:</span>
                  <span style={styles.truncatedUrl}>{analyticsData.originalUrl}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// Inline Style Object
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  navUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  userDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  logoutBtn: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  brandTitle: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: '8px',
  },
  brandSubtitle: {
    fontSize: '15px',
    color: '#94a3b8',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '28px',
    border: '1px solid #334155',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '20px',
    borderBottom: '1px solid #334155',
    paddingBottom: '12px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#94a3b8',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
  },
  primaryBtn: {
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  secondaryBtn: {
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  resultBox: {
    marginTop: '20px',
    padding: '14px',
    backgroundColor: '#0f172a',
    border: '1px solid #22c55e',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  resultLabel: {
    fontSize: '12px',
    color: '#22c55e',
    fontWeight: '600',
  },
  resultLink: {
    color: '#38bdf8',
    fontSize: '15px',
    fontWeight: '500',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  analyticsBox: {
    marginTop: '20px',
    padding: '14px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#cbd5e1',
  },
  truncatedUrl: {
    maxWidth: '250px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#38bdf8',
  },
};