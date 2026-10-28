// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/runtime-settings-editor.tsx
import { useEffect, useState } from "react";
import { DEVELOPER_DIALOG } from "./developer-dialog.const";
import type { RuntimeSettingsEditorStatus } from "./developer-dialog.types";
import { loadRuntimeSettingsText, saveRuntimeSettingsText } from "./runtime-settings-editor-service";
const { CLASS, TEXT } = DEVELOPER_DIALOG;
export function RuntimeSettingsEditor() {
    const [text, setText] = useState("");
    const [savedText, setSavedText] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<RuntimeSettingsEditorStatus>();
    const dirty = text !== savedText;
    useEffect(() => {
        let active = true;
        void loadRuntimeSettingsText().then((loadedText) => {
            if (active) {
                setText(loadedText);
                setSavedText(loadedText);
                setLoaded(true);
            }
        });
        return () => { active = false; };
    }, []);
    async function handleSave(): Promise<void> {
        setSaving(true);
        setStatus(undefined);
        const result = await saveRuntimeSettingsText(text);
        if (result.ok) {
            setText(result.text);
            setSavedText(result.text);
        }
        setStatus({ ok: result.ok, message: result.message });
        setSaving(false);
    }
    function handleChange(value: string): void {
        setText(value);
        setStatus(undefined);
    }
    let statusText = "";
    if (!loaded)
        statusText = TEXT.LOADING;
    else if (status)
        statusText = status.message;
    else if (dirty)
        statusText = TEXT.UNSAVED;
    return (<div className={CLASS.EDITOR}>
      <textarea className={CLASS.EDITOR_TEXT} aria-label={TEXT.EDITOR_LABEL} spellCheck={false} disabled={!loaded} value={text} onChange={(event) => handleChange(event.target.value)}/>
      <div className={CLASS.EDITOR_TOOLBAR}>
        <button type="button" disabled={!loaded || saving} onClick={() => void handleSave()}>{saving ? TEXT.SAVING : TEXT.SAVE}</button>
        <span className={status && !status.ok ? `${CLASS.EDITOR_STATUS} ${CLASS.ERROR}` : CLASS.EDITOR_STATUS} role="status">{statusText}</span>
      </div>
    </div>);
}
