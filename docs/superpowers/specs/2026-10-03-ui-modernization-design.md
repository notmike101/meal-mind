# MealMind UI modernization design

## Scope and approved direction

Addresses parent #48 and children #58, #59, #60, #61, #62, #63. The user selected **neutral stone surfaces with a warm accent**. Preserve Plan / Recipes / Settings navigation, all URL/history contracts, planning actions, provider settings, recipe import, shopping checks, and both native dialogs. No new runtime UI dependency.

## Design system

Use Stitch's source-readable DESIGN.md model and platform-independent structured tokens. Keep existing semantic CSS names and mm-* utilities rather than introduce a competing framework. One JSON source defines light/dark colors, spacing, typography, radii, shadows, shell sizing, and motion. Include types, intent descriptions, and component relationships. Nuxt initialization generates CSS into its ignored build directory for dev/build/prepare; no client token parser or network service. Tailwind consumes the same CSS variables. Agents read DESIGN.md and JSON directly; no new API needed.

Warm accent: dark terracotta for light-mode actions, pale apricot for dark-mode actions with dark foreground. Neutral stone backgrounds and rails, clearly differentiated surfaces/fields, opaque readable primary/secondary/tertiary text. Separate success, warning, destructive roles; do not use accent as a success substitute. Validate normal text >=4.5:1, large text >=3:1, visible control/focus indicators >=3:1. Placeholder and hover text are included. Avoid alpha-muted text and colored glow/shadow treatments.

## Layout

One shared AppShell component owns rail/content placement, responsive gutters and width. Both existing layouts delegate to it, retaining their names for route-backed modal compatibility. Desktop rail approximately 224px; mobile retains visible three-link navigation. Add a skip-to-content link and stable main target. No new dashboard route.

Shared PageHeading owns title scale, eyebrow and supporting text. Shared section/panel patterns provide consistent borders, radii and padding. Keep 4px baseline spacing and 44px practical control targets. Flatten decorative nested containers in settings/editor where they displace content.

Weekly workspace: compact date/header + week controls, Plan/Shopping tabs, current status and primary actions, today adherence, then clearly labeled weekly schedule/editor. Locked schedule groups all seven dates in a responsive grid; empty dates remain comprehensible, not disconnected headings. Editor retains day/meal selection and recipe search/filter/actions. Shopping retains progress and category lists with consistent panel treatment. Recipes use a consistent header, importer, search, grid. Detail route and modal share heading/body hierarchy. Settings use consistent sections and field grouping.

### Wireframe

```text
DESKTOP
[MealMind rail] [Page title / context          week controls]
[Plan        ] [Plan | Shopping                            ]
[Recipes     ] [Week status                  primary action]
[Settings    ] [Today / attention                           ]
[local footer] [Seven-day schedule or editor + recipe grid  ]

MOBILE / TABLET
[MealMind]
[Plan | Recipes | Settings]
[Page title / context]
[Week controls] [Plan | Shopping]
[Status + actions]
[Today]
[Schedule (stack/grid by available width)]
```

## Components and accessibility

Reuse existing Vue components and native elements, document their props/slots/events and token mappings. Primary/secondary buttons, fields, cards, panels, navigation, dialog variants must have explicit default/hover/focus/active/disabled/error/busy contracts where applicable. Preserve label associations, aria-current, status/live regions, recipe link new-tab behavior, native dialog focus trap, Escape/backdrop dismissal, trigger restoration, scroll locking, and reduced motion. Change styling, not workflow data flow.

## Evidence and documentation

DESIGN.md documents tokens, usage, component APIs, agent decision rules and extension procedure. Research/audit document compares five real SaaS references (Linear, Vercel, GitHub, Notion, Stripe), citing primary sources and distinguishing observed facts from interpretation; records old/new palette and contrast results; compares Stitch, Material, Petal and DTCG licensing/compatibility. Stitch's hosted service is not claimed to be an open-source Vue library; its Apache-2.0 public skills support Vue extraction. Adopt its documentation approach plus the open DTCG format, not external service dependency.

## Verification

Run existing web unit tests, mock Playwright workflows, lint and build. Add permanent behavioral coverage only for plausible new risks: responsive overflow, theme contrast/control visibility, skip navigation and existing dialog behavior. Exercise actual local mock UI across all real routes in both themes at 390, 768 and 1440 widths; inspect dialogs and editor. Rebuild home-server web image from verified branch, preserve pg_data, check all service health and perform read-only light/dark responsive browser inspection. Publish evidence and limitations on parent/children and PR. Independent AI current-head approval plus human GitHub current-head approval required before merge.
