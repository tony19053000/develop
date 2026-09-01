import { randomUUID } from "node:crypto";
import {
  websiteArtifactSchema,
  type DomainResearch,
  type MarketResearch,
  type WebsiteArtifact,
  type WebsiteValidation
} from "@launchforge/shared";

export interface WebsiteProductAgentInput {
  projectId: string;
  idea: string;
  marketResearch?: MarketResearch;
  domainResearch?: DomainResearch;
}

export interface WebsiteProductAgent {
  generate(input: WebsiteProductAgentInput): Promise<WebsiteArtifact>;
}

export function createWebsiteProductAgent(): WebsiteProductAgent {
  return {
    async generate(input) {
      const productName = input.marketResearch?.brand.name ?? deriveProductName(input.idea);
      const tagline = input.marketResearch?.brand.tagline ?? `Launch ${productName} with a focused first product.`;
      const targetUsers = input.marketResearch?.brand.targetUsers ?? inferTargetUsers(input.idea);
      const positioning =
        input.marketResearch?.brand.positioning ??
        "A focused launch-ready product experience with clear positioning and conversion paths.";
      const domainName = input.domainResearch?.recommendedDomain?.domainName;
      const css = buildCss();
      const js = buildJavascript(productName);
      const html = buildHtml({
        productName,
        tagline,
        idea: input.idea,
        positioning,
        targetUsers,
        ...(domainName ? { domainName } : {})
      });
      const validation = validateWebsite({ html, css, js, productName, tagline });

      return websiteArtifactSchema.parse({
        id: randomUUID(),
        projectId: input.projectId,
        productName,
        tagline,
        ...(domainName ? { domainName } : {}),
        previewPath: "index.html",
        files: [
          { path: "index.html", contentType: "text/html", contents: html },
          { path: "styles.css", contentType: "text/css", contents: css },
          { path: "app.js", contentType: "text/javascript", contents: js }
        ],
        validation,
        deployment: {
          buildCommand: "No build step required for the generated static site.",
          outputDirectory: ".",
          requiredEnvironment: []
        },
        generatedAt: new Date().toISOString()
      });
    }
  };
}

export function validateWebsite(input: {
  html: string;
  css: string;
  js: string;
  productName: string;
  tagline: string;
}): WebsiteValidation {
  const checks = [
    {
      name: "HTML document",
      passed: input.html.includes("<!doctype html>") && input.html.includes("</html>"),
      message: "Generated site includes a complete HTML document."
    },
    {
      name: "Brand signal",
      passed: input.html.includes(escapeHtml(input.productName)) && input.html.includes(escapeHtml(input.tagline)),
      message: "Generated site includes the product name and tagline."
    },
    {
      name: "Responsive CSS",
      passed: input.css.includes("@media") && input.css.includes("grid-template-columns"),
      message: "Generated site includes responsive layout rules."
    },
    {
      name: "Interactive script",
      passed: input.js.includes("querySelector") && input.js.includes("addEventListener"),
      message: "Generated site includes a small interactive lead capture flow."
    }
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

function buildHtml(input: {
  productName: string;
  tagline: string;
  idea: string;
  positioning: string;
  targetUsers: string[];
  domainName?: string;
}): string {
  const productName = escapeHtml(input.productName);
  const tagline = escapeHtml(input.tagline);
  const idea = escapeHtml(input.idea);
  const positioning = escapeHtml(input.positioning);
  const domainName = input.domainName ? escapeHtml(input.domainName) : "domain ready";
  const audienceItems = input.targetUsers
    .slice(0, 4)
    .map((user) => `<li>${escapeHtml(user)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${productName}</title>
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body>
    <main>
      <section class="hero">
        <nav class="nav" aria-label="Product navigation">
          <strong>${productName}</strong>
          <a href="#waitlist">Join waitlist</a>
        </nav>
        <div class="hero-grid">
          <div class="hero-copy">
            <p class="kicker">${domainName}</p>
            <h1>${productName}</h1>
            <p class="tagline">${tagline}</p>
            <p class="summary">${positioning}</p>
            <form id="waitlist" class="waitlist-form">
              <input aria-label="Email address" name="email" placeholder="founder@example.com" type="email" required>
              <button type="submit">Request access</button>
            </form>
            <p class="form-status" role="status"></p>
          </div>
          <div class="product-panel" aria-label="Product preview">
            <div class="panel-topline">
              <span>Launch score</span>
              <strong>92</strong>
            </div>
            <div class="metric-row"><span>Problem clarity</span><strong>High</strong></div>
            <div class="metric-row"><span>Audience fit</span><strong>Ready</strong></div>
            <div class="metric-row"><span>First workflow</span><strong>Mapped</strong></div>
          </div>
        </div>
      </section>
      <section class="content-band">
        <article>
          <p class="kicker">Product</p>
          <h2>Built around the first customer promise</h2>
          <p>${idea}</p>
        </article>
        <article>
          <p class="kicker">Audience</p>
          <h2>Who it serves</h2>
          <ul>${audienceItems}</ul>
        </article>
        <article>
          <p class="kicker">Launch path</p>
          <h2>Ready for backend and deployment</h2>
          <p>This static product surface is prepared for Phase 10 backend wiring and Phase 11 deployment.</p>
        </article>
      </section>
    </main>
    <script src="./app.js"></script>
  </body>
</html>`;
}

function buildCss(): string {
  return `:root {
  color: #17201c;
  background: #f7f8f4;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

a {
  color: inherit;
  font-weight: 800;
}

.hero {
  min-height: 78vh;
  padding: 24px clamp(18px, 5vw, 72px) 56px;
  background: #f7f8f4;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 52px;
  border-bottom: 1px solid #dce4dc;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.75fr);
  gap: clamp(24px, 6vw, 72px);
  align-items: center;
  min-height: 62vh;
}

.kicker {
  margin: 0 0 10px;
  color: #2f7e52;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 14px;
  font-size: clamp(3rem, 8vw, 6.5rem);
  line-height: 0.92;
  letter-spacing: 0;
}

h2 {
  margin-bottom: 10px;
  font-size: 1.2rem;
}

.tagline,
.summary,
article p,
li {
  color: #4f5f55;
  line-height: 1.55;
}

.tagline {
  max-width: 760px;
  font-size: 1.25rem;
  font-weight: 800;
}

.summary {
  max-width: 760px;
}

.waitlist-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  max-width: 560px;
  margin-top: 24px;
}

input,
button {
  min-height: 48px;
  border-radius: 8px;
  font: inherit;
}

input {
  border: 1px solid #c5d1c8;
  padding: 0 14px;
}

button {
  border: 0;
  padding: 0 18px;
  background: #1f6f46;
  color: #ffffff;
  font-weight: 900;
}

.form-status {
  min-height: 24px;
  margin-top: 10px;
  color: #1f6f46;
  font-weight: 800;
}

.product-panel {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid #c8d8cc;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 60px rgb(20 40 30 / 12%);
}

.panel-topline,
.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #f1f5ef;
}

.panel-topline strong {
  font-size: 2rem;
}

.content-band {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  padding: 36px clamp(18px, 5vw, 72px) 64px;
  border-top: 1px solid #dce4dc;
}

article {
  min-width: 0;
}

ul {
  margin: 0;
  padding-left: 20px;
}

@media (max-width: 780px) {
  .hero-grid,
  .content-band,
  .waitlist-form {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 3.2rem;
  }
}`;
}

function buildJavascript(productName: string): string {
  return `const form = document.querySelector(".waitlist-form");
const status = document.querySelector(".form-status");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim();
  status.textContent = email
    ? "You're on the ${escapeJavascript(productName)} launch list."
    : "Enter an email to request access.";
  form.reset();
});`;
}

function deriveProductName(idea: string): string {
  const ignoredWords = new Set(["launch", "with", "that", "for", "the", "and", "platform", "startup", "product"]);
  const seed =
    idea
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .split(/\s+/)
      .find((word) => word.length > 3 && !ignoredWords.has(word.toLowerCase())) ?? "Launch";

  return `${seed.charAt(0).toUpperCase()}${seed.slice(1).toLowerCase()}Site`;
}

function inferTargetUsers(idea: string): string[] {
  const lowerIdea = idea.toLowerCase();

  if (lowerIdea.includes("student") || lowerIdea.includes("university")) {
    return ["Students", "Career teams", "Early-career candidates"];
  }

  if (lowerIdea.includes("law") || lowerIdea.includes("legal")) {
    return ["Small law firms", "Legal operators", "Founders"];
  }

  return ["Founders", "Operators", "Early adopters"];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJavascript(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", " ");
}
