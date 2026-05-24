"use client";

/**
 * AtelierControls - PT-405
 *
 * Two control surfaces:
 *
 *   1. Top chrome (Skip + Exit) - mounted in `AtelierSurface`'s chrome strip.
 *   2. Dossier controls (Replay + Save) - mounted at the bottom of the
 *      dossier panel.
 *
 * Save button wires to `useReconstructionSave` (PT-103b) per the locked
 * Decision 6 (real backend wiring, NOT disabled). Save success shows the
 * share URL inline with a "Copy link" affordance; save error shows a
 * user-visible error per project CLAUDE.md no-fake-UI rule.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SkipForward, RotateCcw, ArrowLeft, Bookmark, Check, Copy } from "lucide-react";

import { useReconstructionSave } from "@/lib/atlas/use-reconstruction-save";

type AtelierTopControlsProps = {
  onSkip: () => void;
};

const EXIT_FADE_DURATION_MS = 500;

export function AtelierTopControls({ onSkip }: AtelierTopControlsProps) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const handleExit = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    // Spec line 246: "atelier surface fades back to the regular atlas with
    // a half-second transition." Animate the .atelier-surface opacity by
    // setting a class on document.body; the .atelier-surface CSS picks it
    // up via [data-atelier-exiting="true"] attribute (added below).
    const surface = document.querySelector(".atelier-surface");
    surface?.setAttribute("data-exiting", "true");
    window.setTimeout(() => {
      router.push("/open-flint-atlas");
    }, EXIT_FADE_DURATION_MS);
  }, [router, exiting]);

  return (
    <div className="atelier-chrome-controls">
      <button
        type="button"
        className="atelier-chrome-button"
        onClick={onSkip}
        aria-label="Skip animation"
      >
        <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Skip</span>
      </button>
      <button
        type="button"
        className="atelier-chrome-button"
        onClick={handleExit}
        aria-label="Back to atlas"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Back to atlas</span>
      </button>
    </div>
  );
}

type AtelierDossierControlsProps = {
  reconstructionId: string;
  year: number;
  onReplay: () => void;
};

export function AtelierDossierControls({
  reconstructionId,
  year,
  onReplay,
}: AtelierDossierControlsProps) {
  const { save, state, reset } = useReconstructionSave();
  const [copied, setCopied] = useState(false);

  const handleSave = useCallback(async () => {
    await save({ reconstructionId, year });
  }, [save, reconstructionId, year]);

  const handleCopy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <div>
      <div className="atelier-dossier-controls">
        <button
          type="button"
          className="atelier-replay-button"
          onClick={onReplay}
          aria-label="Replay reconstruction animation"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Replay</span>
        </button>
        <button
          type="button"
          className="atelier-save-button"
          onClick={handleSave}
          data-state={state.kind === "saving" ? "saving" : undefined}
          disabled={state.kind === "saving"}
          aria-label="Save this reconstruction"
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{state.kind === "saving" ? "Saving…" : "Save"}</span>
        </button>
      </div>

      {state.kind === "ok" ? (
        <div className="atelier-save-confirmation" role="status">
          <span>
            <Check className="inline h-3 w-3" aria-hidden="true" /> Saved. Bookmark
            or share the link to return:
          </span>
          <code className="atelier-save-confirmation__url">{state.result.shareUrl}</code>
          <button
            type="button"
            className="atelier-replay-button"
            style={{ marginTop: 6 }}
            onClick={() => handleCopy(state.result.shareUrl)}
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="atelier-save-error" role="alert">
          <strong>Save failed.</strong>{" "}
          {state.reason === "schema"
            ? "Backend resolver pending. The save mutation is not yet implemented; the share URL is unavailable."
            : state.reason === "network"
              ? `Network error: ${state.message}. Try again when reconnected.`
              : `Server error: ${state.message}`}
          <button
            type="button"
            className="atelier-replay-button"
            style={{ marginTop: 6 }}
            onClick={reset}
          >
            <span>Dismiss</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
