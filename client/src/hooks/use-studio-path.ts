import { createPathForUser } from "@/lib/v2-experience";
import { useV2Access } from "@/hooks/use-v2-access";

/** Studio home route — `/create` when V2 enabled, `/generate` otherwise. */
export function useStudioPath(): string {
  const { v2Enabled } = useV2Access();
  return createPathForUser(v2Enabled);
}
