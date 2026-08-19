# 凌晨三点：静默纽约

一套手机宽度的章节式悬疑群聊 Demo。玩家可以自定义身份，与艾琳、米勒、哈罗德、沃德等角色共同推进五章故事；章节之间包含视频、音频、换装选择、论文信封和终局投票。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

必须配置：

- `DEEPSEEK_API_KEY`：Kaon 兼容接口密钥，仅服务端使用。
- `WORKFLOW_TOKEN_SECRET`：用于加密每位玩家的独立剧情进度，建议使用至少 32 字节随机值。
- `STORY_MODEL`、`STORY_FALLBACK_MODEL`：主模型与备用模型。

## 构建与部署

```bash
npm run build
npm start
```

项目使用 Next.js App Router，可直接连接 GitHub 并部署到 Vercel。请在 Vercel 的 Production、Preview 和 Development 环境中配置上述服务端变量；不要把 `.env.local` 或 `.dev.vars` 提交到仓库。
