import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { CreateModifierInput, UpdateModifierInput } from "@/schemas/modifiers";

// Tipos para las respuestas de la API
interface Modifier {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface ModifiersResponse {
  modifiers: Modifier[];
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

interface ModifierResponse {
  modifier: Modifier;
}

interface CreateModifierResponse {
  modifier: Modifier;
  message: string;
}

interface UpdateModifierResponse {
  modifier: Modifier;
  message: string;
}

interface DeleteModifierResponse {
  message: string;
}

// Parámetros para las queries
interface GetModifiersParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: "name" | "price" | "weight" | "created_at";
  sort_order?: "asc" | "desc";
}

// Funciones para hacer las peticiones a la API
const fetchModifiers = async (
  params: GetModifiersParams = {}
): Promise<ModifiersResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);

  const response = await fetch(`/api/modifiers?${searchParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch modifiers");
  }

  return response.json();
};

const fetchModifier = async (id: string): Promise<ModifierResponse> => {
  const response = await fetch(`/api/modifiers/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch modifier");
  }

  return response.json();
};

const createModifier = async (
  data: CreateModifierInput
): Promise<CreateModifierResponse> => {
  const response = await fetch("/api/modifiers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create modifier");
  }

  return response.json();
};

const updateModifier = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateModifierInput;
}): Promise<UpdateModifierResponse> => {
  const response = await fetch(`/api/modifiers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update modifier");
  }

  return response.json();
};

const deleteModifier = async (id: string): Promise<DeleteModifierResponse> => {
  const response = await fetch(`/api/modifiers/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete modifier");
  }

  return response.json();
};

// Hooks de React Query
export const useModifiers = (params: GetModifiersParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["modifiers", orgId, params],
    queryFn: () => fetchModifiers(params),
    enabled: !!orgId,
  });
};

export const useModifier = (id: string) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["modifiers", orgId, id],
    queryFn: () => fetchModifier(id),
    enabled: !!orgId && !!id,
  });
};

export const useCreateModifier = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createModifier,
    onSuccess: () => {
      // Invalidar todas las queries de modifiers para esta organización
      queryClient.invalidateQueries({
        queryKey: ["modifiers", orgId],
      });
    },
  });
};

export const useUpdateModifier = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateModifier,
    onSuccess: (data, variables) => {
      // Invalidar la query del modifier específico
      queryClient.invalidateQueries({
        queryKey: ["modifiers", orgId, variables.id],
      });
      // Invalidar la lista de modifiers
      queryClient.invalidateQueries({
        queryKey: ["modifiers", orgId],
        exact: false,
      });
    },
  });
};

export const useDeleteModifier = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteModifier,
    onSuccess: (_, id) => {
      // Remover la query del modifier específico
      queryClient.removeQueries({
        queryKey: ["modifiers", orgId, id],
      });
      // Invalidar la lista de modifiers
      queryClient.invalidateQueries({
        queryKey: ["modifiers", orgId],
        exact: false,
      });
    },
  });
};

// Bulk delete params - supports both individual IDs and select_all mode
type BulkDeleteModifiersParams =
  | { modifier_ids: string[] }
  | {
      select_all: true;
      filters?: {
        search?: string;
      };
    };

// Bulk delete response
interface BulkDeleteModifiersResponse {
  message: string;
  deleted_count: number;
  deleted_ids: string[];
}

// Bulk delete modifiers (permanent hard delete)
const bulkDeleteModifiers = async (
  params: BulkDeleteModifiersParams
): Promise<BulkDeleteModifiersResponse> => {
  const response = await fetch(`/api/modifiers/bulk`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete modifiers");
  }

  return response.json();
};

export const useBulkDeleteModifiers = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkDeleteModifiers,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["modifiers", orgId],
        exact: false,
      });
    },
  });
};
