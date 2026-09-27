import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/admin-crm/lib/crm-api";

export function useCrmDashboard() {
  return useQuery({
    queryKey: ["crm", "dashboard"],
    queryFn: () => crmApi.dashboard(),
    staleTime: 30_000,
  });
}

export function useCrmAccounts() {
  return useQuery({
    queryKey: ["crm", "accounts"],
    queryFn: async () => (await crmApi.accounts.list()).items,
  });
}

export function useCrmAccount(id: string | null) {
  return useQuery({
    queryKey: ["crm", "account", id],
    queryFn: () => crmApi.accounts.get(id!),
    enabled: !!id,
  });
}

export function useCrmWarmup() {
  return useQuery({
    queryKey: ["crm", "warmup"],
    queryFn: async () => (await crmApi.warmup.overview()).items,
  });
}

export function useCrmFolders() {
  return useQuery({
    queryKey: ["crm", "folders"],
    queryFn: async () => (await crmApi.folders.list()).items,
  });
}

export function useCrmMedia(folderKey?: string, search?: string) {
  return useQuery({
    queryKey: ["crm", "media", folderKey, search],
    queryFn: async () =>
      (
        await crmApi.media.list({
          ...(folderKey ? { folder_key: folderKey } : {}),
          ...(search ? { q: search } : {}),
        })
      ).items,
  });
}

export function useCrmMusic(search?: string, favoritesOnly?: boolean) {
  return useQuery({
    queryKey: ["crm", "music", search, favoritesOnly],
    queryFn: async () =>
      (
        await crmApi.music.list({
          ...(search ? { q: search } : {}),
          ...(favoritesOnly ? { favorite: "1" } : {}),
        })
      ).items,
  });
}

export function useCrmPosts(from?: string, to?: string) {
  return useQuery({
    queryKey: ["crm", "posts", from, to],
    queryFn: async () => (await crmApi.posts.list(from, to)).items,
  });
}

export function useCrmPov() {
  return useQuery({
    queryKey: ["crm", "pov"],
    queryFn: async () => (await crmApi.pov.get()).preset,
  });
}

export function useCrmInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["crm"] });
}

export function useCrmAccountMutations() {
  const invalidate = useCrmInvalidate();
  return {
    create: useMutation({
      mutationFn: crmApi.accounts.create,
      onSuccess: () => void invalidate(),
    }),
    update: useMutation({
      mutationFn: ({ id, ...json }: { id: string } & Record<string, unknown>) =>
        crmApi.accounts.update(id, json),
      onSuccess: () => void invalidate(),
    }),
  };
}
