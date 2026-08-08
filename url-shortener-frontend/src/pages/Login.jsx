import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state?.from?.pathname && location.state.from.pathname !== '/')
  ? location.state.from.pathname
  : '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Sign In to SnapLink</h2>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.footerText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid #334155',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  title: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
  },
  button: {
    marginTop: '8px',
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  footerText: {
    marginTop: '20px',
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
  },
  link: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontWeight: '500',
  },
};