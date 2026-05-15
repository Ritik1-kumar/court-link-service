// src/pages/admin/UserManagement.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { listUsers, deleteUser } from "@/lib/adminApi";
import {
  Search,
  RefreshCw,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Eye,
  Trash2,
  Phone,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import StatsCard from "../../components/StatsCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import PageHeader from "../../components/PageHeader";
import { formatDate } from "../../lib/caseUtils";
import UserModal from "@/components/admin/UserModal";
import AddUserModal from "@/components/admin/AddUserModal";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const { user: currentUser, profile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newThisMonth: 0,
    totalCases: 0,
    avgCasesPerUser: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, [sortBy, sortOrder]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");

      if (!profile || !["admin", "hceo"].includes(profile.role)) {
        throw new Error("Insufficient permissions to access user management");
      }

      const authUsersData = await listUsers();

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles_public")
        .select("*")
        .order(sortBy, { ascending: sortOrder === "asc" });

      if (profilesError) console.error("Profiles error:", profilesError);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const mergedUsers = authUsersData.map((authUser) => {
        const profile = profilesData?.find((p) => p.id === authUser.id) || {};
        const lastSignIn = authUser.last_sign_in_at
          ? new Date(authUser.last_sign_in_at)
          : null;
        const isActiveUser = lastSignIn && lastSignIn > thirtyDaysAgo;
        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          email_confirmed_at: authUser.email_confirmed_at,
          phone: authUser.phone || profile.phone,
          full_name: profile.full_name,
          role: profile.role,
          bank_details: profile.bank_details,
          vat_reclaim: profile.vat_reclaim,
          terms_accepted: profile.terms_accepted,
          marketing_consent: profile.marketing_consent,
          is_active: isActiveUser,
          ...profile,
        };
      });

      const { data: casesData, error: casesError } = await supabase
        .from("case_submissions")
        .select("*")
        .neq("status", "draft");

      if (casesError) console.error("Cases error:", casesError);

      setUsers(mergedUsers || []);
      setCases(casesData || []);
      calculateStats(mergedUsers || [], casesData || []);
    } catch (err) {
      setError(`Failed to load user data: ${err.message}`);

      try {
        if (profile && ["admin", "hceo"].includes(profile.role)) {
          const { data: fallbackUsers, error: fallbackError } = await supabase
            .from("profiles")
            .select("*")
            .order(sortBy, { ascending: sortOrder === "asc" });

          if (!fallbackError && fallbackUsers) {
            const usersWithStatus = fallbackUsers.map((user) => ({
              ...user,
              is_active:
                user.updated_at &&
                new Date(user.updated_at) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            }));
            setUsers(usersWithStatus);
            calculateStats(usersWithStatus, []);
            setError(
              "Limited user data available - some information may be incomplete",
            );
          }
        } else {
          setError("Insufficient permissions to access user management");
        }
      } catch (fallbackErr) {
        console.error("Fallback fetch also failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersData, casesData) => {
    const totalUsers = usersData.length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeUsers = usersData.filter((u) => {
      if (!u.last_sign_in_at) return false;
      return new Date(u.last_sign_in_at) > thirtyDaysAgo;
    }).length;

    const newThisMonth = usersData.filter((u) => {
      const userDate = new Date(u.created_at);
      const now = new Date();
      return (
        userDate.getMonth() === now.getMonth() &&
        userDate.getFullYear() === now.getFullYear()
      );
    }).length;

    setStats({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newThisMonth,
      totalCases: casesData.length,
      avgCasesPerUser: totalUsers > 0 ? casesData.length / totalUsers : 0,
    });
  };

  const filteredUsers = users.filter((userItem) => {
    const matchesSearch =
      !searchTerm ||
      [userItem.full_name, userItem.email, userItem.phone, userItem.role].some(
        (field) => field?.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const lastSignIn = userItem.last_sign_in_at
      ? new Date(userItem.last_sign_in_at)
      : null;
    const isActive = lastSignIn && lastSignIn > thirtyDaysAgo;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);

    const matchesRole = roleFilter === "all" || userItem.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleUserAction = async (userId, action) => {
    try {
      if (action === "delete") {
        if (userId === currentUser?.id) {
          setError("You cannot delete your own account.");
          return;
        }
        if (
          window.confirm(
            "Are you sure you want to delete this user? This action cannot be undone.",
          )
        ) {
          await deleteUser(userId);
          fetchAllData();
        }
      }
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
      setError(`Failed to ${action} user: ${err.message}`);
    }
  };

  const handleViewCase = (caseId) => {
    window.location.href = `/admin/case/${caseId}`;
  };

  const handleUserAdded = async () => {
    await fetchAllData();
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "hceo":
        return "bg-blue-100 text-blue-800";
      case "accounts":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <LoadingSpinner message="Loading user management..." />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-blue-50 min-h-screen">
      <PageHeader
        title="User Management"
        subtitle="Manage users and view their activity"
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError("")}
              className="ml-auto"
            >
              &times;
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
        />
        <StatsCard
          title="Active"
          value={stats.activeUsers}
          icon={UserCheck}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          valueColor="text-green-600"
        />
        <StatsCard
          title="Inactive"
          value={stats.inactiveUsers}
          icon={UserX}
          iconBgColor="bg-gray-100"
          iconColor="text-gray-600"
          valueColor="text-gray-600"
        />
        <StatsCard
          title="New This Month"
          value={stats.newThisMonth}
          icon={Calendar}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          valueColor="text-blue-600"
        />
      </div>

      {/* User Management Card */}
      <Card>
        {/* Filters and Search */}
        <CardHeader className="border-b px-4 lg:px-6">
          <div className="flex flex-col gap-3">
            {/* Search + Status row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm bg-white"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Action buttons row */}
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowAddUserModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm flex-1 sm:flex-none"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                <span>Add User</span>
              </Button>
              <Button
                onClick={fetchAllData}
                variant="outline"
                className="text-sm flex-1 sm:flex-none"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Users Table — Desktop */}
        <CardContent className="p-0">
          {filteredUsers.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "User",
                        "Contact",
                        "Role",
                        "Joined",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const thirtyDaysAgo = new Date(
                        Date.now() - 30 * 24 * 60 * 60 * 1000,
                      );
                      const lastSignIn = user.last_sign_in_at
                        ? new Date(user.last_sign_in_at)
                        : null;
                      const isActive = lastSignIn && lastSignIn > thirtyDaysAgo;

                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-red-600 font-medium">
                                  {user.full_name?.charAt(0) ||
                                    user.email?.charAt(0) ||
                                    "U"}
                                </span>
                              </div>
                              <div className="ml-4 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {user.full_name || "N/A"}
                                </div>
                                <div className="text-sm text-gray-500 truncate">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {user.phone && (
                                <div className="flex items-center">
                                  <Phone className="w-4 h-4 mr-1 text-gray-400" />
                                  {user.phone}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {user.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}
                            >
                              {user.role || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.created_at)}
                            {user.last_sign_in_at && (
                              <div className="text-xs text-gray-400">
                                Last: {formatDate(user.last_sign_in_at)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                title="View User Details"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleUserAction(user.id, "delete")
                                }
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4 text-red-700" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const thirtyDaysAgo = new Date(
                    Date.now() - 30 * 24 * 60 * 60 * 1000,
                  );
                  const lastSignIn = user.last_sign_in_at
                    ? new Date(user.last_sign_in_at)
                    : null;
                  const isActive = lastSignIn && lastSignIn > thirtyDaysAgo;

                  return (
                    <div
                      key={user.id}
                      className="p-4 bg-white hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Avatar + name */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-red-600 font-medium">
                              {user.full_name?.charAt(0) ||
                                user.email?.charAt(0) ||
                                "U"}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.full_name || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.email}
                            </p>
                            {user.phone && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserAction(user.id, "delete")}
                          >
                            <Trash2 className="w-4 h-4 text-red-700" />
                          </Button>
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}
                        >
                          {user.role || "N/A"}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="text-xs text-gray-400">
                          Joined {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Results summary */}
              <div className="px-4 lg:px-6 py-3 bg-gray-50 text-sm text-gray-700 border-t">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "No users match your current filters."
                  : "No registered users yet."}
              </p>
              {(searchTerm || statusFilter !== "all") && (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={selectedUser}
          cases={cases}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onViewCase={handleViewCase}
        />
      )}

      {/* Add User Modal */}
      <AddUserModal
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={handleUserAdded}
      />
    </div>
  );
};

export default UserManagement;
