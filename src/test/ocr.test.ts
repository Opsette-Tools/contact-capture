import { describe, it, expect } from "vitest";
import { parseCardText } from "@/lib/ocr";

describe("parseCardText", () => {
  it("parses a clean card with company suffix hint", () => {
    const raw = [
      "Jordan Rivera",
      "Owner & Lead Stylist",
      "Glow Studio",
      "+1 (555) 234-5678",
      "jordan@glowstudio.com",
      "glowstudio.com",
      "@glowstudio",
      "facebook.com/glowstudio",
      "742 Elm Street, Suite 12",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.email).toBe("jordan@glowstudio.com");
    expect(r.phone).toMatch(/555/);
    expect(r.company).toBe("Glow Studio");
    expect(r.name).toBe("Jordan Rivera");
  });

  it("ignores QR-code OCR garbage like 'RR hr' and '©LE'", () => {
    const raw = [
      "RR hr",
      "©LE",
      "Ops software for small businesses",
      "",
      "Jamie Smith",
      "Founder",
      "(555) 123-4567",
      "www.samplebrand.io",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.name).toBe("Jamie Smith");
    expect(r.company).toBe("");
  });

  it("preserves leading paren in phone number", () => {
    const raw = [
      "Jamie Smith",
      "Automation & Systems Consulting",
      "(555)123-4567",
      "jamie@samplebrand.co",
      "samplebrand.co",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.phone).toBe("(555)123-4567");
  });

  it("derives company from email domain when no company text exists", () => {
    const raw = [
      "Jamie Smith",
      "Founder",
      "(555) 123-4567",
      "jamie@samplebrand.co",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.name).toBe("Jamie Smith");
    expect(r.email).toBe("jamie@samplebrand.co");
    expect(r.company).toBe("Samplebrand");
  });

  it("derives multi-word company from compound email domain", () => {
    const raw = [
      "Jane Doe",
      "jane@acme-corp.com",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.company).toBe("Acme Corp");
  });

  it("does not invent a company when there is no email and no company text", () => {
    const raw = [
      "Jamie Smith",
      "Founder",
      "(555) 123-4567",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.name).toBe("Jamie Smith");
    expect(r.company).toBe("");
  });

  it("ignores QR garbage above the name", () => {
    const raw = [
      "L  | -  =. ",
      "1l1 ll  ! .",
      "::    ..  ",
      "Jamie Smith",
      "Founder",
      "(555) 123-4567",
      "www.samplebrand.io",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.name).toBe("Jamie Smith");
  });

  it("does not pick a role line as the name", () => {
    const raw = [
      "Founder",
      "Jamie Smith",
      "(555) 123-4567",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.name).toBe("Jamie Smith");
  });

  it("does not pick a tagline as the company", () => {
    const raw = [
      "Ops software for small businesses",
      "Jamie Smith",
      "Founder",
      "www.samplebrand.io",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.name).toBe("Jamie Smith");
    expect(r.company).toBe("");
  });

  it("extracts website from a www. line", () => {
    const raw = [
      "Jamie Smith",
      "Founder",
      "(555) 123-4567",
      "www.samplebrand.io",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.website).toBe("samplebrand.io");
  });

  it("extracts website from a bare-domain line", () => {
    const raw = [
      "Jamie Smith",
      "(555)123-4567",
      "jamie@samplebrand.co",
      "samplebrand.co",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.website).toBe("samplebrand.co");
    expect(r.email).toBe("jamie@samplebrand.co");
  });

  it("does not pick an email line as the website", () => {
    const raw = [
      "Jane Doe",
      "jane@acme.com",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.website).toBe("");
  });

  it("does not pick a social profile URL as the website", () => {
    const raw = [
      "Jane Doe",
      "facebook.com/janedoe",
      "janedoe.com",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.website).toBe("janedoe.com");
  });

  it("picks Consulting suffix as a company hint", () => {
    const raw = [
      "Jane Doe",
      "Bright Path Consulting",
      "jane@brightpath.com",
    ].join("\n");

    const r = parseCardText(raw);
    expect(r.name).toBe("Jane Doe");
    expect(r.company).toBe("Bright Path Consulting");
  });
});
