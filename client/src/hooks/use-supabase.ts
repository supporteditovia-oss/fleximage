import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile, UpdateProfileRequest } from "@shared/schema";
import { useAuth } from "./use-auth";
import { authFetch } from "@/lib/api";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from "@shared/locales";

type SelfProfileUpdateRequest = {
  full_name?: string | null;
  preferred_locale?: AppLocale;
};

/**
 * Hook for fetching and managing the current user's profile
 */
export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateProfileRequest;
    }) => {
      const res = await authFetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Erreur serveur" }));
        throw new Error(err.message || "Erreur serveur");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profile", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  const updateOwnProfileMutation = useMutation({
    mutationFn: async (updates: SelfProfileUpdateRequest) => {
      const locale = updates.preferred_locale;

      if (locale && !SUPPORTED_LOCALES.includes(locale)) {
        throw new Error(`Invalid locale. Allowed values: ${SUPPORTED_LOCALES.join(", ")}`);
      }

      const payload: SelfProfileUpdateRequest = {
        preferred_locale: locale ?? DEFAULT_LOCALE,
      };

      if (Object.prototype.hasOwnProperty.call(updates, "full_name")) {
        const normalizedName = updates.full_name?.trim();
        payload.full_name = normalizedName ? normalizedName : null;
      }

      const res = await authFetch("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      return res.json();
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Erreur serveur" }));
        throw new Error(err.message || "Erreur serveur");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["user-growth"] });
    },
  });

  return {
    ...query,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateOwnProfile: updateOwnProfileMutation.mutateAsync,
    isUpdatingOwnProfile: updateOwnProfileMutation.isPending,
    deleteProfile: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for fetching admin metrics (Admin only)
 */
export function useAdminMetrics() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).toISOString();
      const thisWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay(),
      ).toISOString();
      const thisMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      const [
        { count: todayCount },
        { count: weekCount },
        { count: monthCount },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thisWeek),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thisMonth),
      ]);

      return {
        today: todayCount || 0,
        week: weekCount || 0,
        month: monthCount || 0,
      };
    },
    enabled: isAdmin,
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

/**
 * Hook for fetching user growth data (Admin only)
 */
export function useUserGrowth() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["user-growth"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Helper: format any date to a local YYYY-MM-DD key
      const toLocalKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      // Group by local date key
      const counts: Record<string, number> = {};
      (data || []).forEach((profile) => {
        const key = toLocalKey(new Date(profile.created_at));
        counts[key] = (counts[key] || 0) + 1;
      });

      // Fill missing days and format for Recharts
      const chartData = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = toLocalKey(d);
        chartData.push({
          date: d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          count: counts[key] || 0,
        });
      }

      return chartData;
    },
    enabled: isAdmin,
  });
}

