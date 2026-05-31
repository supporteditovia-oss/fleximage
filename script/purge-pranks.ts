import { createClient } from "@supabase/supabase-js";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

type CliOptions = {
  all: boolean;
  before?: string;
  userId?: string;
  freeOnly: boolean;
  execute: boolean;
};

type PrankRow = {
  id: string;
  user_id: string;
  created_at: string;
  input_assets: string[] | null;
  output_assets: string[] | null;
  watermarked_assets: string[] | null;
};

type EnvConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;
};

type ProfileRow = {
  id: string;
  role: "user" | "admin";
  is_subscriber: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type SubscriptionRow = {
  user_id: string;
};

const HELP_TEXT = [
  "Usage:",
  "  bun run script/purge-pranks.ts --all [--execute]",
  "  bun run script/purge-pranks.ts --all --free-only [--execute]",
  "  bun run script/purge-pranks.ts --before YYYY-MM-DD [--user USER_UUID] [--execute]",
  "  bun run script/purge-pranks.ts --user USER_UUID [--execute]",
  "",
  "Flags:",
  "  --all             Target all prank rows and all pranks/ + inputs/ objects in R2",
  "  --before DATE     Target pranks created before DATE (YYYY-MM-DD)",
  "  --user UUID       Target pranks of one user",
  "  --free-only       Keep only never-paid users (safe for paid users)",
  "  --execute         Perform real deletion (without this flag: dry-run)",
  "  --help            Show this help",
].join("\n");

function parseArgValue(args: string[], flag: string): string | undefined {
  const withEquals = args.find((a) => a.startsWith(`${flag}=`));
  if (withEquals) {
    return withEquals.slice(flag.length + 1).trim();
  }

  const index = args.indexOf(flag);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1]?.trim();
  }

  return undefined;
}

function parseOptions(args: string[]): CliOptions {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const all = args.includes("--all");
  const before = parseArgValue(args, "--before");
  const userId = parseArgValue(args, "--user");
  const freeOnly = args.includes("--free-only");
  const execute = args.includes("--execute");

  if (!all && !before && !userId) {
    throw new Error(
      "You must provide at least one targeting flag: --all, --before, or --user",
    );
  }

  if (all && (before || userId)) {
    throw new Error("--all cannot be combined with --before or --user");
  }

  if (before && Number.isNaN(Date.parse(before))) {
    throw new Error("Invalid --before date. Expected YYYY-MM-DD");
  }

  return {
    all,
    before,
    userId,
    freeOnly,
    execute,
  };
}

function getEnvConfig(): EnvConfig {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
    throw new Error(
      "Missing R2 env vars. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME",
    );
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    r2AccountId,
    r2AccessKeyId,
    r2SecretAccessKey,
    r2BucketName,
  };
}

function parseJsonUrls(raw: string[] | string | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function extractR2KeyFromUrl(url: string): string | null {
  const normalized = url.trim();
  if (!normalized.startsWith("http")) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");

    if (pathname.startsWith("pranks/") || pathname.startsWith("inputs/")) {
      return pathname;
    }

    return null;
  } catch {
    const markerPranks = normalized.indexOf("/pranks/");
    if (markerPranks >= 0) {
      return normalized.slice(markerPranks + 1);
    }

    const markerInputs = normalized.indexOf("/inputs/");
    if (markerInputs >= 0) {
      return normalized.slice(markerInputs + 1);
    }

    return null;
  }
}

function chunk<T>(values: T[], size: number): T[][] {
  if (size <= 0) return [values];

  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

async function listKeysByPrefix(
  s3Client: S3Client,
  bucketName: string,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  while (true) {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    if (!response.IsTruncated) {
      break;
    }

    continuationToken = response.NextContinuationToken;
  }

  return keys;
}

async function fetchTargetPranks(
  supabase: ReturnType<typeof createClient>,
  options: CliOptions,
): Promise<PrankRow[]> {
  const pageSize = 1000;
  let offset = 0;
  const rows: PrankRow[] = [];

  while (true) {
    let query = supabase
      .from("generations")
      .select(
        "id, user_id, created_at, input_assets, output_assets, watermarked_assets",
      )
      .order("created_at", { ascending: true });

    if (!options.all) {
      if (options.before) {
        const beforeDate = new Date(options.before).toISOString();
        query = query.lt("created_at", beforeDate);
      }

      if (options.userId) {
        query = query.eq("user_id", options.userId);
      }
    }

    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...(data as PrankRow[]));

    if (data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

async function deleteR2Keys(
  s3Client: S3Client,
  bucketName: string,
  keys: string[],
): Promise<number> {
  let deleted = 0;

  for (const keyBatch of chunk(keys, 1000)) {
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: keyBatch.map((key) => ({ Key: key })),
          Quiet: true,
        },
      }),
    );

    deleted += keyBatch.length;
  }

  return deleted;
}

async function deletePrankRows(
  supabase: ReturnType<typeof createClient>,
  prankIds: string[],
): Promise<number> {
  let deleted = 0;

  for (const idBatch of chunk(prankIds, 500)) {
    const { error } = await supabase
      .from("generations")
      .delete()
      .in("id", idBatch);

    if (error) {
      throw error;
    }

    deleted += idBatch.length;
  }

  return deleted;
}

async function resolveNeverPaidUserIds(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Set<string>> {
  const uniqueUserIds = Array.from(new Set(userIds));
  const profilesById = new Map<string, ProfileRow>();
  const subscriptionUserIds = new Set<string>();

  for (const userBatch of chunk(uniqueUserIds, 500)) {
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role, is_subscriber, stripe_customer_id, stripe_subscription_id")
      .in("id", userBatch);

    if (profileErr) {
      throw profileErr;
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profilesById.set(profile.id, profile);
    }

    const { data: subscriptions, error: subErr } = await supabase
      .from("subscriptions")
      .select("user_id")
      .in("user_id", userBatch);

    if (subErr) {
      throw subErr;
    }

    for (const row of (subscriptions ?? []) as SubscriptionRow[]) {
      if (row.user_id) {
        subscriptionUserIds.add(row.user_id);
      }
    }
  }

  const neverPaidUserIds = new Set<string>();

  for (const userId of uniqueUserIds) {
    const profile = profilesById.get(userId);
    if (!profile) {
      continue;
    }

    const hasStripeIds =
      Boolean(profile.stripe_customer_id) ||
      Boolean(profile.stripe_subscription_id);
    const hadSubscriptionRecord = subscriptionUserIds.has(userId);
    const isOrWasPaying = hasStripeIds || hadSubscriptionRecord;
    const isAdmin = profile.role === "admin";
    const isSubscriber = profile.is_subscriber === true;

    if (!isOrWasPaying && !isAdmin && !isSubscriber) {
      neverPaidUserIds.add(userId);
    }
  }

  return neverPaidUserIds;
}

async function run(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const env = getEnvConfig();

  const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });

  const modeLabel = options.execute ? "EXECUTE" : "DRY-RUN";
  console.log(`[${modeLabel}] Fetching target prank rows...`);
  const initialTargetPranks = await fetchTargetPranks(supabase, options);
  let targetPranks = initialTargetPranks;

  if (options.freeOnly) {
    const candidateUserIds = targetPranks.map((row) => row.user_id);
    console.log(
      `[${modeLabel}] Applying free-only filter on ${new Set(candidateUserIds).size} users...`,
    );

    const neverPaidUserIds = await resolveNeverPaidUserIds(
      supabase,
      candidateUserIds,
    );

    targetPranks = targetPranks.filter((row) =>
      neverPaidUserIds.has(row.user_id),
    );

    console.log(
      `[${modeLabel}] Free-only kept ${targetPranks.length}/${initialTargetPranks.length} prank rows`,
    );
  }

  const prankIds = targetPranks.map((row) => row.id);
  const prefixSet = new Set<string>();
  const keySet = new Set<string>();

  if (options.all && !options.freeOnly) {
    console.log(`[${modeLabel}] Listing keys for prefixes pranks/ and inputs/...`);
    const [allPrankKeys, allInputKeys] = await Promise.all([
      listKeysByPrefix(s3Client, env.r2BucketName, "pranks/"),
      listKeysByPrefix(s3Client, env.r2BucketName, "inputs/"),
    ]);

    for (const key of allPrankKeys) {
      keySet.add(key);
    }
    for (const key of allInputKeys) {
      keySet.add(key);
    }
  } else {
    for (const prank of targetPranks) {
      prefixSet.add(`pranks/${prank.id}/`);

      for (const url of parseJsonUrls(prank.input_assets)) {
        const key = extractR2KeyFromUrl(url);
        if (key) keySet.add(key);
      }

      for (const url of parseJsonUrls(prank.output_assets)) {
        const key = extractR2KeyFromUrl(url);
        if (key) keySet.add(key);
      }

      for (const url of parseJsonUrls(prank.watermarked_assets)) {
        const key = extractR2KeyFromUrl(url);
        if (key) keySet.add(key);
      }
    }

    console.log(
      `[${modeLabel}] Listing keys in ${prefixSet.size} prank prefixes...`,
    );

    for (const prefix of prefixSet) {
      const keys = await listKeysByPrefix(s3Client, env.r2BucketName, prefix);
      for (const key of keys) {
        keySet.add(key);
      }
    }
  }

  const keys = Array.from(keySet);

  console.log("Summary:");
  console.log(`  Target prank rows: ${prankIds.length}`);
  console.log(`  Target R2 keys: ${keys.length}`);
  if (!options.execute) {
    console.log(
      "  Mode: dry-run. Re-run with --execute to perform real deletion.",
    );
    return;
  }

  console.log("Deleting R2 objects...");
  const deletedKeys = await deleteR2Keys(s3Client, env.r2BucketName, keys);

  console.log("Deleting generations rows...");
  const deletedRows = await deletePrankRows(supabase, prankIds);

  console.log("Done.");
  console.log(`  Deleted R2 keys: ${deletedKeys}`);
  console.log(`  Deleted prank rows: ${deletedRows}`);
}

run().catch((error) => {
  console.error("Purge failed:", error);
  process.exit(1);
});
