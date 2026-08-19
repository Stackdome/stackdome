import { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertBanner, BlockedAction, FieldShell, reasonList } from "@/components/branded";
import { KeyValueRows } from "@/components/branded/key-value-rows";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecretFormSchema } from "../schemas/secret-schema";
import type { Secret, SecretType, SecretData } from "../types";
import { ZodError } from "zod";

interface SecretFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (secret: Omit<Secret, "id" | "organisation_id" | "created_at" | "updated_at">) => void;
  isLoading: boolean;
  error: string | null;
  editingSecret?: Secret | null;
}

const SECRET_TYPES: { value: SecretType; label: string }[] = [
  { value: "Generic", label: "Generic" },
  { value: "DockerRegistry", label: "Docker Registry" },
  { value: "GitCredentials", label: "Git Credentials" },
];

export function SecretFormDrawer({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  error,
  editingSecret,
}: SecretFormDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SecretType>("Generic");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // Type-specific fields
  const [registry, setRegistry] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [sshPrivateKey, setSshPrivateKey] = useState("");
  const [genericData, setGenericData] = useState<SecretData[]>([{ key: "", value: "" }]);

  const isEditing = !!editingSecret;

  // Reset form when dialog opens/closes or when editing secret changes
  useEffect(() => {
    if (open) {
      if (editingSecret) {
        setName(editingSecret.name);
        setDescription(editingSecret.description || "");
        setType(editingSecret.type);

        // Populate type-specific fields based on existing data
        const data = editingSecret.data || [];
        data.forEach(item => {
          switch (item.key) {
            case "registry":
              setRegistry(item.value);
              break;
            case "username":
              setUsername(item.value);
              break;
            case "password":
              setPassword(item.value);
              break;
            case "token":
              setToken(item.value);
              break;
            case "ssh_private_key":
              setSshPrivateKey(item.value);
              break;
          }
        });

        // For generic type, populate the generic data array
        if (editingSecret.type === "Generic") {
          setGenericData(data.length > 0 ? data : [{ key: "", value: "" }]);
        }
      } else {
        // Reset all fields
        setName("");
        setDescription("");
        setType("Generic");
        setRegistry("");
        setUsername("");
        setPassword("");
        setToken("");
        setSshPrivateKey("");
        setGenericData([{ key: "", value: "" }]);
      }
      setFormErrors({});
      setShowPassword({});
    }
  }, [open, editingSecret]);

  const validateForm = (): boolean => {
    try {
      // Build the form data object based on type
      let formData: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
      };

      // Add type-specific fields
      switch (type) {
        case "DockerRegistry":
          formData = {
            ...formData,
            registry: registry.trim(),
            username: username.trim(),
            password: password.trim(),
          };
          break;
        case "GitCredentials":
          formData = {
            ...formData,
            username: username.trim() || undefined,
            password: password.trim() || undefined,
            token: token.trim() || undefined,
          };
          break;
        case "UsernamePassword":
          formData = {
            ...formData,
            username: username.trim(),
            password: password.trim(),
          };
          break;
        case "Token":
          formData = {
            ...formData,
            token: token.trim(),
          };
          break;
        case "SSHKey":
          formData = {
            ...formData,
            sshPrivateKey: sshPrivateKey.trim(),
          };
          break;
        case "Generic":
        default:
          formData = {
            ...formData,
            data: genericData.filter(item => item.key.trim() && item.value.trim()),
          };
          break;
      }

      // Validate with Zod
      SecretFormSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {};

        error.issues.forEach((issue) => {
          const path = issue.path.join('.');

          // Handle array paths for generic data validation
          if (issue.path.length === 2 && issue.path[0] === 'data') {
            const index = issue.path[1];
            if (typeof index === 'number') {
              errors[`key-${index}`] = issue.message;
            }
          } else if (issue.path.length === 3 && issue.path[0] === 'data') {
            const index = issue.path[1];
            const field = issue.path[2];
            if (typeof index === 'number') {
              errors[`${field}-${index}`] = issue.message;
            }
          } else {
            errors[path || 'form'] = issue.message;
          }
        });

        setFormErrors(errors);
      }
      return false;
    }
  };

  /**
   * EVERY field still empty, phrased as the thing to DO about it.
   *
   * This is a form, so it speaks form: enter, paste, add. A bare field name
   * ("Name") reports a state; an instruction ("Enter a name") is the sentence
   * the user can act on without translating it first.
   *
   * All of them at once, not one at a time — reporting them one by one turns a
   * four-field form into four rounds of hover, fill, hover again.
   */
  const missingFields = (): string[] => {
    const missing: string[] = [];
    if (!name.trim()) missing.push("Enter a name");
    switch (type) {
      case "DockerRegistry":
        if (!registry.trim()) missing.push("Enter the registry URL");
        if (!username.trim()) missing.push("Enter a username");
        if (!password.trim()) missing.push("Enter a password");
        break;
      case "GitCredentials":
        // Either arm satisfies it, so it is one instruction and not two.
        if (!((username.trim() && password.trim()) || token.trim())) {
          missing.push("Enter a username and password, or a personal access token");
        }
        break;
      case "UsernamePassword":
        if (!username.trim()) missing.push("Enter a username");
        if (!password.trim()) missing.push("Enter a password");
        break;
      case "Token":
        if (!token.trim()) missing.push("Enter a token");
        break;
      case "SSHKey":
        if (!sshPrivateKey.trim()) missing.push("Paste the SSH private key");
        break;
      case "Generic":
      default:
        if (!genericData.some((d) => d.key.trim() && d.value.trim())) {
          missing.push("Add at least one key and value");
        }
        break;
    }
    return missing;
  };

  const blockedReason = () => reasonList(missingFields());

  const handleSubmit = () => {
    if (!validateForm()) return;

    let secretData: SecretData[] = [];

    // Build data array based on type
    switch (type) {
      case "DockerRegistry":
        secretData = [
          { key: "registry", value: registry.trim() },
          { key: "username", value: username.trim() },
          { key: "password", value: password.trim() },
        ];
        break;
      case "GitCredentials":
        if (username.trim() && password.trim()) {
          secretData = [
            { key: "username", value: username.trim() },
            { key: "password", value: password.trim() },
          ];
        } else if (token.trim()) {
          secretData = [{ key: "token", value: token.trim() }];
        }
        break;
      case "UsernamePassword":
        secretData = [
          { key: "username", value: username.trim() },
          { key: "password", value: password.trim() },
        ];
        break;
      case "Token":
        secretData = [{ key: "token", value: token.trim() }];
        break;
      case "SSHKey":
        secretData = [{ key: "ssh_private_key", value: sshPrivateKey.trim() }];
        break;
      case "Generic":
        secretData = genericData.filter(item => item.key.trim() && item.value.trim());
        break;
    }

    const secret = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      data: secretData,
    };

    onSubmit(secret);
  };




  const togglePasswordVisibility = (field: string) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const renderTypeSpecificFields = () => {
    switch (type) {
      case "DockerRegistry":
        return (
          <div className="flex flex-col gap-4">
            <FieldShell label="Registry URL" htmlFor="registry" required error={formErrors.registry}>
              <Input
                id="registry"
                value={registry}
                onChange={(e) => {
                  setRegistry(e.target.value);
                  if (formErrors.registry) {
                    setFormErrors(prev => ({ ...prev, registry: "" }));
                  }
                }}
                placeholder="docker.io, gcr.io, your-registry.com"
                className={formErrors.registry ? "border-danger" : ""}
              />
            </FieldShell>
            <FieldShell label="Username" htmlFor="username" required error={formErrors.username}>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (formErrors.username) {
                    setFormErrors(prev => ({ ...prev, username: "" }));
                  }
                }}
                placeholder="Enter username"
                className={formErrors.username ? "border-danger" : ""}
              />
            </FieldShell>
            <FieldShell label="Password" htmlFor="password" required error={formErrors.password}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword.password ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors(prev => ({ ...prev, password: "" }));
                    }
                  }}
                  placeholder="Enter password"
                  className={formErrors.password ? "border-danger pr-10" : "pr-10"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility("password")}
                >
                  {showPassword.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FieldShell>
          </div>
        );

      case "GitCredentials":
        return (
          <div className="flex flex-col gap-4">
            {formErrors.credentials && (
              <AlertBanner>{formErrors.credentials}</AlertBanner>
            )}
            <FieldShell label="Username" htmlFor="username">
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (formErrors.credentials) {
                    setFormErrors(prev => ({ ...prev, credentials: "" }));
                  }
                }}
                placeholder="Enter username"
              />
            </FieldShell>
            <FieldShell label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword.password ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.credentials) {
                      setFormErrors(prev => ({ ...prev, credentials: "" }));
                    }
                  }}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility("password")}
                >
                  {showPassword.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FieldShell>
            {/* Either the pair above or the token below — the divider says so
                once, instead of two numbered headings that read as steps. */}
            <div className="flex items-center gap-3 text-meta text-fg-muted">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <FieldShell
              label="Personal access token"
              htmlFor="token"
              hint="Use a token instead of a username and password."
            >
              <div className="relative">
                <Input
                  id="token"
                  type={showPassword.token ? "text" : "password"}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (formErrors.credentials) {
                      setFormErrors(prev => ({ ...prev, credentials: "" }));
                    }
                  }}
                  placeholder="Enter personal access token"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility("token")}
                >
                  {showPassword.token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FieldShell>
          </div>
        );

      case "UsernamePassword":
        return (
          <div className="flex flex-col gap-4">
            <FieldShell label="Username" htmlFor="username" required error={formErrors.username}>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (formErrors.username) {
                    setFormErrors(prev => ({ ...prev, username: "" }));
                  }
                }}
                placeholder="Enter username"
                className={formErrors.username ? "border-danger" : ""}
              />
            </FieldShell>
            <FieldShell label="Password" htmlFor="password" required error={formErrors.password}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword.password ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors(prev => ({ ...prev, password: "" }));
                    }
                  }}
                  placeholder="Enter password"
                  className={formErrors.password ? "border-danger pr-10" : "pr-10"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility("password")}
                >
                  {showPassword.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FieldShell>
          </div>
        );

      case "Token":
        return (
          <FieldShell label="Token" htmlFor="token" required error={formErrors.token}>
            <div className="relative">
              <Input
                id="token"
                type={showPassword.token ? "text" : "password"}
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (formErrors.token) {
                    setFormErrors(prev => ({ ...prev, token: "" }));
                  }
                }}
                placeholder="Enter token (min 8 characters)"
                className={formErrors.token ? "border-danger pr-10" : "pr-10"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => togglePasswordVisibility("token")}
              >
                {showPassword.token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </FieldShell>
        );

      case "SSHKey":
        return (
          <FieldShell
            label="SSH private key"
            htmlFor="sshPrivateKey"
            required
            error={formErrors.sshPrivateKey}
          >
            <Textarea
              id="sshPrivateKey"
              value={sshPrivateKey}
              onChange={(e) => {
                setSshPrivateKey(e.target.value);
                if (formErrors.sshPrivateKey) {
                  setFormErrors(prev => ({ ...prev, sshPrivateKey: "" }));
                }
              }}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
              className={formErrors.sshPrivateKey ? "border-danger [field-sizing:fixed]" : "[field-sizing:fixed]"}
              rows={6}
            />
          </FieldShell>
        );

      case "Generic":
      default:
        return (
          <FieldShell
            label="Secret data"
            required
            hint="Each pair is one key the stack can read by name."
            error={formErrors.data}
          >
            <KeyValueRows
              rows={genericData.map((d) => ({ key: d.key, value: d.value }))}
              onChange={(rows) => {
                setGenericData(rows.map((r) => ({ key: r.key, value: r.value })));
                setFormErrors((prev) => {
                  const next = { ...prev };
                  for (const k of Object.keys(next)) {
                    if (k.startsWith("key-") || k.startsWith("value-") || k === "data") delete next[k];
                  }
                  return next;
                });
              }}
              makeRow={() => ({ key: "", value: "" })}
              addLabel="Add pair"
              keyPlaceholder="key"
              keyLabel="Key"
              removeLabel="Remove pair"
              valueLabel="Value"
              // One pair always stays: an empty group gives nothing to type into.
              minRows={1}
              errorFor={(_row, i) => ({
                key: formErrors[`key-${i}`],
                value: formErrors[`value-${i}`],
              })}
            />
          </FieldShell>
        );
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader
          title={isEditing ? "Edit secret" : "New secret"}
          description={
            isEditing
              ? "Update the secret's metadata or rotate its values."
              : "Securely store API keys, passwords, or certificates for your stacks."
          }
        />

        {/* The body is the only band that scrolls, and it owns its own padding
            and 16 gap — so the fields need no wrapper of their own. */}
        <DrawerBody>
          <FieldShell
            label="Name"
            htmlFor="name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) {
                  setFormErrors(prev => ({ ...prev, name: "" }));
                }
              }}
              placeholder="Enter secret name"
              className={formErrors.name ? "border-danger" : ""}
            />
          </FieldShell>

          <FieldShell label="Description" htmlFor="description">
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter secret description (optional)"
              rows={2}
              className="resize-none [field-sizing:fixed]"
            />
          </FieldShell>

          <FieldShell label="Type" htmlFor="type" required>
            <Select value={type} onValueChange={(value: SecretType) => setType(value)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select secret type" />
              </SelectTrigger>
              <SelectContent>
                {SECRET_TYPES.map((secretType) => (
                  <SelectItem key={secretType.value} value={secretType.value}>
                    {secretType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>

          {renderTypeSpecificFields()}
        </DrawerBody>

        <DrawerFooter>
          {/* In the footer band, not the body. Inside a band that scrolls, a
              failure scrolls away from the button that produced it. */}
          {error && <AlertBanner>{error}</AlertBanner>}
          <DrawerActions>
            <Button shape="flat" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            {/* Disabled until the form can actually be sent, and it says why —
                §6a's rule applied to a form: render the cost, never hide it. */}
            <BlockedAction reason={isLoading ? null : blockedReason()}>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Save changes" : "Create secret"}
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
