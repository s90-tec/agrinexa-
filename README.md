# AgriNexa Frontend

Responsive Next.js dashboard for the AgriNexa FastAPI service. The frontend does not connect to a database.

## Local development

1. Start the backend using the instructions in `../backend/README.md`.
2. Install dependencies with `npm install`.
3. Optionally set `NEXT_PUBLIC_API_BASE_URL` to the backend API root. It defaults to `http://localhost:8000/api/v1`.
4. Start the frontend with `npm run dev` and open `http://localhost:3000`.

The backend CORS allowlist must include the frontend origin. Login and registration return access and refresh tokens; the app keeps them in `sessionStorage`, rotates refresh tokens on reload, and clears the session on logout.

## Checks

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## API behavior

Resource clients under `lib/api/` unwrap the backend's `{ success, data, message }` response envelope. TanStack Query owns server data; React Hook Form and Zod validate authentication forms.

Dashboard values, field maps, alerts, finance totals, weather observations, satellite indices, and model results are never seeded in the UI. Empty or unavailable backend data is shown as such. The current backend exposes only latest satellite readings (not time-series trends), aggregate finance totals (not transaction history), and a context-only assistant (not an LLM). Disease inference, satellite observations, weather providers, and yield prediction require their configured backend integrations. Password reset and changing account settings are not currently exposed by the API.