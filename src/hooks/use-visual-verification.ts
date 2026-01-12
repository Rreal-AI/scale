import { useMutation } from "@tanstack/react-query";

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
  return useMutation({
    mutationFn: verifyOrderVisual,
  });
};
