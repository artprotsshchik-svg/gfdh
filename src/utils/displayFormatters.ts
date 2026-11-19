/**
 * UI display formatters for Phase A5:
 * Strips download counts, CF/MR tags, and update dates from user-facing strings
 * while keeping underlying MODS_DATABASE intact for matching and scoring logic.
 */

export function cleanStatusLabel(label: string): string {
  if (!label) return '';
  let out = label
    // Remove parenthetical download/source/date counters like "(84M+ CF)", "(20M+ MR)", "(10.2026)"
    .replace(/\s*\([^)]*(?:\b(?:CF|MR|CurseForge|Modrinth)\b|\d+(?:\.\d+)?[kKmM]\+|\b\d{2}\.\d{4}\b|\b202\d\b|скач)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out || label;
}

export function cleanModDescription(description: string): string {
  if (!description) return '';
  let out = description
    // Remove parenthetical download counts, CF/MR mentions, and dates
    .replace(/\s*\([^)]*(?:\b(?:CF|MR|CurseForge|Modrinth)\b|\d+(?:\.\d+)?[kKmM]\+|скачиван|обновлен|\b\d{2}\.\d{4}\b|\b202\d\b)[^)]*\)/gi, '')
    // Remove inline CF/MR source tags if outside parens
    .replace(/\bна\s+(?:CurseForge|Modrinth|CF|MR)\b/gi, '')
    .replace(/\s*\(\s*\)/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out;
}

export function formatShortOneLineDescription(description: string, maxLength = 120): string {
  const cleaned = cleanModDescription(description);
  // Match first sentence ending in '.', '!' or '?' followed by space or end-of-string (so 1.20.1 does not split at '1.')
  const firstSentenceMatch = cleaned.match(/^(?:[^.!?]|[.!?](?!\s|$))+[.!?](?=\s|$)/);
  const candidate = firstSentenceMatch && firstSentenceMatch[0].length >= 24 ? firstSentenceMatch[0] : cleaned;
  if (candidate.length <= maxLength) return candidate;
  return candidate.slice(0, maxLength - 1).trimEnd() + '…';
}
