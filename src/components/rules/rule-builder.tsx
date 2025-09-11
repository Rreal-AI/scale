"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RuleCondition, RuleAction } from "@/schemas/rules";
import { ConditionBuilder } from "./condition-builder";
import { ActionBuilder } from "./action-builder";

interface RuleBuilderProps {
  conditions: RuleCondition[];
  actions: RuleAction[];
  onConditionsChange: (conditions: RuleCondition[]) => void;
  onActionsChange: (actions: RuleAction[]) => void;
  disabled?: boolean;
}

type LogicalOperator = "AND" | "OR";

export function RuleBuilder({
  conditions,
  actions,
  onConditionsChange,
  onActionsChange,
  disabled = false,
}: RuleBuilderProps) {
  const [activeSection, setActiveSection] = useState<"conditions" | "actions">("conditions");
  const [conditionOperators, setConditionOperators] = useState<LogicalOperator[]>([]);
  const [actionOperators, setActionOperators] = useState<LogicalOperator[]>([]);

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: crypto.randomUUID(),
      type: "category_quantity",
      operator: "every",
      value: 3,
      description: "Every 3 items",
    };
    onConditionsChange([...conditions, newCondition]);
    // Add "AND" operator for the new connection if this isn't the first condition
    if (conditions.length > 0) {
      setConditionOperators([...conditionOperators, "AND"]);
    }
  };

  const addAction = () => {
    const newAction: RuleAction = {
      id: crypto.randomUUID(),
      type: "add_product",
      description: "Add product",
    };
    onActionsChange([...actions, newAction]);
    // Add "AND" operator for the new connection if this isn't the first action
    if (actions.length > 0) {
      setActionOperators([...actionOperators, "AND"]);
    }
  };

  const updateCondition = (id: string, updated: Partial<RuleCondition>) => {
    onConditionsChange(
      conditions.map((condition) =>
        condition.id === id ? { ...condition, ...updated } : condition
      )
    );
  };

  const updateAction = (id: string, updated: Partial<RuleAction>) => {
    onActionsChange(
      actions.map((action) =>
        action.id === id ? { ...action, ...updated } : action
      )
    );
  };

  const removeCondition = (id: string) => {
    const conditionIndex = conditions.findIndex((condition) => condition.id === id);
    onConditionsChange(conditions.filter((condition) => condition.id !== id));
    
    // Remove corresponding operator
    if (conditionIndex > 0) {
      // Remove the operator before this condition
      setConditionOperators(conditionOperators.filter((_, index) => index !== conditionIndex - 1));
    } else if (conditionOperators.length > 0) {
      // If removing first condition, remove the first operator
      setConditionOperators(conditionOperators.slice(1));
    }
  };

  const removeAction = (id: string) => {
    const actionIndex = actions.findIndex((action) => action.id === id);
    onActionsChange(actions.filter((action) => action.id !== id));
    
    // Remove corresponding operator
    if (actionIndex > 0) {
      // Remove the operator before this action
      setActionOperators(actionOperators.filter((_, index) => index !== actionIndex - 1));
    } else if (actionOperators.length > 0) {
      // If removing first action, remove the first operator
      setActionOperators(actionOperators.slice(1));
    }
  };

  const toggleConditionOperator = (index: number) => {
    const newOperators = [...conditionOperators];
    newOperators[index] = newOperators[index] === "AND" ? "OR" : "AND";
    setConditionOperators(newOperators);
  };

  const toggleActionOperator = (index: number) => {
    const newOperators = [...actionOperators];
    newOperators[index] = newOperators[index] === "AND" ? "OR" : "AND";
    setActionOperators(newOperators);
  };

  const generateRulePreview = () => {
    if (conditions.length === 0 || actions.length === 0) {
      return "Add conditions and actions to see rule preview";
    }

    const conditionText = conditions
      .map((c, index) => {
        if (index === 0) return c.description;
        const operator = conditionOperators[index - 1] || "AND";
        return `${operator} ${c.description}`;
      })
      .join(" ");
    
    const actionText = actions
      .map((a, index) => {
        if (index === 0) return a.description;
        const operator = actionOperators[index - 1] || "AND";
        return `${operator} ${a.description}`;
      })
      .join(" ");

    return `IF ${conditionText} THEN ${actionText}`;
  };

  return (
    <div className="space-y-6">
      {/* Rule Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Rule Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {generateRulePreview()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          type="button"
          variant={activeSection === "conditions" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("conditions")}
          className="flex-1"
        >
          Conditions ({conditions.length})
        </Button>
        <Button
          type="button"
          variant={activeSection === "actions" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("actions")}
          className="flex-1"
        >
          Actions ({actions.length})
        </Button>
      </div>

      {/* Conditions Section */}
      {activeSection === "conditions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">When should this rule trigger?</h3>
            <Button
              type="button"
              onClick={addCondition}
              size="sm"
              disabled={disabled}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Condition
            </Button>
          </div>

          {conditions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Settings className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  No conditions defined
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Add conditions to define when this rule should trigger
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={condition.id} className="relative">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <GripVertical className="h-4 w-4" />
                          <Badge variant="outline">{index + 1}</Badge>
                        </div>
                        <div className="flex-1">
                          <ConditionBuilder
                            condition={condition}
                            onChange={(updated) => updateCondition(condition.id, updated)}
                            disabled={disabled}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(condition.id)}
                          disabled={disabled}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  {index < conditions.length - 1 && (
                    <div className="flex justify-center py-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => toggleConditionOperator(index)}
                      >
                        {conditionOperators[index] || "AND"}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions Section */}
      {activeSection === "actions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">What should happen when triggered?</h3>
            <Button
              type="button"
              onClick={addAction}
              size="sm"
              disabled={disabled}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Action
            </Button>
          </div>

          {actions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Settings className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  No actions defined
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Add actions to define what happens when the rule triggers
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {actions.map((action, index) => {
                try {
                  return (
                    <div key={action.id} className="relative">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <GripVertical className="h-4 w-4" />
                              <Badge variant="outline">{index + 1}</Badge>
                            </div>
                            <div className="flex-1">
                              <ActionBuilder
                                action={action}
                                onChange={(updated) => updateAction(action.id, updated)}
                                disabled={disabled}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAction(action.id)}
                              disabled={disabled}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      {index < actions.length - 1 && (
                        <div className="flex justify-center py-2">
                          <Badge 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                            onClick={() => toggleActionOperator(index)}
                          >
                            {actionOperators[index] || "AND"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                } catch (error) {
                  console.error("Error rendering action:", error);
                  return (
                    <div key={action.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600">Error rendering action: {(error as Error).message}</p>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}