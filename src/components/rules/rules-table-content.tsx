"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Edit, Trash2, Eye, Play, Pause } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Rule } from "@/hooks/use-rules";
import { RuleDetailSheet } from "./rule-detail-sheet";
import { DeleteRuleDialog } from "./delete-rule-dialog";

interface RulesTableContentProps {
  rules: Rule[];
  selectedRules: string[];
  onSelectRule: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (rule: Rule) => void;
  isLoading?: boolean;
}

export function RulesTableContent({
  rules,
  selectedRules,
  onSelectRule,
  onSelectAll,
  onEditRule,
  onDeleteRule,
  isLoading = false,
}: RulesTableContentProps) {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [deleteRule, setDeleteRule] = useState<Rule | null>(null);

  const allSelected = rules.length > 0 && selectedRules.length === rules.length;
  const someSelected = selectedRules.length > 0 && selectedRules.length < rules.length;

  const formatRulePreview = (rule: Rule) => {
    if (rule.conditions.length === 0 || rule.actions.length === 0) {
      return "No conditions or actions defined";
    }

    const conditionText = rule.conditions
      .map((c) => c.description)
      .join(" AND ");
    
    const actionText = rule.actions
      .map((a) => a.description)
      .join(" AND ");

    return `IF ${conditionText} THEN ${actionText}`;
  };

  const getPriorityStyle = (priority: number) => {
    if (priority === 0) return {
      backgroundColor: "var(--color-success-tint)",
      color: "var(--color-success)",
      borderColor: "var(--color-success)"
    };
    if (priority <= 5) return {
      backgroundColor: "var(--color-warning-tint)",
      color: "var(--color-warning)",
      borderColor: "var(--color-warning)"
    };
    if (priority <= 10) return {
      backgroundColor: "var(--color-info-tint)",
      color: "var(--color-info)",
      borderColor: "var(--color-info)"
    };
    return {
      backgroundColor: "var(--color-neutral)",
      color: "var(--color-neutral-dark)",
      borderColor: "var(--color-neutral-border)"
    };
  };

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox disabled />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Logic</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Checkbox disabled />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </TableCell>
              <TableCell>
                <div className="h-4 bg-muted rounded animate-pulse w-24" />
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" disabled>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">No rules found</div>
        <div className="text-sm text-muted-foreground">
          Create your first rule to get started
        </div>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                ref={(el) => {
                  if (el) (el as any).indeterminate = someSelected;
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Logic</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>
                <Checkbox
                  checked={selectedRules.includes(rule.id)}
                  onCheckedChange={() => onSelectRule(rule.id)}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{rule.name}</div>
                  {rule.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {rule.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-md">
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {formatRulePreview(rule)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={getPriorityStyle(rule.priority)}
                >
                  {rule.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={rule.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {rule.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(rule.created_at), "MMM d, yyyy")}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedRuleId(rule.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditRule(rule)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteRule(rule)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Rule Detail Sheet */}
      <RuleDetailSheet
        open={!!selectedRuleId}
        onOpenChange={(open) => !open && setSelectedRuleId(null)}
        ruleId={selectedRuleId}
      />

      {/* Delete Rule Dialog */}
      <DeleteRuleDialog
        open={!!deleteRule}
        onOpenChange={(open) => !open && setDeleteRule(null)}
        rule={deleteRule}
        onConfirm={() => {
          if (deleteRule) {
            onDeleteRule(deleteRule);
            setDeleteRule(null);
          }
        }}
      />
    </>
  );
}