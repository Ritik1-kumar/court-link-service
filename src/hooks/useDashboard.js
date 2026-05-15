// src/hooks/useDashboard.js
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

export const useDashboard = ({
  userId,
  fetchQuery,
  calculateStats,
  filterCases,
  itemsPerPage = 2, // Default to 2 items per page
  filters = {}, // NEW: Accept filters from parent
}) => {
  const [state, setState] = useState({
    cases: [],
    loading: true,
    error: "",
    stats: {
      totalCases: 0,
      pendingCases: 0,
      completedCases: 0,
      totalAmount: 0,
    },
    currentPage: 1,
    totalCount: 0,
    totalPages: 0,
  });

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  // Fetch paginated data
  const fetchData = useCallback(
    async (page = 1) => {
      if (!userId) {
        setState((prev) => ({
          ...prev,
          loading: false,
          cases: [],
          currentPage: 1,
          totalCount: 0,
          totalPages: 0,
        }));
        return;
      }

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: "" }));

        // Check session first
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session. Please log in again.");
        }

        // Calculate pagination range
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        // Add timeout
        const timeoutMs = 30000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Request timeout. Please refresh the page.")),
            timeoutMs,
          ),
        );

        // Pass pagination params AND filters to fetchQuery
        const queryPromise = fetchQuery(supabase, {
          from,
          to,
          page,
          itemsPerPage,
          filters,
        });
        const result = await Promise.race([queryPromise, timeoutPromise]);

        // Handle the result properly - it should have data, error, and count
        if (!result) {
          throw new Error("No result returned from query");
        }

        const { data, error: fetchError, count } = result;

        if (fetchError) {
          console.error("Fetch error:", fetchError);
          throw fetchError;
        }

        if (!isMountedRef.current) return;

        let cases = data || [];
        if (filterCases) {
          cases = filterCases(cases);
        }

        // Calculate stats from current page data
        const stats = calculateStats(cases);
        const totalPages = Math.ceil((count || 0) / itemsPerPage);

        setState({
          cases,
          loading: false,
          error: "",
          stats,
          currentPage: page,
          totalCount: count || 0,
          totalPages,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);

        if (err.name === "AbortError" || !isMountedRef.current) {
          return;
        }

        let errorMessage = "Failed to load data. Please try again.";

        if (err.message?.includes("timeout")) {
          errorMessage =
            "Request timed out. Please check your connection and try again.";
        } else if (
          err.message?.includes("session") ||
          err.message?.includes("expired")
        ) {
          errorMessage = "Your session has expired. Please log in again.";
          setTimeout(() => {
            supabase.auth.signOut();
          }, 2000);
        } else if (err.message) {
          errorMessage = err.message;
        }

        setState((prev) => ({
          ...prev,
          cases: [],
          loading: false,
          error: errorMessage,
        }));
      }
    },
    [userId, fetchQuery, calculateStats, filterCases, itemsPerPage, filters],
  );

  // Initial fetch and refetch when filters change
  useEffect(() => {
    isMountedRef.current = true;
    hasFetchedRef.current = false;
    fetchData(1); // Reset to page 1 when filters change

    return () => {
      isMountedRef.current = false;
      hasFetchedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, JSON.stringify(filters)]); // Stringify filters to compare by value

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "" }));
  }, []);

  const refetch = useCallback(() => {
    hasFetchedRef.current = false;
    fetchData(state.currentPage);
  }, [fetchData, state.currentPage]);

  const goToPage = useCallback(
    (page) => {
      if (page >= 1 && page <= state.totalPages) {
        fetchData(page);
      }
    },
    [fetchData, state.totalPages],
  );

  return {
    ...state,
    refetch,
    goToPage,
    setError,
    clearError,
    itemsPerPage,
  };
};
