import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const token = localStorage.getItem('token');
  
  // Check if user is authenticated via context or local storage token
  const isAuthenticated = Boolean(user || token);

  const handleAction = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={styles.container}>
      {/* Dynamic Background Glow Animations */}
      <div style={styles.glowTopLeft} />
      <div style={styles.glowBottomRight} />

      {/* Embedded Animation Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .hero-title {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hero-sub {
          animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hero-cta {
          animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .feature-card {
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          border-color: #38bdf8 !important;
          box-shadow: 0 12px 30px -10px rgba(56, 189, 248, 0.2);
        }
        .btn-glow {
          transition: all 0.3s ease;
        }
        .btn-glow:hover {
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.6);
          transform: scale(1.02);
        }
      `}</style>

      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.brandLogo} onClick={() => navigate('/')}>
          ⚡ SnapLink
        </div>
        <div style={styles.navActions}>
          {isAuthenticated ? (
            <button 
              style={styles.getStartedBtn} 
              className="btn-glow" 
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard ▶
            </button>
          ) : (
            <>
              <button style={styles.navLinkBtn} onClick={() => navigate('/login')}>
                Sign In
              </button>
              <button style={styles.getStartedBtn} className="btn-glow" onClick={() => navigate('/login')}>
                Get Started ▶
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main style={styles.heroSection}>
        <div style={styles.badge} className="hero-title">
          🚀 Next-Gen URL Management & Analytics
        </div>

        <h1 style={styles.heroHeading} className="hero-title">
          Shorten Links. <span style={styles.gradientText}>Track Impact.</span> Scale Reach.
        </h1>

        <p style={styles.heroSubtext} className="hero-sub">
          Transform unwieldy URLs into clean, memorable links. Harness real-time device tracking, custom aliases, click limits, and interactive chart analytics.
        </p>

        <div style={styles.heroCtaGroup} className="hero-cta">
          <button
            style={styles.primaryCta}
            className="btn-glow"
            onClick={handleAction}
          >
            {isAuthenticated ? 'Go to Dashboard ⚡' : 'Start Shortening Free ⚡'}
          </button>
          <button
            style={styles.secondaryCta}
            onClick={handleAction}
          >
            {isAuthenticated ? 'Open Analytics' : 'Explore Dashboard'}
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <section style={styles.gridSection}>
          <div style={styles.card} className="feature-card">
            <div style={styles.cardIcon}>🏷️</div>
            <h3 style={styles.cardTitle}>Custom Aliases</h3>
            <p style={styles.cardText}>
              Branded links build trust. Create customized codes like <code style={styles.code}>snap.link/my-github</code> instead of random characters.
            </p>
          </div>

          <div style={styles.card} className="feature-card">
            <div style={styles.cardIcon}>⏳</div>
            <h3 style={styles.cardTitle}>TTL & Click Limits</h3>
            <p style={styles.cardText}>
              Set expiration timers or maximum click ceilings for sensitive campaigns or limited-time offers.
            </p>
          </div>

          <div style={styles.card} className="feature-card">
            <div style={styles.cardIcon}>📈</div>
            <h3 style={styles.cardTitle}>Recharts Analytics</h3>
            <p style={styles.cardText}>
              Monitor audience traffic trends with real-time interactive line charts, device breakdowns, and referral origins.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© {new Date().getFullYear()} SnapLink. Built for high-performance link management.</p>
      </footer>
    </div>
  );
}

// Inline Style Object
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#090d16',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  glowTopLeft: {
    position: 'absolute',
    top: '-150px',
    left: '-150px',
    width: '450px',
    height: '450px',
    background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(0,0,0,0) 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
    animation: 'pulseGlow 6s infinite ease-in-out',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: '-150px',
    right: '-150px',
    width: '450px',
    height: '450px',
    background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, rgba(0,0,0,0) 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
    animation: 'pulseGlow 8s infinite ease-in-out',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    borderBottom: '1px solid #1e293b',
    backdropFilter: 'blur(10px)',
    zIndex: 10,
  },
  brandLogo: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#f8fafc',
    cursor: 'pointer',
    letterSpacing: '-0.5px',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  navLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  getStartedBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  heroSection: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '80px 20px 60px 20px',
    textAlign: 'center',
    flex: 1,
    zIndex: 5,
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#38bdf8',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '24px',
  },
  heroHeading: {
    fontSize: '52px',
    fontWeight: '900',
    lineHeight: '1.15',
    letterSpacing: '-1.5px',
    marginBottom: '20px',
  },
  gradientText: {
    background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtext: {
    fontSize: '18px',
    color: '#94a3b8',
    maxWidth: '680px',
    margin: '0 auto 36px auto',
    lineHeight: '1.6',
  },
  heroCtaGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '70px',
  },
  primaryCta: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryCta: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    padding: '14px 28px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  gridSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '20px',
    textAlign: 'left',
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  cardIcon: {
    fontSize: '28px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#f8fafc',
  },
  cardText: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.5',
  },
  code: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  footer: {
    textAlign: 'center',
    padding: '24px',
    borderTop: '1px solid #1e293b',
    color: '#64748b',
    fontSize: '13px',
    zIndex: 5,
  },
};