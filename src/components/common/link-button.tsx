import Link from "next/link";

import { Button } from "@/components/ui/button";

type LinkButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "render" | "nativeButton"
> & {
  href: string;
};

/**
 * A button that navigates.
 *
 * The underlying Button assumes it renders a real `<button>`; rendering an
 * anchor instead needs `nativeButton={false}`. Keeping that detail here means
 * call sites just pass an href.
 */
export function LinkButton({ href, ...props }: LinkButtonProps) {
  return (
    <Button {...props} nativeButton={false} render={<Link href={href} />} />
  );
}
