// src/components/Sidebar.jsx
import React, { useState } from "react";
import {
  User,
  LogOut,
  Home,
  Plus,
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";

const getRoleBasedLinks = (userRole) => {
  switch (userRole) {
    case "applicant":
      return [
        { name: "Dashboard", href: "/applicant/dashboard", icon: Home },
        { name: "Submit Case", href: "/case-submission", icon: Plus },
        { name: "Draft Cases", href: "/drafts", icon: FileText },
        { name: "Profile", href: "/profile", icon: User },
      ];
    case "admin":
      return [
        { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "User Management", href: "admin/user-management", icon: Users },
        { name: "Reports", href: "admin/reports", icon: BarChart3 },
        { name: "Profile", href: "/profile", icon: User },
      ];
    case "hceo":
      return [
        { name: "Dashboard", href: "hceo/dashboard", icon: LayoutDashboard },
        { name: "Profile", href: "/profile", icon: User },
      ];
    case "accounts":
      return [
        {
          name: "Dashboard",
          href: "/accounts/dashboard",
          icon: LayoutDashboard,
        },
        { name: "Profile", href: "/profile", icon: User },
      ];
    default:
      return [];
  }
};

export default function Sidebar() {
  const { user, profile, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const links = getRoleBasedLinks(userRole);

  const isLinkActive = (href) => location.pathname === href;

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await signOut();

      if (error) {
        setSignOutError(error.message || "Failed to sign out");
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setSignOutError(err.message || "An unexpected error occurred");
    } finally {
      setIsSigningOut(false);
    }
  };

  const closeSidebar = () => setIsOpen(false);

  const SidebarContent = () => (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col overflow-y-auto">
      <div className="p-6 border-b flex items-center justify-between">
        <img src="/courtlink_logo.svg" alt="CourtLink Services" className="h-auto w-4/5" />
        {/* Close button — only visible on mobile */}
        <button
          onClick={closeSidebar}
          className="lg:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {links.map((link, index) => {
            const isActive = isLinkActive(link.href);
            const Icon = link.icon;
            return (
              <li key={`${link.href}-${index}`}>
                <Link
                  to={link.href}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4 space-y-4">
        <div className="px-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {userRole?.replace("_", " ") || "No role"}
              </p>
            </div>
          </div>
        </div>

        {signOutError && (
          <div className="px-3">
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {signOutError}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="px-3">
          <Button
            onClick={handleSignOut}
            disabled={isSigningOut}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-5 left-3 z-40 p-2 rounded-md bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-100"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile: backdrop overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile: slide-in drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-50 h-screen transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop: fixed sidebar (always visible) */}
      <div className="hidden lg:block fixed left-0 top-0 z-30 h-screen">
        <SidebarContent />
      </div>
    </>
  );
}