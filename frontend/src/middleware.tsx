import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import supabase from './supabase-client';
import Loading from './pages/Loading';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface MiddlewareProps {
  children: ReactNode;
}

export const Middleware: React.FC<MiddlewareProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get current session on initial load
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    // Listen for auth state changes (login, logout, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
