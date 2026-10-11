# STYLE_BIBLE

This file defines the minimum configurable visual contract. It is intentionally not a hard-coded palette or style prescription for every project.

## Project-owned decisions

Each project should explicitly declare or inherit from its existing style source:

- palette: background, primary, secondary and accent colors, contrast intent, and restrictions on accent use;
- typography: font family availability, role-based sizes, line width, subtitle safe area and per-line character budget;
- hierarchy: hero, supporting structure, background and text layer priorities;
- graphic language: shape/icon family, stroke, borders, shadow and depth rules;
- motion: permitted presets, duration/easing ranges, settle/hold requirements and maximum simultaneous attention-seeking motions;
- transitions: match-cut, continuity handoff, causal reveal, or deliberate reset;
- sound: narration priority, sound-effect purpose and mix/silence constraints.

## Layer discipline

Default to background, subject and text. Add camera, foreground depth, decorative environment or extra motion only when the shot contract explains the informational purpose. Stillness is valid; motion without an information purpose is not.

## Validation

Prefer the existing project visual contract source and its generated fixtures over copied numeric constants. A missing project-specific value is reported as unresolved rather than silently replaced with a universal aesthetic rule. Font metrics and actual pixel bounds require the project's browser/render measurement path; static source checks alone cannot prove visual legibility.
