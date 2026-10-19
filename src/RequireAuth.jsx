import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

export default function RequireAuth({ children }) {
  const [authenticated, setAuthenticated] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setAuthenticated(Boolean(session?.user));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthenticated(Boolean(session?.user));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authenticated === null) {
    return <main className="auth-loading" aria-live="polite">Checking your session...</main>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}