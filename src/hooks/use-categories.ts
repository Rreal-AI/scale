import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { CreateCategoryInput, UpdateCategoryInput } from "@/schemas/categories";

// Tipos para las respuestas de la API
interface Category {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface CategoriesResponse {
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  filters: {
    search?: string;
    sort_by: string;
    sort_order: string;
  };
}

interface SingleCategoryResponse {
  category: Category;
}

interface CreateCategoryResponse {
  category: Category;
  message: string;
}

interface UpdateCategoryResponse {
  category: Category;
  message: string;
}

interface DeleteCategoryResponse {
  message: string;
}

// Parámetros para las queries
interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: "name" | "created_at";
  sort_order?: "asc" | "desc";
}

// Funciones para hacer las peticiones a la API
const fetchCategories = async (
  params: GetCategoriesParams = {}
): Promise<CategoriesResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);

  const response = await fetch(`/api/categories?${searchParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  return response.json();
};

const fetchSingleCategory = async (
  id: string
): Promise<SingleCategoryResponse> => {
  const response = await fetch(`/api/categories/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch category");
  }

  return response.json();
};

const createCategory = async (
  data: CreateCategoryInput
): Promise<CreateCategoryResponse> => {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create category");
  }

  return response.json();
};

const updateCategory = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateCategoryInput;
}): Promise<UpdateCategoryResponse> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update category");
  }

  return response.json();
};

const deleteCategory = async (id: string): Promise<DeleteCategoryResponse> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete category");
  }

  return response.json();
};

// Hooks de React Query
export const useCategories = (params: GetCategoriesParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["categories", orgId, params],
    queryFn: () => fetchCategories(params),
    enabled: !!orgId,
  });
};

export const useSingleCategory = (id: string) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["categories", orgId, id],
    queryFn: () => fetchSingleCategory(id),
    enabled: !!orgId && !!id,
  });
};

export const useCreateCategory = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      // Invalidar todas las queries de categorías para esta organización
      queryClient.invalidateQueries({
        queryKey: ["categories", orgId],
      });
    },
  });
};

export const useUpdateCategory = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategory,
    onSuccess: (data, variables) => {
      // Invalidar la query de la categoría específica
      queryClient.invalidateQueries({
        queryKey: ["categories", orgId, variables.id],
      });
      // Invalidar la lista de categorías
      queryClient.invalidateQueries({
        queryKey: ["categories", orgId],
        exact: false,
      });
    },
  });
};

export const useDeleteCategory = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_, id) => {
      // Remover la query de la categoría específica
      queryClient.removeQueries({
        queryKey: ["categories", orgId, id],
      });
      // Invalidar la lista de categorías
      queryClient.invalidateQueries({
        queryKey: ["categories", orgId],
        exact: false,
      });
    },
  });
};
