// src/hooks/useInactivityTimeout.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIMEOUT = 2 * 60 * 1000; // 2 minutes warning countdown

export const useInactivityTimeout = () => {
  const { signOut, isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_TIMEOUT / 1000);

  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const showWarningRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    await signOut();
  }, [signOut, clearAllTimers]);

  // Start the warning countdown
  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setRemainingTime(WARNING_TIMEOUT / 1000);

    // Countdown interval (updates every second)
    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    // Auto logout after warning timeout
    warningTimerRef.current = setTimeout(() => {
      handleLogout();
    }, WARNING_TIMEOUT);
  }, [handleLogout]);

  // Reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    // Clear only the inactivity timer, not the warning timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Set inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      startWarningCountdown();
    }, INACTIVITY_TIMEOUT);
  }, [startWarningCountdown]);

  // Handle "Stay Logged In" button click
  const handleStayLoggedIn = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    // Restart the inactivity timer
    resetInactivityTimer();
  }, [clearAllTimers, resetInactivityTimer]);

  // Setup activity listeners - only depends on isAuthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    // Events that count as user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Reset timer on any user activity
    const handleActivity = () => {
      // Only reset if warning is not currently showing (use ref to avoid stale closure)
      if (!showWarningRef.current) {
        resetInactivityTimer();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize the inactivity timer on mount
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [isAuthenticated]); // Only depend on isAuthenticated

  return {
    showWarning,
    remainingTime,
    handleStayLoggedIn,
  };
};
