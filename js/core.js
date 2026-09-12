export const types = { word: "單字", phrase: "片語", grammar: "文法" };
export const normalize = (value) =>
  String(value).normalize("NFKC").trim().toLowerCase();
export function validate(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.items))
    throw new Error("資料格式不正確，請檢查 version 與 items。");
  const ids = new Set();
  for (const item of data.items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      !Object.hasOwn(types, item.type) ||
      !["term", "meaning", "example", "createdAt"].every(
        (k) => typeof item[k] === "string",
      ) ||
      !item.term.trim() ||
      !item.meaning.trim() ||
      !Number.isFinite(Date.parse(item.createdAt)) ||
      !["tags", "synonyms"].every(
        (k) =>
          Array.isArray(item[k]) && item[k].every((v) => typeof v === "string"),
      ) ||
      (item.type === "grammar" && !item.example.trim())
    )
      throw new Error("資料包含不完整或重複的項目。");
    ids.add(item.id);
  }
  return data;
}
export function selectItems(
  items,
  query = "",
  type = "all",
  tag = "",
  sort = "newest",
) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const result = items.filter(
    (i) =>
      (type === "all" || i.type === type) &&
      (!tag || i.tags.includes(tag)) &&
      words.every((w) =>
        normalize(
          [i.term, i.meaning, i.example, ...i.tags, ...i.synonyms].join(" "),
        ).includes(w),
      ),
  );
  return result.sort((a, b) =>
    sort === "az"
      ? a.term.localeCompare(b.term, "en")
      : sort === "za"
        ? b.term.localeCompare(a.term, "en")
        : sort === "oldest"
          ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
          : Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeQuiz(items) {
  const eligible = items.filter((i) =>
    items.some((other) => normalize(other.meaning) !== normalize(i.meaning)),
  );
  return shuffle(eligible)
    .slice(0, 10)
    .map((item) => {
      const distractors = [
        ...new Set(
          items
            .filter((i) => normalize(i.meaning) !== normalize(item.meaning))
            .map((i) => i.meaning),
        ),
      ];
      return {
        item,
        options: shuffle([item.meaning, ...shuffle(distractors).slice(0, 3)]),
      };
    });
}
export function encode(data) {
  return btoa(
    Array.from(
      new TextEncoder().encode(JSON.stringify(data, null, 2) + "\n"),
      (b) => String.fromCharCode(b),
    ).join(""),
  );
}
export function decode(value) {
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(value.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
    ),
  );
}
