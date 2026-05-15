// src/utils/passwordValidator.jsx
import React from "react";

// ─── Rules ────────────────────────────────────────────────────────────────────

const RULES = [
  { label: "8+ characters",     test: (p) => p.length >= 8 },
  { label: "Uppercase letter",  test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter",  test: (p) => /[a-z]/.test(p) },
  { label: "Number",            test: (p) => /[0-9]/.test(p) },
  { label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validates password strength for a system handling legal and financial data.
 *
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validatePassword = (password = "") => {
  const errors = RULES.filter((r) => !r.test(password)).map((r) => r.label);
  return { valid: errors.length === 0, errors };
};

/**
 * Returns a single human-readable error string, or null if the password is valid.
 */
export const getPasswordError = (password = "") => {
  const { valid, errors } = validatePassword(password);
  return valid ? null : errors[0];
};

// ─── Strength indicator component ────────────────────────────────────────────

/**
 * Drop-in React component that shows a strength bar + per-rule checklist.
 * Renders nothing when password is empty.
 *
 * Usage:
 *   import { PasswordStrengthIndicator } from "../../utils/passwordValidator";
 *   <PasswordStrengthIndicator password={newPassword} />
 */
export function PasswordStrengthIndicator({ password }) {
  if (!password) return null;

  const passed = RULES.filter((r) => r.test(password)).length;
  const pct    = (passed / RULES.length) * 100;

  const color =
    passed <= 2 ? "bg-red-500" :
    passed <= 3 ? "bg-yellow-500" :
    passed <= 4 ? "bg-blue-500" :
                  "bg-green-500";

  const label =
    passed <= 2 ? "Weak" :
    passed <= 3 ? "Fair" :
    passed <= 4 ? "Good" :
                  "Strong";

  const labelColor =
    passed <= 2 ? "text-red-600" :
    passed <= 3 ? "text-yellow-600" :
    passed <= 4 ? "text-blue-600" :
                  "text-green-600";

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1 text-xs ${ok ? "text-green-700" : "text-gray-400"}`}
            >
              <span>{ok ? "✓" : "○"}</span>
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}