# Wordbook — 我的英文收藏

參考 [R7 Favors](https://github.com/archie0732/r7-favors) 的純靜態架構，以 GitHub Pages 提供公開英文筆記，透過 GitHub Personal Access Token 將新增與編輯寫回 repository。無須資料庫、付費服務或 build 步驟。

## 功能

- 單字：英文、中文翻譯、同義字、例句與標籤。
- 片語：英文、中文翻譯、相同意思的單字／片語、例句與標籤。
- 文法：名稱、說明、必填例句與標籤。
- 搜尋英文、中文翻譯、說明、例句、同義字及標籤，可搭配類型與標籤篩選。
- 新到舊、舊到新、A → Z、Z → A 排序；編輯不影響建立時間。
- 從全部收藏隨機抽出十題不重複的選擇題，以英文選中文意思／文法說明。提供即時解答、總分與錯題回顧。不足十題時使用現有題目；至少需要兩種不同解答，選項最多四個。
- Token 新增與編輯、UTF-8 中文資料、GitHub SHA 衝突保護。
- 桌面與手機版面、鍵盤操作、原生對話框。

## 發布至 GitHub Pages

1. 將本專案檔案 commit 並 push 至 `archie0732/vocabulary` 的 `main` 分支。
2. 在 GitHub repository 的 **Settings → Pages**，Source 選 **Deploy from a branch**。
3. Branch 選 **main**，Folder 選 **/(root)**，按 Save。
4. 等待 Actions 中的 Pages 部署完成，即可開啟 **https://archie0732.github.io/vocabulary/**。

專案包含 `.nojekyll`，直接發布根目錄即可。每次透過網頁更新 JSON 都會產生 Git commit，並觸發分支來源的 Pages 更新。管理者儲存後即時看到結果，其他訪客需等部署與快取更新。

Fork 或改名時，請更新 `config.js` 的 owner、repo、branch、path，以及 `index.html` 的 GitHub 連結。設定範例：

```js
export const config = Object.freeze({
  owner: 'archie0732',
  repo: 'vocabulary',
  branch: 'main',
  path: 'data/entries.json'
});
```

## 使用 Token 新增／編輯

1. 在 [GitHub Token 設定](https://github.com/settings/personal-access-tokens/new) 建立 fine-grained personal access token。
2. Repository access 選 **Only select repositories**，只選此 repository。
3. Repository permissions 的 **Contents** 設為 **Read and write**，並設定有效期限。
4. 網頁按「管理收藏」或「新增內容」，輸入 Token 並連線。
5. 填寫表單，按「儲存至 GitHub」。連線僅驗證讀取；寫入權限會在儲存時由 GitHub 確認。
6. 完成後按「管理 → 中斷連線」，或重新整理／關閉頁面。

Token 僅留在 JavaScript 記憶體，送往 `api.github.com`；不存入 localStorage、sessionStorage、Cookie、網址或 repository。輸入欄位在關閉連線視窗時清空。所有學習內容均公開，請勿將 Token 寫進程式碼或資料檔。

若出現衝突，表單會保留原輸入。按表單的「重新連線」載入最新資料，檢查內容後再儲存。重新儲存會以目前表單取代該筆資料，但保留其他最新項目。受保護分支可能不允許 Token 直接寫入。

## 資料與範例

`data/entries.json` 附有 12 筆可編輯的範例。若要清空，將檔案改成：

```json
{"version":1,"items":[]}
```

每筆項目有 `id`、`type`（word / phrase / grammar）、`term`、`meaning`、`example`、`synonyms`（字串陣列）、`tags`（字串陣列）、`createdAt`（ISO 日期）。編輯後另記錄 `updatedAt`。不要刪除 JSON 檔本身。

## 本機開發

需要 Node.js 20 以上，不需安裝套件。

```sh
npm run dev
# 開啟 http://127.0.0.1:4173/
npm test
```

請使用 HTTP 伺服器，不要直接雙擊 HTML（ES Modules 與資料 fetch 需要 HTTP）。本機伺服器只供開發。

## 驗證範圍

自動測試涵蓋搜尋／篩選、四種排序、抽題唯一性、少量題庫、資料驗證、中文編碼與模擬 GitHub API 的讀寫／錯誤處理。真實 GitHub 寫入需要你自己的 Token。

## 官方參考

- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
- [GitHub Pages 分支發布](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

## License

[MIT](LICENSE)
