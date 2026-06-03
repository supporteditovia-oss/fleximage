import { useProfile, useAdminMetrics, useUserGrowth } from "@/hooks/use-supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Users, ShieldAlert, Trash2, Crown, TrendingUp, BarChart3, Search, Coins, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Settings2, Activity, Loader2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@shared/schema";

type AdminProfile = Profile & {
  subscriptions?: Array<{ plan_type: string; status: string; billing_interval?: string | null }>;
};

type CreditLedgerReason =
  | "subscription_grant"
  | "generation_charge"
  | "admin_adjustment"
  | "refund"
  | "system_adjustment";

type AdminUserActivity = {
  profile: {
    id: string;
    email: string | null;
    fullName: string | null;
    role: "user" | "admin";
    isSubscriber: boolean;
    credits: number;
    generationCount: number;
    createdAt: string;
  };
  summary: {
    generationCount: number;
    failedGenerations: number;
    totalCharged: number;
    totalRefunded: number;
    netSpent: number;
    subscriptionGranted: number;
    adminAdjustments: number;
  };
  generations: Array<{
    id: string;
    generationType: "image" | "video";
    status: "waiting" | "success" | "fail";
    finalPrompt: string;
    prompt?: string | null;
    provider: string | null;
    failMessage: string | null;
    creditCost: number;
    creditsCharged: number;
    creditsRefunded: number;
    netCredits: number;
    createdAt: string;
    template: { name: string; nameEn?: string | null; category: string | null } | null;
  }>;
  creditLedger: Array<{
    id: string;
    generationId: string | null;
    delta: number;
    balanceAfter: number;
    reason: CreditLedgerReason;
    createdAt: string;
  }>;
};
import { useState, useCallback, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/api";

const PAGE_SIZE = 20;

/**
 * Hook for paginated profile fetching (Admin only)
 */
function usePaginatedProfiles({
  page,
  searchQuery,
  roleFilter,
  subscriberFilter,
  sortBy,
  sortDirection,
}: {
  page: number;
  searchQuery: string;
  roleFilter: string;
  subscriberFilter: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
}) {
  const { isAdmin } = useAuth();

  return useQuery<{ profiles: AdminProfile[]; totalCount: number }>({
    queryKey: ["profiles-paginated", page, searchQuery, roleFilter, subscriberFilter, sortBy, sortDirection],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Build query
      let query = supabase
        .from("profiles")
        .select("*, subscriptions(plan_type,status,billing_interval)", { count: "exact" });

      // Apply filters
      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }
      if (subscriberFilter === "subscriber") {
        query = query.eq("is_subscriber", true);
      } else if (subscriberFilter === "non-subscriber") {
        query = query.eq("is_subscriber", false);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
      }

      // Apply sorting
      const sortColumn = sortBy === "subscriber" ? "is_subscriber" : sortBy === "name" ? "full_name" : "created_at";
      query = query.order(sortColumn, { ascending: sortDirection === "asc" });

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const profiles = (data || []).map(p => ({
        ...p,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })) as Profile[];

      return { profiles: profiles as AdminProfile[], totalCount: count || 0 };
    },
    enabled: isAdmin,
    staleTime: 1000 * 30, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching all profiles (Admin only) - kept for dashboard stats
 */
export function useAllProfiles() {
  const { isAdmin } = useAuth();

  return useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        ...p,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })) as Profile[];
    },
    enabled: isAdmin,
  });
}

function useAdminUserActivity(userId: string | null) {
  const { isAdmin } = useAuth();

  return useQuery<AdminUserActivity>({
    queryKey: ["admin-user-activity", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Missing user id");
      const res = await authFetch(`/api/admin/users/${userId}/activity`);
      return res.json();
    },
    enabled: isAdmin && Boolean(userId),
    staleTime: 10_000,
  });
}

function formatCreditDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function creditReasonLabel(reason: CreditLedgerReason) {
  const labels: Record<CreditLedgerReason, string> = {
    subscription_grant: "Crédits abonnement",
    generation_charge: "Génération",
    admin_adjustment: "Ajustement admin",
    refund: "Remboursement",
    system_adjustment: "Ajustement système",
  };
  return labels[reason];
}

/**
 * Admin Portal Main Page (Dashboard Only)
 */
export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { data: profiles } = useAllProfiles();
  const { data: metrics, isLoading: isLoadingMetrics } = useAdminMetrics();
  const { data: growthData, isLoading: isLoadingGrowth } = useUserGrowth();
  
  const isUsersPage = location === "/admin/users";

  const isLoading = isLoadingMetrics || isLoadingGrowth;

  if (!isAdmin && !isLoading) {
    return <AccessDenied setLocation={setLocation} />;
  }

  if (isUsersPage) {
    return <UsersManagementPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">Aperçu Admin</h1>
        <p className="text-muted-foreground text-lg">
          Aperçu global et statistiques du système.
        </p>
      </div>

      {isLoading ? (
        <AdminSkeleton />
      ) : (
        <>
          <AdminStats metrics={metrics} profiles={profiles} />
          <OneshotApiSettings />
          <GrowthChart data={growthData} />
        </>
      )}
    </div>
  );
}

/**
 * Dedicated User Management Page with pagination
 */
function UsersManagementPage() {
  const { updateProfile, deleteProfile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [subscriberFilter, setSubscriberFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
    // Simple debounce
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const { data, isLoading, isFetching } = usePaginatedProfiles({
    page: currentPage,
    searchQuery: debouncedSearch,
    roleFilter,
    subscriberFilter,
    sortBy,
    sortDirection,
  });

  const profiles = data?.profiles || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Credit dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditTarget, setCreditTarget] = useState<Profile | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [activityUser, setActivityUser] = useState<AdminProfile | null>(null);
  const {
    data: activity,
    isLoading: isActivityLoading,
    isFetching: isActivityFetching,
  } = useAdminUserActivity(activityUser?.id ?? null);

  const handleChangePlan = async (
    id: string,
    plan: "free" | "discovery" | "essential" | "ultimate",
  ) => {
    try {
      await updateProfile({ id, updates: { admin_plan: plan } as any });
      queryClient.invalidateQueries({ queryKey: ["profiles-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      const planLabels = {
        free: "Gratuit",
        discovery: "Decouverte",
        essential: "Essentiel",
        ultimate: "Ultimate",
      };
      toast({ title: "Plan mis à jour", description: `Le plan utilisateur est maintenant ${planLabels[plan]}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de la mise à jour", description: error.message });
    }
  };

  const handleToggleRole = async (id: string, currentRole: string) => {
    try {
      const newRole = currentRole === "admin" ? "user" : "admin";
      await updateProfile({ id, updates: { role: newRole as "user" | "admin" } });
      queryClient.invalidateQueries({ queryKey: ["profiles-paginated"] });
      toast({ title: "Rôle mis à jour", description: `L'utilisateur est maintenant ${newRole === 'admin' ? 'Administrateur' : 'Utilisateur'}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de la mise à jour", description: error.message });
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteProfile(id);
      queryClient.invalidateQueries({ queryKey: ["profiles-paginated"] });
      toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été retiré avec succès." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de la suppression", description: error.message });
    }
  };

  const handleAddCredits = async () => {
    if (!creditTarget || !creditAmount) return;
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Montant invalide", description: "Veuillez entrer un nombre valide." });
      return;
    }
    try {
      const res = await authFetch("/api/admin/credits", {
        method: "POST",
        body: JSON.stringify({ user_id: creditTarget.id, amount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur serveur" }));
        throw new Error(err.message || "Erreur serveur");
      }
      queryClient.invalidateQueries({ queryKey: ["profiles-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["profile", creditTarget.id] });
      toast({ title: "Jetons ajoutés", description: `${amount > 0 ? '+' : ''}${amount} jetons pour ${creditTarget.full_name || creditTarget.email}.` });
      setCreditDialogOpen(false);
      setCreditTarget(null);
      setCreditAmount("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec", description: error.message });
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection(column === "date" ? "desc" : "asc");
    }
    setCurrentPage(0);
  };

  const handleFilterChange = (type: "role" | "subscriber", value: string) => {
    if (type === "role") setRoleFilter(value);
    else setSubscriberFilter(value);
    setCurrentPage(0);
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Page header — matches AdminTemplates */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display">Utilisateurs</h1>
            {!isLoading && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {totalCount}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consultez et modifiez les comptes utilisateurs du système.
          </p>
        </div>
      </div>

      {/* Search + filters — flat, like AdminTemplates */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un utilisateur..." 
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {/* Role pills */}
          {[
            { value: "all", label: "Tous" },
            { value: "user", label: "Utilisateurs" },
            { value: "admin", label: "Admins" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange("role", opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                roleFilter === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="w-px h-5 bg-border/60 self-center mx-1" />
          {/* Subscriber pills */}
          {[
            { value: "all", label: "Tous statuts" },
            { value: "subscriber", label: "Abonnés" },
            { value: "non-subscriber", label: "Gratuit" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange("subscriber", opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                subscriberFilter === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card — matches AdminTemplates */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !profiles.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun utilisateur ne correspond à la recherche.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Utilisateur
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Jetons</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile: AdminProfile) => {
                  const activeSubscription = profile.subscriptions?.find((subscription) => subscription.status === "active");
                  const currentPlan = activeSubscription
                    ? activeSubscription.plan_type === "ultimate"
                      ? "ultimate"
                      : activeSubscription.plan_type === "essential" ||
                          activeSubscription.plan_type === "monthly" ||
                          activeSubscription.plan_type === "video"
                        ? "essential"
                        : "discovery"
                    : profile.is_subscriber
                      ? "discovery"
                      : "free";

                  return (
                  <TableRow
                    key={profile.id}
                    onClick={() => setActivityUser(profile)}
                    className={`cursor-pointer hover:bg-muted/35 ${isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{profile.full_name || "N/A"}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {profile.email}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {profile.createdAt ? format(new Date(profile.createdAt), "dd/MM/yyyy") : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleRole(profile.id, profile.role);
                        }}
                        className="transition-transform active:scale-95"
                      >
                        <Badge 
                          variant={profile.role === 'admin' ? "default" : "secondary"}
                          className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                        >
                          {profile.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <select
                        value={currentPlan}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleChangePlan(
                            profile.id,
                            e.target.value as "free" | "discovery" | "essential" | "ultimate",
                          );
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="free">Gratuit</option>
                        <option value="discovery">Decouverte</option>
                        <option value="essential">Essentiel</option>
                        <option value="ultimate">Ultimate</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono tabular-nums">{profile.credits || 0}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCreditTarget(profile);
                            setCreditAmount("");
                            setCreditDialogOpen(true);
                          }}
                          title="Gérer les jetons"
                        >
                          <Coins className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteUserDialog profile={profile} onDelete={() => handleDeleteUser(profile.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} sur {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(0)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2 tabular-nums">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(totalPages - 1)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserActivityDialog
        profile={activityUser}
        activity={activity}
        isLoading={isActivityLoading}
        isFetching={isActivityFetching}
        onOpenChange={(open) => {
          if (!open) setActivityUser(null);
        }}
      />

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={(open) => {
        setCreditDialogOpen(open);
        if (!open) { setCreditTarget(null); setCreditAmount(""); }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Gérer les jetons
            </DialogTitle>
            <DialogDescription>
              Ajouter ou retirer des jetons pour {creditTarget?.full_name || creditTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Solde actuel</p>
                <p className="text-lg font-bold font-mono tabular-nums">{creditTarget?.credits || 0} jetons</p>
              </div>
              <Coins className="h-8 w-8 text-amber-500/30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Montant à ajouter</Label>
              <Input
                id="credit-amount"
                type="number"
                placeholder="Ex: 50 ou -10"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nombre positif pour ajouter, négatif pour retirer.
              </p>
            </div>
            {creditAmount && !isNaN(parseInt(creditAmount, 10)) && (
              <div className="p-3 rounded-lg border border-border/60 text-center">
                <p className="text-xs text-muted-foreground">Nouveau solde</p>
                <p className="text-lg font-bold font-mono tabular-nums">
                  {(creditTarget?.credits || 0) + parseInt(creditAmount, 10)} jetons
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCredits} disabled={!creditAmount || isNaN(parseInt(creditAmount, 10))}>
              <Coins className="mr-2 h-4 w-4" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserActivityDialog({
  profile,
  activity,
  isLoading,
  isFetching,
  onOpenChange,
}: {
  profile: AdminProfile | null;
  activity?: AdminUserActivity;
  isLoading: boolean;
  isFetching: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const open = Boolean(profile);
  const displayName =
    activity?.profile.fullName ||
    profile?.full_name ||
    activity?.profile.email ||
    profile?.email ||
    "Utilisateur";

  const statusLabel = (status: "waiting" | "success" | "fail") => {
    if (status === "success") return "Succès";
    if (status === "fail") return "Erreur";
    return "En cours";
  };

  const statusClassName = (status: "waiting" | "success" | "fail") => {
    if (status === "success") return "bg-emerald-600/90 hover:bg-emerald-600/90";
    if (status === "fail") return "bg-destructive text-destructive-foreground hover:bg-destructive";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92svh,780px)] w-[min(calc(100vw-1.5rem),72rem)] max-w-none flex-col overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Historique utilisateur
          </DialogTitle>
          <DialogDescription>
            {displayName}
            {profile?.email ? ` · ${profile.email}` : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : !activity ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Impossible de charger l’activité utilisateur.
          </div>
        ) : (
          <div className="min-h-0 overflow-y-auto p-6">
            {isFetching && (
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Actualisation...
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                <p className="text-xs text-muted-foreground">Solde actuel</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                  {activity.profile.credits}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                <p className="text-xs text-muted-foreground">Consommés</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-rose-600">
                  -{activity.summary.totalCharged}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                <p className="text-xs text-muted-foreground">Remboursés</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600">
                  +{activity.summary.totalRefunded}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                <p className="text-xs text-muted-foreground">Net généré</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                  {activity.summary.netSpent}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                <p className="text-xs text-muted-foreground">Requêtes</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                  {activity.summary.generationCount}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Requêtes de génération</CardTitle>
                  <CardDescription>
                    Les 100 dernières requêtes, avec débit et remboursement associé.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {!activity.generations.length ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Aucune génération pour cet utilisateur.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Requête</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Crédits</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activity.generations.map((generation) => (
                          <TableRow key={generation.id}>
                            <TableCell className="align-top">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {generation.generationType === "video" ? "Vidéo" : "Image"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(generation.createdAt), "dd/MM/yyyy HH:mm")}
                                  </span>
                                </div>
                                <p className="line-clamp-2 max-w-xl text-sm font-medium">
                                  {generation.template?.nameEn ||
                                    generation.template?.name ||
                                    generation.finalPrompt ||
                                    generation.prompt ||
                                    "Requête sans prompt"}
                                </p>
                                {generation.failMessage && (
                                  <p className="text-xs text-destructive">
                                    {generation.failMessage}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge className={statusClassName(generation.status)} variant={generation.status === "waiting" ? "secondary" : "default"}>
                                {statusLabel(generation.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top text-right">
                              <div className="font-mono text-sm tabular-nums">
                                -{generation.creditsCharged}
                              </div>
                              {generation.creditsRefunded > 0 && (
                                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  <RotateCcw className="h-3 w-3" />
                                  +{generation.creditsRefunded}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mouvements crédits</CardTitle>
                  <CardDescription>
                    Débits, remboursements, abonnements et ajustements admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!activity.creditLedger.length ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Aucun mouvement crédit.
                    </p>
                  ) : (
                    activity.creditLedger.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {creditReasonLabel(entry.reason)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")} · solde {entry.balanceAfter}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${
                            entry.delta > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {formatCreditDelta(entry.delta)}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sub-components
 */

function AccessDenied({ setLocation }: { setLocation: any }) {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold">Accès Refusé</h1>
      <p className="text-muted-foreground max-w-md">
        Vous n'avez pas les permissions nécessaires pour voir cette page. Cette zone est réservée aux administrateurs.
      </p>
      <Button onClick={() => setLocation("/app")}>
        Retour à l'application
      </Button>
    </div>
  );
}

/**
 * OneshotAPI / Kie AI Settings Card
 */
function OneshotApiSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<{ forceKieAi: boolean; fallbackTimeoutMs: number }>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    staleTime: 10_000,
  });

  const [forceKieAi, setForceKieAi] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState("105");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForceKieAi(settings.forceKieAi);
      setTimeoutSec(String(Math.round(settings.fallbackTimeoutMs / 1000)));
    }
  }, [settings]);

  const handleToggle = async (checked: boolean) => {
    setForceKieAi(checked);
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ forceKieAi: checked }),
      });
      if (!res.ok) throw new Error("Failed to update");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({
        title: checked ? "Mode Full Kie AI activé" : "OneshotAPI activé",
        description: checked
          ? "Toutes les générations passent par Kie AI."
          : "Les générations passent par OneshotAPI avec fallback Kie AI.",
      });
    } catch (err: any) {
      setForceKieAi(!checked);
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTimeoutSave = async () => {
    const ms = parseInt(timeoutSec, 10) * 1000;
    if (isNaN(ms) || ms < 30000 || ms > 600000) {
      toast({ variant: "destructive", title: "Valeur invalide", description: "Le timeout doit être entre 30 et 600 secondes." });
      return;
    }
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ fallbackTimeoutMs: ms }),
      });
      if (!res.ok) throw new Error("Failed to update");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Timeout mis à jour", description: `Fallback Kie AI après ${timeoutSec}s.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            OneshotAPI
          </CardTitle>
          <CardDescription>Configuration du moteur de génération d'images.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Force Kie AI toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Mode Full Kie AI</Label>
            <p className="text-xs text-muted-foreground">
              Quand activé, toutes les générations passent exclusivement par Kie AI (OneshotAPI ignoré).
            </p>
          </div>
          <Switch
            checked={forceKieAi}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>

        {/* Fallback timeout */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Timeout fallback Kie AI</Label>
            <p className="text-xs text-muted-foreground">
              Durée (en secondes) avant de basculer automatiquement sur Kie AI si OneshotAPI n'a pas répondu.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={30}
              max={600}
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(e.target.value)}
              className="w-28 font-mono"
              disabled={saving}
            />
            <span className="text-sm text-muted-foreground">secondes</span>
            <Button
              size="sm"
              onClick={handleTimeoutSave}
              disabled={saving || timeoutSec === String(Math.round((settings?.fallbackTimeoutMs || 105000) / 1000))}
            >
              Sauvegarder
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminStats({ metrics, profiles }: any) {
  const adminsCount = profiles?.filter((p: any) => p.role === 'admin').length || 0;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Aujourd'hui" value={metrics?.today} icon={<TrendingUp className="h-4 w-4 text-[#42a5f6]" />} description="Nouveaux inscrits" />
      <StatCard title="Cette Semaine" value={metrics?.week} icon={<Users className="h-4 w-4 text-primary" />} description="Inscriptions 7j" />
      <StatCard title="Ce Mois" value={metrics?.month} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="Inscriptions 30j" />
      <StatCard title="Admins" value={adminsCount} icon={<ShieldCheck className="h-4 w-4 text-primary" />} description="Administrateurs système" />
    </div>
  );
}

function StatCard({ title, value, icon, description }: any) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value || 0}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function GrowthChart({ data }: any) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Aperçu de la Croissance</CardTitle>
            <CardDescription>Évolution des inscriptions sur les 30 derniers jours.</CardDescription>
          </div>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Aucune donnée de croissance disponible.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Aperçu de la Croissance</CardTitle>
          <CardDescription>Évolution des inscriptions sur les 30 derniers jours.</CardDescription>
        </div>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                minTickGap={30}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
                strokeWidth={2}
                name="Nouveaux Utilisateurs"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteUserDialog({ profile, onDelete }: any) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(event) => event.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Cela supprimera définitivement le profil utilisateur de {profile.email}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
