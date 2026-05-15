// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { identifyUserInSentry, clearSentryUser } from "../lib/sentryUser";
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recoverySession, setRecoverySession] = useState(false);
  const [inviteSession, setInviteSession] = useState(false);

  const isFetchingRef = useRef(false);
  const initializingRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const hasInitialFetchRef = useRef(false);

  const passwordResetTimestampsRef = useRef(new Map());
  const passwordResetInProgressRef = useRef(new Set());

  const fetchUserProfile = useCallback(
    async (currentUser, forceRefetch = false) => {
      if (!currentUser || isFetchingRef.current) {
        return null;
      }

      if (
        !forceRefetch &&
        lastUserIdRef.current === currentUser.id &&
        hasInitialFetchRef.current
      ) {
        return null;
      }

      try {
        isFetchingRef.current = true;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (error) throw error;

        setProfile(data);
        lastUserIdRef.current = currentUser.id;
        hasInitialFetchRef.current = true;
        return data;
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        return null;
      } finally {
        isFetchingRef.current = false;
      }
    },
    [],
  );

  const isInviteFlow = useCallback((session) => {
    if (!session?.user) return false;

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    const urlType = hashParams.get("type") || searchParams.get("type");
    if (urlType === "invite") return true;

    const neverSignedIn = !session.user.last_sign_in_at;
    const isEmailProvider =
      session.user.app_metadata?.provider === "email" ||
      session.user.app_metadata?.providers?.includes("email");
    const hasInvitedAt = !!session.user.invited_at;

    return neverSignedIn && isEmailProvider && hasInvitedAt;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authSubscription = null;

    const initializeAuth = async () => {
      if (initializingRef.current) {
        return;
      }

      initializingRef.current = true;

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
        }

        if (isMounted) {
          if (session?.user) {
            if (isInviteFlow(session)) {
              setInviteSession(true);
              setUser(session.user);
            } else {
              setUser(session.user);
              await fetchUserProfile(session.user, true);
            }
          } else {
            setUser(null);
            setProfile(null);
            lastUserIdRef.current = null;
            hasInitialFetchRef.current = false;
          }
          setLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          lastUserIdRef.current = null;
          hasInitialFetchRef.current = false;
          setLoading(false);
          setIsInitialized(true);
        }
      } finally {
        initializingRef.current = false;
      }
    };

    const setupAuthListener = () => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === "INITIAL_SESSION") {
          return;
        }

        try {
          if (event === "SIGNED_OUT") {
            clearSentryUser();
            setUser(null);
            setProfile(null);
            setRecoverySession(false);
            setInviteSession(false);
            lastUserIdRef.current = null;
            hasInitialFetchRef.current = false;
            setLoading(false);
          } else if (event === "PASSWORD_RECOVERY") {
            setRecoverySession(true);
            setUser(session?.user || null);
            setLoading(false);
          } else if (event === "SIGNED_IN") {
            if (isInviteFlow(session)) {
              setInviteSession(true);
              setUser(session?.user || null);
              setLoading(false);
              return;
            }

            const newUserId = session?.user?.id;
            if (newUserId !== lastUserIdRef.current) {
              setUser(session.user);
              identifyUserInSentry(session.user);
              await fetchUserProfile(session.user);
            } else {
            }
            setLoading(false);
          } else if (event === "TOKEN_REFRESHED") {
            console.log("Token refreshed");
          } else if (event === "USER_UPDATED") {
            setUser(session.user);
            setRecoverySession(false);
            if (session?.user?.id !== lastUserIdRef.current) {
              await fetchUserProfile(session.user, true);
            }
          }
        } catch (error) {
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setRecoverySession(false);
            setInviteSession(false);
            lastUserIdRef.current = null;
            hasInitialFetchRef.current = false;
            setLoading(false);
          }
        }
      });

      authSubscription = subscription;
    };

    initializeAuth().then(() => {
      if (isMounted) {
        setupAuthListener();
      }
    });

    return () => {
      isMounted = false;
      initializingRef.current = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [fetchUserProfile, isInviteFlow]);

  const signUp = useCallback(async (email, password, profileData) => {
    try {
      const bankDetails = {
        bankName: profileData.bankDetails?.bankName || "",
        accountNumber: profileData.bankDetails?.accountNumber || "",
        sortCode: profileData.bankDetails?.sortCode || "",
        accountHolderName: profileData.bankDetails?.accountHolderName || "",
      };

      const userMetadata = {
        full_name: profileData.fullName,
        phone: profileData.phone,
        role: profileData.role || "applicant",
        account_type: profileData.accountType || "individual",
        company_name: profileData.companyName || null,
        invoice_email: profileData.invoiceEmail || null,
        vat_reclaim: profileData.vatReclaim || false,
        terms_accepted: profileData.termsAccepted || false,
        marketing_consent: profileData.marketingConsent || false,
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata,
        },
      });

      if (error) throw error;

      if (data.user?.id) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          const isDev = import.meta.env.DEV;
          const functionUrl = isDev
            ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/.netlify/functions/update-profile-bank-details`
            : `/.netlify/functions/update-profile-bank-details`;

          const response = await fetch(functionUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              bankDetails: bankDetails,
              phone: profileData.phone,
              vatReclaim: profileData.vatReclaim || false,
              termsAccepted: profileData.termsAccepted || false,
              marketingConsent: profileData.marketingConsent || false,
            }),
          });

          const result = await response.json();

          // if (result._serverLogs) {
          //   console.groupCollapsed("🖥️ Server Logs");
          //   result._serverLogs.forEach((log) => console.log(log.message));
          //   console.groupEnd();
          // }

          if (!response.ok || !result.success) {
            console.error(
              "Error updating profile via Netlify function:",
              result.error || result,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const retryResponse = await fetch(functionUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: data.user.id,
                bankDetails: bankDetails,
                phone: profileData.phone,
                vatReclaim: profileData.vatReclaim || false,
                termsAccepted: profileData.termsAccepted || false,
                marketingConsent: profileData.marketingConsent || false,
              }),
            });

            const retryResult = await retryResponse.json();

            // if (retryResult._serverLogs) {
            //   console.groupCollapsed("🖥️ Server Logs (Retry)");
            //   retryResult._serverLogs.forEach((log) =>
            //     console.log(log.message),
            //   );
            //   console.groupEnd();
            // }

            if (!retryResponse.ok || !retryResult.success) {
              console.error(
                "Error updating profile on retry:",
                retryResult.error || retryResult,
              );
            } else {
              console.log("✅ Profile updated successfully with bank details");
            }
          } else {
            console.log("✅ Profile updated successfully with bank details");
          }
        } catch (err) {
          console.error("Exception updating profile:", err);
        }
      } else {
        console.error("No user ID available to update profile");
      }

      return { data, error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { data: null, error };
    }
  }, []);

  const signIn = useCallback(
    async (email, password) => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setLoading(false);
          return { data: null, error };
        }

        if (data.user) {
          setUser(data.user);
          lastUserIdRef.current = data.user.id;
          await fetchUserProfile(data.user, true);
        }

        setLoading(false);
        return { data, error: null };
      } catch (error) {
        console.error("Sign in error:", error);
        setLoading(false);
        return { data: null, error };
      }
    },
    [fetchUserProfile],
  );

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        setLoading(false);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error("Sign out error:", error);
      setLoading(false);
      return { error };
    }
  }, []);

  const updateProfile = useCallback(
    async (profileData) => {
      if (!user?.id) {
        return { data: null, error: new Error("No user logged in") };
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", user.id)
          .select()
          .single();

        if (error) throw error;

        setProfile(data);
        return { data, error: null };
      } catch (error) {
        console.error("Update profile error:", error);
        return { data: null, error };
      }
    },
    [user],
  );

  const resetPassword = useCallback(async (email) => {
    const normalizedEmail = email.toLowerCase().trim();

    if (passwordResetInProgressRef.current.has(normalizedEmail)) {
      return {
        error: new Error(
          "A password reset request is already in progress. Please wait.",
        ),
      };
    }

    const lastRequestTime =
      passwordResetTimestampsRef.current.get(normalizedEmail);
    const now = Date.now();
    const cooldownPeriod = 60000;

    if (lastRequestTime && now - lastRequestTime < cooldownPeriod) {
      const secondsRemaining = Math.ceil(
        (cooldownPeriod - (now - lastRequestTime)) / 1000,
      );
      return {
        error: new Error(
          `Please wait ${secondsRemaining} second${secondsRemaining !== 1 ? "s" : ""} before requesting another password reset email.`,
        ),
      };
    }

    passwordResetInProgressRef.current.add(normalizedEmail);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: redirectUrl,
        },
      );

      if (error) {
        if (
          error.status === 429 ||
          error.message?.includes("rate limit") ||
          error.message?.includes("too many")
        ) {
          passwordResetTimestampsRef.current.set(normalizedEmail, now);
          return {
            error: new Error(
              "Too many password reset requests. Please wait a few minutes before trying again.",
            ),
          };
        }
        return { error };
      }

      passwordResetTimestampsRef.current.set(normalizedEmail, now);
      return { error: null };
    } catch (error) {
      console.error("Password reset error:", error);

      if (
        error.status === 429 ||
        error.message?.includes("rate limit") ||
        error.message?.includes("too many")
      ) {
        passwordResetTimestampsRef.current.set(normalizedEmail, now);
        return {
          error: new Error(
            "Too many password reset requests. Please wait a few minutes before trying again.",
          ),
        };
      }

      return { error };
    } finally {
      passwordResetInProgressRef.current.delete(normalizedEmail);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (error) {
      console.error("Password update error:", error);
      return { error };
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      return { data: null, error: new Error("No user logged in") };
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error("Refresh profile error:", error);
      return { data: null, error };
    }
  }, [user]);

  const clearRecoverySession = useCallback(() => {
    setRecoverySession(false);
  }, []);

  const clearInviteSession = useCallback(() => {
    setInviteSession(false);
  }, []);

  const contextValue = React.useMemo(
    () => ({
      user,
      profile,
      loading,
      isInitialized,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
      resetPassword,
      updatePassword,
      isAuthenticated: !!user && isInitialized && !inviteSession,
      userRole: profile?.role,
      recoverySession,
      clearRecoverySession,
      inviteSession,
      clearInviteSession,
    }),
    [
      user,
      profile,
      loading,
      isInitialized,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
      resetPassword,
      updatePassword,
      recoverySession,
      clearRecoverySession,
      inviteSession,
      clearInviteSession,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
