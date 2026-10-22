import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { yaml } from "@codemirror/lang-yaml";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Controlled CodeMirror view for raw YAML. Only the YAML grammar is loaded; no formatter runs,
 * so the document text stays verbatim.
 */
export function YamlEditor({ value, onChange }: YamlEditorProps) {
  const language = usePreferencesStore((state) => state.language);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // The listener is created once, so it reads the latest callback through this ref.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current ?? undefined,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          yaml(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ spellcheck: "false" }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The view is created once; later value and label changes are applied in the effects below.
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    viewRef.current?.contentDOM.setAttribute(
      "aria-label",
      translate(language, "config.editorLabel"),
    );
  }, [language]);

  return (
    <div
      ref={hostRef}
      className="min-h-96 w-full overflow-hidden rounded-md border bg-background font-mono text-sm"
    />
  );
}
