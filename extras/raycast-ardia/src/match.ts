export type SearchFields = { title: string; host: string };

export type Ranked<T> = { matches: T[]; others: T[] };

const MIN_WORD_START_QUERY = 2;

export function fold(text: string) {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

const isWordCharacter = (character: string | undefined) => character !== undefined && /[\p{L}\p{N}]/u.test(character);

function startsWordAt(text: string, phrase: string) {
  let index = text.indexOf(phrase, 1);
  while (index !== -1) {
    if (!isWordCharacter(text[index - 1])) return true;
    index = text.indexOf(phrase, index + 1);
  }
  return false;
}

function matchTier(phrase: string, words: string[], title: string, host: string): number | undefined {
  if (title.startsWith(phrase)) return 0;
  if (startsWordAt(title, phrase)) return 1;
  if (title.includes(phrase)) return 2;
  if (host.includes(phrase)) return 3;
  if (words.length > 1 && words.every((word) => title.includes(word) || host.includes(word))) return 4;
  return undefined;
}

function titleWords(title: string) {
  return title.split(/[^\p{L}\p{N}]+/u).filter((word) => word !== "");
}

export type WordStartMatch = { first: number; span: number };

export function wordStartMatch(query: string, words: string[]): WordStartMatch | undefined {
  const lastWordFrom = new Map<string, number | undefined>();
  const lastWord = (queryIndex: number, wordIndex: number): number | undefined => {
    const key = `${queryIndex}:${wordIndex}`;
    if (lastWordFrom.has(key)) return lastWordFrom.get(key);
    let best: number | undefined;
    for (let w = wordIndex; w < words.length; w++) {
      const end = consume(queryIndex, w);
      if (end !== undefined && (best === undefined || end < best)) best = end;
    }
    lastWordFrom.set(key, best);
    return best;
  };
  const consume = (queryIndex: number, w: number): number | undefined => {
    const word = words[w];
    let best: number | undefined;
    for (let k = 1; k <= word.length && queryIndex + k <= query.length; k++) {
      if (word[k - 1] !== query[queryIndex + k - 1]) break;
      const end = queryIndex + k === query.length ? w : lastWord(queryIndex + k, w + 1);
      if (end !== undefined && (best === undefined || end < best)) best = end;
    }
    return best;
  };
  let best: WordStartMatch | undefined;
  for (let first = 0; first < words.length; first++) {
    const end = consume(0, first);
    if (end !== undefined && (best === undefined || end - first < best.span)) best = { first, span: end - first };
  }
  return best;
}

export function rank<T>(items: T[], query: string, fieldsOf: (item: T) => SearchFields): Ranked<T> {
  const words = fold(query)
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return { matches: items, others: [] };
  const phrase = words.join(" ");
  const letters = words.join("");
  const matches: { item: T; tier: number }[] = [];
  const others: { item: T; match: WordStartMatch }[] = [];
  for (const item of items) {
    const { title: rawTitle, host: rawHost } = fieldsOf(item);
    const title = fold(rawTitle);
    const tier = matchTier(phrase, words, title, fold(rawHost));
    if (tier !== undefined) {
      matches.push({ item, tier });
      continue;
    }
    if (letters.length < MIN_WORD_START_QUERY) continue;
    const match = wordStartMatch(letters, titleWords(title));
    if (match !== undefined) others.push({ item, match });
  }
  return {
    matches: matches.sort((a, b) => a.tier - b.tier).map(({ item }) => item),
    others: others.sort((a, b) => a.match.span - b.match.span || a.match.first - b.match.first).map(({ item }) => item),
  };
}
