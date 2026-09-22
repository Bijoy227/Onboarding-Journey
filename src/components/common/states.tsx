import { Lock } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * The unauthorized state.
 *
 * Permission checks do more than hide buttons here: reaching a page you do not
 * have the permission for renders this, which is what makes the authorization
 * model visible during the demo.
 */
export function UnauthorizedState({
  permission,
  description,
}: {
  permission?: string;
  description?: string;
}) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Lock className="size-5" />
        </span>
        <div className="space-y-1.5">
          <p className="font-medium">
            You don&apos;t have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            {description ??
              "Your role in this organization does not grant this capability. Switch to an Organization Admin account to see it."}
          </p>
          {permission ? (
            <p className="pt-1 font-mono text-xs text-muted-foreground">
              Required permission: {permission}
            </p>
          ) : null}
        </div>
        <LinkButton variant="outline" size="sm" href="/dashboard">
          Back to dashboard
        </LinkButton>
      </CardContent>
    </Card>
  );
}

export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
