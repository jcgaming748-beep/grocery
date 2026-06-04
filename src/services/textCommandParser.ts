export type TextCommand =
  | { type: 'add'; quantity: number; productName: string; unitPrice?: number }
  | { type: 'update'; productName: string; quantity: number }
  | { type: 'remove'; productName: string };

const ADD_PATTERN =
  /(?:add|put)\s+(\d+(?:\.\d+)?)\s+(?:(?:\w+\s+)?of\s+)?(.+?)(?:\s+at\s+\$?(\d+(?:\.\d+)?))?$/i;

const UPDATE_PATTERN = /(?:change|update|set)\s+(.+?)\s+(?:to|quantity to)\s+(\d+(?:\.\d+)?)/i;

const REMOVE_PATTERN = /(?:remove|delete)\s+(.+)/i;

export function parseTextCommand(input: string): TextCommand | null {
  const text = input.trim();
  if (!text) return null;

  const addMatch = text.match(ADD_PATTERN);
  if (addMatch) {
    return {
      type: 'add',
      quantity: parseFloat(addMatch[1]),
      productName: addMatch[2].trim(),
      unitPrice: addMatch[3] ? parseFloat(addMatch[3]) : undefined,
    };
  }

  const updateMatch = text.match(UPDATE_PATTERN);
  if (updateMatch) {
    return {
      type: 'update',
      productName: updateMatch[1].trim(),
      quantity: parseFloat(updateMatch[2]),
    };
  }

  const removeMatch = text.match(REMOVE_PATTERN);
  if (removeMatch) {
    return {
      type: 'remove',
      productName: removeMatch[1].trim(),
    };
  }

  return null;
}

export function fuzzyMatchProductName(query: string, candidates: string[]): string | null {
  const normalized = query.toLowerCase();

  const exact = candidates.find((name) => name.toLowerCase() === normalized);
  if (exact) return exact;

  const partial = candidates.find((name) => name.toLowerCase().includes(normalized));
  if (partial) return partial;

  return candidates.find((name) => normalized.includes(name.toLowerCase())) ?? null;
}
