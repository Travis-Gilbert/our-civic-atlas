"use client";

/**
 * GeoTaskNotePanel: the BlockNote rich-text note for a selected geo-task.
 *
 * Spec: "each geo-task carries a BlockNote rich-text note, shown on the
 * planning side when the task is selected... One note document per geo-task,
 * stored in the Yjs store." The note binds to a per-task `Y.XmlFragment`
 * (`note:<taskId>`) inside the geo-task sidecar doc, so it persists via
 * IndexedDB and syncs across browsers through the rustyred provider exactly
 * like the rest of that doc. BlockNote's collaboration mode keeps the binding
 * character-granular (Yjs-native), which is why it is the right editor here
 * rather than another BlockSuite instance.
 *
 * Must be mounted client-only (`next/dynamic({ ssr: false })`): BlockNote wraps
 * ProseMirror, which touches `document` at construction.
 */

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { getGeoTaskStore } from "@/lib/atlas/geo-task-store";

interface GeoTaskNotePanelProps {
  readonly taskId: string;
  /** Display name used for the collaboration cursor label. */
  readonly userName?: string;
}

export default function GeoTaskNotePanel({
  taskId,
  userName = "Organizer",
}: GeoTaskNotePanelProps) {
  const store = getGeoTaskStore();

  // Re-create the editor when the selected task changes: each task owns a
  // distinct fragment, and BlockNote binds one fragment per editor instance.
  const editor = useCreateBlockNote(
    {
      collaboration: {
        // The sidecar doc is transported by the rustyred provider + IndexedDB;
        // BlockNote only needs the provider for awareness (cursor labels).
        provider: { awareness: store.awareness },
        fragment: store.noteFragment(taskId),
        user: { name: userName, color: "#005186" },
        showCursorLabels: "activity",
      },
    },
    [taskId],
  );

  return (
    <div className="geo-task-note" data-geo-task-id={taskId}>
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
}
