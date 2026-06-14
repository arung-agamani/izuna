# Authentication Flow & Security Fixes

This document explains the authentication system in Izuna's web backend and frontend,
and the reasoning behind the security fixes we made.

## Why we needed to fix this

The original code had two high-severity security vulnerabilities:

### 1. JWT tokens contained Discord API secrets

When a user logged in via Discord, the server created a JWT that included the user's
full Discord profile AND their Discord OAuth access/refresh tokens:

```json
// OLD JWT payload — BAD
{
  "id": 1,
  "user": { "name": "...", "uid": "...", "email": "...", ... },
  "token": {
    "access_token": "...",
    "refresh_token": "..."  // ← NEVER EXPIRES
  }
}
```

**Why this is dangerous:** If someone steals this JWT (via XSS, a compromised npm
package, or a leaked cookie), they get permanent access to the victim's Discord API
account via the `refresh_token`.

**The rule of thumb:** A JWT should only contain what the server needs to identify
you — nothing more. Think of it like a hotel key card: it should just have your room
number, not your credit card info.

### 2. Many routes bypassed JWT signature verification

The codebase had two ways of reading user info from a JWT:

- **`request.jwtVerify()`** — Verifies the cryptographic signature AND checks
  expiration. This is the safe way.
- **`fastify.jwt.decode()`** — Just base64-decodes the token. It does NOT verify
  the signature or expiration.

```ts
// OLD code — INSECURE
// This trusts ANY string in the "ninpou" cookie, even tampered ones
const decodedValue = fastify.jwt.decode(req.cookies["ninpou"]!)!
```

**Why this is dangerous:** I could take any JWT, modify the payload, and the server
would accept it. For example, I could change `"uid": "123"` to `"uid": "456"` and
access another user's reminders or tags.

**The rule of thumb:** Never trust user input — and a cookie is user input. Always
verify signatures before trusting a token.

---

## What we changed

### Fix 1: Strip secrets from the JWT (`src/routes/oauth/discord.ts`)

Before signing the JWT in the Discord callback, we removed everything except the
user's database ID and Discord UID:

```ts
// NEW JWT payload — safe
{
  "id": 1,
  "uid": "145558597424644097"
}
```

The Discord access token is now stored in an in-memory Map (`discordAccessTokens`
in `src/lib/session.ts`), indexed by Discord UID. Only routes that genuinely need
it (the guild-fetching endpoints) look it up from this map.

**Design rationale:** The JWT's job is just to prove "Who is this user?" — not to
carry all their data. If a route needs more info (like the user's email), it queries
the database using the `id` from the JWT.

### Fix 2: Replace `jwt.decode()` with `jwtVerify()` everywhere

Every route that used `fastify.jwt.decode()` now uses the `authenticate` hook,
which calls `request.jwtVerify()` under the hood. The verified payload is available
as `req.user`:

```ts
// NEW code — SECURE
// The authenticate hook already verified the signature
fastify.get("/user/reminder", { onRequest: [fastify.authenticate] }, async (req, res) => {
    const reminders = await prisma.reminder.findMany({
        where: { uid: req.user.uid }  // ← verified by jwtVerify
    });
});
```

We also found that three reminder endpoints (`GET /user/reminder`, `GET
/user/reminder/:id`, `POST /user/reminder`) had NO authentication at all — anyone
who knew the URL could access or modify reminders. We added the `authenticate` hook
to those too.

---

## Token refresh: the graceful session pattern

Even with the fixes above, there was a UX problem: the JWT expires after 1 hour.
When it expires, the user gets a 401 and has to log in again through Discord. This
is annoying.

### The challenge

If the user closes their laptop at lunch and opens it 3 hours later, the JWT is
stale. We want them to still be logged in — but we also don't want to make the JWT
last forever (too dangerous if stolen).

### The solution: grace-period refresh

We added `POST /api/auth/refresh` (`src/routes/oauth/discord.ts`):

```ts
// Pseudo-code for the refresh endpoint
POST /api/auth/refresh
  1. Read the JWT from the "ninpou" cookie
  2. Verify the signature (but ALLOW expired tokens)
  3. If expired more than 7 days ago → reject ("re-login required")
  4. If user still exists in DB → issue a fresh 1-hour JWT
  5. Set the new cookie on the response
```

The key insight: `jwtVerify({ ignoreExpiration: true })` checks the signature but
skips the expiry check. We then manually check if the token expired within the last
7 days. This creates a sliding window where:

- **Tab is open:** JWT refreshed every 55 minutes (never expires in practice)
- **Tab closed for <7 days:** Refresh endpoint accepts the stale JWT and issues a
  new one
- **Tab closed for >7 days:** Refresh rejects, user must re-auth via Discord

**Why 7 days?** It's a balance between convenience and security. A stolen JWT can
only be used to stay logged in for 7 days max. After that, the attacker needs to
steal it again.

### Frontend: proactive refresh (`web/src/hooks/useUser.ts`)

On the frontend, TanStack Query's `refetchInterval` triggers a full re-check every
55 minutes:

```ts
useQuery({
    queryKey: ["user"],
    queryFn: async () => {
        // Step 1: Refresh the token (extend session)
        await api.post("api/auth/refresh").json();
        // Step 2: Fetch latest user data
        const data = await api.get("api/closure/user/me").json();
        return { ...data.data, loginType: "DISCORD" };
    },
    staleTime: 55 * 60 * 1000,       // Consider data stale after 55 min
    refetchInterval: 55 * 60 * 1000,  // Re-run query every 55 min
});
```

**Why 55 minutes and not 60?** The JWT expires in 60 minutes. We refresh at 55
minutes to stay safely within the window — if the refresh fails for some reason
(network glitch), we still have 5 minutes before the JWT expires.

### The complete flow

```
User opens page for first time
    │
    ▼
useUser fires query
    │
    ▼
POST /api/auth/refresh  ──→  No cookie?  ──→  401 → placeholderData returns emptyUser
    │                                                → Navbar shows "Login"
    │
    ▼
Has cookie?  ──→  jwtVerify({ ignoreExpiration: true })
    │
    ├── Signature invalid → 401 → show Login
    │
    ├── Expired >7 days → 401 → show Login (re-auth via Discord)
    │
    └── Valid or expired <7 days → issue NEW JWT with fresh 1h expiry
                                    → set new cookie
                                    → GET /api/closure/user/me succeeds
                                    → user sees their data
```

---

## Fix 3: Cookie `secure` flag in development (`src/routes/oauth/discord.ts`)

The original code set `secure: true` on the auth cookie:

```ts
reply.setCookie("ninpou", token, { secure: true, ... });
```

**The problem:** Browsers refuse to set cookies with `secure: true` over plain HTTP.
In development, the server runs on `http://127.0.0.1:8000` (not HTTPS), so the
cookie was silently dropped and login never worked locally.

**The fix:** Make `secure` conditional on the environment:

```ts
secure: config.domain !== "localhost"
```

Since we extracted this into a `setAuthCookie` helper function, both the login
callback and the refresh endpoint use the same logic.

**Rule of thumb:** `secure: true` means "only send this cookie over HTTPS." Always
use it in production. In development, you need either HTTPS locally (using mkcert
or similar) or disable it.

---

## Summary of all changes

| File | What changed | Why |
|------|-------------|-----|
| `src/routes/oauth/discord.ts` | Added `POST /api/auth/refresh` | Graceful session renewal within 7-day window |
| `src/routes/oauth/discord.ts` | JWT payload reduced to `{ id, uid }` | Remove Discord tokens from JWT |
| `src/routes/oauth/discord.ts` | `secure` flag is now conditional | Fix local development login |
| `src/routes/oauth/discord.ts` | Cookie logic extracted to `setAuthCookie()` | DRY, consistent cookie settings |
| `src/routes/api/closure/index.ts` | 3 routes got `authenticate` hook | These had no auth at all |
| `src/routes/api/closure/index.ts` | Removed all `jwt.decode()` calls | Now uses verified `req.user` |
| `src/routes/api/closure/tag.ts` | Removed all `jwt.decode()` calls | Same — uses `req.user!.uid` |
| `src/routes/api/reminders/index.ts` | Removed all `jwt.decode()` calls | Same — uses `req.user!.uid` |
| `src/lib/session.ts` | Added `discordAccessTokens` Map | Store Discord tokens outside JWT |
| `src/server/plugins/auth.ts` | `FastifyJWT.user` now includes `uid` | Type-safe access to user ID |
| `web/src/hooks/useUser.ts` | Added refresh call + `refetchInterval` | Proactive token refresh every 55 min |

## Mental models for future thinking

1. **"A JWT is a key card, not a suitcase."** — Don't put data in a JWT unless
   every route that verifies it genuinely needs that data. Everything else belongs
   in a database lookup.

2. **"User input is enemy action."** — A cookie, a URL parameter, a request body —
   all of these can be forged. Always verify before trusting. `jwt.decode()` is
   "trust," `jwtVerify()` is "verify."

3. **"Grace over rigidity."** — Completely rigid security (JWT expires → kick user
   out) creates bad UX. A grace period on the refresh endpoint gives you a sliding
   window that's both secure and user-friendly.

4. **"Environment awareness."** — `secure: true` on cookies, CORS origins, API
   URLs — all these need to change between dev and prod. If you hardcode the
   production value, your dev environment breaks silently (cookies silently
   dropped, CORS errors, etc.).
