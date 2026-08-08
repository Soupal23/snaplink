import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Shorten form state
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('');
  const [maxClicks, setMaxClicks] = useState('');
  const [shortenedResult, setShortenedResult] = useState(null);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState('');
  const [copied, setCopied] = useState(false);

  // Trace form state
  const [traceCode, setTraceCode] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');

  // User Links State
  const [userLinks, setUserLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Explicit logout handler with navigation
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Fetch user's created links
  const fetchUserLinks = useCallback(async () => {
    if (!token) return;
    setLoadingLinks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/url/my-links`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUserLinks(data);
      }
    } catch (err) {
      console.error('Error fetching user links:', err);
    } finally {
      setLoadingLinks(false);
    }
  }, [token]);

  // Fetch links on initial page load
  useEffect(() => {
    fetchUserLinks();
  }, [fetchUserLinks]);

  // Handle deleting a link
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this link?')) return;

    setDeleteError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/url/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete link');
      }

      // Optimistically update state
      setUserLinks((prev) => prev.filter((link) => link._id !== id));
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  // Handle URL Shortening
  const handleShorten = async (e) => {
    e.preventDefault();
    setShortenError('');
    setShortenedResult(null);
    setShortenLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/url/shorten`, {
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
      fetchUserLinks();
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
      const res = await fetch(`${API_BASE_URL}/api/url/analytics/${traceCode}`, {
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

  // Copy shortened link to clipboard
  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear form fields
  const handleClear = () => {
    setOriginalUrl('');
    setCustomAlias('');
    setExpiresInHours('');
    setMaxClicks('');
    setShortenedResult(null);
    setShortenError('');
  };

  const handleUrlChange = (e) => {
    setOriginalUrl(e.target.value);
    if (shortenedResult) setShortenedResult(null);
    if (shortenError) setShortenError('');
  };

  const handleTraceClear = () => {
    setTraceCode('');
    setAnalyticsData(null);
    setTraceError('');
  };

  const handleTraceCodeChange = (e) => {
    setTraceCode(e.target.value);
    if (analyticsData) setAnalyticsData(null);
    if (traceError) setTraceError('');
  };

  // Transform date breakdown object into a chronologically sorted array for Recharts
  const formattedChartData = analyticsData?.analytics?.dates
    ? Object.entries(analyticsData.analytics.dates)
        .map(([date, clicks]) => ({
          date,
          clicks,
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navUser}>
          <span style={styles.userDot}></span>
          Logged in as <strong>{user?.username || user?.email || 'User'}</strong>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          ↳ Logout
        </button>
      </nav>

      {/* Main Layout Container */}
      <main style={styles.container}>
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
                  onChange={handleUrlChange}
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

              <div style={styles.btnRow}>
                <button type="submit" disabled={shortenLoading} style={styles.primaryBtn}>
                  {shortenLoading ? 'Patching...' : 'Patch It ▶'}
                </button>
                {(originalUrl || shortenedResult) && (
                  <button type="button" onClick={handleClear} style={styles.clearBtn}>
                    ✕ Clear
                  </button>
                )}
              </div>
            </form>

            {shortenedResult && (
              <div style={styles.resultBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={styles.resultLabel}>Shortened Link Created:</span>
                  <button onClick={() => setShortenedResult(null)} style={styles.closeResultBtn}>
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <a
                    href={
                      shortenedResult.shortUrl ||
                      `${API_BASE_URL}/${shortenedResult.urlCode || shortenedResult.customCode}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={styles.resultLink}
                  >
                    {shortenedResult.shortUrl ||
                      `${API_BASE_URL}/${shortenedResult.urlCode || shortenedResult.customCode}`}
                  </a>
                  <button
                    onClick={() =>
                      handleCopyLink(
                        shortenedResult.shortUrl ||
                          `${API_BASE_URL}/${shortenedResult.urlCode || shortenedResult.customCode}`
                      )
                    }
                    style={styles.copyBtn}
                  >
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
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
                  onChange={handleTraceCodeChange}
                  placeholder="Enter short code (e.g., my-custom-link)"
                  style={styles.input}
                />
              </div>

              <div style={styles.btnRow}>
                <button type="submit" disabled={traceLoading} style={styles.secondaryBtn}>
                  {traceLoading ? 'Querying...' : 'Query ▶'}
                </button>
                {(traceCode || analyticsData) && (
                  <button type="button" onClick={handleTraceClear} style={styles.clearBtn}>
                    ✕ Clear
                  </button>
                )}
              </div>
            </form>

            {analyticsData && (
              <div style={styles.analyticsBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={styles.resultLabel}>Analytics Summary:</span>
                  <button onClick={() => setAnalyticsData(null)} style={styles.closeResultBtn}>
                    ✕
                  </button>
                </div>

                <div style={styles.statRow}>
                  <span>Total Clicks:</span>
                  <strong>{analyticsData.clicks}</strong>
                </div>

                <div style={{ marginTop: '20px', width: '100%' }}>
                  <span style={styles.subLabel}>📈 Clicks Over Time</span>

                  {formattedChartData.length === 0 ? (
                    <p style={styles.mutedText}>No click history available yet for this link.</p>
                  ) : (
                    <div style={{ width: '100%', height: 220, marginTop: '12px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '6px',
                              color: '#f8fafc',
                            }}
                            itemStyle={{ color: '#38bdf8' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="clicks"
                            stroke="#38bdf8"
                            strokeWidth={3}
                            dot={{ fill: '#38bdf8', r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Section 3: My Links Table */}
          <section style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={styles.cardTitle}>🔗 My Shortened Links</h2>
              <button onClick={fetchUserLinks} style={styles.refreshBtn}>
                ↻ Refresh
              </button>
            </div>

            {deleteError && <div style={styles.errorBanner}>{deleteError}</div>}

            {loadingLinks ? (
              <p style={styles.mutedText}>Loading your links...</p>
            ) : userLinks.length === 0 ? (
              <p style={styles.mutedText}>You haven't created any shortened links yet.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Short Link</th>
                      <th style={styles.th}>Original URL</th>
                      <th style={styles.th}>Clicks</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLinks.map((link) => (
                      <tr key={link._id} style={styles.tableRow}>
                        <td style={styles.td}>
                          <a
                            href={link.shortUrl || `${API_BASE_URL}/${link.urlCode}`}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.linkText}
                          >
                            {link.urlCode}
                          </a>
                        </td>
                        <td style={{ ...styles.td, ...styles.truncatedCell }} title={link.originalUrl}>
                          {link.originalUrl}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badge}>{link.clicks || 0}</span>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleDelete(link._id)}
                            style={styles.deleteBtn}
                            title="Delete Link"
                          >
                            🗙 Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// Inline Styles Object
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
  subLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#cbd5e1',
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
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  primaryBtn: {
    flex: 2,
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 2,
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  clearBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #475569',
    backgroundColor: '#334155',
    color: '#f8fafc',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  copyBtn: {
    padding: '4px 8px',
    backgroundColor: '#334155',
    color: '#38bdf8',
    border: '1px solid #475569',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
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
    justify: 'space-between',
    fontSize: '14px',
    color: '#cbd5e1',
  },
  closeResultBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
  },
  refreshBtn: {
    background: 'none',
    border: '1px solid #475569',
    color: '#94a3b8',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  tableHeaderRow: {
    borderBottom: '1px solid #334155',
  },
  th: {
    padding: '10px 12px',
    color: '#94a3b8',
    fontWeight: '600',
  },
  tableRow: {
    borderBottom: '1px solid #1e293b',
  },
  td: {
    padding: '12px',
    color: '#e2e8f0',
  },
  truncatedCell: {
    maxWidth: '220px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  linkText: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#38bdf8',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  mutedText: {
    color: '#94a3b8',
    fontSize: '14px',
  },
};