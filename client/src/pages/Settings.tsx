import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProfileSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  AlertTriangle,
  LogOut,
  Trash2,
  User,
  Mail,
  Crown,
  ChevronRight,
  X,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { updateProfile, deleteProfile, isDeleting } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertProfileSchema.pick({ full_name: true })),
    defaultValues: {
      full_name: profile?.full_name || "",
    },
  });

  const onSubmit = async (data: { full_name: string | null }) => {
    if (!user) return;
    try {
      await updateProfile({
        id: user.id,
        updates: { full_name: data.full_name || "" },
      });
      toast({
        title: "Profil mis à jour",
        description: "Tes modifications ont été enregistrées.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (profile?.is_subscriber) {
      toast({
        variant: "destructive",
        title: "Action requise",
        description:
          "Résilie d'abord ton abonnement actif avant de supprimer ton compte.",
      });
      return;
    }

    if (deleteConfirmText !== "SUPPRIMER") {
      toast({
        variant: "destructive",
        title: "Validation incorrecte",
        description:
          "Saisis 'SUPPRIMER' exactement en majuscules pour confirmer.",
      });
      return;
    }

    try {
      await deleteProfile(user.id);
      toast({
        title: "Compte supprimé",
        description:
          "Ton compte et tes données ont été définitivement supprimés.",
      });
      await signOut();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const deleteDialogBody = (
    <div className="space-y-4">
      <p className="font-medium text-foreground">
        Es-tu sûr de vouloir supprimer ton compte ?
      </p>
      {profile?.is_subscriber ? (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          Tu as un abonnement actif. Résilie-le d'abord depuis la section
          Abonnement.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Toutes tes données seront supprimées conformément au RGPD. Cette
            action ne peut pas être annulée.
          </p>
          <div className="space-y-2">
            <Label
              htmlFor="confirm-delete"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Saisis "SUPPRIMER" pour confirmer
            </Label>
            <Input
              id="confirm-delete"
              placeholder="SUPPRIMER"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="border-destructive/30 focus-visible:ring-destructive"
            />
          </div>
        </>
      )}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1 rounded-full border-border/40"
          onClick={() => {
            setDeleteOpen(false);
            setDeleteConfirmText("");
          }}
        >
          Annuler
        </Button>
        {!profile?.is_subscriber && (
          <Button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== "SUPPRIMER" || isDeleting}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full border-0"
          >
            {isDeleting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Supprimer
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pt-20 max-w-lg mx-auto">
      {/* Page title */}
      <h1 className="font-display text-2xl md:text-3xl font-bold text-center w-full">
        <span className="relative inline-block">
          Paramètres
          <svg
            className="pointer-events-none absolute left-0 right-0 mx-auto bottom-[-0.25em] md:bottom-[-0.35em] w-full h-[0.3em] md:h-[0.34em] text-primary/50"
            viewBox="0 0 100 12"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M2 8 Q 50 2 98 8"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </h1>

      {/* Profile section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          Profil
        </h2>
        <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur overflow-hidden divide-y divide-border/30">
          {/* Name field */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 px-4 py-3.5">
                    <User className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <FormControl>
                        <Input
                          placeholder="Ton nom"
                          {...field}
                          value={field.value ?? ""}
                          className="border-0 bg-transparent px-0 h-auto text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-0.5" />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={
                        form.formState.isSubmitting || !form.formState.isDirty
                      }
                      className="text-xs text-primary hover:text-primary font-semibold shrink-0 h-auto py-1 px-2"
                    >
                      {form.formState.isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Enregistrer"
                      )}
                    </Button>
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {/* Email — read only */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mail className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.email || "—"}
              </p>
              <p className="text-[11px] text-muted-foreground/50">
                Non modifiable
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          Abonnement
        </h2>
        <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Crown className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Abonnement</p>
            </div>
            {profile?.is_subscriber ? (
              <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                Actif
              </span>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                Inactif
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Account actions */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          Compte
        </h2>
        <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur overflow-hidden divide-y divide-border/30">
          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5 text-muted-foreground/60 shrink-0" />
            <span className="flex-1 text-sm font-medium">Déconnexion</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </button>

          {/* Delete account */}
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="w-4.5 h-4.5 text-destructive/60 shrink-0" />
            <span className="flex-1 text-sm font-medium text-destructive/80">
              Supprimer mon compte
            </span>
            <ChevronRight className="w-4 h-4 text-destructive/30" />
          </button>
        </div>
      </section>

      {/* Delete account — Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteConfirmText("");
          }}
        >
          <DrawerContent>
            <div className="relative">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmText("");
                }}
                className="absolute top-0 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <DrawerHeader className="text-center">
                <DrawerTitle className="flex items-center justify-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Suppression définitive
                </DrawerTitle>
                <DrawerDescription>
                  Cette action est irréversible
                </DrawerDescription>
              </DrawerHeader>
            </div>
            <div className="px-4 pb-6 pt-2">{deleteDialogBody}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteConfirmText("");
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Suppression définitive
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible
              </DialogDescription>
            </DialogHeader>
            {deleteDialogBody}
          </DialogContent>
        </Dialog>
      )}

      {/* Legal footer */}
      <p className="text-center text-[11px] text-muted-foreground/40 pb-4">
        Les données sont traitées conformément au RGPD.
      </p>
    </div>
  );
}
