import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import AnalyticsModal from '../components/AnalyticsModal';

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
  const [copiedId, setCopiedId] = useState(null);

  // User Links State
  const [userLinks, setUserLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Modal State
  const [selectedUrlCode, setSelectedUrlCode] = useState(null);

  // Logout handler using SPA Router navigation
  const handleLogout = () => {
    logout();
    window.location.assign('/');
  };

  // Fetch user's created links
  const fetchUserLinks = useCallback(async () => {
    if (!token) return;
    setLoadingLinks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/url/my-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setUserLinks(data);
    } catch (err) {
      console.error('Error fetching user links:', err);
    } finally {
      setLoadingLinks(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserLinks();
  }, [fetchUserLinks]);

  // Handle deleting a link
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this link?')) return;

    setDeleteError('');
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/url/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete link');

      setUserLinks((prev) => prev.filter((link) => link._id !== id));
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
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

  const handleCopyLink = (url, id = 'result') => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setOriginalUrl('');
    setCustomAlias('');
    setExpiresInHours('');
    setMaxClicks('');
    setShortenedResult(null);
    setShortenError('');
  };

  // Aggregate Calculations for Overview
  const totalLinks = userLinks.length;
  const totalClicks = userLinks.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const mostActiveLink =
    userLinks.length > 0
      ? userLinks.reduce(
          (max, curr) => ((curr.clicks || 0) > (max.clicks || 0) ? curr : max),
          userLinks[0]
        )
      : null;
  const avgClicksPerLink = totalLinks > 0 ? (totalClicks / totalLinks).toFixed(1) : '0';

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

      {/* Analytics Modal Integration */}
      {selectedUrlCode && (
        <AnalyticsModal
          urlCode={selectedUrlCode}
          onClose={() => setSelectedUrlCode(null)}
          token={token}
        />
      )}

      {/* Main Layout Container */}
      <main style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.brandTitle}>🔗 SnapLink</h1>
          <p style={styles.brandSubtitle}>
            Plug a long link into a short jack, then trace its clicks.
          </p>
        </header>

        <div style={styles.grid}>
          {/* Section 1: Overview Quick Metrics */}
          <section style={styles.card}>
            <div style={styles.overviewHeader}>
              <h2 style={styles.overviewCardTitle}>⚡ Dashboard Overview</h2>
              <span style={styles.liveBadge}>Live Data</span>
            </div>

            <div style={styles.kpiGrid}>
              {/* Card 1: Total Links */}
              <div style={styles.kpiCard}>
                <div style={styles.kpiCardTop}>
                  <span style={styles.kpiLabel}>Total Short Links</span>
                  <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                    🔗
                  </div>
                </div>
                <div style={styles.kpiValue}>{totalLinks}</div>
                <p style={styles.kpiSubtext}>Active in your account</p>
              </div>

              {/* Card 2: Total Clicks */}
              <div style={styles.kpiCard}>
                <div style={styles.kpiCardTop}>
                  <span style={styles.kpiLabel}>Total Engagements</span>
                  <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                    📊
                  </div>
                </div>
                <div style={styles.kpiValue}>{totalClicks.toLocaleString()}</div>
                <p style={styles.kpiSubtext}>~{avgClicksPerLink} avg. clicks / link</p>
              </div>

              {/* Card 3: Top Performing Link */}
              <div style={styles.kpiCard}>
                <div style={styles.kpiCardTop}>
                  <span style={styles.kpiLabel}>Top Performing Alias</span>
                  <div style={{ ...styles.iconWrapper, backgroundColor: 'rgba(251, 146, 60, 0.1)', color: '#fb923c' }}>
                    ≫
                  </div>
                </div>
                {mostActiveLink && mostActiveLink.clicks > 0 ? (
                  <div>
                    <div style={styles.topAliasText}>/{mostActiveLink.urlCode}</div>
                    <p style={styles.kpiSubtext}>
                      <strong>{mostActiveLink.clicks}</strong> total clicks recorded
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ ...styles.topAliasText, color: '#64748b' }}>None yet</div>
                    <p style={styles.kpiSubtext}>Awaiting first link click</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Shorten Form */}
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
                  onChange={(e) => {
                    setOriginalUrl(e.target.value);
                    if (shortenedResult) setShortenedResult(null);
                    if (shortenError) setShortenError('');
                  }}
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
                  <button onClick={() => setShortenedResult(null)} style={styles.closeResultBtn}>✕</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <a
                    href={shortenedResult.shortUrl || `${API_BASE_URL}/${shortenedResult.urlCode || shortenedResult.customCode}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.resultLink}
                  >
                    {shortenedResult.shortUrl || `${API_BASE_URL}/${shortenedResult.urlCode || shortenedResult.customCode}`}
                  </a>
                  <button
                    onClick={() => handleCopyLink(shortenedResult.shortUrl || `${API_BASE_URL}/${shortenedResult.urlCode || shortenedResult.customCode}`, 'result')}
                    style={styles.copyBtn}
                  >
                    {copiedId === 'result' ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section 3: My Links Table */}
          <section style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ ...styles.cardTitle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                🔗 My Shortened Links
              </h2>
              <button onClick={fetchUserLinks} style={styles.refreshBtn}>↻ Refresh</button>
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
                      <th style={styles.th}>Analytics</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLinks.map((link) => {
                      const fullShortUrl = link.shortUrl || `${API_BASE_URL}/${link.urlCode}`;
                      return (
                        <tr key={link._id} style={styles.tableRow}>
                          <td style={styles.td}>
                            <a href={fullShortUrl} target="_blank" rel="noreferrer" style={styles.linkText}>
                              {link.urlCode}
                            </a>
                          </td>
                          <td style={{ ...styles.td, ...styles.truncatedCell }} title={link.originalUrl}>
                            {link.originalUrl}
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => setSelectedUrlCode(link.urlCode)}
                              style={styles.badgeBtn}
                              title="Click to view detailed modal analytics"
                            >
                              {link.clicks || 0} Clicks 📊
                            </button>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleCopyLink(fullShortUrl, link._id)}
                                style={styles.copyBtn}
                              >
                                {copiedId === link._id ? '✓ Copied!' : '📋 Copy'}
                              </button>
                              <button
                                onClick={() => handleDelete(link._id)}
                                disabled={deletingId === link._id}
                                style={styles.deleteBtn}
                                title="Delete Link"
                              >
                                {deletingId === link._id ? '...' : '🗙 Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

// Updated Styles
const styles = {
  page: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' },
  navUser: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94a3b8' },
  userDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' },
  logoutBtn: { backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  container: { maxWidth: '900px', margin: '0 auto', padding: '40px 20px' },
  header: { textAlign: 'center', marginBottom: '36px' },
  brandTitle: { fontSize: '32px', fontWeight: '800', color: '#38bdf8', marginBottom: '8px' },
  brandSubtitle: { fontSize: '15px', color: '#94a3b8' },
  grid: { display: 'flex', flexDirection: 'column', gap: '24px' },
  card: { backgroundColor: '#1e293b', borderRadius: '12px', padding: '28px', border: '1px solid #334155', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' },
  cardTitle: { fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '12px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label: { fontSize: '13px', fontWeight: '500', color: '#94a3b8' },
  input: { padding: '10px 14px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '14px', outline: 'none' },
  btnRow: { display: 'flex', gap: '12px', marginTop: '8px' },
  primaryBtn: { flex: 2, padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  clearBtn: { flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#334155', color: '#f8fafc', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  copyBtn: { padding: '6px 10px', backgroundColor: '#334155', color: '#38bdf8', border: '1px solid #475569', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' },
  badgeBtn: { backgroundColor: '#0f172a', border: '1px solid #38bdf8', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', color: '#38bdf8', cursor: 'pointer' },
  errorBanner: { backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' },
  resultBox: { marginTop: '20px', padding: '14px', backgroundColor: '#0f172a', border: '1px solid #22c55e', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  resultLabel: { fontSize: '12px', color: '#22c55e', fontWeight: '600' },
  resultLink: { color: '#38bdf8', fontSize: '15px', fontWeight: '500', textDecoration: 'none', wordBreak: 'break-all' },
  closeResultBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' },
  refreshBtn: { background: 'none', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' },
  tableHeaderRow: { borderBottom: '1px solid #334155' },
  th: { padding: '10px 12px', color: '#94a3b8', fontWeight: '600' },
  tableRow: { borderBottom: '1px solid #1e293b' },
  td: { padding: '12px', color: '#e2e8f0' },
  truncatedCell: { maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  linkText: { color: '#38bdf8', textDecoration: 'none', fontWeight: '500' },
  deleteBtn: { backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  mutedText: { color: '#94a3b8', fontSize: '14px' },

  // Overview Specific Styles
  overviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  overviewCardTitle: { fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: 0 },
  liveBadge: { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
  kpiCard: { backgroundColor: '#0f172a', borderRadius: '12px', padding: '18px 20px', border: '1px solid rgba(51, 65, 85, 0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  kpiCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  kpiLabel: { fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  iconWrapper: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
  kpiValue: { fontSize: '28px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.5px', lineHeight: '1.2' },
  topAliasText: { fontSize: '20px', fontWeight: '700', color: '#38bdf8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' },
  kpiSubtext: { fontSize: '12px', color: '#64748b', marginTop: '6px', marginBottom: 0 },
};