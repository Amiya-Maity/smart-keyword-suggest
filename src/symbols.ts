import * as vscode from "vscode";
import * as ts from "typescript";

/**
 * Main function: returns all symbols (variables, functions, classes, etc.)
 * For JS/TS → delegates to getTSSymbols()
 * For others → uses VSCode DocumentSymbolProvider
 */
export async function getSymbolsInScope(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<string[]> {
  const languageId = document.languageId;
  let names: string[] = [];

  if (languageId === "typescript" || languageId === "javascript") {
    // --- Use TypeScript AST for JS/TS files ---
    names = getTSSymbols(document);
  } else {
    // --- Fallback: Use VSCode’s DocumentSymbolProvider ---
    try {
      const symbols = await vscode.commands.executeCommand<
        vscode.DocumentSymbol[]
      >("vscode.executeDocumentSymbolProvider", document.uri);

      function traverse(symbols: vscode.DocumentSymbol[] | undefined) {
        if (!symbols) return;
        for (const sym of symbols) {
          if (!names.includes(sym.name)) names.push(sym.name);
          if (sym.children && sym.children.length > 0) traverse(sym.children);
        }
      }

      traverse(symbols);
    } catch (err) {
      console.error("Error fetching document symbols:", err);
    }
  }

  console.log("Symbols in scope:", names);
  return names;
}

/**
 * Scope-aware symbol collector for JS/TS
 */
function getTSSymbols(document: vscode.TextDocument): string[] {
  const source = ts.createSourceFile(
    document.fileName,
    document.getText(),
    ts.ScriptTarget.Latest,
    true
  );

  type Scope = Set<string>;
  const scopes: Scope[] = []; // stack of scopes
  const allSymbols: string[] = [];

  /** Enter a new scope */
  function pushScope() {
    scopes.push(new Set());
  }

  /** Exit current scope */
  function popScope() {
    scopes.pop();
  }

  /** Add symbol to current scope and global list */
  function addSymbol(name: string) {
    if (scopes.length) scopes[scopes.length - 1].add(name);
    if (!allSymbols.includes(name)) allSymbols.push(name);
  }

  /** Recursive AST traversal */
  function traverse(node: ts.Node) {
    // --- Enter new scope for functions or blocks ---
    let enterNewScope = false;
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isBlock(node) // blocks {} for let/const
    ) {
      pushScope();
      enterNewScope = true;
    }

    // --- Function declaration name ---
    if (ts.isFunctionDeclaration(node) && node.name) {
      addSymbol(node.name.getText());
    }

    // --- Function parameters ---
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)) &&
      node.parameters
    ) {
      node.parameters.forEach((param) => {
        if (ts.isIdentifier(param.name)) addSymbol(param.name.text);
      });
    }

    // --- Variable declarations ---
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      addSymbol(node.name.text);
    }

    // --- Object method shorthand / property assignment ---
    if (ts.isPropertyAssignment(node) && node.name) {
      if (
        ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer)
      ) {
        addSymbol(node.name.getText());
      }
    }

    if (ts.isMethodDeclaration(node) && node.name) {
      addSymbol(node.name.getText());
      node.parameters.forEach((p) => {
        if (ts.isIdentifier(p.name)) addSymbol(p.name.text);
      });
    }

    // --- Class & Interface declarations ---
    if (ts.isClassDeclaration(node) && node.name)
      addSymbol(node.name.getText());
    if (ts.isInterfaceDeclaration(node)) addSymbol(node.name.text);

    // --- Recurse into children ---
    node.forEachChild(traverse);

    // --- Exit scope ---
    if (enterNewScope) popScope();
  }

  traverse(source);
  return allSymbols;
}
