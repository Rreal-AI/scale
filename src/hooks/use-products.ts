import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { CreateProductInput, UpdateProductInput } from "@/schemas/products";

// Tipos para las respuestas de la API
interface Product {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface ProductsResponse {
  products: Product[];
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

interface ProductResponse {
  product: Product;
}

interface CreateProductResponse {
  product: Product;
  message: string;
}

interface UpdateProductResponse {
  product: Product;
  message: string;
}

interface DeleteProductResponse {
  message: string;
}

// Parámetros para las queries
interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: "name" | "price" | "weight" | "created_at";
  sort_order?: "asc" | "desc";
}

// Funciones para hacer las peticiones a la API
const fetchProducts = async (
  params: GetProductsParams = {}
): Promise<ProductsResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);

  const response = await fetch(`/api/products?${searchParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
};

const fetchProduct = async (id: string): Promise<ProductResponse> => {
  const response = await fetch(`/api/products/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch product");
  }

  return response.json();
};

const createProduct = async (
  data: CreateProductInput
): Promise<CreateProductResponse> => {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create product");
  }

  return response.json();
};

const updateProduct = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateProductInput;
}): Promise<UpdateProductResponse> => {
  const response = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update product");
  }

  return response.json();
};

const deleteProduct = async (id: string): Promise<DeleteProductResponse> => {
  const response = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete product");
  }

  return response.json();
};

// Hooks de React Query
export const useProducts = (params: GetProductsParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["products", orgId, params],
    queryFn: () => fetchProducts(params),
    enabled: !!orgId,
  });
};

export const useProduct = (id: string) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["products", orgId, id],
    queryFn: () => fetchProduct(id),
    enabled: !!orgId && !!id,
  });
};

export const useCreateProduct = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      // Invalidar todas las queries de productos para esta organización
      queryClient.invalidateQueries({
        queryKey: ["products", orgId],
      });
    },
  });
};

export const useUpdateProduct = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (data, variables) => {
      // Invalidar la query del producto específico
      queryClient.invalidateQueries({
        queryKey: ["products", orgId, variables.id],
      });
      // Invalidar la lista de productos
      queryClient.invalidateQueries({
        queryKey: ["products", orgId],
        exact: false,
      });
    },
  });
};

export const useDeleteProduct = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, id) => {
      // Remover la query del producto específico
      queryClient.removeQueries({
        queryKey: ["products", orgId, id],
      });
      // Invalidar la lista de productos
      queryClient.invalidateQueries({
        queryKey: ["products", orgId],
        exact: false,
      });
    },
  });
};
