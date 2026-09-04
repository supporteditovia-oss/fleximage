import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Shield, User as UserIcon, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">App</h1>
          <p className="text-muted-foreground text-lg">
            Ravi de vous revoir, {profile?.full_name || profile?.email || user?.email}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border/50 bg-secondary/5 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Prêt à construire</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Votre boilerplate a bien été configuré. Vous pouvez désormais commencer sur une base saine avec création de compte fonctionnelle, base de donnée, gestion admin. Commencez à changer les éléments à votre façon, ajoutez vos pages, et tout ce que vous souhaitez retrouver sur votre SaaS.
        </p>
      </div>
    </div>
  );
}
