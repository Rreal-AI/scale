"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WeightInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bagNumber: number;
  currentWeight: number;
  onWeightConfirm: (weight: number) => void;
  totalBags?: number;
}

export function WeightInputModal({ 
  open, 
  onOpenChange, 
  bagNumber, 
  currentWeight, 
  onWeightConfirm,
  totalBags
}: WeightInputModalProps) {
  const [value, setValue] = useState("");

  // Keypad numbers
  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  // Reset value when modal opens or bag changes
  useEffect(() => {
    if (open) {
      setValue(currentWeight > 0 ? currentWeight.toString() : "");
    }
  }, [open, currentWeight, bagNumber]);

  // Handle keypad press
  const handleKeypadPress = (key: string) => {
    if (key === '⌫') {
      setValue(prev => prev.slice(0, -1));
    } else if (key === '.' && value.includes('.')) {
      return; // Don't allow multiple dots
    } else if (value.length < 8) {
      setValue(prev => prev + key);
    }
  };

  // Handle keyboard input (supports both touch and physical keyboard)
  const handleInputChange = (inputValue: string) => {
    // Only allow numbers and one decimal point
    const sanitized = inputValue.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return; // Don't allow multiple dots
    }
    if (sanitized.length <= 8) {
      setValue(sanitized);
    }
  };

  // Handle Enter key from physical keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Confirm weight
  const handleConfirm = () => {
    const weight = parseFloat(value) || 0;
    if (weight > 0) {
      onWeightConfirm(weight);
      // Don't close modal automatically - let parent component decide
    }
  };

  // Cancel
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Weigh Bag {bagNumber}
            {totalBags && totalBags > 1 && (
              <span className="text-lg text-gray-500 font-normal ml-2">
                ({bagNumber} of {totalBags})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Weight Display */}
          <div className="text-center">
            <Input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-center text-5xl font-mono h-20 border-2 border-gray-300 bg-gray-50"
              placeholder="0"
              autoFocus
            />
            <div className="text-xl text-gray-500 mt-2">ounces</div>
          </div>

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {keypadNumbers.map((num) => (
              <Button
                key={num}
                variant="outline"
                className={cn(
                  "h-16 text-2xl font-bold border-2 transition-all active:scale-95",
                  num === '⌫' 
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                    : "bg-white border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                )}
                onClick={() => handleKeypadPress(num)}
              >
                {num}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-16 text-lg border-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!value || value === "0"}
              className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700"
            >
              Confirm Weight
            </Button>
          </div>

          {/* Keyboard Hint */}
          <p className="text-sm text-gray-500 text-center">
            Use touch keypad or physical keyboard • Press Enter to confirm
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}