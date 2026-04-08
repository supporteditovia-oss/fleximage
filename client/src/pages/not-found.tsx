import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <FileQuestion className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-display font-bold">404</CardTitle>
          <h2 className="text-xl font-semibold">{t("notFound:title")}</h2>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            {t("notFound:description")}
          </p>
          <Link href="/">
            <Button className="w-full rounded-full">
              {t("notFound:backHome")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
