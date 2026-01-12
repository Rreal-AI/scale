"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VisualVerificationSettings } from "./visual-verification-settings";

interface OrganizationData {
  id: string;
  name: string;
  inbound_email: string;
  timezone: string;
  currency: string;
  visual_verification_prompt: string | null;
}

export function SettingsContent() {
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const response = await fetch("/api/organization");
        if (!response.ok) {
          throw new Error("Failed to fetch organization data");
        }
        const data = await response.json();
        setOrgData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, []);

  const handleCopy = async () => {
    if (!orgData?.inbound_email) return;

    try {
      await navigator.clipboard.writeText(orgData.inbound_email);
      setCopied(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy email");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your organization settings</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your organization settings</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Error loading settings: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization settings</p>
      </div>

      {/* Email Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Configure email forwarding to automatically receive orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Inbound Order Email</label>
            <div className="flex gap-2">
              <Input
                value={orgData?.inbound_email || ""}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Forward order emails to this address. Configure this in your Mailgun routes
              to automatically process incoming orders.
            </p>
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              Mailgun Configuration
            </h4>
            <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
              <li>Go to Mailgun Dashboard &rarr; Sending &rarr; Routes</li>
              <li>Create a new route with match expression for your order emails</li>
              <li>Set the forward action to the email address above</li>
              <li>Save and test with a sample order email</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Organization Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Info</CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-sm text-muted-foreground">{orgData?.name || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Timezone</label>
              <p className="text-sm text-muted-foreground">{orgData?.timezone || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <p className="text-sm text-muted-foreground">{orgData?.currency || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Verification Settings */}
      <VisualVerificationSettings
        currentPrompt={orgData?.visual_verification_prompt || null}
        onUpdate={async (prompt) => {
          const response = await fetch("/api/organization", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visual_verification_prompt: prompt }),
          });
          if (!response.ok) {
            throw new Error("Failed to update");
          }
          const data = await response.json();
          setOrgData((prev) =>
            prev ? { ...prev, visual_verification_prompt: data.visual_verification_prompt } : prev
          );
        }}
      />
    </div>
  );
}
