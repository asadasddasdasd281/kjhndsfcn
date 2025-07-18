import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Session } from "@shared/schema";

export function useSession(productNumber?: string) {
  return useQuery<Session | null>({
    queryKey: ["/api/sessions", productNumber],
    queryFn: async (): Promise<Session | null> => {
      if (!productNumber) return null;
      const response = await fetch(`/api/sessions/${productNumber}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Session doesn't exist yet
        }
        throw new Error("Failed to fetch session");
      }
      return response.json();
    },
    enabled: !!productNumber,
  });
}

export function invalidateSessionQueries(sessionId?: number) {
  if (!sessionId) return;
  queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
  queryClient.invalidateQueries({ queryKey: [`/api/sessions/${sessionId}/progress`] });
}
