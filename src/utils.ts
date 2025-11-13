import levenshtein from "fast-levenshtein";

// --- Keywords per language ---
export const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  javascript: [
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
    "new",
  ],
  typescript: [
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
    "new",
    "interface",
    "implements",
    "extends",
    "readonly",
    "type",
    "enum",
    "as",
  ],
  python: [
    "def",
    "return",
    "print",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "break",
    "continue",
    "class",
    "import",
    "from",
    "pass",
    "raise",
    "try",
    "except",
    "finally",
    "with",
    "as",
    "lambda",
    "global",
    "nonlocal",
    "yield",
  ],
  java: [
    "public",
    "private",
    "protected",
    "class",
    "interface",
    "enum",
    "extends",
    "implements",
    "void",
    "int",
    "double",
    "float",
    "char",
    "boolean",
    "return",
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "break",
    "continue",
    "try",
    "catch",
    "finally",
    "throw",
    "new",
    "import",
    "package",
  ],
};

/**
 * Finds the nearest keyword to a given word based on Levenshtein distance.
 * Also considers symbols in scope.
 */

// --- Cache for CodeLens suggestions to avoid recomputation ---
const suggestionCache = new Map<string, string[]>();

/**
 * Returns nearest keyword suggestions for one or multiple words
 */
export function getNearestKeywords(
  words: string[] | string,
  symbols: string[] = [],
  languageId: string = "javascript",
  maxDistance: number = 5
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const wordsArr = Array.isArray(words) ? words : [words];

  for (let word of wordsArr) {
    word = word.replace(/^[^\w$]+|[^\w$]+$/g, "");
    if (!word) {
      result[word] = [];
      continue;
    }

    const cacheKey = `${languageId}:${word}`;
    if (suggestionCache.has(cacheKey)) {
      result[word] = suggestionCache.get(cacheKey)!;
      continue;
    }

    const keywords = LANGUAGE_KEYWORDS[languageId] || [];
    let candidates = [...keywords, ...symbols];

    // Exclude exact matches
    candidates = candidates.filter((c) => c !== word);

    // Filter by length difference
    const filtered = candidates.filter(
      (c) => Math.abs(c.length - word.length) <= maxDistance
    );

    // Compute distances
    const candidateObjs: { candidate: string; dist: number }[] = filtered.map(
      (c) => ({ candidate: c, dist: levenshtein.get(word, c) })
    ).filter((c) => c.dist <= maxDistance);

    // Sort by distance ascending
    candidateObjs.sort((a, b) => a.dist - b.dist);

    // --- Pick top 2 distances ---
    const topCandidates: string[] = [];
    const distancesAdded = new Set<number>();

    for (const obj of candidateObjs) {
      if (distancesAdded.size < 2 || distancesAdded.has(obj.dist)) {
        topCandidates.push(obj.candidate);
        distancesAdded.add(obj.dist);
      } else {
        break; // already collected top 2 distances
      }
    }
    
    suggestionCache.set(cacheKey, topCandidates);
    result[word] = topCandidates;
  }

  return result;
}
