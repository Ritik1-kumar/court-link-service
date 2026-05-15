// src/components/case/HCEOSelector.jsx

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

const HCEOSelector = ({ value, onChange, error }) => {
  const [allocateForMe, setAllocateForMe] = useState(
    value?.hceoChoice === "Random Assignment"
  );
  const [organizations, setOrganizations] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(value?.organization || "");
  const [selectedOfficer, setSelectedOfficer] = useState(
    value?.hceoChoice || ""
  );
  const [extraDetails, setExtraDetails] = useState(
    value?.hceoExtraDetails || ""
  );
  const [loading, setLoading] = useState(false);

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles_public")
          .select("id, full_name, email")
          .eq("role", "hceo")
          .order("full_name");

        if (error) throw error;

        const mockOrgs = [
          { id: "org1", name: "Digital Marketplace Ltd" },
          { id: "org2", name: "ABC Enforcement Ltd" },
          { id: "org3", name: "XYZ Collection Services" },
        ];

        setOrganizations(mockOrgs);
      } catch (err) {
        console.error("Error fetching organizations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Fetch officers when organization is selected
  useEffect(() => {
    const fetchOfficers = async () => {
      if (!selectedOrg || allocateForMe) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles_public")
          .select("id, full_name, email")
          .eq("role", "hceo")
          .order("full_name");

        if (error) throw error;

        setOfficers(data || []);
      } catch (err) {
        console.error("Error fetching officers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficers();
  }, [selectedOrg, allocateForMe]);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      setAllocateForMe(value.hceoChoice === "Random Assignment");
      setSelectedOrg(value.organization || "");
      setSelectedOfficer(value.hceoChoice || "");
      setExtraDetails(value.hceoExtraDetails || "");
    }
  }, [value]);

  // Handle checkbox change
  const handleAllocateChange = (checked) => {
    setAllocateForMe(checked);
    if (checked) {
      setSelectedOrg("");
      setSelectedOfficer("");
      onChange({
        hceoChoice: "Random Assignment",
        assignedUserName: "",
        assignedUserEmail: "",
        organization: "",
        hceoExtraDetails: extraDetails,
      });
    } else {
      onChange({
        hceoChoice: "",
        assignedUserName: "",
        assignedUserEmail: "",
        organization: "",
        hceoExtraDetails: extraDetails,
      });
    }
  };

  // Handle organization selection
  const handleOrgChange = (orgName) => {
    setSelectedOrg(orgName);
    setSelectedOfficer("");
    onChange({
      hceoChoice: selectedOfficer,
      assignedUserName: value?.assignedUserName || "",
      assignedUserEmail: value?.assignedUserEmail || "",
      organization: orgName,
      hceoExtraDetails: extraDetails,
    });
  };

  // Handle officer selection
  const handleOfficerChange = (officerId) => {
    const officer = officers.find((o) => o.id === officerId);
    setSelectedOfficer(officer?.full_name || "");

    if (officer) {
      onChange({
        hceoChoice: officer.full_name,
        assignedUserName: officer.full_name,
        assignedUserEmail: officer.email,
        organization: selectedOrg,
        hceoExtraDetails: extraDetails,
      });
    }
  };

  // Handle extra details change
  const handleExtraDetailsChange = (e) => {
    const details = e.target.value;
    setExtraDetails(details);
    onChange({
      hceoChoice: value?.hceoChoice || "",
      assignedUserName: value?.assignedUserName || "",
      assignedUserEmail: value?.assignedUserEmail || "",
      organization: selectedOrg,
      hceoExtraDetails: details,
    });
  };

  return (
    <div className="space-y-4">
      <Label>
        HCEO Officer <span className="text-red-500">*</span>
      </Label>

      {/* Checkbox for random allocation */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="allocateHCEO"
          checked={allocateForMe}
          onCheckedChange={handleAllocateChange}
        />
        <Label htmlFor="allocateHCEO" className="font-normal cursor-pointer">
          - please allocate to HCEO for me.
        </Label>
      </div>

      {!allocateForMe && (
        <>
          <div className="text-sm font-bold">or</div>

          {/* Organization Selector */}
          <div className="space-y-2">
            <div className="mb-3">Select Organisation <span className="text-red-500">*</span></div>
            <Select
              value={selectedOrg}
              onValueChange={handleOrgChange}
              disabled={loading}
            >
              <SelectTrigger
                className={error && !selectedOrg ? "border-red-500" : ""}
              >
                <SelectValue placeholder="HCEO Organisation" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.name}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Officer Selector */}
          {selectedOrg && (
            <div className="space-y-2">
              <div className="mb-3">Select Officer <span className="text-red-500">*</span></div>
              <Select
                value={
                  officers.find((o) => o.full_name === selectedOfficer)?.id ||
                  ""
                }
                onValueChange={handleOfficerChange}
                disabled={loading || !selectedOrg}
              >
                <SelectTrigger
                  className={error && !selectedOfficer ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="HCEO Officer" />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((officer) => (
                    <SelectItem key={officer.id} value={officer.id}>
                      {officer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Display selected officer */}
          {selectedOfficer && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm font-medium">
                Selected Officer: {selectedOfficer}
              </p>
            </div>
          )}
        </>
      )}

      {/* Extra details textarea */}
      <div className="space-y-2">
        <Label htmlFor="hceoExtraDetails">Extra Details for HCEO Officer</Label>
        <Textarea
          id="hceoExtraDetails"
          value={extraDetails}
          onChange={handleExtraDetailsChange}
          className="min-h-[120px] resize-none"
          placeholder="Add any additional information for the HCEO officer..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default HCEOSelector;
