"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RuleBuilder } from "./rule-builder";
import {
  CreateRuleForm,
  UpdateRuleForm,
  RuleCondition,
  RuleAction,
  createRuleFormSchema,
  updateRuleFormSchema,
} from "@/schemas/rules";
import { useCreateRule, useUpdateRule } from "@/hooks/use-rules";

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: {
    id: string;
    name: string;
    description?: string | null;
    conditions: RuleCondition[];
    actions: RuleAction[];
    is_active: boolean;
    priority: number;
  } | null;
}

export function RuleDialog({ open, onOpenChange, rule }: RuleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!rule;

  const createRule = useCreateRule();
  const updateRule = useUpdateRule();

  const form = useForm<CreateRuleForm>({
    resolver: zodResolver(isEditing ? updateRuleFormSchema : createRuleFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      conditions: [],
      actions: [],
      is_active: true,
      priority: 0,
    },
  });

  // Reset form when dialog opens/closes or rule changes
  const resetForm = useCallback(() => {
    console.log("RuleDialog resetForm called", { open, rule: !!rule });
    if (open) {
      if (rule) {
        console.log("Resetting form with rule data");
        form.reset({
          name: rule.name,
          description: rule.description || "",
          conditions: rule.conditions,
          actions: rule.actions,
          is_active: rule.is_active,
          priority: rule.priority,
        });
      } else {
        console.log("Resetting form with default data");
        form.reset({
          name: "",
          description: "",
          conditions: [],
          actions: [],
          is_active: true,
          priority: 0,
        });
      }
    }
  }, [open, rule, form]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const onSubmit = async (data: CreateRuleForm) => {
    setIsLoading(true);
    try {
      if (isEditing && rule) {
        await updateRule.mutateAsync({
          id: rule.id,
          ...data,
        });
      } else {
        await createRule.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving rule:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const conditions = form.watch("conditions");
  const actions = form.watch("actions");

  const handleOpenChange = (newOpen: boolean) => {
    console.log("RuleDialog onOpenChange called", { newOpen, currentOpen: open });
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Rule" : "Create Rule"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modify the rule conditions and actions."
              : "Create a new rule for automatic weight calculations."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Salsa Rule for Tacos"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Descriptive name for this rule
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers execute first (0 = highest priority)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Add salsa sets for taco orders"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional details about this rule
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rule Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Rule Logic</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline">
                    {actions.length} action{actions.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              <RuleBuilder
                conditions={conditions}
                actions={actions}
                onConditionsChange={(newConditions) => 
                  form.setValue("conditions", newConditions)
                }
                onActionsChange={(newActions) => 
                  form.setValue("actions", newActions)
                }
                disabled={isLoading}
              />
            </div>

            {/* Active Toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Enable this rule to apply it to orders
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}