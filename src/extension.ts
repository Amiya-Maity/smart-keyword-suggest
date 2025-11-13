// extension.ts
import * as vscode from "vscode";
import { getNearestKeywords } from "./utils";
import { getSymbolsInScope } from "./symbols";
import { specialChecks } from "./specialChecks";
import { error } from "console";

// --- Supported languages ---
const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python", "java"];

// --- Tracks words flagged by diagnostics ---
const errorWords = new Map<string, vscode.Range[]>();

// --- Strikethrough red decoration ---
const strikeDecoration = vscode.window.createTextEditorDecorationType({
  textDecoration: "line-through red",
});

// --- Symbol cache to avoid repeated traversal ---
const symbolCache = new Map<string, string[]>();

// --- Debounce helper ---
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// --- Typo CodeLens Provider ---
class TypoCodeLensProvider implements vscode.CodeLensProvider {
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses =
    this.onDidChangeCodeLensesEmitter.event;

  async provideCodeLenses(
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    const lenses: vscode.CodeLens[] = [];
    if (errorWords.size === 0) return lenses;

    // --- Get symbols in scope (cached if available) ---
    let inScopeSymbols = symbolCache.get(document.uri.toString());
    if (!inScopeSymbols) {
      inScopeSymbols = await getSymbolsInScope(
        document,
        new vscode.Position(document.lineCount, 0)
      );
      symbolCache.set(document.uri.toString(), inScopeSymbols);
    }

    console.log("Symbols in scope:", inScopeSymbols);

    // --- Get suggestions for all error words at once ---
    const suggestionsMap = getNearestKeywords(
      Array.from(errorWords.keys()),
      inScopeSymbols,
      document.languageId
    );

    for (const [word, ranges] of errorWords.entries()) {
      const suggestions = suggestionsMap[word]; // ✅ this is string[]
      if (!suggestions || suggestions.length === 0) continue;

      // --- Create a code lens for each suggestion ---
      for (const [word, ranges] of errorWords.entries()) {
        const suggestions = suggestionsMap[word];
        if (!suggestions || suggestions.length === 0) continue;

        if (!Array.isArray(ranges)) continue; // safety check

        ranges.forEach((range) => {
          suggestions.forEach((suggestion) => {
            lenses.push(
              new vscode.CodeLens(range, {
                title: `💡 '${suggestion}'`,
                command: "smart-keyword-suggest.fixTypo",
                arguments: [document.uri, range, suggestion], // single suggestion
              })
            );
          });
        });
      }
    }

    return lenses;
  }

  public refresh() {
    this.onDidChangeCodeLensesEmitter.fire();
  }
}

// --- Global CodeLens provider instance ---
const typoCodeLensProvider = new TypoCodeLensProvider();

export function activate(context: vscode.ExtensionContext) {
  console.log("✨ Multi-language Keyword Suggest extension activated");

  // --- Debounced diagnostics update ---
  const debouncedUpdate = debounce(updateDiagnostics, 200);
  // --- Document open/change ---
  vscode.workspace.onDidOpenTextDocument(updateDiagnostics);
  vscode.workspace.onDidChangeTextDocument((event) =>
    debouncedUpdate(event.document)
  );

  // --- Active editor change ---
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor) return;
    setTimeout(() => updateDiagnostics(editor.document), 300);
  });

  // --- Register CodeLens provider ---
  SUPPORTED_LANGUAGES.forEach((lang) => {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        { language: lang },
        typoCodeLensProvider
      )
    );
  });

  // --- Command to fix typo ---
  const fixTypoCommand = vscode.commands.registerCommand(
    "smart-keyword-suggest.fixTypo",
    async (uri: vscode.Uri, range: vscode.Range, suggestion: string) => {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Save old word
      const oldWord = document.getText(range);

      await editor.edit((editBuilder) => {
        editBuilder.replace(range, suggestion);
      });

      // Remove immediately from errorWords
      errorWords.delete(oldWord);

      // Immediate strikethrough refresh
      updateStrikethrough(editor);

      // Refresh diagnostics after short delay
      setTimeout(() => updateDiagnostics(document), 150);

      // Refresh CodeLens
      typoCodeLensProvider.refresh();

      vscode.window.showInformationMessage(
        `✅ Replaced "${oldWord}" with "${suggestion}"`
      );
    }
  );
  context.subscriptions.push(fixTypoCommand);

  // --- Command to manually refresh diagnostics and CodeLens ---
const refreshCommand = vscode.commands.registerCommand(
  "smart-keyword-suggest.refresh",
  async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // Clear caches
    errorWords.clear();
    symbolCache.delete(editor.document.uri.toString());

    // Re-run diagnostics
    await updateDiagnostics(editor.document);

    // Refresh CodeLens and strikethrough
    typoCodeLensProvider.refresh();
    updateStrikethrough(editor);

    vscode.window.showInformationMessage(`🔄 Keyword suggestions refreshed`);
  }
);

// --- Add to context subscriptions ---
context.subscriptions.push(refreshCommand);

  // --- Initial refresh if editor active ---
  const editor = vscode.window.activeTextEditor;
  if (editor) setTimeout(() => updateDiagnostics(editor.document), 200);
}

export function deactivate() {
  console.log("❌ Multi-language Keyword Suggest extension deactivated");
}

// --- Update diagnostics ---
async function updateDiagnostics(document: vscode.TextDocument) {
  if (!SUPPORTED_LANGUAGES.includes(document.languageId)) return;

  // Clear previous error words for this document
  errorWords.clear();

  // Clear symbol cache for this document
  symbolCache.delete(document.uri.toString());

  const diagnostics = vscode.languages.getDiagnostics(document.uri);
  if (!diagnostics || diagnostics.length === 0) {
    updateStrikethrough(vscode.window.activeTextEditor);
    typoCodeLensProvider.refresh();
    return;
  }

  diagnostics.forEach((diag) => {
    if (specialChecks(diag, document.languageId)) return;
    const word = document.getText(diag.range).trim();
    if (!word) return;
    if (!errorWords.has(word)) errorWords.set(word, []);
    errorWords.get(word)?.push(diag.range);
  });

  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.toString() === document.uri.toString()) {
    updateStrikethrough(editor);
  }

  // Refresh CodeLens
  typoCodeLensProvider.refresh();
}

// --- Update strikethrough decorations ---
function updateStrikethrough(editor: vscode.TextEditor | undefined) {
  if (!editor) return;

  const decorations: vscode.DecorationOptions[] = [];
  for (const ranges of errorWords.values()) {
    ranges.forEach((range) => decorations.push({ range }));
  }

  editor.setDecorations(strikeDecoration, decorations);
}
