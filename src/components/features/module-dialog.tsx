"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FieldSelect } from "@/components/common/field-select";
import { ModuleAvatar } from "@/components/features/module-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { ImageFileError, imageFileToThumbnail } from "@/lib/image";
import { getCatalog } from "@/lib/permissions/modules";
import {
  ModuleError,
  createModule,
  slugify,
  updateModule,
} from "@/lib/services/module-service";
import { cn } from "@/lib/utils";
import type { OrganizationType, PlatformModule } from "@/types";

export type ModuleDialogTarget =
  | { kind: "create"; audience: OrganizationType; parentId?: string }
  | { kind: "edit"; entry: PlatformModule };

/** Create or edit a catalog module or sub-module. Platform Admin only. */
export function ModuleDialog({
  target,
  onOpenChange,
}: {
  target: ModuleDialogTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* Remounted per target so the form always starts from it. */}
        {target ? (
          <ModuleForm
            key={
              target.kind === "edit"
                ? target.entry.id
                : `new-${target.parentId ?? "root"}`
            }
            target={target}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ModuleForm({
  target,
  onDone,
}: {
  target: ModuleDialogTarget;
  onDone: () => void;
}) {
  const state = useAppState();
  const { user } = useSession();

  const existing = target.kind === "edit" ? target.entry : undefined;
  const audience =
    existing?.audience ??
    (target.kind === "create" ? target.audience : "brand");

  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const [parentId, setParentId] = useState<string>(
    existing?.parentId ??
      (target.kind === "create" ? (target.parentId ?? "") : ""),
  );
  const [group, setGroup] = useState(existing?.group ?? "");
  const [route, setRoute] = useState(existing?.route ?? "");
  const [price, setPrice] = useState(String(existing?.monthlyPrice ?? ""));
  const [description, setDescription] = useState(existing?.description ?? "");
  const [features, setFeatures] = useState(
    (existing?.features ?? []).join("\n"),
  );
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parents = getCatalog(state, audience).filter(
    (entry) => !entry.parentId,
  );
  const parent = parents.find((entry) => entry.id === parentId);
  const isSub = Boolean(parentId);

  async function submit() {
    if (!user) return;
    setError(null);
    setPending(true);

    const monthlyPrice = Number(price);
    const featureList = features.split("\n");

    try {
      if (existing) {
        await updateModule(
          existing.id,
          {
            name,
            slug,
            description,
            group,
            route,
            features: featureList,
            monthlyPrice: price.trim() === "" ? Number.NaN : monthlyPrice,
            imageUrl: imageUrl || null,
          },
          user.id,
        );
        toast.success("Module updated", { description: name });
      } else {
        await createModule(
          {
            audience,
            name,
            slug: slug || slugify(name),
            description,
            parentId: parentId || undefined,
            group,
            route,
            features: featureList,
            monthlyPrice: price.trim() === "" ? Number.NaN : monthlyPrice,
            imageUrl: imageUrl || undefined,
          },
          user.id,
        );
        toast.success(isSub ? "Sub-module added" : "Module added", {
          description: `${name} is now in the ${audience === "brand" ? "Brand" : "Brokerage"} catalog. Add it to a plan to make it available.`,
        });
      }
      onDone();
    } catch (caught) {
      setError(
        caught instanceof ModuleError
          ? caught.message
          : "Could not save the module.",
      );
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {existing
            ? `Edit ${existing.parentId ? "sub-module" : "module"}`
            : isSub
              ? "New sub-module"
              : "New module"}
        </DialogTitle>
        <DialogDescription>
          {audience === "brand" ? "Brand" : "Brokerage"} catalog
          {parent ? ` · inside ${parent.name}` : ""}
        </DialogDescription>
      </DialogHeader>

      {!existing ? (
        <div className="space-y-2">
          <Label htmlFor="module-parent">Belongs to</Label>
          <FieldSelect
            id="module-parent"
            className="w-full"
            value={parentId || "root"}
            onChange={(value) => setParentId(value === "root" ? "" : value)}
            options={[
              { value: "root", label: "Nothing: a top-level module" },
              ...parents.map((entry) => ({
                value: entry.id,
                label: `Sub-module of ${entry.name}`,
              })),
            ]}
          />
        </div>
      ) : null}

      <ModuleImageField
        value={imageUrl}
        onChange={setImageUrl}
        fallback={{
          slug: existing?.slug ?? slugify(name),
          parentId: parentId || undefined,
        }}
        disabled={pending}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="module-name">Name</Label>
          <Input
            id="module-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            placeholder="Trade Spend Sandbox"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-slug">Slug</Label>
          <Input
            id="module-slug"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugTouched(true);
            }}
            placeholder="trade-spend-sandbox"
            className="font-mono"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="module-price">Price per month (USD)</Label>
          <Input
            id="module-price"
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="49"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-group">
            {isSub ? "Section" : "Menu group"}
          </Label>
          <Input
            id="module-group"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            placeholder={isSub ? "Enhanced Reporting" : "Management"}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="module-description">Description</Label>
        <Textarea
          id="module-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="module-route">Route in caboodle.web</Label>
        <Input
          id="module-route"
          value={route}
          onChange={(event) => setRoute(event.target.value)}
          placeholder={audience === "brand" ? "/{brandID}/..." : "/..."}
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="module-features">Screens and reports inside</Label>
        <Textarea
          id="module-features"
          value={features}
          onChange={(event) => setFeatures(event.target.value)}
          rows={3}
          placeholder={"One per line, e.g.\nSales by Product\nVelocity Report"}
        />
        <p className="text-xs text-muted-foreground">
          Not gated on their own. Anything that needs its own on/off switch
          should be a sub-module instead.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {existing ? "Save changes" : "Add to catalog"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Upload, replace or remove the module's image. The upload is shrunk to a
 * thumbnail in the browser before it is kept (see `imageFileToThumbnail`).
 */
function ModuleImageField({
  value,
  onChange,
  fallback,
  disabled,
}: {
  value: string;
  onChange: (imageUrl: string) => void;
  /** What the tile shows with no image: the module's default icon. */
  fallback: Pick<PlatformModule, "slug" | "parentId">;
  disabled?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      onChange(await imageFileToThumbnail(file));
    } catch (caught) {
      setError(
        caught instanceof ImageFileError
          ? caught.message
          : "That image couldn't be used. Try another file.",
      );
    } finally {
      setProcessing(false);
      // Lets the same file be chosen again after removing it.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const busy = disabled || processing;

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void accept(event.dataTransfer.files[0]);
          }}
          aria-label={value ? "Replace module image" : "Upload module image"}
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed p-1 transition-colors hover:bg-accent disabled:opacity-60",
            dragging && "border-primary bg-accent",
          )}
        >
          {processing ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <ModuleAvatar
              entry={{ ...fallback, imageUrl: value || undefined }}
              className="size-full rounded-lg"
              iconClassName="size-6"
            />
          )}
        </button>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <ImageUp className="size-3.5" />
              {value ? "Replace image" : "Upload image"}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  onChange("");
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP, GIF or SVG, up to 5 MB. Shown instead of the default
            icon. You can also drop a file on the tile.
          </p>
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void accept(event.target.files?.[0])}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
