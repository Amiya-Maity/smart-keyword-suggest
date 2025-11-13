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

  // helper: is candidate a subsequence of word characters (keeps original order)
  function isSubsequence(source: string, target: string): boolean {
    let i = 0;
    for (let j = 0; j < source.length && i < target.length; j++) {
      if (source[j] === target[i]) i++;
    }
    return i === target.length;
  }

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
    // Put symbols first in candidates so they get a small ranking advantage
    let candidates = [...symbols, ...keywords];

    // Exclude exact matches
    candidates = candidates.filter((c) => c !== word);

    // Filter by length difference
    const filtered = candidates.filter(
      (c) => Math.abs(c.length - word.length) <= maxDistance
    );

    // Compute distances and a combined score that prefers in-scope symbols,
    // subsequence matches and candidates that start with same character.
    const candidateObjs: {
      candidate: string;
      dist: number;
      score: number;
      isSymbol: boolean;
    }[] = filtered
      .map((c) => {
        const dist = levenshtein.get(word, c);
        const isSymbol = symbols.includes(c);
        // base score is distance, then apply small adjustments:
        // - prefer symbols (subtract bonus)
        // - prefer subsequence matches (subtract bonus)
        // - prefer same starting character (subtract small bonus)
        // Lower score = better
        let score = dist * 100; // scale to keep integer weights
        if (isSymbol) score -= 300; // strong preference for in-scope symbols
        if (isSubsequence(word, c)) score -= 150;
        if (c[0] === word[0]) score -= 50;
        // small tie-breaker using length closeness
        score += Math.abs(c.length - word.length);
        return { candidate: c, dist, score, isSymbol };
      })
      .filter((c) => c.dist <= maxDistance);

    // Sort by score first (our custom ranking), then by raw distance, then alphabetically
    candidateObjs.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.candidate.localeCompare(b.candidate);
    });

    // --- Pick top suggestions (prefer a few distinct distances but prioritize score) ---
    const topCandidates: string[] = [];
    const seen = new Set<string>();
    for (const obj of candidateObjs) {
      if (topCandidates.length >= 5) break; // limit results
      if (seen.has(obj.candidate)) continue;
      topCandidates.push(obj.candidate);
      seen.add(obj.candidate);
    }

    suggestionCache.set(cacheKey, topCandidates);
    result[word] = topCandidates;
  }

  return result;
}
