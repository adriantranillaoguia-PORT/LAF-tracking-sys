import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setAuthPersistence, supabase } from './supabase';

export default function ClientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const recoveryStarted = useRef(window.location.hash.includes('type=recovery'));
  const [mode, setMode] = useState(recoveryStarted.current ? 'recovery' : 'login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryStarted.current = true;
        setMode('recovery');
      } else if (event === 'SIGNED_IN' && session?.user && !recoveryStarted.current) {
        navigate('/home', { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session?.user && !recoveryStarted.current) {
        navigate('/home', { replace: true });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const clearFeedback = () => {
    setError('');
    setMessage('');
  };

  const recordClientLogin = async (session) => {
    if (!session?.user) return;

    try {
      const { data: adminRecord, error: adminCheckError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminCheckError || adminRecord) return;
    } catch {
      return;
    }

    const dedupeKey = `client-login-history:${session.user.id}`;
    const now = Date.now();
    let storageAvailable = false;

    try {
      storageAvailable = typeof window !== 'undefined' && Boolean(window.localStorage);
      const previousLogin = storageAvailable ? Number(window.localStorage.getItem(dedupeKey)) : 0;
      if (previousLogin && now - previousLogin < 30_000) return;
      if (storageAvailable) window.localStorage.setItem(dedupeKey, String(now));
    } catch {
      storageAvailable = false;
    }

    try {
      const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || null;
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || null : null;
      const { error: insertError } = await supabase
        .from('client_login_history')
        .insert({
          user_id: session.user.id,
          email: session.user.email || '',
          full_name: fullName,
          user_agent: userAgent,
        });

      if (insertError && storageAvailable) {
        window.localStorage.removeItem(dedupeKey);
      }
    } catch {
      if (storageAvailable) {
        try {
          window.localStorage.removeItem(dedupeKey);
        } catch {
          // Login tracking must never interrupt authentication.
        }
      }
    }
  };

  const validatePassword = () => {
    if (password.length < 8) {
      throw new Error('Use a password with at least 8 characters.');
    }
    if (password !== confirmPassword) {
      throw new Error('The passwords do not match.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);

    try {
      if (mode === 'register' || mode === 'recovery') validatePassword();

      if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Enter your full name.');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          navigate('/home', { replace: true });
        } else {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setMessage('Account created. Check your email to confirm your account, then sign in.');
        }
      } else if (mode === 'recovery') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        recoveryStarted.current = false;
        navigate('/home', { replace: true });
      } else if (mode === 'forgot') {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          throw new Error('Enter a valid email address to receive a reset link.');
        }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login`,
        });
        if (resetError) throw resetError;
        setMessage('If an account exists for that email, a password reset link is on its way.');
      } else {
        setAuthPersistence(rememberMe);
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;
        void recordClientLogin(data.session);
        const requestedPath = location.state?.from?.pathname;
        navigate(requestedPath && requestedPath !== '/' ? requestedPath : '/home', { replace: true });
      }
    } catch (authError) {
      setError(authError.message || 'Unable to complete your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isRegistering = mode === 'register';
  const isRecovering = mode === 'recovery';
  const isForgotPassword = mode === 'forgot';
  const title = isRegistering ? 'Create your account' : isRecovering ? 'Choose a new password' : isForgotPassword ? 'Reset your password' : 'Welcome Back!';
  const subtitle = isRegistering
    ? 'Join the campus community and help reunite lost belongings.'
    : isRecovering
      ? 'Choose a strong password for your account.'
      : isForgotPassword
        ? 'We will send a secure password reset link to your email.'
        : 'Sign in to access the campus lost and found system.';

  return (
    <main className="client-auth-page">
      <div className="client-auth-layout">
        <header className="client-auth-brand">
          <img src="/cpsu-seal.svg" alt="CPSU Lost and Found logo" />
          <div>
            <p className="client-auth-system-name">CPSU LOST AND FOUND TRACKING SYSTEM</p>
            <p className="client-auth-tagline">Find what's lost. Reunite what matters.</p>
          </div>
        </header>

        <section className="client-auth-card" aria-labelledby="client-login-title">
          {!isRecovering && !isForgotPassword && (
            <div className="client-auth-tabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={!isRegistering} className={!isRegistering ? 'active' : ''} onClick={() => { setMode('login'); clearFeedback(); }}>
                Login
              </button>
              <button type="button" role="tab" aria-selected={isRegistering} className={isRegistering ? 'active' : ''} onClick={() => { setMode('register'); clearFeedback(); }}>
                Register
              </button>
            </div>
          )}

          <div className="client-auth-intro">
            <span className="client-auth-eyebrow">CAMPUS LOST &amp; FOUND</span>
            <h1 id="client-login-title">{title}</h1>
            <p>{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="client-auth-form">
            {isRegistering && <>
              <label htmlFor="client-name">Full name</label>
              <input id="client-name" type="text" autoComplete="name" placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </>}

            {!isRecovering && <>
              <label htmlFor="client-email">Email address</label>
              <input id="client-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </>}

            {!isForgotPassword && <>
              <label htmlFor="client-password">{isRecovering ? 'New password' : 'Password'}</label>
              <div className="client-password-field">
                <input id="client-password" type={showPassword ? 'text' : 'password'} autoComplete={isRegistering || isRecovering ? 'new-password' : 'current-password'} placeholder={isRegistering || isRecovering ? 'At least 8 characters' : 'Enter your password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isRegistering || isRecovering ? 8 : undefined} required />
                <button type="button" className="client-password-toggle" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {(isRegistering || isRecovering) && <p className="client-password-help">Use at least 8 characters. A longer, unique passphrase is recommended.</p>}
            </>}

            {(isRegistering || isRecovering) && <>
              <label htmlFor="client-confirm-password">Confirm password</label>
              <div className="client-password-field">
                <input id="client-confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
                <button type="button" className="client-password-toggle" onClick={() => setShowConfirmPassword((shown) => !shown)} aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </>}

            {mode === 'login' && <div className="client-auth-options">
              <label className="client-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> <span>Remember me</span></label>
              <button type="button" className="client-text-button" onClick={() => { setMode('forgot'); clearFeedback(); }}>Forgot password?</button>
            </div>}

            {error && <p className="client-auth-error" role="alert">{error}</p>}
            {message && <p className="client-auth-message" role="status">{message}</p>}

            <button type="submit" className="client-auth-submit" disabled={submitting}>
              {submitting ? <><span className="client-auth-spinner" aria-hidden="true" />{isRegistering ? 'Creating account...' : isRecovering ? 'Updating password...' : isForgotPassword ? 'Sending reset link...' : 'Signing in...'}</> : isRegistering ? 'Register Account' : isRecovering ? 'Update Password' : isForgotPassword ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>

          {mode === 'login' && <>
            <div className="client-auth-divider"><span>OR</span></div>
            <button type="button" className="client-auth-secondary" onClick={() => { setMode('register'); clearFeedback(); }}>Create an Account</button>
          </>}

          {(isForgotPassword || isRecovering) && <button type="button" className="client-auth-back" onClick={() => { setMode('login'); clearFeedback(); }}>Back to sign in</button>}
          {isRegistering && <p className="client-auth-switch">Already have an account? <button type="button" onClick={() => { setMode('login'); clearFeedback(); }}>Sign in</button></p>}
          <p className="client-auth-security"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>Your information is safe and secure with us.</p>
        </section>
        <footer className="client-auth-footer">Central Philippine State University <span aria-hidden="true">•</span> Lost &amp; Found</footer>
      </div>
    </main>
  );
}