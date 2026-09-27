import { PublicLegalPageLayout } from "@/components/marketing/PublicLegalPageLayout";
import { PRIVACY_POLICY } from "@/lib/legal-public-pages";

export default function PrivacyPublic() {
  return (
    <PublicLegalPageLayout document={PRIVACY_POLICY} canonicalPath="/privacy" />
  );
}
