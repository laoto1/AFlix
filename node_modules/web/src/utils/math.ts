/**
 * Parses a chapter identifier string into a numeric float.
 * Examples:
 *   "10"        → 10
 *   "10.5"      → 10.5
 *   "Chương 10" → 10
 *   "Chapter 3" → 3
 *   undefined   → 0
 */
export function parseChapterNumber(chapterStr: string | undefined | null): number {
    if (!chapterStr) return 0;
    // Extract the first decimal number found in the string
    const match = chapterStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
}
