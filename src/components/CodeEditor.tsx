import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { Language, LocateRequest } from '../domain/types';

export const HELL_THEME = 'cyber-hell';

export const hellTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6F6585', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'C084FC' },
    { token: 'keyword.control', foreground: 'F472B6' },
    { token: 'string', foreground: '86EFAC' },
    { token: 'number', foreground: 'F5C97B' },
    { token: 'type.identifier', foreground: '7DD3FC' },
    { token: 'identifier', foreground: 'E9E4F5' },
    { token: 'delimiter', foreground: '8E86A3' },
    { token: 'tag', foreground: 'F472B6' },
  ],
  colors: {
    'editor.background': '#0B0912',
    'editor.foreground': '#E9E4F5',
    'editorLineNumber.foreground': '#4C435F',
    'editorLineNumber.activeForeground': '#C084FC',
    'editor.lineHighlightBackground': '#151022',
    'editor.lineHighlightBorder': '#2A1C3E',
    'editor.selectionBackground': '#3B1D5E',
    'editor.inactiveSelectionBackground': '#2A163F',
    'editorCursor.foreground': '#EF4444',
    'editorIndentGuide.background1': '#21182F',
    'editorIndentGuide.activeBackground1': '#4C2A6E',
    'editorWidget.background': '#120E1C',
    'editorWidget.border': '#3B2A55',
    'editorSuggestWidget.background': '#120E1C',
    'editorSuggestWidget.selectedBackground': '#2A1C3E',
    'scrollbarSlider.background': '#3B2A5555',
    'scrollbarSlider.hoverBackground': '#5B3F7A77',
    'minimap.background': '#0B0912',
  },
};

interface CodeEditorProps {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  readOnly?: boolean;
  locate?: LocateRequest | null;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
  locate,
  onMount,
}: CodeEditorProps) {
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (instance, monacoInstance) => {
    setEditor(instance);
    onMount?.(instance);
    monacoInstance.editor.defineTheme(HELL_THEME, hellTheme);
  };

  useEffect(() => {
    if (!editor || !locate) return;
    const model = editor.getModel();
    if (!model) return;
    const line = Math.max(1, Math.min(locate.line, model.getLineCount()));
    editor.revealLineInCenter(line, monaco.editor.ScrollType.Smooth);
    editor.setPosition({ lineNumber: line, column: 1 });
    const length = model.getLineLength(line);
    editor.setSelection(new monaco.Range(line, 1, line, Math.max(1, length + 1)));
    editor.focus();
  }, [editor, locate]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(next) => onChange(next ?? '')}
      theme={HELL_THEME}
      beforeMount={(monacoInstance) => {
        monacoInstance.editor.defineTheme(HELL_THEME, hellTheme);
        monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
          { noSemanticValidation: true, noSyntaxValidation: false },
        );
        monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
          { noSemanticValidation: true, noSyntaxValidation: false },
        );
      }}
      onMount={handleMount}
      loading={
        <div className="flex h-full items-center justify-center text-sm text-mist">
          正在铺设黄泉代码卷轴…
        </div>
      }
      options={{
        readOnly,
        fontSize: 13,
        lineHeight: 22,
        fontFamily:
          '"SFMono-Regular", "JetBrains Mono", Consolas, "PingFang SC", monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 14, bottom: 14 },
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: true,
        renderLineHighlight: 'all',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        tabSize: 2,
        wordWrap: 'off',
        contextmenu: true,
        fixedOverflowWidgets: true,
        overviewRulerBorder: false,
        scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
      }}
    />
  );
}