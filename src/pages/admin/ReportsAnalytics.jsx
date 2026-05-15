// src/pages/admin/ReportsAnalytics.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { listUsers } from "@/lib/adminApi";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PoundSterlingIcon,
  FileText,
  AlertCircle,
  PieChart,
  Activity,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Target,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Area,
  AreaChart,
  Pie,
} from "recharts";
import {
  formatAmount,
  formatDate,
  formatDateTime,
  generateCompanyCaseId,
} from "@/lib/caseUtils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";

// Calculate statistics helper
const calculateStats = (cases) => {
  const totalCases = cases.length;
  const submittedCases = cases.filter((c) => c.status === "submitted").length;
  const returnedCases = cases.filter((c) => c.status === "returned").length;
  const approvedCases = cases.filter((c) => c.status === "approved").length;
  const writReceivedCases = cases.filter(
    (c) => c.status === "writ_received",
  ).length;
  const hceoCompletedCases = cases.filter(
    (c) => c.status === "hceo_completed",
  ).length;
  const closedCases = cases.filter((c) => c.status === "closed").length;

  return {
    totalCases,
    submittedCases,
    returnedCases,
    approvedCases,
    writReceivedCases,
    hceoCompletedCases,
    closedCases,
  };
};

const ReportsAnalytics = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cases, setCases] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({
    revenue: {
      total: 0,
      thisMonth: 0,
      lastMonth: 0,
      growth: 0,
    },
    cases: {
      total: 0,
      submitted: 0,
      approved: 0,
      completedByAdmin: 0,
      completedByHceo: 0,
      conversion: 0,
      avgValue: 0,
    },
    users: {
      total: 0,
      active: 0,
      newThisMonth: 0,
      retention: 0,
    },
    performance: {
      completionTime: 0,
      successRate: 0,
      customerSatisfaction: 85,
    },
    trends: {
      monthlyRevenue: [],
      monthlyCases: [],
      statusDistribution: [],
      courtDistribution: [],
    },
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError("");

      // Check if current user is admin or HCEO
      const { data: currentUserProfile } = await supabase
        .from("profiles_public")
        .select("role")
        .eq("id", currentUser?.id)
        .single();

      if (
        !currentUserProfile ||
        !["admin", "hceo"].includes(currentUserProfile.role)
      ) {
        throw new Error("Insufficient permissions to access analytics");
      }

      // Fetch cases - EXCLUDE draft cases
      const { data: casesData, error: casesError } = await supabase
        .from("case_submissions")
        .select("*")
        .neq("status", "draft")
        .order("created_at", { ascending: false });

      if (casesError) throw casesError;

      // Fetch user profiles to get company names
      let casesWithProfiles = casesData || [];
      if (casesData && casesData.length > 0) {
        const userIds = [...new Set(casesData.map((c) => c.user_id))].filter(
          Boolean,
        );

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles_public")
            .select("id, email, role, full_name, company_name")
            .in("id", userIds);

          if (!profilesError && profilesData) {
            casesWithProfiles = casesData.map((caseItem) => {
              const userProfile = profilesData.find(
                (p) => p.id === caseItem.user_id,
              );
              return {
                ...caseItem,
                user_profile: userProfile || null,
              };
            });
          }
        }
      }

      // Fetch users
      let usersData = [];
      try {
        const authUsersData = await listUsers();

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles_public")
          .select("*");

        usersData = authUsersData.map((authUser) => {
          const profile = profilesData?.find((p) => p.id === authUser.id) || {};
          return {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            email_confirmed_at: authUser.email_confirmed_at,
            phone: authUser.phone || profile.phone,
            full_name: profile.full_name,
            role: profile.role,
            is_active: authUser.last_sign_in_at !== null,
            ...profile,
          };
        });
      } catch (userError) {
        const { data: fallbackUsers, error: fallbackError } = await supabase
          .from("profiles_public")
          .select("*");

        if (!fallbackError && fallbackUsers) {
          usersData = fallbackUsers.map((user) => ({
            ...user,
            is_active:
              user.last_sign_in_at &&
              new Date(user.last_sign_in_at) >
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          }));
        }
      }

      setCases(casesWithProfiles);
      setUsers(usersData || []);
      calculateAnalytics(casesWithProfiles, usersData || []);
    } catch (err) {
      setError(`Failed to load analytics data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (casesData, usersData) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Revenue Analytics - only from succeeded payments
    const completedCases = casesData.filter(
      (c) => c.payment_status === "succeeded",
    );
    const totalRevenue = completedCases.reduce(
      (sum, c) => sum + (parseFloat(c.service_fee) || 0),
      0,
    );

    const thisMonthRevenue = completedCases
      .filter((c) => new Date(c.created_at) >= thisMonth)
      .reduce((sum, c) => sum + (parseFloat(c.service_fee) || 0), 0);

    const lastMonthRevenue = completedCases
      .filter(
        (c) =>
          new Date(c.created_at) >= lastMonth &&
          new Date(c.created_at) <= endLastMonth,
      )
      .reduce((sum, c) => sum + (parseFloat(c.service_fee) || 0), 0);

    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Case statistics
    const stats = calculateStats(casesData);

    // Calculate conversion rate
    const conversionRate =
      stats.totalCases > 0
        ? ((stats.closedCases +
            stats.approvedCases +
            stats.hceoCompletedCases) /
            stats.totalCases) *
          100
        : 0;

    // Average case value
    const avgCaseValue =
      stats.totalCases > 0
        ? casesData.reduce(
            (sum, c) => sum + (parseFloat(c.judgment_amount) || 0),
            0,
          ) / stats.totalCases
        : 0;

    // User Analytics
    const totalUsers = usersData.length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = usersData.filter((u) => {
      if (!u.last_sign_in_at) return false;
      const lastSignIn = new Date(u.last_sign_in_at);
      return lastSignIn > thirtyDaysAgo;
    }).length;
    const newUsersThisMonth = usersData.filter(
      (u) => new Date(u.created_at) >= thisMonth,
    ).length;

    // Performance Analytics
    const avgCompletionTime = calculateAverageCompletionTime(casesData);
    const successRate = conversionRate;

    // Trend Analytics
    const monthlyRevenue = calculateMonthlyRevenue(casesData);
    const monthlyCases = calculateMonthlyCases(casesData);
    const statusDistribution = calculateStatusDistribution(casesData);
    const courtDistribution = calculateCourtDistribution(casesData);

    setAnalytics({
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth,
      },
      cases: {
        total: stats.totalCases,
        submitted: stats.submittedCases,
        approved: stats.approvedCases,
        completedByAdmin: stats.closedCases,
        completedByHceo: stats.hceoCompletedCases,
        conversion: conversionRate,
        avgValue: avgCaseValue,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
        retention: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      },
      performance: {
        completionTime: avgCompletionTime,
        successRate: successRate,
        customerSatisfaction: 85,
      },
      trends: {
        monthlyRevenue,
        monthlyCases,
        statusDistribution,
        courtDistribution,
      },
    });
  };

  const calculateAverageCompletionTime = (casesData) => {
    const completedCases = casesData.filter(
      (c) =>
        (c.status === "writ_received" || c.status === "hceo_completed") &&
        c.updated_at &&
        c.created_at,
    );

    if (completedCases.length === 0) return 0;

    const totalDays = completedCases.reduce((sum, c) => {
      const created = new Date(c.created_at);
      const completed = new Date(c.updated_at);
      const daysDiff = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
      return sum + daysDiff;
    }, 0);

    return totalDays / completedCases.length;
  };

  const calculateMonthlyRevenue = (casesData) => {
    const monthlyData = {};
    const completedCases = casesData.filter(
      (c) => c.payment_status === "succeeded",
    );

    completedCases.forEach((c) => {
      const month = new Date(c.created_at).toISOString().slice(0, 7);
      monthlyData[month] =
        (monthlyData[month] || 0) + (parseFloat(c.service_fee) || 0);
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({ month, revenue }));
  };

  const calculateMonthlyCases = (casesData) => {
    const monthlyData = {};

    casesData.forEach((c) => {
      const month = new Date(c.created_at).toISOString().slice(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, cases]) => ({ month, cases }));
  };

  const calculateStatusDistribution = (casesData) => {
    const statusCounts = {
      draft: 0,
      submitted: 0,
      returned: 0,
      approved: 0,
      writ_received: 0,
      hceo_completed: 0,
      closed: 0,
    };

    casesData.forEach((c) => {
      if (statusCounts.hasOwnProperty(c.status)) {
        statusCounts[c.status] += 1;
      }
    });

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({ status, count }));
  };

  const calculateCourtDistribution = (casesData) => {
    const courtCounts = {};

    casesData.forEach((c) => {
      if (c.court && c.court !== "Select Court...") {
        courtCounts[c.court] = (courtCounts[c.court] || 0) + 1;
      }
    });

    return Object.entries(courtCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([court, count]) => ({ court, count }));
  };

  const exportReport = (reportType) => {
    try {
      let reportData = [];
      let filename = "";

      switch (reportType) {
        case "revenue":
          const revenueRows = [
            {
              metric: "Total Revenue",
              value: analytics.revenue.total,
              formatted_value: formatAmount(analytics.revenue.total),
              period: "All Time",
            },
            {
              metric: "This Month Revenue",
              value: analytics.revenue.thisMonth,
              formatted_value: formatAmount(analytics.revenue.thisMonth),
              period: "Current Month",
            },
            {
              metric: "Last Month Revenue",
              value: analytics.revenue.lastMonth,
              formatted_value: formatAmount(analytics.revenue.lastMonth),
              period: "Previous Month",
            },
            {
              metric: "Growth Rate",
              value: analytics.revenue.growth,
              formatted_value: `${analytics.revenue.growth.toFixed(1)}%`,
              period: "Month-over-Month",
            },
          ];

          analytics.trends.monthlyRevenue.forEach((item) => {
            revenueRows.push({
              metric: "Monthly Revenue",
              value: item.revenue,
              formatted_value: formatAmount(item.revenue),
              period: item.month,
            });
          });

          reportData = revenueRows;
          filename = `revenue-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          break;

        case "cases":
          reportData = cases.map((c) => ({
            case_id: generateCompanyCaseId(c.id, c.user_profile?.company_name),
            claimant: c.claimant_name,
            defendant: c.defendant_name,
            judgment_amount: c.judgment_amount,
            formatted_amount: formatAmount(c.judgment_amount),
            service_fee: c.service_fee,
            formatted_service_fee: formatAmount(c.service_fee),
            status: c.status,
            payment_status: c.payment_status,
            court: c.court,
            hceo_choice: c.hceo_choice,
            created_date: formatDate(c.created_at),
            updated_date: c.updated_at ? formatDate(c.updated_at) : "",
            interest_recovery: c.interest_recovery ? "Yes" : "No",
          }));
          filename = `cases-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          break;

        case "analytics":
          const analyticsRows = [
            // Revenue Analytics
            {
              category: "Revenue",
              metric: "Total Revenue",
              value: analytics.revenue.total,
              formatted_value: formatAmount(analytics.revenue.total),
            },
            {
              category: "Revenue",
              metric: "This Month",
              value: analytics.revenue.thisMonth,
              formatted_value: formatAmount(analytics.revenue.thisMonth),
            },
            {
              category: "Revenue",
              metric: "Last Month",
              value: analytics.revenue.lastMonth,
              formatted_value: formatAmount(analytics.revenue.lastMonth),
            },
            {
              category: "Revenue",
              metric: "Growth Rate",
              value: analytics.revenue.growth,
              formatted_value: `${analytics.revenue.growth.toFixed(1)}%`,
            },

            // Case Analytics
            {
              category: "Cases",
              metric: "Total Cases",
              value: analytics.cases.total,
              formatted_value: analytics.cases.total.toString(),
            },
            {
              category: "Cases",
              metric: "Submitted Cases",
              value: analytics.cases.submitted,
              formatted_value: analytics.cases.submitted.toString(),
            },
            {
              category: "Cases",
              metric: "Approved Cases",
              value: analytics.cases.approved,
              formatted_value: analytics.cases.approved.toString(),
            },
            {
              category: "Cases",
              metric: "Completed by Admin",
              value: analytics.cases.completedByAdmin,
              formatted_value: analytics.cases.completedByAdmin.toString(),
            },
            {
              category: "Cases",
              metric: "Completed by Hceo",
              value: analytics.cases.completedByHceo,
              formatted_value: analytics.cases.completedByHceo.toString(),
            },
            {
              category: "Cases",
              metric: "Conversion Rate",
              value: analytics.cases.conversion,
              formatted_value: `${analytics.cases.conversion.toFixed(1)}%`,
            },
            {
              category: "Cases",
              metric: "Average Case Value",
              value: analytics.cases.avgValue,
              formatted_value: formatAmount(analytics.cases.avgValue),
            },

            // User Analytics
            {
              category: "Users",
              metric: "Total Users",
              value: analytics.users.total,
              formatted_value: analytics.users.total.toString(),
            },
            {
              category: "Users",
              metric: "Active Users",
              value: analytics.users.active,
              formatted_value: analytics.users.active.toString(),
            },
            {
              category: "Users",
              metric: "New This Month",
              value: analytics.users.newThisMonth,
              formatted_value: analytics.users.newThisMonth.toString(),
            },
            {
              category: "Users",
              metric: "Retention Rate",
              value: analytics.users.retention,
              formatted_value: `${analytics.users.retention.toFixed(1)}%`,
            },

            // Performance Analytics
            {
              category: "Performance",
              metric: "Avg Completion Time",
              value: analytics.performance.completionTime,
              formatted_value: `${analytics.performance.completionTime.toFixed(
                1,
              )} days`,
            },
            {
              category: "Performance",
              metric: "Success Rate",
              value: analytics.performance.successRate,
              formatted_value: `${analytics.performance.successRate.toFixed(
                1,
              )}%`,
            },
            {
              category: "Performance",
              metric: "Customer Satisfaction",
              value: analytics.performance.customerSatisfaction,
              formatted_value: `${analytics.performance.customerSatisfaction}%`,
            },
          ];

          // Add status distribution data
          analytics.trends.statusDistribution.forEach((item) => {
            analyticsRows.push({
              category: "Status Distribution",
              metric: item.status,
              value: item.count,
              formatted_value: item.count.toString(),
            });
          });

          // Add court distribution data
          analytics.trends.courtDistribution.forEach((item) => {
            analyticsRows.push({
              category: "Court Distribution",
              metric: item.court,
              value: item.count,
              formatted_value: item.count.toString(),
            });
          });

          reportData = analyticsRows;
          filename = `analytics-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          break;

        default:
          throw new Error("Unknown report type");
      }

      if (!reportData || reportData.length === 0) {
        throw new Error("No data available for export");
      }

      const headers = Object.keys(reportData[0]).join(",");

      const rows = reportData.map((row) =>
        Object.values(row)
          .map((value) => {
            if (value === null || value === undefined) {
              return "";
            }

            const stringValue = String(value);

            if (
              stringValue.includes(",") ||
              stringValue.includes('"') ||
              stringValue.includes("\n")
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }

            return stringValue;
          })
          .join(","),
      );

      const csvContent = [headers, ...rows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.setAttribute("style", "display: none;");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to export ${reportType} report: ${err.message}`);
    }
  };

  // Colors for charts
  const COLORS = {
    draft: "#9ca3af", // gray
    submitted: "#3b82f6", // blue
    returned: "#f97316", // orange
    approved: "#22c55e", // green
    writ_received: "#a855f7", // purple
    hceo_completed: "#14b8a6", // teal
    closed: "#64748b", // slate
    revenue: "#8b5cf6", // purple
  };

  const PIE_COLORS = [
    COLORS.draft,
    COLORS.submitted,
    COLORS.returned,
    COLORS.approved,
    COLORS.writ_received,
    COLORS.hceo_completed,
    COLORS.closed,
  ];

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <LoadingSpinner message="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="p-5 bg-blue-50">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive analytics and insights"
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            {error}
            <Button
              onClick={() => setError("")}
              variant="ghost"
              size="sm"
              className="ml-auto"
            >
              ×
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue this Month
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {formatAmount(analytics.revenue.thisMonth)}
                </p>
              </div>
              <PoundSterlingIcon className="w-12 h-12 text-green-600" />
            </div>
            <div className="flex items-center">
              {analytics.revenue.growth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm ${
                  analytics.revenue.growth >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {Math.abs(analytics.revenue.growth).toFixed(1)}% vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-3xl font-bold text-blue-600">
                  {analytics.cases.total}
                </p>
              </div>
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
            <div className="text-sm text-gray-500">
              {analytics.cases.completedByAdmin +
                analytics.cases.completedByHceo}{" "}
              completed • {analytics.cases.submitted + analytics.cases.approved}{" "}
              pending
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Conversion Rate
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.cases.conversion.toFixed(1)}%
                </p>
              </div>
              <Target className="w-12 h-12 text-purple-600" />
            </div>
            <div className="text-sm text-gray-500">
              Success rate from submission to completion
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {analytics.users.active}
                </p>
              </div>
              <Users className="w-12 h-12 text-orange-600" />
            </div>
            <div className="text-sm text-gray-500">
              {analytics.users.newThisMonth} new this month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Case Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Case Status Distribution
              <PieChart className="w-5 h-5 text-gray-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.trends.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {analytics.trends.statusDistribution.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[entry.status] || COLORS.submitted}
                          />
                        ),
                      )}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Status List */}
              <div className="space-y-4">
                {analytics.trends.statusDistribution.map(
                  ({ status, count }) => {
                    const percentage =
                      analytics.cases.total > 0
                        ? (count / analytics.cases.total) * 100
                        : 0;
                    const getStatusInfo = (status) => {
                      switch (status) {
                        case "draft":
                          return {
                            label: "Draft",
                            color: "bg-gray-500",
                            icon: Clock,
                            description: "Saved as draft",
                          };
                        case "submitted":
                          return {
                            label: "Submitted",
                            color: "bg-blue-500",
                            icon: Clock,
                            description: "Awaiting admin review",
                          };
                        case "returned":
                          return {
                            label: "Returned",
                            color: "bg-orange-500",
                            icon: Clock,
                            description: "Needs attention",
                          };
                        case "approved":
                          return {
                            label: "Approved",
                            color: "bg-green-500",
                            icon: CheckCircle,
                            description: "Sent to HCEO",
                          };
                        case "writ_received":
                          return {
                            label: "Writ Received",
                            color: "bg-purple-500",
                            icon: CheckCircle,
                            description: "Ready for enforcement",
                          };
                        case "hceo_completed":
                          return {
                            label: "HCEO Completed",
                            color: "bg-teal-500",
                            icon: CheckCircle,
                            description: "Enforcement complete",
                          };
                        case "closed":
                          return {
                            label: "Closed",
                            color: "bg-slate-500",
                            icon: CheckCircle,
                            description: "Case closed",
                          };
                        default:
                          return {
                            label: status,
                            color: "bg-gray-500",
                            icon: Activity,
                            description: "Other status",
                          };
                      }
                    };

                    const statusInfo = getStatusInfo(status);
                    const IconComponent = statusInfo.icon;

                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <IconComponent
                            className={`w-5 h-5 ${statusInfo.color.replace(
                              "bg-",
                              "text-",
                            )}`}
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900 w-8 text-right">
                              {count} {statusInfo.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Revenue Overview
              <PoundSterlingIcon className="w-5 h-5 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    This Month
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatAmount(analytics.revenue.thisMonth)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600">vs Last Month</p>
                  <p className="text-lg font-semibold text-green-700">
                    {formatAmount(analytics.revenue.lastMonth)}
                  </p>
                </div>
              </div>

              {/* Monthly Revenue Trend Chart */}
              {analytics.trends.monthlyRevenue.length > 0 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.trends.monthlyRevenue.slice(-6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(value) =>
                          new Date(value + "-01").toLocaleDateString("en-GB", {
                            month: "short",
                          })
                        }
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          `£${(value / 1000).toFixed(1)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [formatAmount(value), "Revenue"]}
                        labelFormatter={(value) =>
                          new Date(value + "-01").toLocaleDateString("en-GB", {
                            month: "short",
                            year: "numeric",
                          })
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={COLORS.revenue}
                        fill={COLORS.revenue}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Revenue per Case</span>
                  <span className="font-medium">
                    {formatAmount(
                      analytics.cases.completedByAdmin > 0
                        ? analytics.revenue.total /
                            (analytics.cases.completedByAdmin +
                              analytics.cases.approved)
                        : 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average Case Value</span>
                  <span className="font-medium">
                    {formatAmount(analytics.cases.avgValue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service Fee Rate</span>
                  <span className="font-medium">5.0%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.performance.completionTime.toFixed(1)} days
              </p>
              <p className="text-sm text-gray-600">Average Completion Time</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.performance.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.performance.customerSatisfaction}%
              </p>
              <p className="text-sm text-gray-600">Customer Satisfaction</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Reports */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Export Reports as CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => exportReport("revenue")}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <PoundSterlingIcon className="w-12 h-12 text-green-600 mb-3" />
              <p className="text-2xl font-medium text-gray-900">
                Revenue Report
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Financial analytics & trends
              </p>
            </button>

            <button
              onClick={() => exportReport("cases")}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <FileText className="w-12 h-12 text-blue-600 mb-3" />
              <p className="text-2xl font-medium text-gray-900">Cases Report</p>
              <p className="text-sm text-gray-500 mt-1">
                Detailed case data export
              </p>
            </button>

            <button
              onClick={() => exportReport("analytics")}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <BarChart3 className="w-12 h-12 text-purple-600 mb-3" />
              <p className="text-2xl font-medium text-gray-900">
                Analytics Report
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Complete analytics summary
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cases
              .filter((c) => c.updated_at)
              .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
              .slice(0, 5)
              .map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Case{" "}
                        {generateCompanyCaseId(
                          caseItem.id,
                          caseItem.user_profile?.company_name,
                        )}{" "}
                        updated
                      </p>
                      <p className="text-sm text-gray-500">
                        {caseItem.claimant_name} vs {caseItem.defendant_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatDateTime(caseItem.updated_at)}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatAmount(caseItem.judgment_amount)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsAnalytics;
