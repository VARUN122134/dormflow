---
name: Liquid Glass Management
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system for this hostel management platform centers on a "Liquid Glass" aesthetic—a sophisticated evolution of glassmorphism that emphasizes depth, translucency, and fluid motion. The brand personality is modern, high-tech, and organized, transforming the typically mundane task of warden administration into a premium digital experience.

The target audience includes modern administrators and facility managers who require high density of information without the feeling of clutter. The UI evokes a sense of "digital physicalness," where windows feel like polished sheets of acrylic floating over a dynamic, slow-moving liquid environment. The emotional response is one of clarity, calm control, and cutting-edge reliability.

## Colors
The palette is built on a high-contrast dark mode foundation to allow the glass effects and vibrant accents to "pop." 

- **Primary (Electric Blue):** Used for financial data, primary actions, and system-level navigation.
- **Secondary (Vibrant Emerald):** Dedicated to success states, attendance confirmation, and healthy capacity indicators.
- **Tertiary (Glowing Amber):** Used for warnings, late-entry alerts, and urgent maintenance tasks.
- **Background:** A complex mesh gradient using deep navy, emerald, and amber tones. This gradient should animate subtly in the background to maintain the "liquid" feel.
- **Surface:** The primary container color is a semi-transparent white (8-12% opacity) which creates the frosted appearance when combined with heavy background blurs.

## Typography
Typography uses **Inter** exclusively to ensure maximum legibility against complex, translucent backgrounds. To counteract the "softness" of glass, text must remain crisp:

1. **High Contrast:** Always use pure white (#FFFFFF) for primary text and high-opacity light grey (#CBD5E1) for secondary text.
2. **Weight as Hierarchy:** Use semi-bold and bold weights for headings to anchor the eye as it scans the frosted surfaces.
3. **Tracking:** Use slightly tighter letter-spacing on display headings and wider spacing on "label-caps" to ensure clarity at small sizes.

## Layout & Spacing
The layout follows a **Fluid Grid** model to accommodate the varied data density of warden management (e.g., student lists vs. financial dashboards).

- **Desktop:** 12-column grid with a fixed sidebar (280px). Main content resides in a "glass tray" with 40px external margins.
- **Mobile:** Single column with 16px side margins. Modals and drawers replace complex grid structures.
- **Rhythm:** An 8px base unit governs all spacing. Vertical rhythm is strictly enforced to keep data-heavy tables readable.
- **Negative Space:** Generous padding within glass containers (24px+) is required to prevent the backdrop blur from feeling claustrophobic.

## Elevation & Depth
Depth is created through "Backdrop Layers" rather than traditional shadows:

1. **Layer 0 (Background):** The animated liquid mesh gradient.
2. **Layer 1 (Main UI):** 16px backdrop-blur, 1px white border (15% opacity), subtle inner glow (top-left).
3. **Layer 2 (Modals/Popovers):** 32px backdrop-blur, 1px white border (25% opacity), and a diffused colored shadow (shadow color matches the primary color of the action, e.g., an Amber shadow for a warning modal).
4. **Interactive State:** When an element is hovered, the backdrop-blur increases and the inner glow intensifies, simulating the object moving closer to the user.

## Shapes
In line with the "Liquid Glass" theme, shapes are highly rounded to mimic tensioned fluid. 

- **Primary Containers:** Use `rounded-xl` (1.5rem / 24px) to create a soft, friendly aesthetic.
- **Buttons and Inputs:** Use `rounded-lg` (1rem / 16px) for a consistent tactile feel.
- **Status Pills:** Use pill-shaped (full radius) geometry to distinguish them from actionable buttons.

## Components
### Buttons
- **Primary:** Solid Electric Blue with a 10% brightness inner glow on the top edge. 20px soft blue drop shadow.
- **Ghost (Secondary):** 1px white border (30% opacity), semi-transparent background, high blur.

### Input Fields
- Background is a darker, more opaque version of the glass (15% white). 
- Bottom-heavy 1px border that glows when focused (Electric Blue).

### Cards (Student/Room Cards)
- Individual cards within the grid should have a 12px backdrop blur.
- Header of the card should have a subtle 5% white "sheen" gradient from top-left to bottom-right.

### List & Tables
- Table rows should not have solid backgrounds. Use a 1px divider (white, 10% opacity).
- Hovering a row should trigger a "highlight" glass effect (20% white opacity).

### Chips/Indicators
- **Attendance Status:** Glowing Emerald (#10b981) circle with a 4px blur glow behind it.
- **Late Alerts:** Pulsing Amber (#f59e0b) text with a subtle background "glass" tint.

### Navigation Sidebar
- High-blur (40px) vertical bar. Icons should be "high-gloss" style with subtle gradients and a 1px highlight on their top edges.