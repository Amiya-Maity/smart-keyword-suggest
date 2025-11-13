# Smart Keyword Suggest v0.2.3

![VSCode](https://img.shields.io/badge/VSCode-Extension-blue) ![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow) ![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue) ![Python](https://img.shields.io/badge/Language-Python-green) ![Java](https://img.shields.io/badge/Language-Java-orange)

**Smart Keyword Suggest** is a Visual Studio Code extension that detects **typos in language keywords and variable names** for JavaScript, TypeScript, Python, and Java. It provides **inline suggestions, strikethrough highlighting**, and **quick fixes** to improve code quality and reduce bugs.

---

## Features

- ✅ Supports **JavaScript, TypeScript, Python, Java, JSX, and TSX**.
- ✅ Detects **typos in keywords and variables**.
- ✅ Highlights errors with **red strikethrough decorations**.
- ✅ Suggests **nearest correct keywords or symbols** using Levenshtein distance.
- ✅ Tracks **in-scope variables and symbols** for accurate suggestions.
- ✅ **Per-range suggestions**: Same word at different positions gets different suggestions based on local scope.
- ✅ **Diagnostic-first suggestions**: TS/ESLint suggestions appear first, followed by extension suggestions.
- ✅ **Max 3 suggestions per range** to keep CodeLens clean and focused.
- ✅ Provides **inline CodeLens suggestions** to quickly replace typos.
- ✅ Commands:
  - `Fix Typo` – Instantly replace a typo.
  - `Refresh Suggestions` – Refresh CodeLens and diagnostics manually.
- ✅ Keyboard shortcuts:
  - `Ctrl+Alt+F` → Fix typo.
  - `Ctrl+Alt+R` → Refresh suggestions.
- ✅ Debounced updates for **fast perceived response**.
- ✅ Symbol caching for performance in **large files**.
- ✅ **Centralized logging** with `[smart-keyword-suggest]` prefix for easy filtering.

---

## Installation

1. Install from VSCode Marketplace or load the extension from VSIX.
2. Open a supported language file mentioned in features.
3. Ensure TypeScript checking (`checkJs`) is enabled for JavaScript/TypeScript for undeclared variable detection (optional).

```json
{
  "compilerOptions": {
    "checkJs": true,
    "noEmit": true,
    "target": "ES2020"
  },
  "include": ["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx"]
}
```

---

## Usage

1. **Typo Detection:**

   - Misspelled keywords or undeclared variables are automatically highlighted with **red strikethrough**.
   - Hover or click **CodeLens** to see replacement suggestions.

2. **Fixing Typos:**

   - Click a CodeLens suggestion to replace the typo.
   - Strikethrough decoration and CodeLens update immediately.

3. **Manual Refresh:**

   - Run `Refresh Keyword Suggestions` from the Command Palette or press `Ctrl+Alt+R` to manually refresh suggestions and decorations.

4. **Scope-Aware Suggestions:**

   - The same word at different positions in your code receives tailored suggestions based on the local scope.
   - Example: `timere` at line 5 might suggest `timer` based on scope A, while `timere` at line 15 might suggest `tmer` based on scope B.

---

## Configuration

No extra configuration is needed. Optional:

- Add custom keywords to the `keywords` array in the extension source.
- Adjust debounce delay for perceived speed in `extension.ts`.

---

## Example

```javascript
functon greet(name) {
  consol.log("Hello " + name); // ❌ 'functon' and 'consol' highlighted
}

let timere = "test"; // ❌ 'timere' highlighted
```

- Suggestions:

  - Replace `'functon'` → `'function'`.
  - Replace `'consol'` → `'console'`.
  - Replace `'timere'` → `'timer'` (primary from diagnostic) + `'tmer'`, `'texttimer'` (similar candidates, max 3 total).

---

## Tech Stack

- VSCode Extension API
- TypeScript & JavaScript
- Levenshtein distance (`fast-levenshtein`)
- Regex & CodeLens for inline suggestions
- Symbol caching and debounced updates for performance
- Centralized logger with prefixed output for filtering

---

## What's New in v0.2.3

- **Per-Range Scope-Aware Suggestions**: Same word at different positions now receives different suggestions based on local scope.
- **Merged Diagnostics**: Multiple diagnostics for the same word and range are merged with deduplicated suggestions.
- **Diagnostic-First Ordering**: TS/ESLint suggestions appear first in CodeLens, followed by extension suggestions.
- **Max 3 Suggestions**: CodeLens now shows at most 3 suggestions per range to keep the editor clean.
- **JSX/TSX Support**: Special handling for JSX and TSX files with improved parse error filtering.
- **Centralized Logging**: All console logs use the `[smart-keyword-suggest]` prefix for easy filtering in the extension host output.

---

## Known Limitations

- Best used with **plain files** and modern language modules.
- Undeclared variable detection depends on TypeScript or ESLint configuration.
- Cross-file variable tracking is not yet supported.

---

## Contributing

1. Mail at `amiyamaity7105@gmail.com` for collaboration or feedback.
2. Make changes locally or request features.
3. Submit feedback or updated version for review.
4. Send back your improved version for review. If your changes help others — I'll publish them to the Marketplace with **proper credits** 🏅

---

## License

MIT License © 2025
