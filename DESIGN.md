---
name: Hyeria
description: Clear operations for self-hosted CLI Proxy API v8.
colors:
  background: "#000000"
  foreground: "#ededed"
  card: "#0a0a0a"
  secondary: "#111111"
  accent: "#1a1a1a"
  border: "#262626"
  input: "#333333"
  muted-foreground: "#a1a1a1"
typography:
  body:
    fontFamily: 'Google Sans, Product Sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
  label:
    fontFamily: "Google Code Sans, Google Sans Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
rounded:
  default: "8px"
spacing:
  page: "24px"
---

# Design System: Hyeria

## Overview

**Creative North Star: "Quiet Operations"**

Hyeria presents operational information on a pure-black dark canvas, with near-black surfaces and precise dividers. The visual language stays quiet so system status, configuration, and user decisions remain the focus. Existing application navigation and familiar web controls remain intact across static, management, and demo builds.

The default is dark, while light, white, and system choices remain available. Motion is brief and purposeful, and operating-system reduced-motion preferences are respected. The requested Google type families lead their stacks; platform fallbacks keep the interface functional when those fonts are unavailable.

**Key Characteristics:**

- Pure black default background with subtle tonal layers.
- Semantic colors carry status; neutral emphasis carries structure.
- Familiar, responsive application shell and controls.

## Colors

The dark palette uses a true-black ground, restrained neutral surfaces, and semantic state colors.

### Primary

- **Near-white** (`#ededed`): Primary text and high-emphasis controls on dark surfaces.

### Neutral

- **Black** (`#000000`): Dark theme page background.
- **Surface** (`#0a0a0a`): Cards and popovers.
- **Raised neutral** (`#111111`): Secondary and muted surfaces.
- **Accent surface** (`#1a1a1a`): Hover and selected states.
- **Divider** (`#262626`): Borders and separators.
- **Input edge** (`#333333`): Input boundaries.
- **Secondary text** (`#a1a1a1`): Supporting copy and less prominent labels.

### Named Rules

**The Status Has Meaning Rule.** Reserve red, amber, green, and blue for semantic status and data; do not use them as decoration.

## Typography

**Display Font:** Google Sans (with Product Sans and system sans-serif fallbacks)
**Body Font:** Google Sans (with Product Sans and system sans-serif fallbacks)
**Label/Mono Font:** Google Code Sans (with Google Sans Mono and system monospace fallbacks)

**Character:** Clear, contemporary sans-serif text for the interface; monospaced faces are reserved for code, logs, and measured values. Fonts are referenced by family name and are not bundled in this repository.

### Hierarchy

- **Headline:** Route titles use the existing prominent heading scale and weight.
- **Body:** Google Sans stack for navigation, descriptions, and controls.
- **Label:** Google Code Sans stack for code, logs, and tabular operational values.

## Layout

The existing responsive application shell remains the organizing structure: a compact header, desktop sidebar, and existing mobile navigation. Content remains route-specific, aligned to its task and data. The shared page-spacing token is 24px; smaller screens use the existing responsive utility spacing.

## Elevation & Depth

The system is flat. Tonal surface changes and hairline borders separate regions; cards do not cast shadows.

### Named Rules

**The Flat By Default Rule.** Use tonal layering and borders for grouping rather than decorative shadows.

## Shapes

The shared default corner radius is 8px. Preserve the existing component radius variants and familiar control shapes. Use fine neutral borders rather than prominent outlines except for focus and status.

## Components

### Buttons

- **Shape:** Existing compact rounded control shape (8px default token).
- **Primary:** Near-white surface with black text; alternate variants retain the shared semantic theme tokens.
- **Hover / Focus:** Brief color and state transitions, with visible keyboard focus.
- **Active:** Subtle press scale; disabled controls remain visibly disabled.

### Cards / Containers

- **Corner Style:** Existing component rounding, based on the 8px default token.
- **Background:** Near-black surface in dark mode; semantic card token in other themes.
- **Shadow Strategy:** Flat; no card shadow.
- **Border:** One quiet semantic divider.

### Inputs / Fields

- **Style:** Theme-aware background and fine semantic input border.
- **Focus:** Visible 2px focus outline with offset.
- **Error / Disabled:** Use semantic destructive and disabled states.

### Navigation

- **Style:** Existing desktop sidebar and compact top header; mobile navigation remains unchanged in behavior. Active links use the semantic accent surface and foreground. Hover is restrained and keyboard focus stays explicit.

## Do's and Don'ts

### Do:

- **Do** use the semantic tokens for surfaces, borders, and text.
- **Do** keep status colors tied to meaningful states.
- **Do** respect reduced-motion preferences and keyboard focus.
- **Do** use tabular numerals for data, timestamps, and code-oriented values.

### Don't:

- **Don't** add decoration that competes with operational data.
- **Don't** remove existing theme options or change build-specific behavior.
- **Don't** request or persist credentials in the isolated demo.
- **Don't** depend on externally fetched fonts for basic usability.
