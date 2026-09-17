---
tokens:
  colors:
    background: "#dcdfe3"
    surface: "#ffffff"
    surface-elevated: "#f8fafc"
    border: "#e2e8f0"
    foreground: "#0f172a"
    muted: "#64748b"
    primary: "#014d40"       # Deep hunter / forest green matching bar chart
    primary-hover: "#013b31"
    accent: "#f39775"        # Coral/salmon trendline accent
    accent-light: "#fde8e1"
    highlight: "#1e293b"
  typography:
    fonts:
      sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      mono: "'JetBrains Mono', monospace"
    scale:
      xs: "0.75rem"
      sm: "0.875rem"
      base: "1rem"
      lg: "1.125rem"
      xl: "1.25rem"
      "2xl": "1.5rem"
      "3xl": "1.875rem"
      "4xl": "2.25rem"
      "5xl": "3rem"
      "6xl": "3.75rem"
  radii:
    card: "28px"
    sm: "8px"
    md: "14px"
    lg: "20px"
    full: "9999px"
  shadows:
    card: "0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)"
---

# Design System: Repair Café Donation Statistics Dashboard

## Visual Identity & Personality
The dashboard embodies clean Scandinavian minimalism, utility, and clarity:
- **Tone**: Purposeful, honest, community-driven, uncluttered.
- **Canvas**: Soft matte light-slate grey (`#dcdfe3`) giving high contrast to pure white floating cards.
- **Cards**: Pure white (`#ffffff`) with generous corner radii (`28px`), crisp padding, and no heavy drop shadows.
- **Data Accents**:
  - Primary metric bars: Deep forest / pine green (`#014d40`).
  - Average trend regression line: Warm coral/salmon (`#f39775`).
  - Organic loop: Custom SVG sketched oval encircling the highest single donation value.

## Layout & Composition
Matching the exact reference layout:
- **Left Column** (approx 24% width on desktop):
  - Top Card: **Mål** (Target) -> `250 kr.` `pr. gang`
  - Middle Card: **Gennemsnit** (Average) -> `245 kr.` `pr. gang`
- **Right Main Card** (approx 76% width on desktop):
  - Title: **2025 - Uge nr** (Dynamic year toggle & week inspection)
  - Full SVG weekly bar chart with Y-axis tick marks (0, 200, 400, 600, 800, 1000, 1200, 1400) and X-axis week numbers (2, 3, 4 ... 53).
  - Coral trendline overlaid.
- **Bottom Row** (3 evenly spaced cards):
  - Card 1: **Største beløb** with circled peak amount and surrounding runner-ups.
  - Card 2: **Donationer pr. gang** (`2.94`).
  - Card 3: **Beløb doneret** frequency list (`50 kr. (44)`, `100 kr. (42)`, `25 kr. (31)`).
