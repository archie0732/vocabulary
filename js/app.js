import { types, validate, selectItems, makeQuiz } from "./core.js";
import { readRepository, writeRepository } from "./github.js";
const $ = (s) => document.querySelector(s);
let data = { version: 1, items: [] },
  token = "",
  sha = "",
  type = "all",
  editing = null,
  busy = false,
  pendingAdd = false;
const node = (tag, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
};
function status(message) {
  $("#status").textContent = message;
}
function render() {
  $("#stats").replaceChildren(
    ...Object.entries(types).map(([key, label]) => {
      const span = node("span");
      span.append(
        node("strong", data.items.filter((i) => i.type === key).length),
        document.createTextNode(` ${label}`),
      );
      return span;
    }),
  );
  const tag = $("#tag").value;
  $("#tag").replaceChildren(
    new Option("全部標籤", ""),
    ...[...new Set(data.items.flatMap((i) => i.tags))]
      .sort()
      .map((t) => new Option(t, t)),
  );
  $("#tag").value = [...$("#tag").options].some((o) => o.value === tag)
    ? tag
    : "";
  const items = selectItems(
    data.items,
    $("#search").value,
    type,
    $("#tag").value,
    $("#sort").value,
  );
  $("#count").textContent = `${items.length}`;
  $("#cards").replaceChildren(
    ...items.map((item) => {
      const card = node("article", undefined, "card");
      const top = node("div", undefined, "card-top");
      top.append(
        node("span", types[item.type], `badge ${item.type}`),
        node(
          "span",
          new Date(item.createdAt).toLocaleDateString("zh-TW"),
          "date",
        ),
      );
      card.append(
        top,
        node("h3", item.term),
        node("p", item.meaning, "meaning"),
      );
      if (item.synonyms.length && item.type !== "grammar")
        card.append(node("p", `≈ ${item.synonyms.join(" · ")}`, "synonyms"));
      if (item.example) card.append(node("blockquote", item.example));
      const bottom = node("div", undefined, "card-bottom");
      const tags = node("div", undefined, "tags");
      item.tags.forEach((tag) => {
        const b = node("button", `# ${tag}`);
        b.onclick = () => {
          $("#tag").value = tag;
          render();
        };
        tags.append(b);
      });
      bottom.append(tags);
      if (token) {
        const edit = node("button", "編輯", "edit");
        edit.onclick = () => openEditor(item);
        bottom.append(edit);
      }
      card.append(bottom);
      return card;
    }),
  );
  $("#empty").hidden = items.length > 0;
  $("#manage").textContent = token ? "● 已連線 · 管理" : "⚙ 管理收藏";
  $("#start-quiz").disabled = makeQuiz(data.items).length === 0;
}
async function load() {
  try {
    const response = await fetch("./data/entries.json", { cache: "no-store" });
    if (!response.ok) throw new Error("無法載入收藏資料。");
    data = validate(await response.json());
    status("");
    render();
  } catch (error) {
    status(`${error.message} 請重新整理頁面重試。`);
    $("#start-quiz").disabled = true;
  }
}
$("#search").oninput = render;
$("#sort").onchange = render;
$("#tag").onchange = render;
$("#types").onclick = (e) => {
  const button = e.target.closest("[data-type]");
  if (!button) return;
  type = button.dataset.type;
  $("#types")
    .querySelectorAll("button")
    .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  render();
};
$("#reset").onclick = () => {
  $("#search").value = "";
  $("#tag").value = "";
  $("#types button").click();
};
document.querySelectorAll("[data-close]").forEach(
  (b) =>
    (b.onclick = () => {
      if (!busy) b.closest("dialog").close();
    }),
);
document.querySelectorAll("dialog").forEach((d) =>
  d.addEventListener("cancel", (e) => {
    if (busy) e.preventDefault();
  }),
);
function auth() {
  $("#auth-error").textContent = "";
  $("#auth-dialog").showModal();
}
$("#manage").onclick = auth;
$("#reconnect").onclick = auth;
$("#auth-dialog").addEventListener("close", () => {
  $("#token").value = "";
  pendingAdd = false;
});
$("#disconnect").onclick = () => {
  token = "";
  sha = "";
  $("#auth-dialog").close();
  $("#editor-dialog").close();
  render();
  status("已中斷連線。");
};
$("#auth-form").onsubmit = async (e) => {
  e.preventDefault();
  if (busy) return;
  busy = true;
  $("#connect").disabled = true;
  $("#disconnect").disabled = true;
  $("#auth-error").textContent = "";
  try {
    const nextToken = $("#token").value.trim();
    if (!nextToken) throw new Error("請輸入 Token。");
    const result = await readRepository(nextToken);
    token = nextToken;
    sha = result.sha;
    data = result.data;
    const shouldAdd = pendingAdd;
    pendingAdd = false;
    $("#auth-dialog").close();
    render();
    status("已載入 GitHub 最新資料。儲存時會確認寫入權限。");
    if (shouldAdd) openEditor();
  } catch (error) {
    $("#auth-error").textContent = error.message;
  } finally {
    busy = false;
    $("#connect").disabled = false;
    $("#disconnect").disabled = false;
  }
};
function updateFields() {
  const grammar = $("#entry-type").value === "grammar";
  $("#meaning-label").textContent = grammar ? "文法說明" : "中文翻譯";
  $("#synonyms-field").hidden = grammar;
  $("#example-label").textContent = grammar ? "例句（必填）" : "例句（選填）";
  $("#editor-form").elements.example.required = grammar;
}
$("#entry-type").onchange = updateFields;
function openEditor(item = null) {
  editing = item?.id ?? null;
  const form = $("#editor-form");
  form.reset();
  $("#editor-title").textContent = item ? "編輯內容" : "新增內容";
  if (item)
    for (const key of [
      "type",
      "term",
      "meaning",
      "example",
      "synonyms",
      "tags",
    ])
      form.elements[key].value = Array.isArray(item[key])
        ? item[key].join(", ")
        : item[key];
  updateFields();
  $("#editor-error").textContent = "";
  $("#editor-dialog").showModal();
}
$("#add").onclick = () => {
  if (!token) {
    pendingAdd = true;
    auth();
  } else openEditor();
};
const list = (value) => [
  ...new Set(
    value
      .split(/[,，\n]/)
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];
$("#editor-form").onsubmit = async (e) => {
  e.preventDefault();
  if (busy) return;
  const form = e.target;
  const values = new FormData(form);
  const previous = data.items.find((i) => i.id === editing);
  if (editing && !previous) {
    $("#editor-error").textContent = "這筆資料已被移除，請關閉表單後重新新增。";
    return;
  }
  const item = {
    id: editing ?? crypto.randomUUID(),
    type: values.get("type"),
    term: values.get("term").trim(),
    meaning: values.get("meaning").trim(),
    example: values.get("example").trim(),
    synonyms:
      values.get("type") === "grammar" ? [] : list(values.get("synonyms")),
    tags: list(values.get("tags")),
    createdAt: previous?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const next = {
    ...data,
    items: editing
      ? data.items.map((i) => (i.id === editing ? item : i))
      : [item, ...data.items],
  };
  busy = true;
  $("#save").disabled = true;
  $("#save").textContent = "儲存中…";
  $("#reconnect").disabled = true;
  try {
    sha = await writeRepository(token, sha, next);
    data = next;
    $("#editor-dialog").close();
    render();
    status("已儲存至 GitHub。公開網站會在 Pages 更新後顯示最新內容。");
  } catch (error) {
    $("#editor-error").textContent = error.message;
  } finally {
    busy = false;
    $("#save").disabled = false;
    $("#save").textContent = "儲存至 GitHub";
    $("#reconnect").disabled = false;
  }
};
let quiz = [],
  answers = [],
  position = 0;
$("#start-quiz").onclick = () => {
  quiz = makeQuiz(data.items);
  answers = [];
  position = 0;
  if (!quiz.length) {
    status("至少需要兩筆不同解答的收藏才能測驗。");
    return;
  }
  $("#quiz-dialog").showModal();
  showQuestion();
};
function showQuestion() {
  const root = $("#quiz-content");
  root.replaceChildren();
  const q = quiz[position];
  root.append(
    node(
      "p",
      `第 ${position + 1} / ${quiz.length} 題${quiz.length < 10 ? "（目前可用題目不足十題）" : ""}`,
      "eyebrow",
    ),
  );
  const progress = node("progress");
  progress.max = quiz.length;
  progress.value = position;
  progress.setAttribute("aria-label", "測驗進度");
  root.append(
    progress,
    node("span", types[q.item.type], `badge ${q.item.type}`),
    node("h3", q.item.term, "quiz-term"),
    node(
      "p",
      q.item.type === "grammar"
        ? "選出正確的文法說明。"
        : "選出正確的中文意思。",
    ),
  );
  const options = node("div", undefined, "options");
  const feedback = node("div");
  feedback.setAttribute("role", "status");
  q.options.forEach((option, index) => {
    const b = node(
      "button",
      `${String.fromCharCode(65 + index)}. ${option}`,
      "answer",
    );
    b.onclick = () => {
      options.querySelectorAll("button").forEach((button, j) => {
        button.disabled = true;
        if (q.options[j] === q.item.meaning) button.classList.add("correct");
      });
      const correct = option === q.item.meaning;
      if (!correct) b.classList.add("wrong");
      answers.push({ item: q.item, answer: option, correct });
      feedback.append(
        node("h3", correct ? "答對了！" : "再記住一次，就更熟悉了。"),
        node("p", `正確解答：${q.item.meaning}`),
        node("p", q.item.example),
      );
      const next = node(
        "button",
        position === quiz.length - 1 ? "查看結果 →" : "下一題 →",
        "primary",
      );
      next.onclick = () => {
        position++;
        position === quiz.length ? showResult() : showQuestion();
      };
      feedback.append(next);
      next.focus();
    };
    options.append(b);
  });
  root.append(options, feedback);
}
function showResult() {
  const root = $("#quiz-content");
  const score = answers.filter((a) => a.correct).length;
  root.replaceChildren(
    node("p", "PRACTICE COMPLETE", "eyebrow"),
    node("h3", `${score} / ${quiz.length}`, "score"),
    node(
      "p",
      score === quiz.length
        ? "全部答對！繼續累積你的英文收藏。"
        : "完成練習！再看一次錯題，讓記憶更深刻。",
    ),
  );
  answers
    .filter((a) => !a.correct)
    .forEach((a) => {
      const review = node("article", undefined, "review");
      review.append(
        node("h4", a.item.term),
        node("p", `你的答案：${a.answer}`),
        node("p", `正確解答：${a.item.meaning}`),
        node("p", a.item.example),
      );
      root.append(review);
    });
  const retry = node("button", "再測一次", "primary");
  retry.onclick = () => {
    quiz = makeQuiz(data.items);
    position = 0;
    answers = [];
    showQuestion();
  };
  root.append(retry);
}
load();
