import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { adminSupabase as supabase } from './supabase';

export default function RequireAdmin({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (active) setAllowed(false);
        return;
      }

      const { data: adminRow, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Admin membership check failed.', error);
      }

      if (active) setAllowed(Boolean(adminRow));
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        if (active) setAllowed(false);
        return;
      }

      supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) console.error('Admin membership check failed.', error);
          if (active) setAllowed(Boolean(data));
        });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (allowed === null) return <div className="state-container"><h1>Checking access...</h1></div>;
  if (!allowed) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ message: 'Your session expired. Please sign in again.' }}
      />
    );
  }

  return children;
}
