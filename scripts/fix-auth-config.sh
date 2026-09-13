#!/usr/bin/env bash
# Fixes the two settings that make sign-up unusable in production.
#
# What's wrong right now (checked 2026-07-28):
#   rate_limit_email_sent : 2                     -> 2 confirmation emails per
#                                                    HOUR for the whole project,
#                                                    so the 3rd person to sign up
#                                                    never gets one.
#   smtp_host             : (none)                -> no mail provider of our own.
#   site_url              : http://localhost:3000 -> the link in those emails
#                                                    points at the reader's own
#                                                    machine and fails to open.
#
# STEP 1 (this script): turn email confirmation off, so signing up needs no mail
# at all, and point site_url at the app's own deep link instead of localhost.
# The app already handles both cases (see lib/auth.tsx signUp -> signedIn).
#
# STEP 2 (later, optional): connect a real mail provider and turn confirmation
# back on. See scripts/README-smtp.md.
#
# Usage:
#   bash scripts/fix-auth-config.sh            # production only
#   bash scripts/fix-auth-config.sh --all      # production + dev
#   bash scripts/fix-auth-config.sh --check    # read current settings, change nothing
set -euo pipefail

PROD=dwajyyyimwpspdvxeflp
DEV=iqezjcmpsgawgkvjzcaa

TOKEN="${SUPABASE_ACCESS_TOKEN:-$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null || true)}"
if [ -z "$TOKEN" ]; then
  echo "No Supabase access token."
  echo "Run 'npx supabase login' first, or set SUPABASE_ACCESS_TOKEN=<token>"
  echo "(create one at https://supabase.com/dashboard/account/tokens)"
  exit 1
fi

show() {
  local ref=$1
  curl -sS "https://api.supabase.com/v1/projects/$ref/config/auth" \
    -H "Authorization: Bearer $TOKEN" |
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for k in ['mailer_autoconfirm','site_url','uri_allow_list','smtp_host','rate_limit_email_sent']:
    print(f'    {k}: {d.get(k)}')
"
}

apply() {
  local ref=$1
  curl -sS -X PATCH "https://api.supabase.com/v1/projects/$ref/config/auth" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"mailer_autoconfirm": true, "site_url": "bada://", "uri_allow_list": "bada://*"}' \
    -o /dev/null -w "    HTTP %{http_code}\n"
}

REFS=("$PROD")
[ "${1:-}" = "--all" ] && REFS=("$PROD" "$DEV")

for ref in "${REFS[@]}"; do
  echo "== $ref =="
  echo "  before:"; show "$ref"
  if [ "${1:-}" = "--check" ]; then continue; fi
  echo "  applying..."; apply "$ref"
  echo "  after:"; show "$ref"
  echo
done

echo "Done. Sign-up now works without any email."
echo "Verify: open the app, create an account, you should land straight in the tabs."
