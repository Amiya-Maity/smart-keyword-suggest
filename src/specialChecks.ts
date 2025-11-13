import vscode from "vscode";
export function specialChecks(
  diag: vscode.Diagnostic,
  languageId: string
): boolean {
  if (languageId === "typescript") return checkTypescript(diag);
  if (languageId === "javascript") return checkJavascript(diag);
  if (languageId === "python") return checkPython(diag);
  return false;
}

export function checkTypescript(diag: vscode.Diagnostic): boolean {
  if (String(diag.severity) === "Error") console.log(JSON.stringify(diag));
  else return true;
  if ([7006, 6133, 2588].includes(Number(diag.code))) return true;
  else if (diag.message.includes("Expected {")) return true;
  else if ([2304, 1435].includes(Number(diag.code))) return false;
  return false;
}
export function checkJavascript(diag: vscode.Diagnostic): boolean {
  if (String(diag.severity) === "Error") console.log(JSON.stringify(diag));
  else return true;
  if ([7006, 6133, 2588].includes(Number(diag.code))) return true;
  else if (diag.message.includes("Expected {")) return true;
  else if ([2304, 1435].includes(Number(diag.code))) return false;
  return false;
}
export function checkPython(diag: vscode.Diagnostic): boolean {
  if (
    diag.severity === vscode.DiagnosticSeverity.Error ||
    diag.severity === vscode.DiagnosticSeverity.Warning
  ) {
    console.log(JSON.stringify(diag));
  } else return true;
  if (diag.message.includes("is not accessed")) return true;
  if (diag.message === "Expected indented block") return true;
  return false;
}

//{"severity":"Warning","message":"\"fuf\" is not defined","range":[{"line":8,"character":0},{"line":8,"character":3}],"source":"Pylance","code":{"value":"reportUndefinedVariable","target":{"$mid":1,"path":"/microsoft/pylance-release/blob/main/docs/diagnostics/reportUndefinedVariable.md","scheme":"https","authority":"github.com"}}}
