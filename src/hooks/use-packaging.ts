import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  CreatePackagingInput,
  UpdatePackagingInput,
} from "@/schemas/packaging";

// Tipos para las respuestas de la API
interface Packaging {
  id: string;
  org_id: string;
  name: string;
  weight: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface PackagingResponse {
  packaging: Packaging[];
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

interface SinglePackagingResponse {
  packaging: Packaging;
}

interface CreatePackagingResponse {
  packaging: Packaging;
  message: string;
}

interface UpdatePackagingResponse {
  packaging: Packaging;
  message: string;
}

interface DeletePackagingResponse {
  message: string;
}

// Parámetros para las queries
interface GetPackagingParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: "name" | "weight" | "created_at";
  sort_order?: "asc" | "desc";
}

// Funciones para hacer las peticiones a la API
const fetchPackaging = async (
  params: GetPackagingParams = {}
): Promise<PackagingResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);

  const response = await fetch(`/api/packaging?${searchParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch packaging");
  }

  return response.json();
};

const fetchSinglePackaging = async (
  id: string
): Promise<SinglePackagingResponse> => {
  const response = await fetch(`/api/packaging/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch packaging");
  }

  return response.json();
};

const createPackaging = async (
  data: CreatePackagingInput
): Promise<CreatePackagingResponse> => {
  const response = await fetch("/api/packaging", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create packaging");
  }

  return response.json();
};

const updatePackaging = async ({
  id,
  data,
}: {
  id: string;
  data: UpdatePackagingInput;
}): Promise<UpdatePackagingResponse> => {
  const response = await fetch(`/api/packaging/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update packaging");
  }

  return response.json();
};

const deletePackaging = async (
  id: string
): Promise<DeletePackagingResponse> => {
  const response = await fetch(`/api/packaging/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete packaging");
  }

  return response.json();
};

// Hooks de React Query
export const usePackaging = (params: GetPackagingParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["packaging", orgId, params],
    queryFn: () => fetchPackaging(params),
    enabled: !!orgId,
  });
};

export const useSinglePackaging = (id: string) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["packaging", orgId, id],
    queryFn: () => fetchSinglePackaging(id),
    enabled: !!orgId && !!id,
  });
};

export const useCreatePackaging = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPackaging,
    onSuccess: () => {
      // Invalidar todas las queries de packaging para esta organización
      queryClient.invalidateQueries({
        queryKey: ["packaging", orgId],
      });
    },
  });
};

export const useUpdatePackaging = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePackaging,
    onSuccess: (data, variables) => {
      // Invalidar la query del packaging específico
      queryClient.invalidateQueries({
        queryKey: ["packaging", orgId, variables.id],
      });
      // Invalidar la lista de packaging
      queryClient.invalidateQueries({
        queryKey: ["packaging", orgId],
        exact: false,
      });
    },
  });
};

export const useDeletePackaging = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePackaging,
    onSuccess: (_, id) => {
      // Remover la query del packaging específico
      queryClient.removeQueries({
        queryKey: ["packaging", orgId, id],
      });
      // Invalidar la lista de packaging
      queryClient.invalidateQueries({
        queryKey: ["packaging", orgId],
        exact: false,
      });
    },
  });
};
