"use client";

/**
 * PlannerNotesEditor: a focused Tiptap rich-text surface for the porchfest
 * planner's free-text notes (task notes, placement notes).
 *
 * Ported from the travisgilbert.me studio editor (src/components/studio/
 * TiptapEditor.tsx) but deliberately scoped down: the studio surface is a
 * full writing workbench (slash commands, wiki-links, mentions, Yjs
 * collaboration, tables, image upload, drag handles). A task notes field
 * needs none of that. This keeps the same Tiptap v3 foundation and the same
 * `{ html, markdown }` update contract, with a notes-grade extension set:
 *
 *   StarterKit (bold, italic, strike, code, headings, lists, blockquote,
 *   code block, horizontal rule, link, underline, history) + Placeholder +
 *   TaskList/TaskItem (checklists) + Typography (smart quotes, no em-dash to
 *   match the house style) + Highlight + Markdown (round-trip serialization).
 *
 * Storage: the planner task model already has a `notes` string field that the
 * deployed backend persists (proto Task.notes, EventTasksList selects it). The
 * `onUpdate` payload carries both `html` and `markdown` so the integration can
 * persist whichever it prefers; markdown is the recommended string to store.
 *
 * Reuse across entities: this is a single editor instance. To bind it to the
 * currently-selected task, mount it with `key={task.id}` so React remounts it
 * (and reseeds content) when the selection changes, rather than threading a
 * reset effect through here.
 *
 * Styling lives in src/app/porchfest/porchfest.css under `.planner-notes*`,
 * consuming the civic-atlas `--ctx-*` register so the editor reads as one
 * surface with the rest of the planner chrome.
 */

import { useCallback, useEffect, useReducer } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { Markdown } from "@tiptap/markdown";

export interface PlannerNotesPayload {
  /** Editor content as HTML. */
  readonly html: string;
  /** Editor content as Markdown (recommended for storage in the notes field). */
  readonly markdown: string;
}

export interface PlannerNotesEditorProps {
  /** Initial content string. Empty string for a blank note. */
  readonly initialContent?: string;
  /** Format of `initialContent`. Defaults to "markdown" (the recommended
   *  storage format); pass "html" if the stored value is HTML. */
  readonly initialContentFormat?: "html" | "markdown";
  /** Fires on every edit with both serializations. */
  readonly onUpdate?: (payload: PlannerNotesPayload) => void;
  /** Receives the editor instance once it is ready (for external commands). */
  readonly onEditorReady?: (editor: Editor) => void;
  /** Placeholder shown while the document is empty. */
  readonly placeholder?: string;
  /** When false, the editor is read-only and the toolbar is hidden. */
  readonly editable?: boolean;
  /** Accessible label for the editable region. */
  readonly ariaLabel?: string;
}

function readMarkdown(editor: Editor): string {
  const candidate = editor as Editor & { getMarkdown?: () => string };
  return typeof candidate.getMarkdown === "function"
    ? candidate.getMarkdown()
    : editor.getText();
}

export default function PlannerNotesEditor({
  initialContent = "",
  initialContentFormat = "markdown",
  onUpdate,
  onEditorReady,
  placeholder = "Add a note. **bold**, - lists, [ ] checklists, # headings all work.",
  editable = true,
  ariaLabel = "Note editor",
}: PlannerNotesEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      // emDash:false keeps the editor from auto-substituting em-dashes, per
      // the project's no-em-dash house rule.
      Typography.configure({ emDash: false }),
      Markdown,
    ],
    content: initialContent,
    contentType: initialContentFormat,
    editorProps: {
      attributes: {
        class: "planner-notes-content",
        "aria-label": ariaLabel,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate?.({ html: ed.getHTML(), markdown: readMarkdown(ed) });
    },
  });

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return <div className="planner-notes" aria-busy="true" />;
  }

  return (
    <div className="planner-notes">
      {editable ? <NotesToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar                                                            */
/*                                                                     */
/*  Text-label buttons (no icon dependency) styled in porchfest.css to */
/*  read as planner chrome. Active state reflects the current marks via */
/*  a transaction-driven re-render.                                     */
/* ------------------------------------------------------------------ */

function NotesToolbar({ editor }: { readonly editor: Editor }) {
  // Tiptap mutates the editor in place; force a re-render on every
  // transaction so isActive() reads stay in sync with the selection.
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onTx = () => bump();
    editor.on("transaction", onTx);
    return () => {
      editor.off("transaction", onTx);
    };
  }, [editor]);

  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }, [editor]);

  return (
    <div className="planner-notes-toolbar" role="toolbar" aria-label="Formatting">
      <NotesButton
        label="B"
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        variant="bold"
      />
      <NotesButton
        label="I"
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        variant="italic"
      />
      <NotesButton
        label="S"
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        variant="strike"
      />
      <NotesButton
        label="Mark"
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      />
      <span className="planner-notes-sep" aria-hidden="true" />
      <NotesButton
        label="H2"
        title="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      />
      <NotesButton
        label="H3"
        title="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      />
      <span className="planner-notes-sep" aria-hidden="true" />
      <NotesButton
        label="List"
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <NotesButton
        label="1."
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <NotesButton
        label="Todo"
        title="Checklist"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
      <span className="planner-notes-sep" aria-hidden="true" />
      <NotesButton
        label="Quote"
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <NotesButton
        label="Code"
        title="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <NotesButton
        label="Link"
        title="Add or edit link"
        active={editor.isActive("link")}
        onClick={setLink}
      />
    </div>
  );
}

function NotesButton({
  label,
  title,
  active,
  onClick,
  variant,
}: {
  readonly label: string;
  readonly title: string;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly variant?: "bold" | "italic" | "strike";
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`planner-notes-btn ${active ? "is-active" : ""} ${
        variant ? `is-${variant}` : ""
      }`}
    >
      {label}
    </button>
  );
}
