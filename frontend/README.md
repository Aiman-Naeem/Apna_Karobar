# Apna Karobar — Frontend (React + Vite + Tailwind)

```bash
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

- Start the backend and MongoDB separately before using login. The dev server proxies `/api` to `http://localhost:5000`; change `API_PROXY_TARGET` in `.env` if the backend uses another host or port.
- For deployments without a same-origin `/api` reverse proxy, set `VITE_API_URL` to the backend API base URL, for example `https://api.example.com/api`.
- Add UI text in `src/i18n/translations.js` (both `en` and `ur`), use `t('section.key')`.
- Add API calls in `src/api/client.js` (matches API_CONTRACT.md).
- Language toggle flips the whole app to RTL for Urdu and saves choice to the profile when logged in.
