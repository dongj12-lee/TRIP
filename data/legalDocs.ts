// Self-contained HTML for BADA's legal docs, rendered in-app via a WebView
// (app/legal/[doc].tsx). NOT hosted externally. These used to be claude.ai
// artifact links (the "made with Claude Code" tell, and an App Store reject
// risk); now they're bundled so there's zero external dependency and they work
// offline. Colors use BADA's neutralized palette (theme/tokens.ts), and the
// doc reacts to the device light/dark theme on its own via prefers-color-scheme.
//
// Content is the real, full legal text (Privacy 11 sections, Terms 12, plus
// Community Guidelines). Operator name and contact live in the constants
// below so they are set once rather than scattered through the markup.

// Operator identity and contact, referenced by all three documents.
//
// CONTACT_EMAIL must be an address that actually receives mail — Apple checks
// that support is reachable, and a dead address is a rejection. Change it in
// this one place; every document picks it up.
const OWNER = 'Dongjin Lee';
const JURISDICTION = 'the Republic of Korea';
const CONTACT_EMAIL = 'dongj1210@gmail.com';

export type LegalDocKey = 'privacy' | 'terms' | 'guidelines';

export const LEGAL_TITLES: Record<LegalDocKey, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  guidelines: 'Community Guidelines',
};

// Shared stylesheet, neutralized terra/paper (was the old cream #fbf6ee /
// orange #c26b4a). Covers every class any of the three docs use.
const STYLE = `
  :root {
    --paper: #faf9f7; --surface: #ffffff; --ink: #2e2a24; --ink-soft: #6f665a;
    --muted: #a59a8a; --line: #e6e4e0; --terra: #a36643; --terra-dark: #7a4429; --terra-tint: #f7ebe3;
    --sage: #79876b; --sage-dark: #5f6d53; --sage-tint: #eceee6;
    --rose: #c75c54; --rose-dark: #b04942; --rose-tint: #f9e7e3;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper: #171614; --surface: #201f1d; --ink: #f3ebde; --ink-soft: #b6ab9a;
      --muted: #837a6b; --line: #302f2c; --terra: #d39069; --terra-dark: #ebbda2; --terra-tint: #3f291c;
      --sage: #93a182; --sage-dark: #b6c6a2; --sage-tint: #2a3225;
      --rose: #d97a72; --rose-dark: #eb9b93; --rose-tint: #3a2320;
    }
  }
  * { box-sizing: border-box; -webkit-text-size-adjust: 100%; }
  html, body { margin: 0; padding: 0; background: var(--paper); }
  .page {
    max-width: 700px; margin: 0 auto; padding: 20px 22px 60px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    color: var(--ink); line-height: 1.6; background: var(--paper);
  }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
  .brand .mark { width: 34px; height: 34px; border-radius: 10px; background: var(--terra);
    display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .brand .name { font-family: Georgia, "Times New Roman", serif; font-weight: 700; font-size: 18px; letter-spacing: -0.2px; color: var(--ink); }
  .doc-kind { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
    color: var(--terra-dark); background: var(--terra-tint); padding: 3px 9px; border-radius: 999px; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-weight: 700; font-size: clamp(28px, 6vw, 38px);
    line-height: 1.12; letter-spacing: -0.5px; margin: 0 0 10px; }
  .meta { color: var(--muted); font-size: 13.5px; margin: 0 0 30px; }
  .meta strong { color: var(--ink-soft); }
  .lede { font-size: 16px; color: var(--ink-soft); line-height: 1.65; margin: 0 0 34px;
    padding-bottom: 28px; border-bottom: 1px solid var(--line); }
  nav.toc { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; margin-bottom: 38px; }
  nav.toc .label { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
  nav.toc ol { margin: 0; padding: 0; list-style: none; }
  nav.toc li { margin-bottom: 9px; }
  nav.toc a { color: var(--ink-soft); text-decoration: none; font-size: 14.5px; font-weight: 500; display: flex; gap: 9px; }
  nav.toc a .n { color: var(--terra); font-variant-numeric: tabular-nums; font-weight: 700; }
  section { margin-bottom: 34px; scroll-margin-top: 20px; }
  section h2 { font-family: Georgia, "Times New Roman", serif; font-size: 21px; font-weight: 700; letter-spacing: -0.2px;
    margin: 0 0 6px; display: flex; align-items: baseline; gap: 10px; }
  section h2 .num { color: var(--terra); font-size: 15px; font-variant-numeric: tabular-nums; }
  section p { font-size: 15px; color: var(--ink-soft); margin: 12px 0; }
  section ul { margin: 12px 0; padding-left: 22px; }
  section li { font-size: 15px; color: var(--ink-soft); margin-bottom: 8px; line-height: 1.6; }
  section li strong, td strong { color: var(--ink); }
  .callout { background: var(--terra-tint); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: var(--terra-dark); margin: 16px 0; line-height: 1.55; }
  .callout strong { color: var(--terra-dark); }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13.5px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); color: var(--ink-soft); vertical-align: top; }
  th { color: var(--muted); font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.6px; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 38px; }
  .rule-card { border-radius: 16px; padding: 18px 20px; border: 1px solid var(--line); }
  .rule-card.do { background: var(--sage-tint); border-color: transparent; }
  .rule-card.dont { background: var(--rose-tint); border-color: transparent; }
  .rule-card .kicker { font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 12px; }
  .rule-card.do .kicker { color: var(--sage-dark); }
  .rule-card.dont .kicker { color: var(--rose-dark); }
  .rule-card ul { margin: 0; padding-left: 18px; }
  .rule-card li { font-size: 14.5px; margin-bottom: 9px; line-height: 1.5; color: var(--ink); }
  footer { margin-top: 46px; padding-top: 24px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--muted); }
  footer a, section a { color: var(--terra-dark); }
  .placeholder { background: linear-gradient(transparent 60%, var(--terra-tint) 60%); padding: 0 1px; }
  ::selection { background: var(--terra-tint); color: var(--terra-dark); }
`;

const PRIVACY_BODY = `
  <div class="brand"><span class="mark">🧭</span><span class="name">BADA</span><span class="doc-kind">Privacy Policy</span></div>
  <h1>Privacy Policy</h1>
  <p class="meta"><strong>Effective date:</strong> July 5, 2026 &nbsp;·&nbsp; <strong>Last updated:</strong> July 23, 2026</p>
  <p class="lede">BADA is a travel app that helps foreign visitors discover places, K-content connections, and community tips across Korea. This policy explains what we collect when you use BADA, why we collect it, and the controls you have, including deleting your account and data at any time, directly in the app.</p>
  <nav class="toc" aria-label="Table of contents"><div class="label">On this page</div><ol>
    <li><a href="#collect"><span class="n">01</span> Information we collect</a></li>
    <li><a href="#use"><span class="n">02</span> How we use it</a></li>
    <li><a href="#share"><span class="n">03</span> Who we share it with</a></li>
    <li><a href="#ai"><span class="n">04</span> AI trip planning</a></li>
    <li><a href="#location"><span class="n">05</span> Location data</a></li>
    <li><a href="#retention"><span class="n">06</span> Retention &amp; deletion</a></li>
    <li><a href="#rights"><span class="n">07</span> Your rights &amp; choices</a></li>
    <li><a href="#children"><span class="n">08</span> Children's privacy</a></li>
    <li><a href="#security"><span class="n">09</span> Security</a></li>
    <li><a href="#international"><span class="n">10</span> International transfers</a></li>
    <li><a href="#changes"><span class="n">11</span> Changes to this policy</a></li>
    <li><a href="#contact"><span class="n">12</span> Contact us</a></li>
  </ol></nav>
  <section id="collect"><h2><span class="num">01</span> Information we collect</h2>
    <p>We collect the minimum needed to run BADA's core features:</p>
    <div class="table-wrap"><table><thead><tr><th>Category</th><th>Examples</th><th>Why</th></tr></thead><tbody>
      <tr><td><strong>Account</strong></td><td>Email address, password (hashed)</td><td>Sign-in, account recovery</td></tr>
      <tr><td><strong>Profile</strong></td><td>Display name, home region, travel interests</td><td>Personalize Explore &amp; Themes</td></tr>
      <tr><td><strong>Content you create</strong></td><td>Tips, routes, questions, comments, saved places</td><td>Power the community feed &amp; your itinerary</td></tr>
      <tr><td><strong>Usage</strong></td><td>Screens viewed, features used, crash logs</td><td>Fix bugs, improve the app</td></tr>
      <tr><td><strong>Device</strong></td><td>Device type, OS version, app version</td><td>Compatibility &amp; diagnostics</td></tr>
    </tbody></table></div>
    <p>We do not collect payment information. BADA does not process payments.</p></section>
  <section id="use"><h2><span class="num">02</span> How we use it</h2><ul>
    <li><strong>To operate BADA:</strong> authenticate you, sync your saved places and itinerary across sessions, and show your posts in the community feed.</li>
    <li><strong>To personalize:</strong> tailor the Explore, Themes, and Feed tabs to the interests you selected during onboarding.</li>
    <li><strong>To keep the community safe:</strong> review reports of abusive content, enforce our Community Guidelines, and act on blocks you create.</li>
    <li><strong>To improve BADA:</strong> understand which features are used and diagnose crashes.</li>
  </ul><p>We do not sell your personal information, and we do not use your content to train third-party advertising profiles.</p></section>
  <section id="share"><h2><span class="num">03</span> Who we share it with</h2>
    <p>We share data only with the service providers that make BADA work, under contracts that limit their use of it to providing that service:</p><ul>
    <li><strong>Supabase</strong>, our database, authentication, and file storage provider. Your account and content are stored on Supabase's infrastructure.</li>
    <li><strong>OpenAI</strong>, powers the trip-planning assistant. See Section 4 for exactly what is sent.</li>
    <li><strong>Apple</strong>, app distribution, crash reporting, and (if enabled) Sign in with Apple.</li>
  </ul><p>Content you post publicly, tips, routes, comments, is visible to other BADA users by design, including your display name and the country/region you selected at onboarding.</p></section>
  <section id="ai"><h2><span class="num">04</span> AI trip planning</h2>
    <p>BADA's trip planner builds your itinerary <strong>on your device</strong>, from our own catalog of places. No AI service is involved in generating a plan.</p>
    <p>The optional chat box on the trip screen is different. When you type a request there (for example, &ldquo;make day 2 more relaxed&rdquo;), we send to <strong>OpenAI</strong>:</p><ul>
      <li>the message you typed;</li>
      <li>a summary of the itinerary currently on screen, place names, neighbourhoods, and times;</li>
      <li>your recent messages in that same chat, so follow-up requests make sense.</li>
    </ul>
    <p>We do <strong>not</strong> send your name, email address, account identifier, location, or any other profile data. The request is made by our server, not from your device, so OpenAI never receives your IP address.</p>
    <p>OpenAI returns only an instruction describing <em>what</em> to change (for example, &ldquo;replace this stop with something lighter&rdquo;). BADA then chooses the actual place from its own catalog on your device, the AI service never selects a place and never sees the result.</p>
    <div class="callout"><strong>Your choice.</strong> The chat box is optional. If you never use it, nothing is ever sent to OpenAI, and you can still edit every stop by hand.</div>
    <p>Under OpenAI's API terms, data sent through their API is not used to train their models.</p></section>
  <section id="location"><h2><span class="num">05</span> Location data</h2><p>BADA shows places on a map using coordinates attached to each listed spot. If a future version of BADA requests your device's precise location (for example, to sort places by distance), we will ask for your permission first and explain exactly why, and you can decline without losing access to the rest of the app.</p></section>
  <section id="retention"><h2><span class="num">06</span> Retention &amp; deletion</h2>
    <p>We keep your account data for as long as your account is active. You can permanently delete your account at any time from <strong>Settings → Account → Delete account</strong> inside the app. Deletion removes your profile, saved places, itinerary, posts, and comments from our production database. Some content you posted publicly (such as a tip or a route) may be retained in de-identified form if other users have already quoted or replied to it, but it will no longer be linked to your identity.</p>
    <div class="callout"><strong>No email required.</strong> Account deletion is self-serve and immediate, you never need to contact support to close your account.</div></section>
  <section id="rights"><h2><span class="num">07</span> Your rights &amp; choices</h2><ul>
    <li><strong>Access &amp; export:</strong> contact us to request a copy of your data.</li>
    <li><strong>Correction:</strong> edit your profile and posts directly in the app.</li>
    <li><strong>Deletion:</strong> delete individual posts/comments any time, or your whole account (see Section 6).</li>
    <li><strong>Blocking:</strong> block any user from the report sheet on their content, you'll stop seeing their posts and comments.</li>
  </ul><p>If you're in the EEA, UK, or a jurisdiction with similar data protection law, you also have the right to object to or restrict certain processing, and to lodge a complaint with your local data protection authority.</p></section>
  <section id="children"><h2><span class="num">08</span> Children's privacy</h2><p>BADA is not directed to children under 13 (or the minimum age required by your country's law), and we do not knowingly collect personal information from them. If you believe a child has created an account, contact us and we will delete it.</p></section>
  <section id="security"><h2><span class="num">09</span> Security</h2><p>We use industry-standard measures, encryption in transit, access-controlled databases, and row-level security policies, to protect your data. No method of transmission or storage is 100% secure, so we can't guarantee absolute security.</p></section>
  <section id="international"><h2><span class="num">10</span> International transfers</h2><p>BADA is built for travelers visiting Korea and our infrastructure providers may process data in Korea, the United States, or other countries where they operate data centers. Where required, we rely on standard contractual safeguards for these transfers.</p></section>
  <section id="changes"><h2><span class="num">11</span> Changes to this policy</h2><p>If we make material changes to this policy, we'll notify you in the app before they take effect. The "Last updated" date at the top of this page always reflects the current version.</p></section>
  <section id="contact"><h2><span class="num">12</span> Contact us</h2><p>Questions about this policy or your data? Reach us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p></section>
  <footer>© 2026 ${OWNER} · Seoul, South Korea</footer>
`;

const TERMS_BODY = `
  <div class="brand"><span class="mark">🧭</span><span class="name">BADA</span><span class="doc-kind">Terms of Service</span></div>
  <h1>Terms of Service</h1>
  <p class="meta"><strong>Effective date:</strong> July 5, 2026 &nbsp;·&nbsp; <strong>Last updated:</strong> July 5, 2026</p>
  <p class="lede">These terms govern your use of BADA, a community app for travelers exploring Korea. By creating an account, you agree to them. Please also read our Community Guidelines, which set the ground rules for the Feed.</p>
  <nav class="toc" aria-label="Table of contents"><div class="label">On this page</div><ol>
    <li><a href="#account"><span class="n">01</span> Your account</a></li>
    <li><a href="#content"><span class="n">02</span> Content you post</a></li>
    <li><a href="#conduct"><span class="n">03</span> Acceptable use</a></li>
    <li><a href="#moderation"><span class="n">04</span> Moderation &amp; enforcement</a></li>
    <li><a href="#ip"><span class="n">05</span> Intellectual property</a></li>
    <li><a href="#disclaimer"><span class="n">06</span> Disclaimers</a></li>
    <li><a href="#liability"><span class="n">07</span> Limitation of liability</a></li>
    <li><a href="#termination"><span class="n">08</span> Termination</a></li>
    <li><a href="#law"><span class="n">09</span> Governing law</a></li>
    <li><a href="#changes"><span class="n">10</span> Changes to these terms</a></li>
    <li><a href="#contact"><span class="n">11</span> Contact us</a></li>
  </ol></nav>
  <section id="account"><h2><span class="num">01</span> Your account</h2><ul>
    <li>You must be at least 13 years old (or the minimum age in your country) to use BADA.</li>
    <li>You're responsible for the accuracy of your account information and for keeping your password secure.</li>
    <li>One account per person. Don't create an account on someone else's behalf without their permission.</li>
  </ul></section>
  <section id="content"><h2><span class="num">02</span> Content you post</h2>
    <p>Tips, routes, questions, comments, and any other content you submit ("<strong>User Content</strong>") remain yours. By posting, you grant BADA a worldwide, non-exclusive, royalty-free license to host, display, and distribute that content within the app so other travelers can see it.</p>
    <p>You're solely responsible for your User Content. Don't post anything you don't have the right to share.</p></section>
  <section id="conduct"><h2><span class="num">03</span> Acceptable use</h2><p>When using BADA, you agree not to:</p><ul>
    <li>Post content that is illegal, hateful, harassing, sexually explicit, or that endangers others.</li>
    <li>Impersonate another person or misrepresent your affiliation with anyone.</li>
    <li>Post spam, scams, or deceptive pricing/location information about a place.</li>
    <li>Attempt to access another user's account, or reverse-engineer, scrape, or overload BADA's systems.</li>
    <li>Use BADA to solicit money, sell goods, or run commercial promotions without our written permission.</li>
  </ul></section>
  <section id="moderation"><h2><span class="num">04</span> Moderation &amp; enforcement</h2><p>Every post and comment can be reported directly from within the app. We review reports and may remove content, warn a user, or suspend or terminate an account that violates these terms or our Community Guidelines. You can also block any user to stop seeing their content, blocking is immediate and doesn't notify the blocked user.</p></section>
  <section id="ip"><h2><span class="num">05</span> Intellectual property</h2><p>BADA's app, design, curated place listings, and guides are owned by ${OWNER} and protected by intellectual property law. You may not copy, modify, or redistribute them outside of normal use of the app.</p></section>
  <section id="disclaimer"><h2><span class="num">06</span> Disclaimers</h2><p>BADA is provided "as is." Place information, hours, prices, and foreigner-friendliness tags are crowd-sourced or curated for guidance only, always confirm details (especially prices) at the venue. We don't guarantee that any place, guide, or piece of community content is accurate, current, or safe.</p></section>
  <section id="liability"><h2><span class="num">07</span> Limitation of liability</h2><p>To the maximum extent permitted by law, ${OWNER} is not liable for indirect, incidental, or consequential damages arising from your use of BADA, including disputes with other users or businesses listed in the app.</p></section>
  <section id="termination"><h2><span class="num">08</span> Termination</h2><p>You may delete your account at any time from Settings. We may suspend or terminate accounts that violate these terms, with or without notice, particularly in cases of harassment, safety risk, or repeated violations.</p></section>
  <section id="law"><h2><span class="num">09</span> Governing law</h2><p>These terms are governed by the laws of ${JURISDICTION}, without regard to conflict-of-law principles.</p></section>
  <section id="changes"><h2><span class="num">10</span> Changes to these terms</h2><p>We may update these terms as BADA evolves. We'll notify you in the app of material changes before they take effect; continuing to use BADA after that means you accept the updated terms.</p></section>
  <section id="contact"><h2><span class="num">11</span> Contact us</h2><p>Questions about these terms? Reach us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p></section>
  <footer>© 2026 ${OWNER} · Seoul, South Korea</footer>
`;

const GUIDELINES_BODY = `
  <div class="brand"><span class="mark">🧭</span><span class="name">BADA</span><span class="doc-kind">Community Guidelines</span></div>
  <h1>Community Guidelines</h1>
  <p class="lede">BADA's Feed works because travelers trust each other's tips. These guidelines keep that trust intact, read them alongside our Terms of Service.</p>
  <div class="grid">
    <div class="rule-card do"><div class="kicker">Do</div><ul>
      <li>Share honest, specific tips, real prices, real wait times, real gotchas.</li>
      <li>Flag tourist-pricing or scams you encounter, kindly and factually.</li>
      <li>Report content that breaks these guidelines instead of arguing in comments.</li>
    </ul></div>
    <div class="rule-card dont"><div class="kicker">Don't</div><ul>
      <li>Post hate speech, harassment, or content that targets someone's identity.</li>
      <li>Impersonate a place, business, or another traveler.</li>
      <li>Post spam, referral links, or unsolicited promotions.</li>
      <li>Share anyone's private information without their consent.</li>
    </ul></div>
  </div>
  <section><h2>How enforcement works</h2><p>Tap <strong>···</strong> on any post or comment to report it. Reports are reviewed and we may remove content, warn the poster, or suspend the account, repeat or severe violations lead to a permanent ban. You can also block anyone directly; you'll immediately stop seeing their content across the app.</p></section>
  <section><h2>On Foreigner Fit tags</h2><p>The 🧍 Solo OK, 📋 English menu, 💸 Fair price, 💳 Card OK, and 💬 English spoken tags are crowd-verified, only vote on a tag if you've genuinely experienced it at that place. False votes hurt the traveler behind you.</p></section>
  <footer>Questions about a moderation decision? Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</footer>
`;

const BODIES: Record<LegalDocKey, string> = {
  privacy: PRIVACY_BODY,
  terms: TERMS_BODY,
  guidelines: GUIDELINES_BODY,
};

export function legalDocHtml(key: LegalDocKey): string {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<style>' + STYLE + '</style></head><body><div class="page">' +
    BODIES[key] +
    '</div></body></html>'
  );
}
