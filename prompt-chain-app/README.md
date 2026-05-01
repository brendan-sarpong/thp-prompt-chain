# THP Prompt Chain Tool (Task 8)

This app manages `humor_flavors` and `humor_flavor_steps`, with role-gated access and caption generation tests through the THP REST API.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. In Supabase Auth, add Google provider and set redirect URI to:
   - `http://localhost:3000/auth/callback`
   - your Vercel URL + `/auth/callback`
4. Run:

```bash
npm install
npm run dev
```

## What It Includes

- Google login via Supabase OAuth
- Access wall requiring `profiles.is_superadmin` or `profiles.is_matrix_admin`
- Create/update/delete humor flavors
- Create/update/delete/reorder humor flavor steps
- Light / dark / system theme switcher
- Flavor test form that calls:
  - `POST https://api.almostcrackd.ai/pipeline/upload-image-from-url`
  - `POST https://api.almostcrackd.ai/pipeline/generate-captions`
- Recent caption list from `captions` table
