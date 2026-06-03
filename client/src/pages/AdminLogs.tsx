import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminGenerationLogs,
  useClearAdminGenerationLogs,
} from "@/hooks/use-larps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Loader2, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { AdminGenerationLogItem } from "@/hooks/use-larps";
import { cn } from "@/lib/utils";
import { getLocalizedHistoryTemplateName } from "@/lib/template-utils";

function formatDuration(costTime: number | null): string {
  if (costTime === null) return "—";
  const seconds = Number(costTime);
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins} min ${secs} s` : `${mins} min`;
}

function StatusBadge({
  status,
  labels,
}: {
  status: AdminGenerationLogItem["status"];
  labels: { success: string; fail: string; waiting: string };
}) {
  if (status === "success") {
    return (
      <Badge className="bg-emerald-600/90 hover:bg-emerald-600/90">
        {labels.success}
      </Badge>
    );
  }
  if (status === "fail") {
    return <Badge variant="destructive">{labels.fail}</Badge>;
  }
  return <Badge variant="secondary">{labels.waiting}</Badge>;
}

type StatusFilter = "all" | "success" | "fail";

function filterLogs(
  logs: AdminGenerationLogItem[],
  statusFilter: StatusFilter,
  search: string,
): AdminGenerationLogItem[] {
  const q = search.trim().toLowerCase();
  return logs.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (!q) return true;
    const email = (log.userEmail ?? "").toLowerCase();
    const failMessage = (log.failMessage ?? "").toLowerCase();
    return email.includes(q) || failMessage.includes(q);
  });
}

export default function AdminLogs() {
  const { isAdmin } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: logs, isLoading, isError, refetch, isFetching } =
    useAdminGenerationLogs({ enabled: isAdmin });
  const clearLogs = useClearAdminGenerationLogs();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const filteredLogs = useMemo(
    () => (logs ? filterLogs(logs, statusFilter, search) : []),
    [logs, statusFilter, search],
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">{t("adminLogs.accessDeniedTitle")}</h2>
        <p className="text-muted-foreground">
          {t("adminLogs.accessDeniedDescription")}
        </p>
      </div>
    );
  }

  const statusLabels = {
    success: t("adminLogs.statusSuccess"),
    fail: t("adminLogs.statusFail"),
    waiting: t("adminLogs.statusWaiting"),
  };

  const handleClearLogs = async () => {
    try {
      const { deletedCount } = await clearLogs.mutateAsync();
      setClearDialogOpen(false);
      toast({
        title: t("adminLogs.clearSuccessTitle"),
        description: t("adminLogs.clearSuccessDescription", {
          count: deletedCount,
        }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("adminLogs.clearErrorTitle"),
        description:
          error instanceof Error ? error.message : t("adminLogs.loadError"),
      });
    }
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("adminLogs.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("adminLogs.pageDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isFetching && !isLoading && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!logs?.length || clearLogs.isPending}
            onClick={() => setClearDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("adminLogs.clearButton")}
          </Button>
        </div>
      </div>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminLogs.clearDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminLogs.clearDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearLogs.isPending}>
              {t("adminLogs.clearDialogCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleClearLogs();
              }}
              disabled={clearLogs.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearLogs.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("adminLogs.clearDialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("adminLogs.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            type="search"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { value: "all" as const, label: t("adminLogs.filterAll") },
              {
                value: "success" as const,
                label: t("adminLogs.filterSuccess"),
              },
              { value: "fail" as const, label: t("adminLogs.filterFail") },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                statusFilter === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {t("adminLogs.tableTitle")}
            {logs?.length ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {t("adminLogs.resultCount", {
                  shown: filteredLogs.length,
                  total: logs.length,
                })}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-destructive">{t("adminLogs.loadError")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {t("adminLogs.retry")}
              </button>
            </div>
          ) : !logs?.length ? (
            <p className="text-center py-10 text-muted-foreground">
              {t("adminLogs.empty")}
            </p>
          ) : !filteredLogs.length ? (
            <p className="text-center py-10 text-muted-foreground">
              {t("adminLogs.emptyFiltered")}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("adminLogs.colEmail")}</TableHead>
                    <TableHead>{t("adminLogs.colDate")}</TableHead>
                    <TableHead>{t("adminLogs.colType")}</TableHead>
                    <TableHead>{t("adminLogs.colStatus")}</TableHead>
                    <TableHead>{t("adminLogs.colDuration")}</TableHead>
                    <TableHead>{t("adminLogs.colTemplate")}</TableHead>
                    <TableHead>{t("adminLogs.colError")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {log.userEmail ?? (
                          <span className="text-muted-foreground italic">
                            {t("adminLogs.noEmail")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.createdAt), "dd MMM yyyy HH:mm", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.generationType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} labels={statusLabels} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">
                        {formatDuration(log.costTime)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "max-w-[160px] truncate text-sm",
                          !log.template && "text-muted-foreground",
                        )}
                      >
                        {log.template
                          ? getLocalizedHistoryTemplateName(
                              log.template,
                              i18n.language,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "max-w-[220px] truncate text-sm",
                          log.failMessage
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                        title={log.failMessage ?? undefined}
                      >
                        {log.failMessage ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
