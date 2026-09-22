"use client";

import { History } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { UserAvatar } from "@/components/common/avatars";
import { relativeTime } from "@/lib/format";
import { useAppState } from "@/lib/demo/demo-provider";
import type { AuditEvent } from "@/types";

/**
 * Lightweight activity log.
 *
 * Not exhaustive by design: it exists to show that identity and security events
 * are the kind of thing this model can track.
 */
export function ActivityFeed({
  events,
  emptyLabel = "No activity yet",
}: {
  events: AuditEvent[];
  emptyLabel?: string;
}) {
  const state = useAppState();

  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={emptyLabel}
        description="Actions taken in the demo appear here."
      />
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const actor = state.users.find((user) => user.id === event.actorUserId);
        return (
          <li key={event.id} className="flex gap-3">
            <UserAvatar
              name={actor?.name ?? "System"}
              className="size-7 text-[10px]"
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm leading-snug">{event.description}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {event.action} · {relativeTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
