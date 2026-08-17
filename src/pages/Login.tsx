import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSession, login } from '../lib/auth';

const REMEMBERED_USERNAME_KEY = 'itrust.remembered.username';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const rememberedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (rememberedUsername) setUsername(rememberedUsername);
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const cleanUsername = username.trim();
    setError('');
    setLoading(true);

    try {
      await login(cleanUsername, password);

      if (remember) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, cleanUsername);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-label="I-TRUST WEBAPP login">
        <div className="brand-mark" aria-hidden="true">IT</div>
        <p className="eyebrow">I-TRUST WEBAPP</p>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">
          Secure access to your shop management workspace.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Username / Email
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="Enter username or email"
              required
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              required
            />
          </label>

          <div className="auth-row">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember Login
            </label>
            <button type="button" className="link-button" onClick={() => setError('Please contact your administrator to reset your password.')}>
              Contact Admin
            </button>
          </div>

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          <button className="primary-button login-button" disabled={loading} type="submit">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">Admin • Manager • User access</p>
      </section>
    </main>
  );
}
