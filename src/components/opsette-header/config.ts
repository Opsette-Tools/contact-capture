// Opsette Header — per-app configuration for Contact Capture.
// See ../../../_shared/opsette-header/INTEGRATION.md.

import type { OpsetteHeaderConfig } from "./config.template";

export type { OpsetteHeaderConfig };

export const opsetteHeaderConfig: OpsetteHeaderConfig = {
  toolName: "Contact Capture",
  brandIconPaths: `
    <circle cx="136" cy="112" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <line x1="32" y1="72" x2="56" y2="72" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <line x1="32" y1="128" x2="56" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <line x1="32" y1="184" x2="56" y2="184" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <path d="M88,168a60,60,0,0,1,96,0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    <rect x="40" y="48" width="192" height="160" rx="8" transform="translate(264 -8) rotate(90)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
  `,
};
