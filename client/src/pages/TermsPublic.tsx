import { PublicLegalPageLayout } from "@/components/marketing/PublicLegalPageLayout";
import { TERMS_OF_SERVICE } from "@/lib/legal-public-pages";

export default function TermsPublic() {
  return (
    <PublicLegalPageLayout document={TERMS_OF_SERVICE} canonicalPath="/terms" />
  );
}
