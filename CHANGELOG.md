# Changelog

[![VSCode](https://img.shields.io/badge/VSCode-Extension-blue)](https://marketplace.visualstudio.com/)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow)]
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)]
[![Python](https://img.shields.io/badge/Language-Python-green)]
[![Java](https://img.shields.io/badge/Language-Java-orange)]

All notable changes to this project will be documented in this file.  
Versioning follows [SemVer](https://semver.org/).

---

## [0.1.0] - 2025-11-11
### Added
- Full **multi-language support**: JavaScript, TypeScript, Python, and Java.
- Detects **typos in keywords** and **undeclared variables** using VSCode diagnostics.
- Inline **CodeLens suggestions** for quick fixes.
- Red **strikethrough decorations** for flagged words.
- Commands registered:
  - `smart-keyword-suggest.fixTypo` – Fix the typo.
  - `smart-keyword-suggest.refresh` – Refresh keyword suggestions.
- Keyboard shortcuts:
  - `Ctrl+Alt+F` → Fix typo.
  - `Ctrl+Alt+R` → Refresh suggestions.
- Debounced diagnostics updates for better performance.
- Symbol caching to reduce repeated scope traversal.
- Optimized suggestion mapping: batch mapping of all error words at once.

### Changed
- Immediate refresh of strikethrough decorations and CodeLens after typo correction.
- Reduced perceived delay using **debounce** and **immediate updates**.

### Fixed
- Typo styling now removes correctly after fixing a word.
- Corrected words no longer reappear as errors after fixing (`pott → pot` bug fixed).
- Only updates diagnostics for the **active editor**.
- Avoided duplicate CodeLens creation.

---

## [0.2.0] - 2025-11-12
### Added
- Tracks **variable names and symbols** in addition to keywords for better suggestion accuracy.
- Suggestions now consider **in-scope variables** and user-defined symbols.
- Enhanced CodeLens: multiple suggestions for a single error word when relevant.
- Optional: add custom keywords dynamically per language.

### Changed
- Optimized performance for **large files**:
  - Cached symbols per document.
  - Batch computation of nearest keywords for all error words.
- Debounced updates now **trigger faster perceived response** while avoiding unnecessary computation.

### Fixed
- Fixed bug where styling or CodeLens would **lag or persist incorrectly** after typo correction.
- Corrected multiple nested loops causing duplicate CodeLens for same word.
- Proper handling of special characters and trimmed words in suggestions.
- Prevented reappearance of previously fixed variable names or typos.

### Removed
- Removed redundant logs and unused variables for cleaner console output.

---

## [0.2.1] - 2025-11-12
### Fixed
- Leave the warnings, hints and info for suggestion in TS/JS.
### Planned Features
- User-configurable keywords.
- Incremental diagnostics for **very large files**.
- Undo last fix support.
- Suggestions for cross-file undeclared variables and dynamic imports.
