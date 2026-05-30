# King Iron Works — Next.js Migration

## Project Overview
Migrating Kings Iron Works from Vite+React+Express (SPA) to Next.js 15 (SSR) for SEO.
Source project: /Users/danielmartins/projects/kings-ironworks

## Business Context
- Custom ironwork & fire escape contractor serving NE + FL (9 states)
- HQ: 69 Norman St, Unit 20, Everett, MA 02149
- Phone: (617) 404-2589 | Email: info@kingsironworks.com
- 20+ years in business, 1000+ projects

## Design System
- Industrial Heritage Brutalism
- Fonts: Space Grotesk (display), Inter (body)
- Colors: Gold oklch(0.66 0.12 75), Charcoal oklch(0.15 0.005 280), Cream oklch(0.99 0.003 90)
- UI: Shadcn/ui components with Radix primitives

## Key Integrations
- GHL Location ID: rJsKSnzzxWdCgDCq21rI
- GHL Chat Widget: 699737916e6009b3eccf3dff
- GA4: G-040FS71NJ6 | GTM: GT-P3H97K4D | Google Ads: AW-817727428
- Deploy: Railway (Node.js 22 + pnpm)

## Commands
```bash
pnpm dev      # Local development
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # ESLint
```

## Migration Notes
- Source uses Wouter routing → convert to Next.js App Router file-based routing
- Source Express server handles OG tags + /api/contact → use Next.js metadata + Route Handlers
- Many components use "use client" (Framer Motion, forms, interactive) — mark appropriately
- Portfolio data is in client/src/lib/portfolio-data.ts — large auto-generated file
- Copy components from source, adapt imports from @/* to @/
