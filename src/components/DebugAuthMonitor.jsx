// src/components/DebugAuthMonitor.jsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DebugAuthMonitor() {
  const [events, setEvents] = useState([]);
  const eventCountRef = useRef({});

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const timestamp = new Date().toLocaleTimeString();

      // Count events
      eventCountRef.current[event] = (eventCountRef.current[event] || 0) + 1;

      setEvents((prev) => {
        const newEvents = [
          ...prev.slice(-9), // Keep last 10 events
          {
            timestamp,
            event,
            hasSession: !!session,
            count: eventCountRef.current[event],
          },
        ];

        // Check for infinite loop (more than 3 same events in last 5)
        const recentEvents = newEvents.slice(-5);
        const sameEventCount = recentEvents.filter(
          (e) => e.event === event
        ).length;

        if (sameEventCount >= 3) {
          console.error(
            `⚠️ POSSIBLE INFINITE LOOP: ${event} fired ${sameEventCount} times`
          );
        }

        return newEvents;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-2xl text-xs max-w-sm z-50">
      <div className="font-bold mb-2 flex items-center justify-between">
        <span>Auth Events (Last 10)</span>
        <button
          onClick={() => setEvents([])}
          className="text-gray-400 hover:text-white text-xs"
        >
          Clear
        </button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {events.length === 0 && (
          <div className="text-gray-500 italic">No events yet</div>
        )}
        {events.map((e, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-gray-500 text-[10px]">{e.timestamp}</span>
            <span
              className={`font-mono ${
                e.event === "SIGNED_IN"
                  ? "text-green-400"
                  : e.event === "SIGNED_OUT"
                  ? "text-red-400"
                  : e.event === "TOKEN_REFRESHED"
                  ? "text-blue-400"
                  : e.event === "INITIAL_SESSION"
                  ? "text-yellow-400"
                  : "text-gray-300"
              }`}
            >
              {e.event}
            </span>
            {e.count > 1 && (
              <span className="text-orange-400 text-[10px]">x{e.count}</span>
            )}
          </div>
        ))}
      </div>
      {Object.keys(eventCountRef.current).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-400">
          Total:{" "}
          {Object.entries(eventCountRef.current)
            .map(([event, count]) => `${event}:${count}`)
            .join(", ")}
        </div>
      )}
    </div>
  );
}
