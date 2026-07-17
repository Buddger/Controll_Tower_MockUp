# Order Control Tower Pilot

Standalone React/Vite pilot dashboard for deployment through GitHub and Vercel.

## Repository setup

Upload the contents of this folder directly to the root of a new GitHub repository.
Do not place the entire folder inside another subfolder.

## Vercel

Import the new GitHub repository as a new Vercel project.
The repository already defines:

- Node.js 24.x
- pnpm 10.13.1
- Install command: `pnpm install --no-frozen-lockfile`
- Build command: `pnpm run build`
- Output directory: `dist`

Project-level Vercel settings affect only this new Vercel project, not other apps.

## Local development

```bash
corepack enable
pnpm install
pnpm dev
```

## Production check

```bash
pnpm install
pnpm run build
```
