import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { adminSupabase as supabase } from './supabase';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(location.state?.message || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const trimmedEmail = email.trim();
    const isLegacyDemoAdmin = ['admin', 'admin@example.com'].includes(trimmedEmail.toLowerCase()) && password === 'admin123';

    if (isLegacyDemoAdmin) {
      setError('The legacy demo admin login is no longer supported. Use a real Supabase admin email created in Authentication > Users.');
      setSubmitting(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const userId = data?.user?.id;
      if (!userId) {
        throw new Error('No admin session was created.');
      }

      const { data: adminRow, error: adminLookupError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminLookupError) {
        throw adminLookupError;
      }

      if (!adminRow) {
        await supabase.auth.signOut();
        throw new Error('This account is not registered as an admin.');
      }

      navigate('/admin', { replace: true });
    } catch (loginError) {
      console.error('Admin sign-in failed.', loginError);
      setError(loginError.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="admin-login-title">
        <p className="auth-kicker">Lost &amp; Found Tracker</p>
        <h1 id="admin-login-title">Admin sign in</h1>
        <p>Manage reported items and update their status.</p>
        <p className="auth-hint">Use the email of a real admin created in Supabase Authentication. Legacy demo usernames like "admin" are no longer valid.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="admin-email">Admin email</label>
          <input
            id="admin-email"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="admin@yourcompany.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in as admin'}
          </button>
        </form>
        <Link className="auth-link" to="/">Back to client login</Link>
      </section>
    </main>
  );
}
