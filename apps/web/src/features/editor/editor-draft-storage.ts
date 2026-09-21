export type EditorDraft = {
  selectedLanguage: string;
  sourceByLanguage: Record<string, string>;
  stdin: string;
};

function keyFor(attemptId: string, questionId: string) {
  return `technical-assessment-editor-draft:${attemptId}:${questionId}`;
}

export function loadEditorDraft(attemptId: string, questionId: string): EditorDraft | null {
  try {
    const draft = sessionStorage.getItem(keyFor(attemptId, questionId));
    return draft ? JSON.parse(draft) as EditorDraft : null;
  } catch {
    return null;
  }
}

export function saveEditorDraft(attemptId: string, questionId: string, draft: EditorDraft) {
  try {
    sessionStorage.setItem(keyFor(attemptId, questionId), JSON.stringify(draft));
  } catch {
  }
}
