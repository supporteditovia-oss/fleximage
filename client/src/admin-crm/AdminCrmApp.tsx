import { Route, Switch, Redirect, useLocation } from "wouter";
import AdminCrmLogin from "@/admin-crm/AdminCrmLogin";
import { AdminCrmProtectedLayout } from "@/admin-crm/AdminCrmProtectedLayout";
import DashboardPage from "@/admin-crm/pages/dashboard";
import LibraryPage from "@/admin-crm/pages/library";
import PovPage from "@/admin-crm/pages/pov";
import MusicPage from "@/admin-crm/pages/music";
import PublishPage from "@/admin-crm/pages/publish";
import AnalyticsPage from "@/admin-crm/pages/analytics";
import SettingsPage from "@/admin-crm/pages/settings";
import AccountsPage from "@/admin-crm/pages/accounts";
import AccountDetailPage from "@/admin-crm/pages/account-detail";
import WarmupPage from "@/admin-crm/pages/warmup";

function Protected({ children }: { children: React.ReactNode }) {
  return <AdminCrmProtectedLayout>{children}</AdminCrmProtectedLayout>;
}

export function AdminCrmApp() {
  const [location] = useLocation();
  const path = location.split("?")[0];

  if (path === "/admin") {
    return <AdminCrmLogin />;
  }

  return (
    <Switch>
      <Route path="/admin/dashboard">
        <Protected>
          <DashboardPage />
        </Protected>
      </Route>
      <Route path="/admin/accounts/:id">
        <Protected>
          <AccountDetailPage />
        </Protected>
      </Route>
      <Route path="/admin/accounts">
        <Protected>
          <AccountsPage />
        </Protected>
      </Route>
      <Route path="/admin/warmup">
        <Protected>
          <WarmupPage />
        </Protected>
      </Route>
      <Route path="/admin/library">
        <Protected>
          <LibraryPage />
        </Protected>
      </Route>
      <Route path="/admin/pov">
        <Protected>
          <PovPage />
        </Protected>
      </Route>
      <Route path="/admin/music">
        <Protected>
          <MusicPage />
        </Protected>
      </Route>
      <Route path="/admin/publish">
        <Protected>
          <PublishPage />
        </Protected>
      </Route>
      <Route path="/admin/analytics">
        <Protected>
          <AnalyticsPage />
        </Protected>
      </Route>
      <Route path="/admin/settings">
        <Protected>
          <SettingsPage />
        </Protected>
      </Route>
      <Route path="/admin/:rest*">
        <Redirect to="/admin/dashboard" />
      </Route>
    </Switch>
  );
}

export function isAdminCrmPath(pathname: string): boolean {
  if (pathname === "/admin") return true;
  return (
    pathname.startsWith("/admin/dashboard") ||
    pathname.startsWith("/admin/accounts") ||
    pathname.startsWith("/admin/warmup") ||
    pathname.startsWith("/admin/library") ||
    pathname.startsWith("/admin/pov") ||
    pathname.startsWith("/admin/music") ||
    pathname.startsWith("/admin/publish") ||
    pathname.startsWith("/admin/analytics") ||
    pathname.startsWith("/admin/settings")
  );
}
