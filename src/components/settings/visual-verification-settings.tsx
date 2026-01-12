"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_VISUAL_VERIFICATION_PROMPT } from "@/lib/visual-verification-prompt";

interface VisualVerificationSettingsProps {
  currentPrompt: string | null;
  onUpdate: (prompt: string | null) => Promise<void>;
}

export function VisualVerificationSettings({
  currentPrompt,
  onUpdate,
}: VisualVerificationSettingsProps) {
  const [prompt, setPrompt] = useState(currentPrompt || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isUsingDefault = !currentPrompt;
  const hasChanges = prompt !== (currentPrompt || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If prompt is empty or same as default, save as null (use default)
      const promptToSave = prompt.trim() === "" || prompt.trim() === DEFAULT_VISUAL_VERIFICATION_PROMPT.trim()
        ? null
        : prompt.trim();

      await onUpdate(promptToSave);
      toast.success("Visual verification prompt updated");
    } catch (error) {
      toast.error("Failed to update prompt");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setPrompt("");
  };

  const handleLoadDefault = () => {
    setPrompt(DEFAULT_VISUAL_VERIFICATION_PROMPT);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visual Verification AI Prompt
        </CardTitle>
        <CardDescription>
          Customize the AI prompt used for visual verification of orders.
          Leave empty to use the default prompt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUsingDefault && !prompt && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-800">
              Currently using the <strong>default prompt</strong>. Click &quot;Customize&quot; to create a custom prompt for your organization.
            </p>
          </div>
        )}

        {(isExpanded || !isUsingDefault || prompt) && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Custom Prompt</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadDefault}
                    className="text-xs"
                  >
                    Load Default as Template
                  </Button>
                  {prompt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetToDefault}
                      className="text-xs text-orange-600 hover:text-orange-700"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset to Default
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your custom prompt here... Use {items} as a placeholder for the order items list."
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-gray-100 px-1 rounded">{"{items}"}</code> as a placeholder where the order items list will be inserted.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Prompt
              </Button>
            </div>
          </>
        )}

        {!isExpanded && isUsingDefault && !prompt && (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full"
          >
            Customize Prompt
          </Button>
        )}

        {/* Show default prompt preview */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View default prompt
          </summary>
          <pre className="mt-2 p-3 bg-gray-50 rounded-md overflow-x-auto text-xs whitespace-pre-wrap border">
            {DEFAULT_VISUAL_VERIFICATION_PROMPT}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
