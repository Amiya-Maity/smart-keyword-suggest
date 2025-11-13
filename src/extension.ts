/* eslint-disable curly */
// extension.ts
import * as vscode from "vscode";
import { info } from "./logger";
import { getNearestKeywords } from "./utils";
import { getSymbolsInScope } from "./symbols";
import { specialChecks } from "./specialChecks";

// --- Supported languages ---
const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python", "java"];

// --- Tracks words flagged by diagnostics ---
// now store multiple occurrences per word so same token at different positions can have different suggestions
const errorWords = new Map<
  string,
  { occurrences: { range: vscode.Range; suggests: string[] }[] }
>();

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

    info("Symbols in scope:", inScopeSymbols);

    // --- Get suggestions for all error words at once ---
    const suggestionsMap = getNearestKeywords(
      Array.from(errorWords.keys()),
      inScopeSymbols,
      document.languageId
    );

    // For each word, handle every occurrence independently
    for (const [word, entry] of errorWords.entries()) {
      const similarSuggestions = suggestionsMap[word] || []; // global similar candidates
      for (const occ of entry.occurrences) {
        // keep diagnostic-sourced suggestions first, then other similar suggestions
        const primary = occ.suggests || [];
        const combined = primary.concat(similarSuggestions.filter((s) => !primary.includes(s)));
        // dedupe and limit to max 3 suggestions per range
        const suggestions = Array.from(new Set(combined)).slice(0, 3);
         if (!suggestions || suggestions.length === 0) continue;
         if (!occ.range) continue;

        info(word, "occurrence =>", occ.range, "suggestions =>", suggestions);

        suggestions.forEach((suggestion) => {
          lenses.push(
            new vscode.CodeLens(occ.range, {
              title: `💡 '${suggestion}'`,
              command: "smart-keyword-suggest.fixTypo",
              arguments: [document.uri, occ.range, suggestion], // single suggestion
            })
          );
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
  info("✨ Multi-language Keyword Suggest extension activated");

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

      // Remove only the occurrence that was fixed
      const entry = errorWords.get(oldWord);
      if (entry) {
        entry.occurrences = entry.occurrences.filter(
          (o) => !(o.range.start.isEqual(range.start) && o.range.end.isEqual(range.end))
        );
        if (entry.occurrences.length === 0) errorWords.delete(oldWord);
      }

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
  info("❌ Multi-language Keyword Suggest extension deactivated");
}

function fetchSuggestWord(diag: vscode.Diagnostic): string {
  const message = diag.message;
  const suggestionMatch = message.match(/Did you mean\s*['"`]?([^'"`]+)['"`]?/i);
  return suggestionMatch ? suggestionMatch[1] : '';
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

  // iterate so we can continue/skip easily
  for (const diag of diagnostics) {
    if (specialChecks(diag, document.languageId)) continue;
    const word = document.getText(diag.range).trim();
    if (!word) continue;

    // Fetch the suggestion for the current diagnostic
    const suggestion = fetchSuggestWord(diag);

    // ensure an entry exists for this word
    let entry = errorWords.get(word);
    if (!entry) {
      entry = { occurrences: [] as { range: vscode.Range; suggests: string[] }[] };
      errorWords.set(word, entry);
    }

    // check if an occurrence with the exact same range already exists
    const existing = entry.occurrences.find(
      (o) => o.range.start.isEqual(diag.range.start) && o.range.end.isEqual(diag.range.end)
    );

    if (existing) {
      // merge suggestion into existing occurrence (avoid duplicates)
      if (suggestion && !existing.suggests.includes(suggestion)) {
        existing.suggests.push(suggestion);
      }
    } else {
      // new occurrence for same word but different position -> keep separate
      entry.occurrences.push({ range: diag.range, suggests: suggestion ? [suggestion] : [] });
    }
  }

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
  for (const entry of errorWords.values()) {
    for (const occ of entry.occurrences) decorations.push({ range: occ.range });
  }

  editor.setDecorations(strikeDecoration, decorations);
}
