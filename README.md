# Team Fines

A multi-team football fines app built with Next.js, TypeScript, Supabase and pnpm.

## Local setup

1. Enable Corepack and install dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase values.

3. Start the app:

   ```bash
   pnpm dev
   ```

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```
