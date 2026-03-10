import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProfileSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Info, CreditCard } from "lucide-react";
import { useState } from "react";
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

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { updateProfile, deleteProfile, isDeleting } = useProfile();
  const { toast } = useToast();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const form = useForm({
    resolver: zodResolver(insertProfileSchema.pick({ full_name: true })),
    defaultValues: {
      full_name: profile?.full_name || "",
    },
  });

  const onSubmit = async (data: { full_name: string | null }) => {
    if (!user) return;
    try {
      await updateProfile({ id: user.id, updates: { full_name: data.full_name || "" } });
      toast({ title: "Profil mis à jour", description: "Vos modifications ont été enregistrées." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (profile?.is_subscriber) {
      toast({
        variant: "destructive",
        title: "Action requise",
        description: "Veuillez d'abord résilier votre abonnement actif avant de supprimer votre compte.",
      });
      return;
    }

    if (deleteConfirmText !== "SUPPRIMER") {
      toast({
        variant: "destructive",
        title: "Validation incorrecte",
        description: "Veuillez saisir 'SUPPRIMER' exactement en majuscules pour confirmer.",
      });
      return;
    }

    try {
      await deleteProfile(user.id);
      toast({ title: "Compte supprimé", description: "Votre compte et vos données ont été définitivement supprimés." });
      await signOut();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Paramètres</h1>
        <p className="text-muted-foreground">Gérez votre compte et vos préférences.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Informations Personnelles</CardTitle>
            <CardDescription>Mettez à jour vos informations de profil.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom Complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean Dupont" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>Adresse Email</Label>
                    <Input value={user?.email || ""} disabled className="h-11 bg-muted" />
                    <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié.</p>
                  </div>
                </div>
                <Button type="submit" disabled={form.formState.isSubmitting} className="shadow-sm">
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer les modifications
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Billing / Plans */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Facturation
            </CardTitle>
            <CardDescription>Statut de votre abonnement.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Abonnement :</span>
              {profile?.is_subscriber ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">Actif</Badge>
              ) : (
                <Badge variant="secondary">Inactif</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Zone de Danger
            </CardTitle>
            <CardDescription>Actions irréversibles sur votre compte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 border border-destructive/20 rounded-lg bg-background">
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-foreground">Supprimer le compte</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Conformément au <strong>RGPD</strong>, vous disposez d'un droit à l'effacement. La suppression de votre compte entraînera la suppression définitive de toutes vos données personnelles de nos serveurs.
                </p>
                <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 border border-border/40 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Cette action est immédiate et irréversible.</span>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="shrink-0 shadow-lg shadow-destructive/20">
                    Supprimer mon compte
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Suppression définitive
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4 pt-2">
                      <p className="font-medium text-foreground">
                        Êtes-vous sûr de vouloir supprimer votre compte ?
                      </p>
                      {profile?.is_subscriber ? (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                          Vous avez un abonnement actif. Veuillez d'abord le résilier depuis la section "Facturation" avant de pouvoir supprimer votre compte.
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Toutes vos données seront supprimées conformément au RGPD. Cette action ne peut pas être annulée.
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="confirm-delete" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Saisissez "SUPPRIMER" pour confirmer
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
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Annuler</AlertDialogCancel>
                    {!profile?.is_subscriber && (
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "SUPPRIMER" || isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20"
                      >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmer la suppression
                      </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
