# Fantasy Baseball Auction Calculator — Design Guidelines

## Design Philosophy

**Core Aesthetic**: Baseball card meets modern fintech — nostalgic warmth with sharp, precise data visualization. Think vintage baseball card typography paired with clean, modern data tables. This should feel like a tool a serious fantasy baseball analyst would love to use.

## Color System

**Primary Palette**:
- Rich baseball leather browns (#8B4513, #A0522D) for primary elements and headers
- Warm cream/parchment (#F5E6D3, #FFF8E7) for backgrounds
- Crisp navy (#1E3A5F, #2C5282) for data emphasis and primary actions
- Forest green (#2D5016, #3A6B1E) for success states and positive values

**Functional Colors**:
- Value/inflation indicators: Green (#10B981) for increased values, Red (#EF4444) for bargains
- Drafted player state: Muted gray (#9CA3AF) with subtle strikethrough
- Warning states: Amber (#F59E0B) for budget alerts
- Background layers: Layered warm tones (#FFF8E7 base, #F5E6D3 cards, #E8D5C0 borders)

## Typography

**Font Families**:
- Display/Headers: Use a condensed, bold sports-inspired font (Google Fonts: "Bebas Neue" or "Oswald") for section titles and page headers
- Data/Numbers: Monospace tabular font (Google Fonts: "Roboto Mono" or "JetBrains Mono") for all numerical values, ensuring perfect alignment
- Body Text: Clean sans-serif (Google Fonts: "Inter" or "Work Sans") for forms, labels, and descriptions

**Type Scale**:
- Hero/Page Titles: 48px, bold, condensed, letter-spacing tight
- Section Headers: 28px, semi-bold, condensed
- Data Table Headers: 14px, uppercase, medium weight, letter-spacing wide
- Table Data: 16px, tabular monospace for numbers, sans-serif for text
- Body Text: 16px, regular weight, line-height 1.6
- Small Labels: 14px, medium weight

## Layout System

**Spacing Scale**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20 for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-16
- Card spacing: gap-6 for grids, space-y-4 for stacks
- Table cell padding: px-4 py-3

**Container Widths**:
- Full application: max-w-7xl centered
- Form sections: max-w-4xl
- Data tables: Full width within container with horizontal scroll on mobile

**Grid Patterns**:
- League settings forms: 2-column grid on desktop (grid-cols-2), single column on mobile
- Position requirements: 3-4 column grid for position inputs
- Scoring categories: 2-column checkbox grids
- Player values table: Full-width scrollable table

## Component Design

**Cards & Panels**:
- Background: Warm parchment (#FFF8E7)
- Border: 2px solid warm brown (#D4B5A0)
- Border radius: rounded-lg (8px)
- Shadow: Subtle warm shadow (shadow-md with brown tint)
- Padding: p-6 to p-8

**Forms & Inputs**:
- Text inputs: Cream background (#F5E6D3), brown border, navy text, focus ring in forest green
- Dropdowns: Matching input style with arrow indicator
- Number steppers: Integrated +/- buttons with tabular number display
- Checkboxes: Custom styled with navy check on cream background
- Sliders: Navy track with leather brown thumb

**Buttons**:
- Primary CTA: Navy background (#2C5282), cream text, bold, rounded-md, shadow-lg
- Secondary: Forest green background, cream text
- Tertiary: Cream background, navy border and text
- Button sizes: py-3 px-6 for primary actions, py-2 px-4 for secondary
- Hover states: Darken background by 10%, lift with shadow

**Data Tables**:
- Header row: Rich brown background (#8B4513), cream text, uppercase, sticky positioning
- Table rows: Alternating warm cream (#FFF8E7) and slightly darker (#F5E6D3) for readability
- Borders: Subtle brown dividers between rows
- Cell padding: px-4 py-3
- Monospace alignment for all numerical columns
- Hover state: Slightly darker background with smooth transition
- Drafted rows: Gray overlay with reduced opacity

**Metrics Dashboard** (Draft Room):
- Fixed header bar with dark navy background (#1E3A5F)
- Large tabular numbers in cream
- Labels in muted cream, small caps
- 4-column grid layout (Budget | Players | Inflation | Avg Cost)
- Subtle vertical dividers between metrics

**Modal Dialogs**:
- Overlay: Semi-transparent dark (#000 at 50% opacity)
- Modal card: Parchment background, thick brown border, generous padding (p-8)
- Close button: Top-right corner, navy icon
- Action buttons: Aligned right, primary + secondary pairing

## Iconography

Use **Heroicons** (outline style) for all interface icons:
- Search: magnifying-glass
- Upload: cloud-arrow-up
- Download/Export: arrow-down-tray
- Filter: funnel
- Sort: arrows-up-down
- Star/Favorite: star (solid when active)
- Check/Success: check-circle
- Warning: exclamation-triangle
- Undo: arrow-uturn-left

## Interaction Patterns

**Micro-interactions**:
- Button presses: Subtle scale(0.98) on active state
- Value changes: Smooth number counter animation (CountUp.js style)
- Table sorting: Smooth 200ms transition when reordering
- Draft confirmation: Gentle highlight pulse on newly drafted player
- Value picks (bargains): Subtle green glow animation on row

**Loading States**:
- CSV processing: Baseball spinning animation or progress bar with percentage
- Value generation: "Calculating..." with animated dots
- Table updates: Skeleton loading rows in warm cream

**Empty States**:
- Baseball illustration (vintage sketch style) with friendly message
- Actionable next step clearly indicated
- Warm, encouraging tone

## Data Visualization

**Inflation Indicators**:
- Up arrows (↑) in green for inflation
- Down arrows (↓) in red for deflation  
- Delta values in tabular monospace, color-coded
- Percentage changes with +/- prefix

**Value Tiers** (in player table):
- Subtle background color gradients: Darker cream for tier 1, lighter for tier 5
- No harsh borders, just gentle tonal shifts
- Maintain readability of all text

**Progress Indicators**:
- Budget remaining: Horizontal bar with brown fill, cream background
- Roster needs: Checkbox grid with navy checks, fraction display (1/3)

## Responsive Behavior

**Desktop (Primary)**:
- Full multi-column layouts
- Side-by-side form sections
- Expanded data tables with all columns visible
- Sticky table headers during scroll

**Tablet**:
- 2-column form grids collapse thoughtfully
- Table remains full-width with horizontal scroll
- Metrics dashboard maintains 4-column layout or stacks to 2x2

**Mobile**:
- Single column forms
- Simplified metrics (stack vertically)
- Table: Horizontal scroll with sticky first column (player name)
- Larger touch targets for buttons (min 44px height)

## Images

This application is data-focused and does not require hero images or photography. All visual interest comes from the vintage baseball aesthetic, typography, and well-designed data tables.

## Accessibility

- Maintain 4.5:1 contrast ratio (navy/brown text on cream backgrounds)
- Tabular data uses proper semantic table markup
- Form labels clearly associated with inputs
- All interactive elements keyboard navigable
- Focus states visible with forest green ring
- Screen reader labels for icon-only buttons