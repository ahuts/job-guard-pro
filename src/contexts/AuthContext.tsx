import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getEmailVerificationRedirectUrl } from "@/lib/authRedirect";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ExtensionSessionMessage = {
  type?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
};

const EXTENSION_SESSION_MESSAGE = "GHOSTJOB_EXTENSION_SESSION";

function removeAuthQueryParams(paramNames: string[]) {
  const url = new URL(window.location.href);
  let changed = false;

  paramNames.forEach((name) => {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name);
      changed = true;
    }
  });

  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    removeAuthQueryParams(["token", "refresh_token"]);

    const handleExtensionSession = (event: MessageEvent<ExtensionSessionMessage>) => {
      if (event.origin !== window.location.origin || event.source !== window) return;

      const message = event.data;
      if (!message || message.type !== EXTENSION_SESSION_MESSAGE) return;

      if (message.error) {
        removeAuthQueryParams(["extension_login"]);
        setLoading(false);
        return;
      }

      if (!message.accessToken || !message.refreshToken) return;

      supabase.auth
        .setSession({
          access_token: message.accessToken,
          refresh_token: message.refreshToken,
        })
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to set session from extension handoff:", error);
          }
          setSession(data?.session ?? null);
          setLoading(false);
        })
        .finally(() => {
          removeAuthQueryParams(["extension_login"]);
        });
    };

    window.addEventListener("message", handleExtensionSession);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      window.removeEventListener("message", handleExtensionSession);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { lovable } = await import("@/integrations/lovable");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        console.error("Google sign-in error:", result.error);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailVerificationRedirectUrl(),
        data: { full_name: fullName || "" },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
