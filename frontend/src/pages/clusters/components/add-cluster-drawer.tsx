import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertBanner, BlockedAction, FieldShell, reasonList } from "@/components/branded";
import { ClusterSchema } from "../hooks/use-clusters";
import type { ClusterData } from "../hooks/use-clusters";
import { extractErrorMessage } from "@/lib/utils";

interface AddClusterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCluster: (cluster: ClusterData) => void;
  isLoading?: boolean;
  error?: string | null;
}

/** Local form state, so the registry can be an object the payload is built from. */
type ClusterFormState = Omit<ClusterData, "cluster_image_registry"> & {
  cluster_image_registry?: {
    name: string;
    spec?: {
      backend_storage_size?: string;
    };
  };
};

const DEFAULT_REGISTRY = {
  name: "default-registry",
  spec: { backend_storage_size: "20Gi" },
};

const empty: ClusterFormState = {
  name: "",
  cluster_url: "",
  cluster_ca_data: "",
  cluster_sa_token: "",
  cluster_image_registry: DEFAULT_REGISTRY,
};

/**
 * **A drawer, one phase.** §13's table names `cluster` under *"None → drawer,
 * one phase"*, and this shipped as a `Dialog` at `form` — one of the two the
 * section still listed as exceptions *"until they convert"*. This is the
 * conversion. A cluster is an object, and *"a dialog is never an add"*.
 *
 * **It had been telling us for a while.** The `DialogContent` carried
 * `max-h-[80vh] overflow-y-auto`: a scrolling dialog. §13's dialog is one padded
 * box whose levels are made of **air**, and that only works because its body
 * does not scroll. A body that scrolls needs bands with **lines** to pass under,
 * which is the drawer.
 *
 * ### Nothing on this form shares a subject
 *
 * Asked properly rather than counted. `Name` identifies the object; the API
 * server URL is *where it is*; the CA certificate is what verifies **the server
 * to us** and the service account token is what authenticates **us to it** —
 * adjacent, not one answer in two boxes, which is the `Username ǀ Password`
 * test. And both are base64 blobs: halved, they would be 212px of box for a line
 * that has no short form.
 *
 * So every field fills, and that is the **chosen** answer rather than the
 * default one. `Backend storage size` fills too — §8's *"a short value does not
 * earn a short box"*.
 */
export default function AddClusterDrawer({
  open,
  onOpenChange,
  onAddCluster,
  isLoading = false,
  error = null,
}: AddClusterDrawerProps) {
  const [formData, setFormData] = useState<ClusterFormState>(empty);
  const [showCAData, setShowCAData] = useState(false);
  const [showSAToken, setShowSAToken] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ClusterData, string>>>({});

  // Reset on open, the shape both exemplars ship: the form the drawer shows is
  // always the one the person opened it for.
  useEffect(() => {
    if (open) {
      setFormData(empty);
      setErrors({});
      setShowCAData(false);
      setShowSAToken(false);
    }
  }, [open]);

  const validateForm = (): boolean => {
    const result = ClusterSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ClusterData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof ClusterData;
        fieldErrors[field] = extractErrorMessage(err, err.message);
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ClusterData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * EVERY field still empty, phrased as the thing to DO about it — the shape the
   * secret and object store drawers ship. A form speaks form: you **enter** what
   * you type and **paste** what you paste. All of it at once, rather than one
   * round of press-and-discover per field.
   */
  const missingFields = (): string[] => {
    const missing: string[] = [];
    if (!formData.name.trim()) missing.push("Enter a name");
    if (!formData.cluster_url.trim()) missing.push("Enter the API server URL");
    if (!formData.cluster_ca_data.trim()) missing.push("Paste the CA certificate");
    if (!formData.cluster_sa_token.trim()) missing.push("Paste the service account token");
    if (
      formData.cluster_image_registry &&
      !formData.cluster_image_registry.spec?.backend_storage_size?.trim()
    ) {
      missing.push("Enter a storage size for the image registry");
    }
    return missing;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const { cluster_image_registry, ...rest } = formData;
    onAddCluster({
      ...rest,
      ...(cluster_image_registry
        ? {
          cluster_image_registry: {
            name: cluster_image_registry.name,
            spec: {
              backend_storage_size: cluster_image_registry.spec?.backend_storage_size ?? "",
            },
          },
        }
        : {}),
    } as ClusterData);
  };

  const handleImageRegistryToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      cluster_image_registry: checked ? DEFAULT_REGISTRY : undefined,
    }));
  };

  const handleRegistrySizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      cluster_image_registry: prev.cluster_image_registry
        ? { ...prev.cluster_image_registry, spec: { backend_storage_size: value } }
        : undefined,
    }));
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (isLoading) return;
        onOpenChange(next);
      }}
    >
      <DrawerContent size="form">
        <DrawerHeader
          /* `Add`, not `New`. Stackdome does not make the cluster — it connects
             to one that already exists — and `Add cluster` is the verb the page
             header, the empty state and the toast all already use. The title was
             `Add New Cluster`: Title Case, which §6 does not have, over a word
             that was not true. */
          title="Add cluster"
          /* One line. A second costs the header band 20 more (§13). */
          description="Connect a Kubernetes cluster to your organization."
        />

        <DrawerBody>
          <FieldShell label="Name" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              name="name"
              /* A specimen, and one in the product's own casing — the old
                 `My Production Cluster` was Title Case in a placeholder. */
              placeholder="production-eu"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "border-danger" : ""}
            />
          </FieldShell>

          {/* `API server URL`, which is what the field's own validation error
              has always called it. `Cluster URL` inside a drawer titled
              `Add cluster` spends its first word on the thing already named
              above it, and says nothing about *which* of a cluster's URLs. */}
          <FieldShell
            label="API server URL"
            htmlFor="cluster_url"
            required
            error={errors.cluster_url}
          >
            <Input
              id="cluster_url"
              name="cluster_url"
              placeholder="https://k8s-api.example.com:6443"
              value={formData.cluster_url}
              onChange={handleChange}
              className={errors.cluster_url ? "border-danger font-mono" : "font-mono"}
            />
          </FieldShell>

          <FieldShell
            label="CA certificate"
            htmlFor="cluster_ca_data"
            required
            hint="Base64-encoded."
            error={errors.cluster_ca_data}
          >
            <div className="relative">
              <Input
                id="cluster_ca_data"
                name="cluster_ca_data"
                type={showCAData ? "text" : "password"}
                placeholder="LS0tLS1CRUdJTi..."
                value={formData.cluster_ca_data}
                onChange={handleChange}
                className={errors.cluster_ca_data ? "border-danger pr-10" : "pr-10"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={showCAData ? "Hide CA certificate" : "Show CA certificate"}
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCAData(!showCAData)}
              >
                {showCAData ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
              </Button>
            </div>
          </FieldShell>

          <FieldShell
            label="Service account token"
            htmlFor="cluster_sa_token"
            required
            error={errors.cluster_sa_token}
          >
            <div className="relative">
              <Input
                id="cluster_sa_token"
                name="cluster_sa_token"
                type={showSAToken ? "text" : "password"}
                placeholder="eyJhbGciOiJSUzI1NiIs..."
                value={formData.cluster_sa_token}
                onChange={handleChange}
                className={errors.cluster_sa_token ? "border-danger pr-10" : "pr-10"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={showSAToken ? "Hide service account token" : "Show service account token"}
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSAToken(!showSAToken)}
              >
                {showSAToken ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
              </Button>
            </div>
          </FieldShell>

          {/* **The switch is a `FieldShell inline`, not a copy of one.** It was
              a `Switch` + `Label` + `<p>` hand-rolled into a flex — with the
              `mt-0.5` nudge §8 removed when it settled that a switch centres on
              the **whole statement**, label and hint together, 24 off it. Pinned
              to the label's first line, a one-line row looked centred and this
              two-line one looked top-heavy.

              **And it names the thing, not the act.** `Enable Image Registry`
              wrote the control's own job into its label — the row read as an
              instruction while the switch beside it already said on or off. */}
          <FieldShell
            label="Image registry"
            htmlFor="enable-registry"
            hint="A private registry inside the cluster, for the images your builds produce."
            inline
          >
            <Switch
              id="enable-registry"
              checked={!!formData.cluster_image_registry}
              onCheckedChange={handleImageRegistryToggle}
            />
          </FieldShell>

          {/* Directly under the switch that reveals it, on the body's own 16 —
              not indented to `pl-11`, a bespoke inset that put one field 44px
              off the column every other field on the form sits on. Adjacency is
              what says "this belongs to that" (§8). */}
          {formData.cluster_image_registry && (
            <FieldShell
              label="Backend storage size"
              htmlFor="registry-size"
              /* One job each. It shipped `hint="e.g. 20Gi, 100Gi"` **and**
                 `placeholder="20Gi"` — the same fact twice, in the two slots §6
                 gives different jobs: a placeholder is a **specimen**, a
                 constraint is a **hint**. The unit is the constraint, so it is
                 the hint; the field opens on a real value, so there is no
                 specimen left to show. */
              hint="The disk the registry stores images on. Use a value like 20Gi or 100Gi."
            >
              <Input
                id="registry-size"
                value={formData.cluster_image_registry.spec?.backend_storage_size || ""}
                onChange={handleRegistrySizeChange}
              />
            </FieldShell>
          )}
        </DrawerBody>

        <DrawerFooter>
          {/* In the footer band, not the body. Inside a band that scrolls, a
              failure scrolls away from the button that produced it. */}
          {error && <AlertBanner>{error}</AlertBanner>}
          {/* **The primary alone**, and it **says why it is off** (§9). It used
              to disable on a bare `isFormValid` boolean with no reason attached
              at all — the user could see the cost was unavailable and not what
              to do about it. `Cancel` is gone with the dialog: nothing is
              committed until this button is pressed, so the ✕, Esc and the scrim
              are the exits. */}
          <DrawerActions>
            <BlockedAction reason={isLoading ? null : reasonList(missingFields())}>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Add cluster
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
