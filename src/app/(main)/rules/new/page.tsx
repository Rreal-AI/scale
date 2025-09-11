"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleBuilder } from "@/components/rules/rule-builder";
import {
  CreateRuleForm,
  RuleCondition,
  RuleAction,
  createRuleFormSchema,
} from "@/schemas/rules";
import { useCreateRule } from "@/hooks/use-rules";

export default function NewRulePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const createRule = useCreateRule();

  const form = useForm<CreateRuleForm>({
    resolver: zodResolver(createRuleFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      conditions: [],
      actions: [],
      is_active: true,
      priority: 0,
    },
  });

  const conditions = form.watch("conditions");
  const actions = form.watch("actions");

  const onSubmit = async (data: CreateRuleForm) => {
    setIsLoading(true);
    try {
      await createRule.mutateAsync(data);
      router.push("/rules");
    } catch (error) {
      console.error("Failed to create rule:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Rule</h1>
          <p className="text-muted-foreground">
            Define conditions and actions for automatic weight calculations
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Rule Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Rule Logic</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline">
                  {actions.length} action{actions.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Active Toggle */}
          <Card>
            <CardContent className="pt-6">
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
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Rule
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}