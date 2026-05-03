# Book Recommendation System — Frontend

A small, production-minded Next.js app that searches a book-catalog API with natural-language queries, probes service health/catalog readiness, and presents results on a responsive grid with optional detail dialogs.

Suited as a portfolio piece: readable structure, typed API boundary, guarded env usage, and UI focused on responsiveness and accessibility.

---

## Live demo

- **App (Vercel):** [Book-Recommendation-System-FrontEnd](https://book-recommendation-system-front-en.vercel.app/)
- **Backend source (GitHub):** [Book-Recommendation-System-BackEnd](https://github.com/SauelAlmonte/Book-Recommendation-System-BackEnd)
- **API origin:** [Render](https://book-recommendation-api-hfh8.onrender.com/health)

---

## Stack

| Area | Choice |
| ------ | ------ |
| Framework | Next.js **16** (App Router), `src/app` |
| UI | React **19**, function components |
| Language | TypeScript (**strict**, `noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS **v4** (CSS-first `@import "tailwindcss"`, `@theme inline`) |
| Animation | Motion (`motion/react`) with reduced-motion awareness |
| Theming | `next-themes` (Light / Dark / System) |
| Validation / parsing | Zod + inferred types shared with UI |

---

## Architecture

```text
src/
  app/                  # Routes, layouts, global styles
  components/           # Reusable UI (e.g. recommendations, theme toggle)
  lib/                  # API client, helpers (e.g. book-api.ts, errors.ts, cn.ts)
  types/                # Shared types and Zod schemas for API boundaries
```

Design choices:

- **Server-friendly defaults** — App Router; client components only where browser state or effects are required.
- **Single API surface** — `src/lib/book-api.ts` encapsulates origin resolution, timeouts, AbortSignal handling, and Zod validation of responses and FastAPI-style errors.

---

## Features

- Search form with category, tone, limit, and required natural-language catalog query.
- **Health** and **catalog ready** probes for cold-start / idle backend awareness.
- Result **cards**: compact preview; **click to open modal** with full title, authors, ISBN, and description snippet.
- **Fluid typography/spacing tokens** via CSS `clamp()` in `src/app/globals.css`, exposed as Tailwind theme utilities where useful.
- **Responsive layout**: results grid breakpoints tuned for narrow, tablet (~768px+), and large viewports.

---

## Author

Demonstration frontend for a Book Recommendation backend — focuses on typed integration, UX, and responsive, accessible presentation.

## License

This project is released under the [MIT License](LICENSE).
