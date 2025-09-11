"use client";

import { useState } from "react";
import { useRules, useDeleteRule } from "@/hooks/use-rules";
import { RulesFilters } from "./rules-filters";
import { RulesTableContent } from "./rules-table-content";
import { RulesPagination } from "./rules-pagination";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Rule } from "@/hooks/use-rules";
import { useRouter } from "next/navigation";

export function RulesTable() {
  const router = useRouter();
  const [filters, setFilters] = useState<{
    search?: string;
    sort_by?: "name" | "priority" | "created_at" | "updated_at";
    sort_order?: "asc" | "desc";
    is_active?: boolean;
  }>({
    sort_by: "priority",
    sort_order: "asc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const pageSize = 10;

  const { data, isLoading, error } = useRules({
    page: currentPage,
    limit: pageSize,
    ...filters,
  } as never);

  const deleteRule = useDeleteRule();

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Selection handlers
  const handleSelectRule = (ruleId: string) => {
    setSelectedRules((prev) =>
      prev.includes(ruleId)
        ? prev.filter((id) => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRules(data?.rules.map((rule) => rule.id) || []);
    } else {
      setSelectedRules([]);
    }
  };

  // CRUD action handlers
  const handleCreateRule = () => {
    router.push("/rules/new");
  };

  const handleEditRule = (rule: Rule) => {
    router.push(`/rules/${rule.id}/edit`);
  };

  const handleDeleteRule = async (rule: Rule) => {
    try {
      await deleteRule.mutateAsync(rule.id);
      // The query will automatically refetch due to React Query invalidation
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rules</h1>
          <p className="text-muted-foreground">
            Manage your product rules and weight calculations
          </p>
        </div>
        <Button onClick={handleCreateRule}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Filters */}
      <RulesFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table */}
      <RulesTableContent
        rules={data?.rules || []}
        selectedRules={selectedRules}
        onSelectRule={handleSelectRule}
        onSelectAll={handleSelectAll}
        onEditRule={handleEditRule}
        onDeleteRule={handleDeleteRule}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {data && (
        <RulesPagination
          currentPage={currentPage}
          totalPages={data.pagination.pages}
          totalCount={data.pagination.total}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
