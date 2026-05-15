// src/lib/caseUtils.js
import { addCaseHistory } from "./caseHistory";
import { supabase } from "./supabase";
import { displayServerLogs } from "./serverLogger";

// Constants
export const COURTS = [
  "Select Court...",
  "High Court",
  "County Court",
  "Magistrates Court",
  "Crown Court",
];

export const DEFAULT_HCEO_OPTIONS = [
  "Select HCEO...",
  "HCEO Option 1",
  "HCEO Option 2",
  "HCEO Option 3",
];

// Fee constants
export const COURT_FEE = 66.0; // £66 court fee
export const SERVICE_FEE = 35.0; // £35 service fee
export const VAT_RATE = 0.2; // 20% VAT

// Fetch HCEO options from profiles table (users with role='hceo')
export const HCEO_OPTIONS = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles_public")
      .select("id, full_name, email")
      .eq("role", "hceo")
      .order("full_name");

    if (error) {
      console.error("Error fetching HCEO options:", error);
      throw error;
    }

    const defaultOptions = [
      { id: "select", name: "Select HCEO...", email: "" },
      { id: "random", name: "Random Assignment", email: "" },
    ];

    if (!data || data.length === 0) {
      console.warn("No HCEO users found in database");
      return defaultOptions;
    }

    const hceoUsers = data.map((user) => ({
      id: user.id,
      name: user.full_name || "Unknown",
      email: user.email || "",
    }));

    const allOptions = [...defaultOptions, ...hceoUsers];

    return allOptions;
  } catch (error) {
    console.error("Failed to load HCEO options:", error);
    return [
      { id: "select", name: "Select HCEO...", email: "" },
      { id: "random", name: "Random Assignment", email: "" },
    ];
  }
};

// Get HCEO with least cases (cab rank assignment)
export const getHCEOWithLeastCases = async () => {
  try {
    const { data: hceoUsers, error: hceoError } = await supabase
      .from("profiles_public")
      .select("id, full_name, email")
      .eq("role", "hceo")
      .order("full_name");

    if (hceoError) {
      console.error("Error fetching HCEO users:", hceoError);
      throw hceoError;
    }

    if (!hceoUsers || hceoUsers.length === 0) {
      console.warn("No HCEO users found");
      return null;
    }

    const hceoWithCounts = await Promise.all(
      hceoUsers.map(async (hceo) => {
        const { count, error } = await supabase
          .from("case_submissions")
          .select("*", { count: "exact", head: true })
          .or(
            `assigned_user_email.eq.${hceo.email},assigned_user_name.eq.${hceo.full_name}`,
          )
          .not("status", "in", '("draft")');

        if (error) {
          console.error(`Error counting cases for ${hceo.full_name}:`, error);
          return { ...hceo, caseCount: 0 };
        }

        return { ...hceo, caseCount: count || 0 };
      }),
    );

    hceoWithCounts.sort((a, b) => a.caseCount - b.caseCount);

    const selectedHCEO = hceoWithCounts[0];

    return {
      id: selectedHCEO.id,
      name: selectedHCEO.full_name,
      email: selectedHCEO.email,
      caseCount: selectedHCEO.caseCount,
    };
  } catch (error) {
    console.error("Failed to get HCEO with least cases:", error);
    return null;
  }
};

// Card element options for Stripe - Individual Elements
export const CARD_NUMBER_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#424770",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#9e2146",
    },
  },
  showIcon: true,
};

export const CARD_EXPIRY_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#424770",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#9e2146",
    },
  },
};

export const CARD_CVC_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#424770",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#9e2146",
    },
  },
};

// Status utilities
export const getStatusIcon = (status) => {
  const iconMap = {
    draft: "FileText",
    submitted: "Clock",
    returned: "AlertCircle",
    approved: "CheckCircle",
    writ_received: "FileCheck",
    hceo_completed: "CheckCircle2",
    closed: "Archive",
  };
  return iconMap[status] || "Clock";
};

export const getStatusColor = (status) => {
  const colorMap = {
    draft: "bg-gray-100 text-gray-800 border-gray-300",
    submitted: "bg-blue-100 text-blue-800 border-blue-300",
    returned: "bg-orange-100 text-orange-800 border-orange-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    writ_received: "bg-purple-100 text-purple-800 border-purple-300",
    hceo_completed: "bg-teal-100 text-teal-800 border-teal-300",
    closed: "bg-slate-100 text-slate-800 border-slate-300",
  };
  return colorMap[status] || "bg-gray-100 text-gray-800 border-gray-300";
};

export const getStatusLabel = (status) => {
  const labelMap = {
    draft: "Draft",
    submitted: "Submitted",
    returned: "Returned to Applicant",
    approved: "Approved",
    writ_received: "Writ Received",
    hceo_completed: "HCEO Completed",
    closed: "Closed",
  };
  return labelMap[status] || status;
};

export const getPaymentStatusColor = (status) => {
  if (status === "succeeded") {
    return "bg-green-100 text-green-800";
  }
  return "bg-yellow-100 text-yellow-800";
};

// Format utilities
export const formatAmount = (amount) => {
  if (!amount) return "£0.00";
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return "£0.00";

  return `£${numAmount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleString();
};

// Generate case ID with company prefix if applicable
export const generateCompanyCaseId = (id, companyName = null) => {
  if (!id) return "N/A";

  const baseId = id.substring(0, 8).toUpperCase();

  if (companyName) {
    const companyPrefix = companyName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase();

    return `${companyPrefix}-${baseId}`;
  }

  return `CASE-${baseId}`;
};

// Validation - UPDATED for new form structure
export const validateForm = (formData, requireFiles = false) => {
  const errors = {};

  if (!formData.claimantName?.trim()) {
    errors.claimantName = "Claimant name is required";
  }

  if (!formData.claimantRef?.trim()) {
    errors.claimantRef = "Claimant Ref is required";
  }

  if (!formData.claimantAddress?.trim()) {
    errors.claimantAddress = "Claimant Address is required";
  }

  if (!formData.defendantName?.trim()) {
    errors.defendantName = "Defendant name is required";
  }

  if (!formData.defendantRef?.trim()) {
    errors.defendantRef = "Defendant Ref is required";
  }

  if (!formData.defendantAddressOnJudgment?.trim()) {
    errors.defendantAddressOnJudgment = "Defendant Address is required";
  }

  if (!formData.amountOfDebt || parseFloat(formData.amountOfDebt) <= 0) {
    errors.amountOfDebt = "Valid debt amount is required";
  }

  if (!formData.amountOfCosts || parseFloat(formData.amountOfCosts) <= 0) {
    errors.amountOfCosts = "Valid costs amount is required";
  }

  if (!formData.judgmentDate) {
    errors.judgmentDate = "Judgment date is required";
  }

  if (
    requireFiles &&
    (!formData.judgmentFiles || formData.judgmentFiles.length === 0)
  ) {
    errors.judgmentFiles = "Judgment File is required";
  }

  if (!formData.claimNumber) {
    errors.claimNumber = "Claim Number is required";
  }

  if (
    !formData.courtMakingJudgment ||
    formData.courtMakingJudgment === "Select Court"
  ) {
    errors.courtMakingJudgment = "Court selection is required";
  }

  if (!formData.hceoChoice || formData.hceoChoice === "Select HCEO...") {
    errors.hceoChoice = "Please Select HCEO Officer";
  }

  if (!formData.claimingFixedCosts) {
    errors.claimingFixedCosts = "Please indicate if claiming fixed costs";
  }

  if (formData.defendantMoved && !formData.defendantCurrentAddress?.trim()) {
    errors.defendantCurrentAddress =
      "Current address is required when defendant has moved";
  }

  return errors;
};

// Case permissions
export const canEditCase = (caseData) => {
  return (
    caseData.status === "draft" ||
    caseData.status === "submitted" ||
    caseData.is_draft
  );
};

export const canDeleteCase = (caseData, userRole) => {
  if (userRole === "admin") {
    return true;
  }

  return (
    caseData.status === "draft" ||
    caseData.status === "submitted" ||
    caseData.status === "returned" ||
    caseData.is_draft
  );
};

// Calculate fees with fixed structure
export const calculateFees = () => {
  const courtFee = COURT_FEE;
  const serviceFee = SERVICE_FEE;
  const vat = serviceFee * VAT_RATE;
  const totalFees = courtFee + serviceFee + vat;

  return {
    courtFee,
    serviceFee,
    vat,
    totalFees,
  };
};

// Legacy function for backwards compatibility
export const calculateServiceFee = (judgmentAmount) => {
  const fees = calculateFees();
  return fees.totalFees;
};

// File upload to Supabase
export const uploadFilesToSupabase = async (files, userId) => {
  const uploadedPaths = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("judgment-documents")
      .upload(fileName, file);

    if (error) {
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }

    uploadedPaths.push(data.path);
  }

  return uploadedPaths;
};

// View document in browser (opens in new tab)
export const viewDocumentInBrowser = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from("judgment-documents")
      .createSignedUrl(filePath, 3600);

    if (error) throw error;

    if (!data || !data.signedUrl) {
      throw new Error("Failed to generate document URL");
    }

    window.open(data.signedUrl, "_blank");
  } catch (error) {
    console.error("Error viewing document:", error);
    throw error;
  }
};

// Check if file exists in Supabase storage
export const checkFileExists = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from("judgment-documents")
      .list(filePath.substring(0, filePath.lastIndexOf("/")));

    if (error) {
      console.error("Error checking file existence:", error);
      return false;
    }

    const fileName = filePath.split("/").pop();
    const fileExists = data && data.some((file) => file.name === fileName);

    return fileExists;
  } catch (err) {
    console.error("Error checking file existence:", err);
    return false;
  }
};

// Helper function to get user info
const getUserInfo = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

// Save case to database
export const saveCaseToDatabase = async (
  formData,
  user,
  isDraft = false,
  paymentIntentId = null,
) => {
  try {
    let filePaths = [];
    if (formData.judgmentFiles && formData.judgmentFiles.length > 0) {
      filePaths = await uploadFilesToSupabase(
        formData.judgmentFiles,
        user.id,
        "judgment-documents",
      );
    }

    const fees = calculateFees();

    let assignedUserName = formData.assignedUserName;
    let assignedUserEmail = formData.assignedUserEmail;
    let hceoChoice = formData.hceoChoice;

    if (formData.hceoChoice === "Random Assignment" && !isDraft) {
      const assignedHCEO = await getHCEOWithLeastCases();

      if (assignedHCEO) {
        assignedUserName = assignedHCEO.name;
        assignedUserEmail = assignedHCEO.email;
        hceoChoice = assignedHCEO.name;
      } else {
        console.warn("Could not find HCEO for automatic assignment");
      }
    }

    const caseData = {
      user_id: user.id,
      claimant_name: formData.claimantName,
      claimant_ref: formData.claimantRef,
      claimant_address: formData.claimantAddress,
      defendant_name: formData.defendantName,
      defendant_ref: formData.defendantRef || null,
      defendant_address_on_judgment:
        formData.defendantAddressOnJudgment || null,
      defendant_moved: formData.defendantMoved || false,
      defendant_current_address: formData.defendantCurrentAddress || null,
      claim_number: formData.claimNumber || null,
      court_making_judgment: formData.courtMakingJudgment || null,
      claiming_fixed_costs: formData.claimingFixedCosts || null,
      judgment_date: formData.judgmentDate,
      amount_of_debt: parseFloat(formData.amountOfDebt) || 0,
      amount_of_costs: parseFloat(formData.amountOfCosts) || 0,
      judgment_amount:
        parseFloat(formData.amountOfDebt || 0) +
        parseFloat(formData.amountOfCosts || 0),
      payments_received: JSON.stringify(formData.paymentsReceived || []),
      hceo_choice: hceoChoice,
      organization: formData.organization || null,
      hceo_extra_details: formData.hceoExtraDetails || null,
      interest_recovery: formData.interestRecovery === "yes",
      judgment_file_paths: filePaths,
      is_draft: isDraft,
      status: isDraft ? "draft" : "submitted",
      assigned_user_name: assignedUserName || null,
      assigned_user_email: assignedUserEmail || null,
      payment_intent_id: paymentIntentId,
      payment_status: paymentIntentId ? "succeeded" : null,
      payment_amount: isDraft ? null : fees.totalFees,
      court_fee: isDraft ? null : fees.courtFee,
      service_fee: isDraft ? null : fees.serviceFee,
      vat_amount: isDraft ? null : fees.vat,
    };

    const { data, error } = await supabase
      .from("case_submissions")
      .insert([caseData])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // HISTORY ENTRY
    const userInfo = await getUserInfo(user.id);
    await addCaseHistory({
      caseId: data.id,
      userId: user.id,
      userEmail: userInfo?.email || user.email,
      userName: userInfo?.full_name || "User",
      userRole: userInfo?.role || "applicant",
      actionType: "case_created",
      actionDescription: isDraft
        ? "Case saved as draft"
        : "Case submitted successfully",
      newValue: isDraft ? "draft" : "submitted",
      metadata: {
        judgment_amount: data.judgment_amount,
        claimant_name: data.claimant_name,
        defendant_name: data.defendant_name,
      },
    });

    return data;
  } catch (error) {
    console.error("Error in saveCaseToDatabase:", error);
    throw error;
  }
};

export const updateCaseHCEO = async (caseId, newHceoName) => {
  try {
    const { data: currentCase, error: fetchError } = await supabase
      .from("case_submissions")
      .select("hceo_choice, assigned_user_name, assigned_user_email")
      .eq("id", caseId)
      .single();

    if (fetchError) {
      console.error("Error fetching current case:", fetchError);
      throw fetchError;
    }

    const oldHceoName = currentCase?.hceo_choice || "Not assigned";

    let assignedUserName = newHceoName;
    let assignedUserEmail = null;

    const { data: hceoData, error: hceoError } = await supabase
      .from("profiles_public")
      .select("id, full_name, email")
      .eq("role", "hceo")
      .ilike("full_name", newHceoName)
      .single();

    if (hceoError) {
      console.warn(
        "HCEO not found in profiles, using name only:",
        hceoError.message,
      );
    } else if (hceoData) {
      assignedUserName = hceoData.full_name;
      assignedUserEmail = hceoData.email;
    }

    const updatePayload = {
      hceo_choice: assignedUserName,
      assigned_user_name: assignedUserName,
      assigned_user_email: assignedUserEmail,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("case_submissions")
      .update(updatePayload)
      .eq("id", caseId)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;

    if (currentUser) {
      const userInfo = await getUserInfo(currentUser.id);
      await addCaseHistory({
        caseId: caseId,
        userId: currentUser.id,
        userEmail: userInfo?.email || currentUser.email,
        userName: userInfo?.full_name || "Admin",
        userRole: userInfo?.role || "admin",
        actionType: "hceo_assignment",
        actionDescription: `HCEO reassigned from ${oldHceoName} to ${assignedUserName}`,
        oldValue: oldHceoName,
        newValue: assignedUserName,
        metadata: {
          old_hceo_email: currentCase?.assigned_user_email || null,
          new_hceo_email: assignedUserEmail,
        },
      });
    }

    return data;
  } catch (error) {
    console.error("Error in updateCaseHCEO:", error);
    throw error;
  }
};

// Update case in database
export const updateCaseInDatabase = async (
  caseId,
  formData,
  user,
  existingFilePaths = [],
  preserveStatus = false,
  adminNote = null,
) => {
  try {
    const { data: existingCase, error: fetchError } = await supabase
      .from("case_submissions")
      .select("*")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) throw fetchError;

    let newFilePaths = [];
    if (formData.judgmentFiles && formData.judgmentFiles.length > 0) {
      newFilePaths = await uploadFilesToSupabase(
        formData.judgmentFiles,
        user.id,
        "judgment-documents",
      );
    }

    const allFilePaths = [...existingFilePaths, ...newFilePaths];

    let assignedUserName = formData.assignedUserName;
    let assignedUserEmail = formData.assignedUserEmail;
    let hceoChoice = formData.hceoChoice;

    if (formData.hceoChoice === "Random Assignment") {
      const assignedHCEO = await getHCEOWithLeastCases();

      if (assignedHCEO) {
        assignedUserName = assignedHCEO.name;
        assignedUserEmail = assignedHCEO.email;
        hceoChoice = assignedHCEO.name;
      } else {
        console.warn("Could not find HCEO for automatic assignment");
      }
    }

    const updateData = {
      claimant_name: formData.claimantName,
      claimant_ref: formData.claimantRef,
      claimant_address: formData.claimantAddress,
      defendant_name: formData.defendantName,
      defendant_ref: formData.defendantRef,
      defendant_address_on_judgment: formData.defendantAddressOnJudgment,
      defendant_moved: formData.defendantMoved || false,
      defendant_current_address: formData.defendantCurrentAddress || null,
      claim_number: formData.claimNumber,
      court_making_judgment: formData.courtMakingJudgment,
      claiming_fixed_costs: formData.claimingFixedCosts,
      judgment_date: formData.judgmentDate,
      amount_of_debt: parseFloat(formData.amountOfDebt) || 0,
      amount_of_costs: parseFloat(formData.amountOfCosts) || 0,
      judgment_amount:
        parseFloat(formData.amountOfDebt || 0) +
        parseFloat(formData.amountOfCosts || 0),
      payments_received: JSON.stringify(formData.paymentsReceived || []),
      hceo_choice: hceoChoice,
      organization: formData.organization || null,
      hceo_extra_details: formData.hceoExtraDetails || null,
      interest_recovery: formData.interestRecovery === "yes",
      judgment_file_paths: allFilePaths,
      assigned_user_name: assignedUserName || null,
      assigned_user_email: assignedUserEmail || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("case_submissions")
      .update(updateData)
      .eq("id", caseId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // TRACK CHANGES AND ADD HISTORY ENTRY
    const userInfo = await getUserInfo(user.id);
    const changedFields = [];

    const fieldMapping = {
      claimant_name: "Claimant Name",
      claimant_ref: "Claimant Reference",
      claimant_address: "Claimant Address",
      defendant_name: "Defendant Name",
      defendant_ref: "Defendant Reference",
      defendant_address_on_judgment: "Defendant Address on Judgment",
      defendant_moved: "Defendant Moved",
      defendant_current_address: "Defendant Current Address",
      claim_number: "Claim Number",
      court_making_judgment: "Court Making Judgment",
      claiming_fixed_costs: "Claiming Fixed Costs",
      judgment_date: "Judgment Date",
      amount_of_debt: "Amount of Debt",
      amount_of_costs: "Amount of Costs",
      judgment_amount: "Judgment Amount",
      hceo_choice: "HCEO Choice",
      organization: "Organization",
      hceo_extra_details: "HCEO Extra Details",
      interest_recovery: "Interest Recovery",
    };

    for (const [key, label] of Object.entries(fieldMapping)) {
      const oldValue = existingCase[key];
      const newValue = updateData[key];

      if (key === "payments_received") {
        const oldPayments =
          typeof oldValue === "string" ? JSON.parse(oldValue) : oldValue;
        const newPayments =
          typeof newValue === "string" ? JSON.parse(newValue) : newValue;

        const paymentsChanged =
          JSON.stringify(oldPayments) !== JSON.stringify(newPayments);

        if (paymentsChanged) {
          const oldCount = Array.isArray(oldPayments) ? oldPayments.length : 0;
          const newCount = Array.isArray(newPayments) ? newPayments.length : 0;

          changedFields.push({
            field: label,
            oldValue: `${oldCount} payment(s)`,
            newValue: `${newCount} payment(s)`,
          });
        }
        continue;
      }

      let formattedOldValue = oldValue === null ? "" : String(oldValue);
      let formattedNewValue = newValue === null ? "" : String(newValue);

      if (
        ["amount_of_debt", "amount_of_costs", "judgment_amount"].includes(key)
      ) {
        formattedOldValue = oldValue ? formatAmount(oldValue) : "£0.00";
        formattedNewValue = newValue ? formatAmount(newValue) : "£0.00";
      }

      if (key === "judgment_date") {
        formattedOldValue = oldValue ? formatDate(oldValue) : "";
        formattedNewValue = newValue ? formatDate(newValue) : "";
      }

      if (["defendant_moved", "interest_recovery"].includes(key)) {
        formattedOldValue = oldValue ? "Yes" : "No";
        formattedNewValue = newValue ? "Yes" : "No";
      }

      if (formattedOldValue !== formattedNewValue) {
        changedFields.push({
          field: label,
          oldValue: formattedOldValue,
          newValue: formattedNewValue,
        });
      }
    }

    if (newFilePaths.length > 0) {
      changedFields.push({
        field: "Documents",
        oldValue: `${existingFilePaths.length} file(s)`,
        newValue: `${allFilePaths.length} file(s) (+${newFilePaths.length} new)`,
      });
    }

    if (changedFields.length > 0) {
      const changesSummary = changedFields
        .map((change) => `${change.field}`)
        .join(", ");

      await addCaseHistory({
        caseId: data.id,
        userId: user.id,
        userEmail: userInfo?.email || user.email,
        userName: userInfo?.full_name || "User",
        userRole: userInfo?.role || "applicant",
        actionType: "case_update",
        actionDescription: adminNote
          ? `Updated case: ${changesSummary}. Reason: ${adminNote}`
          : `Updated case: ${changesSummary}`,
        oldValue: null,
        newValue: null,
        metadata: {
          changedFields: changedFields,
          fieldsUpdated: changedFields.length,
          adminNote: adminNote || null,
          editedBy: userInfo?.role || "applicant",
        },
      });
    } else {
      console.log("No changes detected, skipping history entry");
    }

    return data;
  } catch (error) {
    console.error("Error in updateCaseInDatabase:", error);
    throw error;
  }
};

// Delete case from database
export const deleteCaseFromDatabase = async (
  caseId,
  user,
  filePaths,
  isAdmin = false,
) => {
  try {
    if (filePaths && filePaths.length > 0) {
      for (const path of filePaths) {
        try {
          await supabase.storage.from("judgment-documents").remove([path]);
        } catch (fileError) {
          console.error(`Error deleting file ${path}:`, fileError);
        }
      }
    }

    const { data: caseData } = await supabase
      .from("case_submissions")
      .select("hceo_file_paths")
      .eq("id", caseId)
      .single();

    if (caseData?.hceo_file_paths && caseData.hceo_file_paths.length > 0) {
      for (const path of caseData.hceo_file_paths) {
        try {
          await supabase.storage.from("judgment-documents").remove([path]);
        } catch (fileError) {
          console.error(`Error deleting HCEO file ${path}:`, fileError);
        }
      }
    }

    let query = supabase.from("case_submissions").delete().eq("id", caseId);

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { error } = await query;

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting case:", error);
    throw error;
  }
};

// Create payment intent
export const createPaymentIntent = async (totalAmount, formData, user) => {
  try {
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const apiUrl = isLocalhost
      ? import.meta.env.VITE_API_URL || "http://localhost:3001"
      : window.location.origin;
    const endpoint = isLocalhost
      ? `${apiUrl}/api/create-payment-intent`
      : `/.netlify/functions/create-payment-intent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: "gbp",
        metadata: {
          claimantName: formData.claimantName,
          defendantName: formData.defendantName,
          judgmentAmount: formData.judgmentAmount,
          userId: user.id,
          caseId: formData.caseId || formData.id,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      displayServerLogs(errorData, "Create Payment Intent (Error)");
      console.error("Payment intent error:", errorData);
      throw new Error(errorData.message || "Failed to create payment intent");
    }

    const data = await response.json();
    displayServerLogs(data, "Create Payment Intent");
    return data.clientSecret;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
};

// Calculate statistics for Admin Dashboard
export const calculateStats = (cases) => {
  const totalCases = cases.length;

  const pendingCases = cases.filter(
    (c) =>
      c.status === "submitted" ||
      c.status === "returned" ||
      c.status === "approved",
  ).length;

  const completedCases = cases.filter(
    (c) =>
      c.status === "writ_received" ||
      c.status === "hceo_completed" ||
      c.status === "closed",
  ).length;

  const totalAmount = cases.reduce(
    (sum, c) => sum + parseFloat(c.judgment_amount || 0),
    0,
  );

  return {
    totalCases,
    pendingCases,
    completedCases,
    totalAmount,
  };
};

// Calculate statistics for Applicant Dashboard
export const calculateApplicantStats = (cases) => {
  const totalCases = cases.length;

  const pendingCases = cases.filter(
    (c) => c.status === "draft" || c.status === "returned",
  ).length;

  const completedCases = cases.filter((c) =>
    [
      "submitted",
      "approved",
      "writ_received",
      "hceo_completed",
      "closed",
    ].includes(c.status),
  ).length;

  const totalAmount = cases.reduce(
    (sum, c) => sum + parseFloat(c.judgment_amount || 0),
    0,
  );

  return {
    totalCases,
    pendingCases,
    completedCases,
    totalAmount,
  };
};

// Calculate statistics for HCEO Dashboard
export const calculateHCEOStats = (cases) => {
  const totalCases = cases.length;

  const pendingCases = cases.filter(
    (c) =>
      c.status === "submitted" ||
      c.status === "approved" ||
      c.status === "writ_received",
  ).length;

  const completedCases = cases.filter(
    (c) => c.status === "hceo_completed" || c.status === "closed",
  ).length;

  const totalAmount = cases.reduce(
    (sum, c) => sum + parseFloat(c.judgment_amount || 0),
    0,
  );

  return {
    totalCases,
    pendingCases,
    completedCases,
    totalAmount,
  };
};
