import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SessionContextType {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set up the auth state listener.
    // This will be called immediately with the current session,
    // and then every time the auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Clean up the subscription when the component unmounts.
    return () => subscription.unsubscribe();
  }, []); // Run this effect only once.

  useEffect(() => {
    // Handle redirects based on session state and current location.
    // This effect runs whenever the session, loading state, or location changes.
    if (!loading) {
      const isAuthPage = location.pathname === '/login';
      if (session && isAuthPage) {
        // User is logged in but on the login page, redirect to home.
        navigate('/');
      } else if (!session && !isAuthPage) {
        // User is not logged in and not on the login page, redirect to login.
        navigate('/login');
      }
    }
  }, [session, loading, navigate, location.pathname]);

  const value = {
    session,
    loading,
  };

  // Don't render children until the initial session check is complete.
  // This prevents the flicker effect.
  return (
    <SessionContext.Provider value={value}>
      {loading ? null : children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};