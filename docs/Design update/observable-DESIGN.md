---
version: alpha
name: "Observable Notebooks 2.0"
description: "Primary visual anchor uses #e2e2e2 with card borders, dividers, hero container borders. Typography baseline relies on __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace for hero headline — large monospace display text for primary page heading."
colors:
  light-gray: "#e2e2e2"
  code-surface-blue: "#f1f6fb"
  near-white: "#f5f5f5"
  pure-white: "#ffffff"
  dark-gray: "#454545"
  mid-gray: "#c5c5c5"
  navy-primary: "#005186"
  near-black: "#1c1c1c"
  syntax-navy: "#005f87"
  syntax-purple: "#6636b4"
  syntax-teal: "#20a5ba"
typography:
  hero-display:
    fontFamily: "__Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "56px"
    fontWeight: "500"
    lineHeight: "64px"
  section-heading:
    fontFamily: "__Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "24px"
    fontWeight: "500"
    lineHeight: "32px"
  ui-heading-large:
    fontFamily: "__Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "22px"
    fontWeight: "600"
    lineHeight: "28px"
  ui-heading-medium:
    fontFamily: "__Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "20px"
    fontWeight: "700"
    lineHeight: "28px"
  body-regular:
    fontFamily: "__Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
  body-semibold:
    fontFamily: "__Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: "600"
    lineHeight: "16.1px"
  label-small:
    fontFamily: "__Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: "400"
  code-inline:
    fontFamily: "__Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "10px"
    fontWeight: "400"
    lineHeight: "13px"
  overline-label-caps:
    fontFamily: "__Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: "700"
    lineHeight: "28px"
    letterSpacing: "1.6px"
rounded:
  radius-none: "0px"
  radius-1: "2px"
  radius-2: "4px"
  radius-3: "8px"
  radius-circle: "100%"
  radius-pill: "9999px"
spacing:
  spacing-extra-small: "4px"
  spacing-small: "8px"
  spacing-medium: "16px"
  spacing-large: "32px"
  spacing-extra-large: "64px"
  spacing-extra-extra-large: "80px"
  spacing-24: "24px"
  spacing-48: "48px"
  spacing-10: "10px"
---

## Overview

Primary visual anchor uses #e2e2e2 with card borders, dividers, hero container borders. Typography baseline relies on __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace for hero headline — large monospace display text for primary page heading.

This system uses a 8px base grid with scale values 4, 8, 16, 24, 32, 48, 64, 80.

**Signature traits:**
- Core token rhythm: Token evidence indicates consistent color, spacing, and radius rhythm across visible UI.

## Colors

The palette uses 11 validated color tokens across 1 theme profile. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

**Semantic naming:**
- **action-text** maps to `navy-primary`: Role "text" is grounded by usage context "Primary brand color, used for links, CTA borders, and key interactive elements".
- **content-text** maps to `near-black`: Role "text" is grounded by usage context "Primary body text and nav text color".
- **surface-background** maps to `pure-white`: Role "background" is grounded by usage context "Modal backgrounds, card surfaces, nav background".
- **border-primary** maps to `light-gray`: Role "primary" is grounded by usage context "Card borders, dividers, hero container borders".

### Primary Brand
- **Light Gray** (#e2e2e2): Card borders, dividers, hero container borders. Role: primary. {authored: rgb(226, 226, 226), space: rgb}

### Text Scale
- **Dark Gray** (#454545): Secondary text, icon buttons, muted UI labels. Role: text. {authored: rgb(69, 69, 69), space: rgb}
- **Mid Gray** (#c5c5c5): Nav secondary text, placeholder and muted label text. Role: text. {authored: rgb(197, 197, 197), space: rgb}
- **Navy Primary** (#005186): Primary brand color, used for links, CTA borders, and key interactive elements. Role: text. {authored: rgb(0, 81, 134), space: rgb}
- **Near Black** (#1c1c1c): Primary body text and nav text color. Role: text. {authored: rgb(28, 28, 28), space: rgb}
- **Syntax Navy** (#005f87): Syntax highlighting for known variables in code blocks. Role: text. {authored: rgb(0, 95, 135), space: rgb}
- **Syntax Purple** (#6636b4): Syntax highlighting for keywords in code blocks. Role: text. {authored: rgb(102, 54, 180), space: rgb}
- **Syntax Teal** (#20a5ba): Syntax highlighting for numbers and values in code blocks. Role: text. {authored: rgb(32, 165, 186), space: rgb}

### Surface & Shadows
- **Code Surface Blue** (#f1f6fb): Code block / pre element background fill. Role: background. {authored: rgb(241, 246, 251), space: rgb}
- **Near White** (#f5f5f5): Hero heading text on dark background, secondary surface fills. Role: background. {authored: rgb(245, 245, 245), space: rgb}
- **Pure White** (#ffffff): Modal backgrounds, card surfaces, nav background. Role: background. {authored: rgb(255, 255, 255), space: rgb}

## Typography

Typography uses __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace, __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Mixes __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace and __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif for visual contrast. Weight range spans medium, semi-bold, bold, regular. Sizes range from 10px to 56px.

### Font Roles
- **Headline Font**: __Inter_e798ec
- **Body Font**: __Inter_e798ec

### Type Scale Evidence
| Role | Font | Size | Weight | Line Height | Letter Spacing | Stack / Features | Notes |
|------|------|------|--------|-------------|----------------|------------------|-------|
| Hero headline — large monospace display text for primary page heading | __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace | 56px | 500 | 64px | normal | __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace | Extracted token |
| Section-level headings in monospace style | __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace | 24px | 500 | 32px | normal | __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace | Extracted token |
| Modal titles and prominent UI headings | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | 22px | 600 | 28px | normal | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | Extracted token |
| Card headings and sub-section titles | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | 20px | 700 | 28px | normal | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | Extracted token |
| Primary body copy, nav links, modal text | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | 14px | 400 | normal | normal | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | Extracted token |
| Button labels, emphasized UI text | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | 14px | 600 | 16.1px | normal | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | Extracted token |
| Small labels, captions, metadata text | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | 12px | 400 | normal | normal | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | Extracted token |
| Inline code and code block content | __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace | 10px | 400 | 13px | normal | __Spline_Sans_Mono_1999fd, SFMono-Regular, Menlo, Consolas, monospace | Extracted token |
| Overline labels and section category tags | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | 16px | 700 | 28px | 1.6px | __Inter_e798ec, -apple-system, BlinkMacSystemFont, sans-serif | Extracted token |

## Layout

Responsive system uses 4 breakpoint tier(s): mobile, tablet, desktop, wide.

### Responsive Strategy
- **mobile (>= 450px)**: Constrain layout for small viewports and prioritize vertical stacking.
- **tablet (>= 640px)**: Increase spacing and column structure for medium-width viewports.
- **desktop (>= 1024px)**: Expand layout density and horizontal composition for wide viewports.
- **wide (>= 1536px)**: Stretch composition with generous gutters and wider layout spans.

### Spacing System
| Token | Value | Px | Notes |
|------|-------|----|-------|
| spacing-extra-small | 4px | 4 | Mapped to --spacing-extra-small |
| spacing-small | 8px | 8 | Mapped to --spacing-small |
| spacing-10 | 10px | 10 | Extracted spacing token |
| spacing-medium | 16px | 16 | Mapped to --spacing-medium |
| spacing-24 | 24px | 24 | Extracted spacing token |
| spacing-large | 32px | 32 | Mapped to --spacing-large |
| spacing-48 | 48px | 48 | Extracted spacing token |
| spacing-extra-large | 64px | 64 | Mapped to --spacing-extra-large |
| spacing-extra-extra-large | 80px | 80 | Mapped to --spacing-extra-extra-large |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence
| Shadow Token | Layers | Details |
|--------------|--------|---------|
| shadow-card | 1 | 0px 4px 15px 0px rgba(0, 0, 0, 0.12) |
| shadow-dropdown | 4 | 0px 0px 0px 0px rgba(0, 0, 0, 0) |
| shadow-popover | 1 | 0px 2px 8px 0px rgba(0, 0, 0, 0.15) |
| shadow-elevated | 1 | 0px 2px 8px 0px rgba(0, 0, 0, 0.25) |

### Interaction Signals
| Theme | Signal | Evidence |
|-------|--------|----------|
| Light | backdrop-filter | blur(50px) |
| Light | outline-color | rgb(0, 81, 134) ; rgb(0, 0, 0) ; rgb(102, 54, 180) |
| Light | outline-width | 3px |
| Light | outline-offset | 0px |
| Light | transform | matrix(1, 0, 0, 1, 0, -16.5) ; matrix(1, 0, 0, 1, -72, -17.5) ; matrix(1, 0, 0, 1, 505.071, 186.121) |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles
| Token | Value | Px | Role Mapping |
|------|-------|----|--------------|
| radius-none | 0px | 0 | Hairline corner |
| radius-1 | 2px | 2 | Hairline corner |
| radius-2 | 4px | 4 | Subtle corner |
| radius-3 | 8px | 8 | Control corner |
| radius-circle | 100% | 9999 | Large surface corner |
| radius-pill | 9999px | 9999 | Large surface corner |

### Geometry Evidence
| Radius Token | Shape | Units |
|--------------|-------|-------|
| radius-none | 0 | px |
| radius-1 | 2px | px |
| radius-2 | 4px | px |
| radius-3 | 8px | px |
| radius-circle | 100% | % |
| radius-pill | 9999 | px |

## Components

(none detected)

## Do's and Don'ts

Guardrails protect Core token rhythm without adding unsupported visual claims.

| Do | Don't |
|----|---------|
| Do maintain consistent spacing using the base grid | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text) | Don't mix rounded and sharp corners in the same view |
| Do use the primary color only for the single most important action per screen |  |
| Do verify evidence before writing new design-system guidance |  |

## Responsive Evidence

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | >= 450px | (min-width: 450px) |
| Mobile | >= 480px | (min-width: 480px) |
| Mobile | >= 640px | (min-width: 640px) |
| Tablet | >= 768px | (min-width: 768px) |
| Tablet | >= 800px | (min-width: 800px) |
| Desktop | >= 1024px | (min-width: 1024px) |
| Desktop | >= 1280px | (min-width: 1280px) |
| Desktop | >= 1536px | (min-width: 1536px) |
| Breakpoint 9 | Unknown | (hover) |

## Agent Prompt Guide

### Example Component Prompts
- Create button component using validated primary color role and spacing tokens.
- Create card component with mapped radius role and evidence-backed elevation.
- Create form input component using inferred typography hierarchy and border roles.

### Iteration Guide
1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.
