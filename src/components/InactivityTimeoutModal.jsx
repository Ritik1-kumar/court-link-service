// src/components/InactivityTimeoutModal.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";

const InactivityTimeoutModal = ({ isOpen, onStayLoggedIn, remainingTime }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header Section with gradient background */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-6 py-8 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              <div className="relative flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">
            Session Timeout Warning
          </h2>
          <p className="text-amber-50 text-center text-sm">
            You've been inactive for a while
          </p>
        </div>

        {/* Content Section */}
        <div className="px-6 py-8 bg-white">
          {/* Countdown Timer */}
          <div className="mb-6">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-900 tracking-tight tabular-nums">
                    {formatTime(remainingTime)}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 font-medium text-base">
                Auto logout in {formatTime(remainingTime)}
              </p>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 text-center leading-relaxed">
              For your security, you will be automatically logged out due to
              inactivity. Click the button below to continue your session.
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={onStayLoggedIn}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Stay Logged In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InactivityTimeoutModal;
