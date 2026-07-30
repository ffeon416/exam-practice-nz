# Study Ace — developer setup (for Rowan)

Welcome. This gets you running Study Ace locally and deploying it, using Claude Code + the Claude extension.
Do the steps in order. You'll be invited to a few accounts by email first — accept those, then do this.

## 0. Accounts you've been invited to (accept the email invites)
- **GitHub** — the code
- **Vercel** — hosting / deploys
- (optional, only if you'll manage them) Anthropic, Stripe, Supabase, Clerk

## 1. Install the tools
- **Node 24** (`node -v` should say v24.x) — https://nodejs.org
- **Git** — https://git-scm.com
- **Claude Code** — https://claude.com/claude-code
- **VS Code + the Claude extension** if you want the editor integration

## 2. Get the code
```bash
git clone https://github.com/ffeon416/exam-practice-nz.git
cd exam-practice-nz
npm install
```

## 3. Add the secrets
The app needs a file called `.env.local` in the project root. It's **not** in GitHub (on purpose — it holds
live keys). You'll receive it separately and securely. Save it as `.env.local` in the `exam-practice-nz` folder.
(`.env.example` shows what the keys are, with fake values.)

## 4. Run it
```bash
npm run dev
```
Open http://localhost:3000 — that's the site running on your machine.

## 5. Set your git identity (so commits show as you)
```bash
git config user.name "Rowan Clifford"
git config user.email "your-github-email@example.com"
```

## 6. How to make a change and ship it
1. Start Claude Code in the project folder: `claude`
2. Tell it what you want. It reads `AGENTS.md` automatically — that file has the project rules; **follow them.**
3. Test locally with `npm run dev`.
4. Commit and push:
   ```bash
   git add -A
   git commit -m "what you changed"
   git push
   ```
5. **Pushing to `main` deploys to production automatically** (Vercel builds on push). There is no separate
   deploy command. Give it ~1–2 min, then check studyace.co.

## Important to know
- **Read `AGENTS.md` before changing anything** — the hard rules live there (honest marking, no Google
  Analytics/PostHog, don't claim real NZQA papers, no tier-flicker, etc.).
- **`.env.local` is secret** — never commit it, never paste it anywhere public. It contains live Stripe and
  database keys.
- **`main` is live production.** For anything risky, make a branch first (`git checkout -b my-change`) and
  push that instead — Vercel gives it a preview URL without touching the live site.
- If Claude Code seems to not know the project, point it at `AGENTS.md`.
