import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

// Types for API responses
interface WeightSample {
  id: string;
  org_id: string;
  product_id: string | null;
  order_id: string | null;
  weight: number;
  item_count: number;
  is_single_product: boolean;
  check_number: string | null;
  items_summary: string | null;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    weight: number;
  } | null;
}

interface WeightSamplesResponse {
  samples: WeightSample[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  filters: {
    product_id?: string;
    is_single_product?: boolean;
    sort_by: string;
    sort_order: string;
  };
}

interface WeightSampleStats {
  product_id: string;
  product_name: string | null;
  product_weight: number | null;
  sample_count: number;
  min_weight: number | null;
  max_weight: number | null;
  avg_weight: string | null;
}

interface WeightSampleStatsResponse {
  stats: WeightSampleStats[];
}

interface SingleProductStatsResponse {
  product: {
    id: string;
    name: string;
    weight: number;
  } | null;
  stats: {
    product_id: string;
    sample_count: number;
    min_weight: number | null;
    max_weight: number | null;
    avg_weight: string | null;
  };
}

interface CreateWeightSampleInput {
  product_id?: string;
  order_id?: string;
  weight: number;
  item_count?: number;
  is_single_product?: boolean;
  check_number?: string;
  items_summary?: string;
}

interface CreateWeightSampleResponse {
  sample: WeightSample;
  message: string;
}

// Query parameters
interface GetWeightSamplesParams {
  page?: number;
  limit?: number;
  product_id?: string;
  is_single_product?: boolean;
  sort_by?: "weight" | "created_at";
  sort_order?: "asc" | "desc";
}

// API fetch functions
const fetchWeightSamples = async (
  params: GetWeightSamplesParams = {}
): Promise<WeightSamplesResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.product_id) searchParams.set("product_id", params.product_id);
  if (params.is_single_product !== undefined) searchParams.set("is_single_product", params.is_single_product.toString());
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);

  const response = await fetch(`/api/product-weight-samples?${searchParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch weight samples");
  }

  return response.json();
};

const fetchWeightSampleStats = async (
  product_id?: string
): Promise<WeightSampleStatsResponse | SingleProductStatsResponse> => {
  const searchParams = new URLSearchParams();

  if (product_id) searchParams.set("product_id", product_id);

  const response = await fetch(
    `/api/product-weight-samples/stats?${searchParams}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch weight sample stats");
  }

  return response.json();
};

const createWeightSample = async (
  data: CreateWeightSampleInput
): Promise<CreateWeightSampleResponse> => {
  const response = await fetch("/api/product-weight-samples", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create weight sample");
  }

  return response.json();
};

// React Query hooks
export const useWeightSamples = (params: GetWeightSamplesParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["weight-samples", orgId, params],
    queryFn: () => fetchWeightSamples(params),
    enabled: !!orgId,
  });
};

export const useWeightSampleStats = (product_id?: string) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["weight-sample-stats", orgId, product_id],
    queryFn: () => fetchWeightSampleStats(product_id),
    enabled: !!orgId,
  });
};

export const useCreateWeightSample = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWeightSample,
    onSuccess: () => {
      // Invalidate all weight samples queries
      queryClient.invalidateQueries({
        queryKey: ["weight-samples", orgId],
      });
      // Invalidate stats queries
      queryClient.invalidateQueries({
        queryKey: ["weight-sample-stats", orgId],
      });
    },
  });
};

const deleteWeightSample = async (id: string): Promise<{ message: string }> => {
  const response = await fetch(`/api/product-weight-samples/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete weight sample");
  }

  return response.json();
};

export const useDeleteWeightSample = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWeightSample,
    onSuccess: () => {
      // Invalidate all weight samples queries
      queryClient.invalidateQueries({
        queryKey: ["weight-samples", orgId],
      });
      // Invalidate stats queries
      queryClient.invalidateQueries({
        queryKey: ["weight-sample-stats", orgId],
      });
    },
  });
};
