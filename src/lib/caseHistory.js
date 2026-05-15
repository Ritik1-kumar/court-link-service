// src/lib/caseHistory.js
import { supabase } from "./supabase";

// Add a history entry for a case
export const addCaseHistory = async ({
  caseId,
  userId,
  userEmail,
  userName,
  userRole,
  actionType,
  actionDescription,
  oldValue = null,
  newValue = null,
  metadata = {},
}) => {
  try {
    const { data, error } = await supabase.from("case_history").insert([
      {
        case_id: caseId,
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        user_role: userRole,
        action_type: actionType,
        action_description: actionDescription,
        old_value: oldValue,
        new_value: newValue,
        metadata: metadata,
      },
    ]);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error adding case history:", error);
    return { success: false, error };
  }
};

// Fetch case history
export const fetchCaseHistory = async (caseId) => {
  try {
    const { data, error } = await supabase
      .from("case_history")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching case history:", error);
    return { success: false, error, data: [] };
  }
};

// Get icon for action type
export const getHistoryIcon = (actionType) => {
  const iconMap = {
    case_created: "FileText",
    status_change: "RefreshCw",
    hceo_assignment: "UserCheck",
    payment_added: "PoundSterling",
    document_upload: "Upload",
    case_update: "Edit",
    case_deleted: "Trash2",
  };
  return iconMap[actionType] || "Activity";
};

// Get color for action type
export const getHistoryColor = (actionType) => {
  const colorMap = {
    case_created: "text-blue-600 bg-blue-100",
    status_change: "text-green-600 bg-green-100",
    hceo_assignment: "text-purple-600 bg-purple-100",
    payment_added: "text-emerald-600 bg-emerald-100",
    document_upload: "text-orange-600 bg-orange-100",
    case_update: "text-gray-600 bg-gray-100",
    case_deleted: "text-red-600 bg-red-100",
  };
  return colorMap[actionType] || "text-gray-600 bg-gray-100";
};

// Format history entry for display
export const formatHistoryEntry = (entry) => {
  const formattedDate = new Date(entry.created_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    ...entry,
    formattedDate,
    icon: getHistoryIcon(entry.action_type),
    color: getHistoryColor(entry.action_type),
  };
};
