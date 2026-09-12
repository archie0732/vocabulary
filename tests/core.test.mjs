import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate, selectItems, makeQuiz, encode, decode } from "../js/core.js";
import { readRepository, writeRepository } from "../js/github.js";
const data = JSON.parse(
  readFileSync(new URL("../data/entries.json", import.meta.url)),
);
test("sample data is valid and Chinese round-trips through GitHub encoding", () => {
  assert.equal(validate(data), data);
  assert.deepEqual(decode(encode(data)), data);
});
test("search covers translation, synonyms, tags and case-insensitive phrases", () => {
  assert.ok(
    selectItems(data.items, "幸運").some((i) => i.term === "serendipity"),
  );
  assert.ok(
    selectItems(data.items, "INQUISITIVE").some((i) => i.term === "curious"),
  );
  assert.ok(selectItems(data.items, "口語", "phrase").length);
  assert.equal(
    selectItems(data.items, "ON THE SAME PAGE")[0].term,
    "on the same page",
  );
  assert.equal(selectItems(data.items, "unlikely query").length, 0);
});
test("type and tag filters combine and all four sort directions work", () => {
  const subset = selectItems(data.items, "", "word", "TOEIC");
  assert.ok(subset.length);
  assert.ok(subset.every((i) => i.type === "word" && i.tags.includes("TOEIC")));
  for (const [a, b] of [
    ["az", "za"],
    ["newest", "oldest"],
  ])
    assert.deepEqual(
      selectItems(data.items, "", "all", "", a).map((i) => i.id),
      selectItems(data.items, "", "all", "", b)
        .map((i) => i.id)
        .reverse(),
    );
});
test("quiz uses ten distinct entries with exactly one correct option", () => {
  for (let n = 0; n < 30; n++) {
    const quiz = makeQuiz(data.items);
    assert.equal(quiz.length, 10);
    assert.equal(new Set(quiz.map((q) => q.item.id)).size, 10);
    for (const q of quiz) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert.equal(q.options.filter((o) => o === q.item.meaning).length, 1);
    }
  }
});
test("small or ambiguous datasets do not generate impossible questions", () => {
  assert.deepEqual(makeQuiz([]), []);
  assert.deepEqual(makeQuiz([data.items[0]]), []);
  assert.deepEqual(
    makeQuiz([
      data.items[0],
      { ...data.items[1], meaning: data.items[0].meaning.toUpperCase() },
    ]),
    [],
  );
  assert.equal(makeQuiz(data.items.slice(0, 2)).length, 2);
});
test("invalid data is rejected before persistence", () => {
  assert.throws(() => validate({ items: [] }));
  assert.throws(() =>
    validate({ ...data, items: [data.items[0], data.items[0]] }),
  );
  assert.throws(() =>
    validate({ ...data, items: [{ ...data.items[0], type: "constructor" }] }),
  );
  assert.throws(() =>
    validate({ ...data, items: [{ ...data.items[0], term: " " }] }),
  );
});
test("repository reads and writes preserve UTF-8 and use SHA protection", async () => {
  const oldFetch = global.fetch;
  try {
    global.fetch = async (url, options) => {
      assert.ok(
        url.startsWith(
          "https://api.github.com/repos/archie0732/vocabulary/contents/",
        ),
      );
      assert.equal(options.headers.Authorization, "Bearer test-token");
      return {
        ok: true,
        json: async () => ({ content: encode(data), sha: "current-sha" }),
      };
    };
    assert.deepEqual(await readRepository("test-token"), {
      data,
      sha: "current-sha",
    });
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(options.method, "PUT");
      assert.equal(body.sha, "current-sha");
      assert.equal(body.branch, "main");
      assert.deepEqual(decode(body.content), data);
      assert.ok(!body.content.includes("test-token"));
      return { ok: true, json: async () => ({ content: { sha: "new-sha" } }) };
    };
    assert.equal(
      await writeRepository("test-token", "current-sha", data),
      "new-sha",
    );
  } finally {
    global.fetch = oldFetch;
  }
});
test("conflicts and authentication failures surface without retrying writes", async () => {
  const oldFetch = global.fetch;
  try {
    for (const status of [401, 403, 404, 409, 422, 500]) {
      let calls = 0;
      global.fetch = async () => {
        calls++;
        return { ok: false, status };
      };
      await assert.rejects(writeRepository("test-token", "old-sha", data));
      assert.equal(calls, 1);
    }
  } finally {
    global.fetch = oldFetch;
  }
});
