"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Rule {
  id: string;
  name: string;
  description: string | null;
  conditions: Array<{
    id: string;
    type: string;
    operator: string;
    value: number;
    description: string;
  }>;
  actions: Array<{
    id: string;
    type: string;
    description: string;
  }>;
  is_active: boolean;
  priority: number;
}

interface DeleteRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null;
  onConfirm: () => void;
}

export function DeleteRuleDialog({
  open,
  onOpenChange,
  rule,
  onConfirm,
}: DeleteRuleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!rule) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Rule
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this rule? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            <div>
              <div className="font-medium">{rule.name}</div>
              {rule.description && (
                <div className="text-sm text-muted-foreground mt-1">
                  {rule.description}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={rule.is_active ? "default" : "secondary"}>
                {rule.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">Priority {rule.priority}</Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Conditions:</div>
              <div className="space-y-1">
                {rule.conditions.map((condition, index) => (
                  <div key={condition.id} className="text-sm text-muted-foreground">
                    {index + 1}. {condition.description}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Actions:</div>
              <div className="space-y-1">
                {rule.actions.map((action, index) => (
                  <div key={action.id} className="text-sm text-muted-foreground">
                    {index + 1}. {action.description}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Trash2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Rule
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}