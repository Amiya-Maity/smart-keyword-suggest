"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fast_levenshtein_1 = __importDefault(require("fast-levenshtein"));
// --- JavaScript keywords for comparison ---
const keywords = [
    "function",
    "return",
    "console",
    "var",
    "let",
    "const",
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "break",
    "default",
    "try",
    "catch",
    "finally",
    "throw",
    "class",
    "import",
    "export",
];
// --- Track last 10 recently typed words ---
const recentWords = [];
// --- Map for words flagged as errors by diagnostics ---
const errorWords = new Map();
// --- Strikethrough decoration ---
const strikeDecoration = vscode.window.createTextEditorDecorationType({
    textDecoration: "line-through red",
});
// --- Helper: Compute nearest keyword ---
function getNearestKeyword(word) {
    if (keywords.includes(word))
        return null;
    if (recentWords.includes(word))
        return null;
    let best = null;
    let minDist = Infinity;
    for (const k of keywords) {
        const d = fast_levenshtein_1.default.get(word, k);
        if (d < minDist && d <= 3) {
            minDist = d;
            best = k;
        }
    }
    for (const k of recentWords) {
        const d = fast_levenshtein_1.default.get(word, k);
        if (d < minDist && d <= 3) {
            minDist = d;
            best = k;
        }
    }
    //   if (best) console.log(`🔍 Suggestion for '${word}' -> '${best}'`);
    return best;
}
// --- Track recent words typed (last 10) ---
function trackRecentWord(word) {
    if (!recentWords.includes(word))
        recentWords.push(word);
    if (recentWords.length > 10)
        recentWords.shift();
}
// --- Update errorWords from diagnostics ---
function updateErrorWords(document) {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    errorWords.clear();
    diagnostics
        .filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
        .forEach((d) => {
        const word = document.getText(d.range);
        if (!keywords.includes(word) && /^[a-zA-Z_$][\w$]*$/.test(word)) {
            if (!errorWords.has(word))
                errorWords.set(word, []);
            errorWords.get(word)?.push(d.range);
        }
    });
}
// --- Apply strikethrough ---
function updateStrikethrough(editor) {
    if (!editor)
        return;
    const decorations = [];
    const text = editor.document.getText();
    // Error words
    for (const [word, ranges] of errorWords) {
        const suggestion = getNearestKeyword(word);
        if (suggestion) {
            ranges.forEach((range) => decorations.push({ range }));
        }
    }
    editor.setDecorations(strikeDecoration, decorations);
}
async function getAllSymbols(document) {
    const symbols = await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", document.uri);
    const names = [];
    function traverse(symbols) {
        if (!symbols)
            return;
        for (const sym of symbols) {
            names.push(sym.name);
            if (sym.children.length > 0)
                traverse(sym.children);
        }
    }
    traverse(symbols);
    return names;
}
// --- Refresh function ---
async function refresh(editor) {
    const activeEditor = editor || vscode.window.activeTextEditor;
    if (!activeEditor)
        return;
    // Extract all symbols
    const symbols = await getAllSymbols(activeEditor.document);
    recentWords.length = 0;
    // Merge into keywords dynamically (avoid duplicates)
    for (const sym of symbols) {
        if (!keywords.includes(sym))
            recentWords.push(sym);
    }
    //   logger.info(recentWords);
    updateErrorWords(activeEditor.document);
    updateStrikethrough(activeEditor);
}
// --- Main Activation ---
function activate(context) {
    const logger = require('./logger');
    logger.info("✅ JS Keyword Suggest extension activated!");
    // --- Auto refresh every 5 seconds ---
    const interval = setInterval(() => refresh(), 5000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
    // --- Track document changes ---
    vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== event.document)
            return;
        for (const change of event.contentChanges) {
            const words = change.text.match(/\b\w+\b/g);
            if (words)
                words.forEach(trackRecentWord);
        }
        refresh(editor);
    });
    // --- Track diagnostics changes ---
    vscode.languages.onDidChangeDiagnostics((event) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        event.uris.forEach((uri) => {
            if (editor.document.uri.toString() === uri.toString()) {
                refresh(editor);
            }
        });
    });
    // --- Track active editor change (file open) ---
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor)
            return;
        setTimeout(() => refresh(editor), 200); // delay for diagnostics
    });
    // --- CodeLens Provider ---
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: "javascript" }, {
        provideCodeLenses(document) {
            const lenses = [];
            for (const [word, ranges] of errorWords) {
                const suggestion = getNearestKeyword(word);
                if (!suggestion)
                    continue;
                ranges.forEach((range) => lenses.push(new vscode.CodeLens(range, {
                    title: `Replace with '${suggestion}'`,
                    command: "js-keyword-suggest.fixTypo",
                    arguments: [document.uri, range, suggestion],
                })));
            }
            return lenses;
        },
    }));
    // --- Command to replace typo ---
    context.subscriptions.push(vscode.commands.registerCommand("js-keyword-suggest.fixTypo", async (uri, range, replacement) => {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, range, replacement);
        const success = await vscode.workspace.applyEdit(edit);
        if (!success)
            return;
        // Refresh after replacement (small delay for diagnostics)
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.toString() === uri.toString()) {
            setTimeout(() => refresh(editor), 100);
        }
    }));
    // --- Initial refresh ---
    setTimeout(() => refresh(), 300);
}
function deactivate() {
    const logger = require('./logger');
    logger.info("🧹 JS Keyword Suggest extension deactivated.");
}
//# sourceMappingURL=extension.js.map