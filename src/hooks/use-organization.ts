import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

interface Organization {
  id: string;
  name: string;
  inbound_email: string;
  timezone: string;
  currency: string;
  order_weight_delta_tolerance: number;
}

interface UpdateOrganizationInput {
  order_weight_delta_tolerance?: number;
}

const fetchOrganization = async (): Promise<Organization> => {
  const response = await fetch("/api/organization");

  if (!response.ok) {
    throw new Error("Failed to fetch organization");
  }

  return response.json();
};

const updateOrganization = async (
  data: UpdateOrganizationInput
): Promise<Organization & { message: string }> => {
  const response = await fetch("/api/organization", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update organization");
  }

  return response.json();
};

export const useOrganization = () => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["organization", orgId],
    queryFn: fetchOrganization,
    enabled: !!orgId,
  });
};

export const useUpdateOrganization = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization", orgId],
      });
    },
  });
};
