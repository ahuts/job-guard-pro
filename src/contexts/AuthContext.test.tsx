import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { getEmailVerificationRedirectUrl } from "@/lib/authRedirect";

// Mock supabase client
const signUpMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        onAuthStateChangeMock(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: () => getSessionMock(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      setSession: vi.fn(),
    },
  },
}));

const TestConsumer = ({ onReady }: { onReady: (auth: ReturnType<typeof useAuth>) => void }) => {
  const auth = useAuth();
  onReady(auth);
  return null;
};

describe("AuthContext - email verification redirect", () => {
  beforeEach(() => {
    signUpMock.mockReset();
    onAuthStateChangeMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    signUpMock.mockResolvedValue({ error: null });
  });

  it("sends signUp with emailRedirectTo pointing at /dashboard", async () => {
    let auth: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthProvider>
        <TestConsumer onReady={(a) => { auth = a; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(auth).not.toBeNull());
    await act(async () => {
      await auth!.signUpWithEmail("test@example.com", "password123", "Test User");
    });

    expect(signUpMock).toHaveBeenCalledTimes(1);
    const callArg = signUpMock.mock.calls[0][0];
    expect(callArg.email).toBe("test@example.com");
    expect(callArg.password).toBe("password123");
    expect(callArg.options.emailRedirectTo).toBe(getEmailVerificationRedirectUrl());
    expect(callArg.options.data).toEqual({ full_name: "Test User" });
  });

  it("maps internal lovableproject origins to the public preview dashboard URL", () => {
    expect(
      getEmailVerificationRedirectUrl(
        "https://e8d0384f-c5d7-429b-8c6c-44eb10c7bbb5.lovableproject.com",
        "e8d0384f-c5d7-429b-8c6c-44eb10c7bbb5",
      ),
    ).toBe("https://id-preview--e8d0384f-c5d7-429b-8c6c-44eb10c7bbb5.lovable.app/dashboard");
  });

  it("creates an authenticated session when onAuthStateChange fires SIGNED_IN after verification", async () => {
    let auth: ReturnType<typeof useAuth> | null = null;
    render(
      <AuthProvider>
        <TestConsumer onReady={(a) => { auth = a; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

    // Simulate Supabase firing SIGNED_IN after the user clicks the verify link
    // and lands back on /dashboard with a session.
    const callback = onAuthStateChangeMock.mock.calls[0][0];
    const fakeSession = {
      access_token: "verified-token",
      refresh_token: "refresh",
      user: { id: "user-1", email: "test@example.com" },
    };
    act(() => {
      callback("SIGNED_IN", fakeSession);
    });

    await waitFor(() => {
      expect(auth?.session).toEqual(fakeSession);
      expect(auth?.user?.id).toBe("user-1");
      expect(auth?.loading).toBe(false);
    });
  });
});
