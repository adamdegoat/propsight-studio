# PropSight Studio — adding templates, skins & categories

The master is `app.html` (self-contained, inline images). `build_deploy.js` externalises
the demo photos and writes `deploy_studio/index.html` (+ `img/`) and the local `serve/`.
Deploy = `git push` inside `deploy_studio`. Local test server: `serve/` on :8787,
headless Chrome debug on :9379.

## The three things you can add (easiest → hardest)

**1. A SKIN = a new visual variety of an existing style** (palette + font + mood).
No logic, low risk. A "template" the user picks = a *concept* (structure) + a *skin*.
- Add a CSS block: `.reel.tmpl-<skin>{--paper;--rk;--rmid;--rline;--rac;--fgf;--bgf;--disp}`
  (insert near the other `.reel.tmpl-*` blocks). `--paper`=background, `--rk`=ink,
  `--rac`=accent, `--disp`=display font (Newsreader/Spectral serif, Archivo/Bebas sans,
  SpaceG grotesk; omit for the default grotesk).
- If the skin is DARK, add its id to the `['nocturne',...]` fallback list in `Reel()`.
- Register the template(s) in `var TPL=[...]`: `{id,name,desc,concept,skin}`.
- Add the swatch colours to `SKINCOL` (picker): `<skin>:['<paper>','<accent>']`.
- **Where skins show best:** paper-forward styles (Editorial cover/facts, Numbers,
  Postcard card, Mosaic grid) show the palette strongly. Photo-forward styles
  (Reveal, Spotlight, Kinetic, Story) show it subtly — differentiate those by
  light/dark paper + accent + font. Aim for a light/dark spread within each style.

**2. A CATEGORY = a new content type** (New Listing, Just Sold, Open House, For Rent…).
- Add a `RECIPES.<cat>` entry (kicker, endKick, highTitle, factsKick, stamp?,
  coverPrice, coverSub, facts, fields).
- Add a `<cat>` branch to EVERY cat-branching helper: `bigPrice, numStats, kStats,
  spotDetails, listReasons, listTitle, storyHook, revealHook` (+ `previewSpec` demo fields).
- Register in `var FORMATS=[...]` (drives home cards + gallery + editor automatically).
- Rules that have bitten us: never assume timing ("this weekend" — use the real date),
  never assert what the app can't know ("prime location"), rentals never show psf/tenure,
  Just-Sold/Rented hide price on the cover behind a stamp.

**3. A CONCEPT = a new structure/mechanic** (Before/After, etc.).
- New builder `build<Concept>(push,ctx)` + DOM `function <concept>DOM(b,f,s)` +
  register in `buildBeats` dispatch and `beatDOM`. Add CSS + pacing constants.
  This is the real work — plan the beats and pacing first.

## MANDATORY before every deploy (the checklist)

1. `node build_deploy.js`  (rebuild serve/ + deploy_studio)
2. `node studio_audit.js`  → **must print "AUDIT CLEAN"**. It auto-covers every
   category × style × {full, sparse, torture-price, long-address} + a render
   smoke-test on every template. If it flags, fix before anything else.
3. `node studio_shots.js "<template ids>"` → eyeball the shots in `shots/` for
   pacing, legibility, composition (does key info fit, no clipping, scrims hold).
4. Design rules: no emoji in customer copy (SVG icons), keep prices via `parseAmt`
   (handles 1.38M / 980k / commas / $), text-over-photo must have a scrim.
5. Deploy: `cd deploy_studio && git add -A && git commit && git push`. If GitHub
   Pages hangs in "building", re-trigger with an empty commit. Verify the live URL
   actually changed (`curl` for a new string) before declaring done.

## Current library (regenerate with the audit's discovery)
8 categories, 9 concepts, 35 templates. Concepts: editorial, kinetic, story,
numbers, reveal, list(shortlist), spotlight, postcard, mosaic.
