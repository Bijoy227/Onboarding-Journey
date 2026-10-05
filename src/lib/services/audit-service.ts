import { createId } from "@/lib/mock/store";
import type { AppState, AuditEvent } from "@/types";

/**
 * Appends an audit event to a state draft.
 *
 * Called from inside `demoStore.mutate` by the other services, so every
 * meaningful identity and access event lands in the platform activity log.
 * Anything the Platform Admin does inside an organization they don't belong
 * to is support access, and is flagged as such.
 */
export function recordEvent(
  draft: AppState,
  event: Omit<AuditEvent, "id" | "createdAt">,
): AuditEvent {
  const actor = draft.users.find((user) => user.id === event.actorUserId);
  const isSupportAccess =
    event.isSupportAccess ??
    Boolean(
      actor?.isPlatformAdmin &&
        event.organizationId &&
        !draft.memberships.some(
          (membership) =>
            membership.userId === actor.id &&
            membership.organizationId === event.organizationId &&
            membership.status === "active",
        ) &&
        // Platform actions (connections, modules, organizations) are the
        // Platform Admin's own job, not support.
        !/^(organization|connection|modules|support)\./.test(event.action),
    );

  const auditEvent: AuditEvent = {
    ...event,
    isSupportAccess: isSupportAccess || undefined,
    id: createId("audit"),
    createdAt: new Date().toISOString(),
  };
  draft.auditEvents = [auditEvent, ...draft.auditEvents];
  return auditEvent;
}

/** Convenience lookup used when composing audit sentences. */
export function nameOf(draft: AppState, userId: string | undefined): string {
  if (!userId) return "Someone";
  return draft.users.find((user) => user.id === userId)?.name ?? "Someone";
}

/** Convenience lookup used when composing audit sentences. */
export function orgNameOf(
  draft: AppState,
  organizationId: string | undefined,
): string {
  if (!organizationId) return "an organization";
  return (
    draft.organizations.find((org) => org.id === organizationId)?.name ??
    "an organization"
  );
}
