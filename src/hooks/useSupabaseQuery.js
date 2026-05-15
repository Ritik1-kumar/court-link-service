// src/hooks/useSupabaseQuery.js
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Hook to handle Supabase queries with timeout and error handling
 */
export const useSupabaseQuery = (timeoutMs = 10000) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeQuery = useCallback(
    async (queryFn) => {
      setLoading(true);
      setError(null);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error("Request timeout - please check your connection")),
          timeoutMs
        )
      );

      try {
        // Race between the query and timeout
        const result = await Promise.race([queryFn(), timeoutPromise]);

        setLoading(false);
        return result;
      } catch (err) {
        console.error("Query error:", err);

        // Check if it's a session error
        if (err.message?.includes("session") || err.message?.includes("JWT")) {
          // Try to refresh session
          try {
            const { error: refreshError } =
              await supabase.auth.refreshSession();
            if (!refreshError) {
              // Retry the query after refresh
              const result = await queryFn();
              setLoading(false);
              return result;
            }
          } catch (refreshErr) {
            console.error("Session refresh failed:", refreshErr);
          }
        }

        setError(err.message || "An error occurred");
        setLoading(false);
        throw err;
      }
    },
    [timeoutMs]
  );

  return { executeQuery, loading, error };
};
