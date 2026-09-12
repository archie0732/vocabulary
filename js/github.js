import { config } from "../config.js";
import { validate, encode, decode } from "./core.js";
const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${config.path.split("/").map(encodeURIComponent).join("/")}`;
async function request(token, options = {}) {
  const response = await fetch(
    endpoint +
      (options.method ? "" : `?ref=${encodeURIComponent(config.branch)}`),
    {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    },
  );
  if (!response.ok) {
    const errors = {
      401: "Token 無效或已過期。",
      403: "權限不足或 API 額度已用完，請檢查 Token 的 Contents 權限。",
      404: "找不到資料檔，請檢查 repository、分支與 Token 授權範圍。",
      409: "資料已被其他操作更新。請重新連線載入最新資料後再儲存；表單內容已保留。",
      422: "寫入失敗，請確認分支與資料格式，並重新連線。",
    };
    throw new Error(
      errors[response.status] || `GitHub 請求失敗（${response.status}）。`,
    );
  }
  return response.json();
}
export async function readRepository(token) {
  const file = await request(token);
  if (!file.content || !file.sha)
    throw new Error("GitHub 未回傳可讀取的資料檔。");
  return { data: validate(decode(file.content)), sha: file.sha };
}
export async function writeRepository(token, sha, data) {
  validate(data);
  if (!token || !sha) throw new Error("請先連線 GitHub。");
  const result = await request(token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update vocabulary entries",
      content: encode(data),
      sha,
      branch: config.branch,
    }),
  });
  return result.content.sha;
}
