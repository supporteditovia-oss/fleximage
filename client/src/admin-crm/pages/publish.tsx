import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth, formatISO } from "date-fns";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { PublishCalendar } from "@/admin-crm/components/PublishCalendar";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import {
  useCrmPosts,
  useCrmAccounts,
  useCrmMedia,
  useCrmMusic,
  useCrmInvalidate,
} from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import type { CrmPost } from "@/admin-crm/types";
import { COUNTRY_META } from "@/admin-crm/lib/constants";
import { Loader2 } from "lucide-react";

export default function PublishPage() {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; date?: Date; post?: CrmPost } | null>(
    null,
  );
  const invalidate = useCrmInvalidate();

  const rangeFrom = formatISO(startOfMonth(cursor));
  const rangeTo = formatISO(endOfMonth(cursor));
  const { data: posts, isLoading, error } = useCrmPosts(rangeFrom, rangeTo);
  const { data: accounts } = useCrmAccounts();
  const { data: media } = useCrmMedia();
  const { data: music } = useCrmMusic();

  const accountById = useMemo(
    () => new Map((accounts || []).map((a) => [a.id, a])),
    [accounts],
  );

  async function handleMove(postId: string, newDate: Date) {
    await crmApi.posts.update(postId, { scheduled_at: newDate.toISOString() });
    invalidate();
  }

  async function handleDelete(id: string) {
    await crmApi.posts.remove(id);
    invalidate();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <CrmEmptyState
        title="Agenda indisponible"
        hint={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="lux-display text-2xl">Publish</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">
          Calendrier éditorial — glisser-déposer, création et édition
        </p>
      </div>

      <PublishCalendar
        posts={posts || []}
        cursor={cursor}
        onCursorChange={setCursor}
        view={view}
        onViewChange={setView}
        onSlotClick={(date) => setModal({ mode: "create", date })}
        onPostMove={handleMove}
        onPostClick={(post) => setModal({ mode: "edit", post })}
        onDeletePost={handleDelete}
      />

      {modal ? (
        <PostEditorModal
          mode={modal.mode}
          initialDate={modal.date}
          post={modal.post}
          accounts={accounts || []}
          media={media || []}
          music={music || []}
          accountById={accountById}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

function PostEditorModal({
  mode,
  initialDate,
  post,
  accounts,
  media,
  music,
  accountById,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initialDate?: Date;
  post?: CrmPost;
  accounts: import("@/admin-crm/types").CrmAccount[];
  media: import("@/admin-crm/types").CrmMedia[];
  music: import("@/admin-crm/types").CrmMusic[];
  accountById: Map<string, import("@/admin-crm/types").CrmAccount>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [accountId, setAccountId] = useState(post?.account_id || accounts[0]?.id || "");
  const [scheduledAt, setScheduledAt] = useState(
    post?.scheduled_at?.slice(0, 16) ||
      (initialDate
        ? new Date(
            initialDate.getFullYear(),
            initialDate.getMonth(),
            initialDate.getDate(),
            18,
            30,
          )
            .toISOString()
            .slice(0, 16)
        : ""),
  );
  const [mediaId, setMediaId] = useState(post?.media_id || "");
  const [musicId, setMusicId] = useState(post?.music_id || "");
  const [caption, setCaption] = useState(post?.caption || "");
  const [hashtags, setHashtags] = useState((post?.hashtags || []).join(", "));
  const [saving, setSaving] = useState(false);

  const acc = accountById.get(accountId);
  const countryMeta = acc ? COUNTRY_META[acc.country_code] : null;

  async function save() {
    setSaving(true);
    try {
      const payload = {
        account_id: accountId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        media_id: mediaId || null,
        music_id: musicId || null,
        caption,
        hashtags: hashtags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: "scheduled",
      };
      if (mode === "edit" && post) {
        await crmApi.posts.update(post.id, payload);
      } else {
        await crmApi.posts.create(payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <GlassCard className="w-full max-w-lg space-y-3 lux-glow-gold my-8">
        <h2 className="lux-display text-xl">
          {mode === "create" ? "Nouvelle publication" : "Modifier"}
        </h2>

        <Field label="Compte">
          <select
            className="crm-input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.username} ({a.platform})
              </option>
            ))}
          </select>
        </Field>

        {countryMeta ? (
          <p className="text-xs text-[var(--lux-text-faint)]">
            Auto : {countryMeta.label} · langue {acc?.language_code} · fuseau{" "}
            {acc?.timezone} · heure optimale suggérée 18:30 locale
          </p>
        ) : null}

        <Field label="Date & heure">
          <input
            type="datetime-local"
            className="crm-input"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </Field>

        <Field label="Vidéo (bibliothèque)">
          <select className="crm-input" value={mediaId} onChange={(e) => setMediaId(e.target.value)}>
            <option value="">—</option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Musique">
          <select className="crm-input" value={musicId} onChange={(e) => setMusicId(e.target.value)}>
            <option value="">—</option>
            {music.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            className="crm-input min-h-[80px]"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </Field>

        <Field label="Hashtags (virgules)">
          <input className="crm-input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="text-sm text-[var(--lux-text-muted)] px-3">
            Annuler
          </button>
          <button
            type="button"
            disabled={!accountId || !scheduledAt || saving}
            onClick={() => void save()}
            className="px-4 py-2 rounded-lg bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] text-sm disabled:opacity-40"
          >
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-[var(--lux-text-muted)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
