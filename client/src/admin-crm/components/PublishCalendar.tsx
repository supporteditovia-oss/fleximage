import { useMemo, useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addDays,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";
import { fr } from "date-fns/locale";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import type { CrmPost } from "@/admin-crm/types";
import { platformLabel } from "@/admin-crm/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "month" | "week" | "day";

export function PublishCalendar({
  posts,
  cursor,
  onCursorChange,
  view,
  onViewChange,
  onSlotClick,
  onPostMove,
  onPostClick,
  onDeletePost,
}: {
  posts: CrmPost[];
  cursor: Date;
  onCursorChange: (d: Date) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onSlotClick: (date: Date) => void;
  onPostMove: (postId: string, newDate: Date) => void;
  onPostClick: (post: CrmPost) => void;
  onDeletePost: (postId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  function postsForDay(day: Date) {
    return posts.filter((p) => isSameDay(parseISO(p.scheduled_at), day));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCursorChange(subMonths(cursor, 1))}
            className="p-2 rounded-lg hover:bg-[var(--lux-glass)]"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="lux-display text-xl min-w-[180px] text-center capitalize">
            {format(cursor, view === "day" ? "d MMMM yyyy" : "MMMM yyyy", {
              locale: fr,
            })}
          </h2>
          <button
            type="button"
            onClick={() => onCursorChange(addMonths(cursor, 1))}
            className="p-2 rounded-lg hover:bg-[var(--lux-glass)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex gap-1 rounded-lg bg-black/30 border border-[var(--lux-glass-border)] p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 rounded-md text-xs capitalize ${
                view === v
                  ? "bg-[var(--lux-glass)] text-[var(--lux-text)]"
                  : "text-[var(--lux-text-muted)]"
              }`}
            >
              {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Jour"}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-1 text-xs text-[var(--lux-text-muted)] px-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const inMonth = isSameMonth(day, cursor);
              const dayPosts = postsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId) return;
                    const p = posts.find((x) => x.id === dragId);
                    if (!p) return;
                    const old = parseISO(p.scheduled_at);
                    const moved = setMinutes(
                      setHours(day, old.getHours()),
                      old.getMinutes(),
                    );
                    onPostMove(dragId, moved);
                    setDragId(null);
                  }}
                  onClick={() => onSlotClick(day)}
                  className={`min-h-[100px] rounded-xl border p-1.5 cursor-pointer transition-colors ${
                    inMonth
                      ? "border-[var(--lux-border)] hover:border-[var(--lux-gold)]/40"
                      : "border-transparent opacity-40"
                  }`}
                >
                  <span className="text-[10px] text-[var(--lux-text-muted)]">
                    {format(day, "d")}
                  </span>
                  <div className="space-y-1 mt-1">
                    {dayPosts.map((post) => (
                      <PostChip
                        key={post.id}
                        post={post}
                        draggable
                        onDragStart={() => setDragId(post.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPostClick(post);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <GlassCard
              key={day.toISOString()}
              variant="flat"
              className="min-h-[200px] cursor-pointer"
              onClick={() => onSlotClick(day)}
            >
              <p className="text-xs text-[var(--lux-text-muted)] mb-2">
                {format(day, "EEE d", { locale: fr })}
              </p>
              {postsForDay(day).map((post) => (
                <PostChip
                  key={post.id}
                  post={post}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPostClick(post);
                  }}
                />
              ))}
            </GlassCard>
          ))}
        </div>
      )}

      {view === "day" && (
        <GlassCard variant="flat" className="min-h-[320px]">
          <div className="space-y-2">
            {postsForDay(cursor).length === 0 ? (
              <p
                className="text-sm text-[var(--lux-text-muted)] py-8 text-center cursor-pointer"
                onClick={() => onSlotClick(cursor)}
              >
                Case vide — clique pour créer une publication
              </p>
            ) : (
              postsForDay(cursor).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--lux-border)]"
                >
                  <div onClick={() => onPostClick(post)} className="cursor-pointer flex-1">
                    <PostChip post={post} />
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[var(--lux-danger)] ml-2"
                    onClick={() => onDeletePost(post.id)}
                  >
                    Supprimer
                  </button>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function PostChip({
  post,
  draggable,
  onDragStart,
  onClick,
}: {
  post: CrmPost;
  draggable?: boolean;
  onDragStart?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="text-[10px] px-2 py-1 rounded-md bg-[var(--lux-blue-soft)] text-[var(--lux-blue)] truncate cursor-grab active:cursor-grabbing"
    >
      {format(parseISO(post.scheduled_at), "HH:mm")}{" "}
      {post.account?.username || "?"} · {platformLabel(post.platform)}
    </div>
  );
}
