import vscode from "vscode";
import { info } from "./logger";

export function specialChecks(
  diag: vscode.Diagnostic,
  languageId: string
): boolean {
  // route TSX/JSX files to the corresponding checks
  if (languageId === "typescript" || languageId === "typescriptreact")
    return checkTypescript(diag);
  if (languageId === "javascript" || languageId === "javascriptreact")
    return checkJavascript(diag);
  if (languageId === "python") return checkPython(diag);
  return true;
}

function codeNumber(code: any): number {
  if (code == null) return NaN;
  if (typeof code === "object" && "value" in code) return Number(code.value);
  return Number(code);
}

export function checkTypescript(diag: vscode.Diagnostic): boolean {
  if (diag.severity === vscode.DiagnosticSeverity.Error) {
    info(JSON.stringify(diag));
  }

  const code = codeNumber(diag.code);
  if ([7006, 6133, 2588, 2322].includes(code)) return true;

  const msg = (diag.message || "").toLowerCase();
  // ignore JSX/TSX parse errors and structural messages
  if (msg.includes("jsx") || msg.includes("tsx")) return true;
  if (msg.includes("expected {") || msg.includes("'{' expected")) return true;

  if ([2304, 1435].includes(code)) return false;
  return false;
}

export function checkJavascript(diag: vscode.Diagnostic): boolean {
  if (diag.severity === vscode.DiagnosticSeverity.Error) {
    info(JSON.stringify(diag));
  }

  const code = codeNumber(diag.code);
  if ([7006, 6133, 2588, 2322].includes(code)) return true;

  const msg = (diag.message || "").toLowerCase();
  if (msg.includes("jsx") || msg.includes("tsx")) return true;
  if (msg.includes("expected {") || msg.includes("'{' expected")) return true;

  if ([2304, 1435].includes(code)) return false;
  return false;
}

export function checkPython(diag: vscode.Diagnostic): boolean {
  if (
    diag.severity === vscode.DiagnosticSeverity.Error ||
    diag.severity === vscode.DiagnosticSeverity.Warning
  ) {
    info(JSON.stringify(diag));
  } else return true;
  if (diag.message.includes("is not accessed")) return true;
  if (diag.message === "Expected indented block") return true;
  return false;
}

//{"severity":"Warning","message":"\"fuf\" is not defined","range":[{"line":8,"character":0},{"line":8,"character":3}],"source":"Pylance","code":{"value":"reportUndefinedVariable","target":{"$mid":1,"path":"/microsoft/pylance-release/blob/main/docs/diagnostics/reportUndefinedVariable.md","scheme":"https","authority":"github.com"}}}
