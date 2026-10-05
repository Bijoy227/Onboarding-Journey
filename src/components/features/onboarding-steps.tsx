import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Self-service onboarding: create an account, verify the email, then join or
 * create an organization and verify its domain. There are no plan or payment
 * steps; modules are enabled per organization by the Platform Admin.
 */
export const ONBOARDING_STEPS = [
  { id: "account", label: "Account" },
  { id: "verify-email", label: "Verify email" },
  { id: "organization", label: "Organization" },
  { id: "domain", label: "Domain" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/**
 * Where the person is in the onboarding journey.
 *
 * `steps` narrows the list for shorter journeys.
 */
export function OnboardingSteps({
  current,
  steps,
  className,
}: {
  current: OnboardingStepId;
  steps?: OnboardingStepId[];
  className?: string;
}) {
  const visible = ONBOARDING_STEPS.filter(
    (step) => !steps || steps.includes(step.id),
  );
  const currentIndex = visible.findIndex((step) => step.id === current);

  return (
    <nav
      aria-label="Onboarding progress"
      className={cn("mx-auto w-full max-w-2xl", className)}
    >
      <p className="mb-2 text-center text-xs text-muted-foreground sm:hidden">
        Step {currentIndex + 1} of {visible.length} ·{" "}
        <span className="font-medium text-foreground">
          {visible[currentIndex]?.label}
        </span>
      </p>
      {/* Labels hang below the circles, so the connectors keep their width
          even inside a narrow card. The padding leaves room for them. */}
      <ol className="flex items-center sm:px-8 sm:pb-6">
        {visible.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step.id}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center",
                index < visible.length - 1 && "flex-1",
              )}
            >
              <div className="relative flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary text-primary ring-3 ring-primary/15",
                    !done && !active && "bg-background text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "absolute top-full mt-1.5 hidden whitespace-nowrap text-xs sm:block",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < visible.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-2 h-px flex-1",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
