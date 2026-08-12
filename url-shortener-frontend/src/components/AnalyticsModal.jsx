import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function AnalyticsModal({ urlCode, onClose, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/url/analytics/${urlCode}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch analytics');
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (urlCode) fetchAnalytics();
  }, [urlCode, token]);

  if (!urlCode) return null;

  // Transform Device object to Chart Array
  const deviceData = data?.analytics?.devices
    ? Object.entries(data.analytics.devices).map(([device, clicks]) => ({
        device: device.charAt(0).toUpperCase() + device.slice(1),
        clicks,
      }))
    : [];

  // Transform Referrers object to Array
  const referrerData = data?.analytics?.referrers
    ? Object.entries(data.analytics.referrers).map(([source, clicks]) => ({
        source,
        clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks)
    : [];

  // Transform and sort Daily Timeline object to Chart Array
  const timelineData = data?.analytics?.dates
    ? Object.entries(data.analytics.dates)
        .map(([date, clicks]) => ({ date, clicks }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  // Determine top device
  const topDevice = deviceData.reduce(
    (max, item) => (item.clicks > max.clicks ? item : max),
    { device: 'N/A', clicks: 0 }
  );

  // Determine primary source by highest click count
  const topReferrer = referrerData.reduce(
    (max, item) => (item.clicks > max.clicks ? item : max),
    { source: 'Direct', clicks: 0 }
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              📊 Analytics for <span style={styles.codeHighlight}>/{urlCode}</span>
            </h2>
            {data?.originalUrl && (
              <p style={styles.subtitle} title={data.originalUrl}>
                Target: {data.originalUrl}
              </p>
            )}
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={styles.centerBox}>
            <p style={styles.mutedText}>Fetching click analytics...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBanner}>{error}</div>
        ) : (
          <div style={styles.body}>
            {/* KPI Stat Cards */}
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Total Clicks</span>
                <span style={styles.kpiValue}>{data?.clicks || 0}</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Top Platform</span>
                <span style={styles.kpiValue}>{topDevice.device}</span>
              </div>
              <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Primary Source</span>
              <span style={styles.kpiValue}>
                {topReferrer.source}
              </span>
              </div>
            </div>

            {/* Daily Clicks Chart */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>📈 Clicks Over Time</h3>
              {timelineData.length === 0 ? (
                <p style={styles.mutedText}>No activity recorded yet.</p>
              ) : (
                <div style={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '6px',
                          color: '#f8fafc',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={{ fill: '#38bdf8', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Bottom Row: Devices & Referrers */}
            <div style={styles.splitGrid}>
              {/* Devices Breakdown */}
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>📱 Devices</h3>
                {deviceData.length === 0 ? (
                  <p style={styles.mutedText}>No device metrics.</p>
                ) : (
                  <div style={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="device" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '6px',
                            color: '#f8fafc',
                          }}
                        />
                        <Bar dataKey="clicks" fill="#818cf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Referrers Breakdown */}
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>🌐 Traffic Sources</h3>
                {referrerData.length === 0 ? (
                  <p style={styles.mutedText}>No referrer metrics.</p>
                ) : (
                  <div style={styles.referrerList}>
                    {referrerData.map((item, idx) => (
                      <div key={idx} style={styles.referrerItem}>
                        <span style={styles.referrerName}>{item.source}</span>
                        <span style={styles.badge}>{item.clicks} clicks</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '650px',
    maxHeight: '90vh',
    overflowY: 'auto',
    color: '#f8fafc',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: '1px solid #334155',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff',
  },
  codeHighlight: {
    color: '#38bdf8',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '4px 0 0 0',
    maxWidth: '480px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  centerBox: {
    padding: '40px',
    textAlign: 'center',
  },
  mutedText: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
  },
  errorBanner: {
    margin: '24px',
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  kpiCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpiLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#38bdf8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 0,
    marginBottom: '14px',
  },
  chartContainer: {
    width: '100%',
    height: 180,
  },
  splitGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  referrerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '180px',
    overflowY: 'auto',
  },
  referrerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    borderRadius: '6px',
    border: '1px solid #334155',
  },
  referrerName: {
    fontSize: '13px',
    color: '#e2e8f0',
  },
  badge: {
    backgroundColor: '#334155',
    color: '#38bdf8',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
};