import { useMutation, useQueryClient } from "@tanstack/react-query";

interface VerifyVisualParams {
  orderId: string;
  images: string[];
}

interface VerifyVisualResponse {
  success: boolean;
  status: "pending";
  message: string;
}

const verifyOrderVisual = async ({
  orderId,
  images,
}: VerifyVisualParams): Promise<VerifyVisualResponse> => {
  const response = await fetch(`/api/orders/${orderId}/verify-visual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ images }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start visual verification");
  }

  return response.json();
};

export const useVisualVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyOrderVisual,
    onMutate: async ({ orderId }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // Optimistically update order status to "pending" immediately
      queryClient.setQueriesData(
        { queryKey: ["orders"] },
        (oldData: unknown) => {
          if (!oldData || typeof oldData !== "object") return oldData;

          // Handle orders list response
          if ("orders" in oldData && Array.isArray((oldData as { orders: unknown[] }).orders)) {
            const data = oldData as { orders: Array<{ id: string; visual_verification_status?: string }> };
            return {
              ...data,
              orders: data.orders.map((order) =>
                order.id === orderId
                  ? { ...order, visual_verification_status: "pending" }
                  : order
              ),
            };
          }

          // Handle single order response
          if ("order" in oldData) {
            const data = oldData as { order: { id: string; visual_verification_status?: string } };
            if (data.order?.id === orderId) {
              return {
                ...data,
                order: { ...data.order, visual_verification_status: "pending" },
              };
            }
          }

          return oldData;
        }
      );
    },
    onSuccess: () => {
      // Invalidate to sync with server state
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};
