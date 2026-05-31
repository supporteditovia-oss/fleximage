import { useTranslation } from "react-i18next";
import { Briefcase, Heart, TrendingUp, Users } from "lucide-react";

function UseCaseCard({
  icon: Icon,
  text,
}: {
  icon: typeof TrendingUp;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-white/85 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur md:px-5 md:py-5">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.04]">
        <Icon className="h-4 w-4 text-foreground/70" />
      </div>
      <p className="text-left text-sm font-medium leading-snug text-foreground md:text-base">
        {text}
      </p>
    </div>
  );
}

function UseCaseBlock({
  title,
  items,
}: {
  title: string;
  items: { icon: typeof TrendingUp; text: string }[];
}) {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <h3 className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-sm">
        {title}
      </h3>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <UseCaseCard key={item.text} icon={item.icon} text={item.text} />
        ))}
      </div>
    </div>
  );
}

export default function UseCasesSection() {
  const { t } = useTranslation();

  const successItems = [
    { icon: TrendingUp, text: t("marquee.successItem1") },
    { icon: Briefcase, text: t("marquee.successItem2") },
  ];

  const socialItems = [
    { icon: Users, text: t("marquee.socialItem1") },
    { icon: Heart, text: t("marquee.socialItem2") },
  ];

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-4 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 md:gap-10">
        <UseCaseBlock title={t("marquee.successTitle")} items={successItems} />
        <UseCaseBlock title={t("marquee.socialTitle")} items={socialItems} />
      </div>
    </section>
  );
}
