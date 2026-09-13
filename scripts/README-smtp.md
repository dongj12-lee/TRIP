# Step 2 — turn email confirmation back on, properly

Step 1 (`scripts/fix-auth-config.sh`) removed the email dependency so launch
isn't blocked. This is the follow-up, once there's time: connect a real mail
provider so confirmation emails actually arrive, then re-enable confirmation.

Nothing in the app needs changing — `lib/auth.tsx` already handles both cases,
and `app/auth.tsx` shows the "check your email" screen (with a resend link) only
when Supabase withholds the session.

## Why the built-in mailer isn't enough

Supabase's bundled SMTP is for development only. On this project it is capped at
**2 emails per hour for the entire project**, so the third person to sign up in
an hour silently gets nothing. That cap is not adjustable while using the
built-in mailer.

## Connecting Resend (free tier: 3,000 emails/month)

1. **Create the account** — <https://resend.com>, sign up.
2. **Add a sender domain.** Two options:
   - *You own a domain*: add it in Resend → Domains, then create the DNS records
     Resend shows (SPF + DKIM) at your registrar. Verification takes minutes.
   - *You don't*: Resend gives you `onboarding@resend.dev` for testing. Fine for
     a soft launch, but it can land in spam, so move to a real domain before
     pushing signups hard.
3. **Create an API key** — Resend → API Keys → Create. Copy it once.
4. **Point Supabase at it** — Dashboard → *your project* → Authentication →
   Emails → SMTP Settings → Enable custom SMTP:

   | Field | Value |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the API key from step 3 |
   | Sender email | `noreply@yourdomain.com` (or `onboarding@resend.dev`) |
   | Sender name | `BADA` |

5. **Raise the rate limit** — same page, Rate Limits → emails per hour. With a
   provider connected this is yours to set; 100/hour is plenty early on.

6. **Turn confirmation back on** — Authentication → Providers → Email →
   *Confirm email* → on. Equivalent via API:

   ```bash
   TOKEN=$(security find-generic-password -s "Supabase CLI" -w)
   curl -X PATCH https://api.supabase.com/v1/projects/dwajyyyimwpspdvxeflp/config/auth \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"mailer_autoconfirm": false}'
   ```

## Check it works

Sign up with a real address you can read. You should get the mail within a few
seconds. The link opens `bada://` — the app itself — because `site_url` was set
in step 1, rather than the `http://localhost:3000` it used to point at.

If the mail doesn't arrive, look at Resend → Logs first; it will show whether
Supabase handed the message over at all.
