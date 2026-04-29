// Opsette Share — per-app configuration.

export type OpsetteShareConfig = {
  appName: string;
  tagline: string;
  url: string;
  logoSrc?: string;
};

export const opsetteShareConfig: OpsetteShareConfig = {
  appName: "Contact Capture",
  tagline: "Scan business cards and capture contacts offline.",
  url: "https://tools.opsette.io/contact-capture/",
  logoSrc: "opsette-logo.png",
};
