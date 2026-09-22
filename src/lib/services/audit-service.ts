import { createId } from "@/lib/mock/store";
import type { AppState, AuditEvent } from "@/types";

/**
 * Appends an audit event to a state draft.
 *
 * Called from inside `demoStore.mutate` by the other services, so every
 * meaningful identity event lands in the platform activity log.
 */
export function recordEvent(
  draft: AppState,
  event: Omit<AuditEvent, "id" | "createdAt">,
): AuditEvent {
  const auditEvent: AuditEvent = {
    ...event,
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
