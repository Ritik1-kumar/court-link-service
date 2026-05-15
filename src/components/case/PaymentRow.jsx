// src/components/case/PaymentRow.jsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar } from "lucide-react";

const PaymentRow = ({ payment, index, onChange, onRemove }) => {
  return (
    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
      <div className="flex-1">
        <div className="relative">
          <Input
            type="date"
            value={payment.date}
            onChange={(e) => onChange(index, "date", e.target.value)}
            className="pr-2"
          />
        </div>
      </div>
      <div className="flex-1">
        <Input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={payment.amount}
          onChange={(e) => onChange(index, "amount", e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="text-red-600 hover:text-red-800 hover:bg-red-50"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default PaymentRow;
