---
name: Wellfie AI Premium
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#b4c5ff'
  on-secondary: '#002a78'
  secondary-container: '#0053db'
  on-secondary-container: '#cdd7ff'
  tertiary: '#bec6e0'
  on-tertiary: '#283044'
  tertiary-container: '#9ba2bb'
  on-tertiary-container: '#31394d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2.5rem
  xl: 4rem
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
---

## Brand & Style

The design system is engineered to embody "Clinical Precision meets Luxury Lifestyle." It positions the product as a high-end health-tech authority that is both scientifically rigorous and aesthetically aspirational. The target audience consists of health-conscious high-performers who value data clarity and premium experiences.

The visual direction follows a **Modern Glassmorphic** approach. It utilizes deep, sophisticated foundations layered with translucent glass panels, subtle glowing gradients, and razor-sharp typography. This creates a sense of "physicality" in a digital space—as if the user is interacting with an advanced, holographic medical interface designed for the home. The mood is calm, professional, and deeply trustworthy.

## Colors

The palette is anchored in a dark, high-contrast environment to emphasize premium quality and focus.

- **Primary Emerald (#10B981):** Used for primary CTAs, success states, and positive health indicators. It represents vitality and growth.
- **Secondary Blue (#2563EB):** Reserved for technical data points, AI-driven insights, and secondary links.
- **Foundational Navy & Charcoal:** `#0F172A` serves as the primary surface color, while a deeper `#080C14` is used for the background to create infinite depth.
- **Functional Accents:** Gradients should transition from Emerald to a slightly deeper forest green to add dimension to buttons and active states.

## Typography

This design system utilizes **Manrope** exclusively to maintain a clean, geometric, yet approachable character. 

- **Hierarchy:** Use bold and extra-bold weights for headlines to create a strong vertical rhythm. 
- **Readability:** Body text uses a slightly increased line height (1.6) and generous letter spacing to ensure data-heavy health reports remain legible and less intimidating.
- **Emphasis:** The `label-caps` style is used for small metadata, categories, and overlines to provide a professional, organized structure to dashboard widgets.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid with Generous Whitespace**. Content should never feel cramped; the health-tech nature requires "breathing room" to convey a sense of calm.

- **Desktop:** 12-column grid with a maximum content width of 1440px. 
- **Mobile:** 4-column grid with 20px side margins.
- **Rhythm:** Use a 4px baseline grid. Components are separated by `lg` (2.5rem) or `xl` (4rem) spacing to group health metrics logically while maintaining visual separation between distinct data sets.

## Elevation & Depth

Depth is achieved through **Glassmorphism and Tonal Layering** rather than traditional heavy shadows.

- **Surface Strategy:** Background is the deepest navy. Cards use a semi-transparent fill (`rgba(30, 41, 59, 0.7)`) with a `backdrop-blur` of 12px to 20px.
- **Borders:** Instead of shadows, use 1px "inner-glow" borders. These are subtle linear gradients (top-left to bottom-right) starting at `white / 15%` and ending at `white / 5%`.
- **Active Elevation:** When an element is focused or hovered, increase the backdrop blur intensity and add a subtle outer glow using the Primary Emerald color at 20% opacity.

## Shapes

The shape language balances professional structure with friendly accessibility.

- **Containers:** Large containers and cards utilize `rounded-3xl` (1.5rem / 24px) to soften the "clinical" edge of the data.
- **Interactive Elements:** Buttons and input fields use `rounded-2xl` (1rem / 16px).
- **Icons:** Use a consistent 2px stroke width with slightly rounded terminals to match the typography's geometry.

## Components

- **Buttons:** Primary buttons feature a subtle vertical gradient of Emerald Green. Text is bold and centered. Use a high-gloss "glass" variant for secondary actions.
- **Health Chips:** Small, pill-shaped indicators for status (e.g., "Optimal," "At Risk"). Use low-opacity background tints of the status color with high-contrast text.
- **Data Cards:** The core of the dashboard. Use the glassmorphic style with a subtle inner border. Headlines within cards should be `headline-md`.
- **Input Fields:** Dark, recessed backgrounds with a 1px border that illuminates in Emerald when focused.
- **Progress Rings:** Use thick 8px strokes for health metrics, utilizing gradients to show progress (e.g., Deep Green to Bright Emerald).
- **AI Insights:** Specialized containers with a subtle "pulsing" blue glow border to indicate AI-generated content.