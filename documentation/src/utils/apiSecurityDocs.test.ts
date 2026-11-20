import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Docs contracts for issue #609 — dapp RPC CORS, allowlists, and secrets.
 *
 * These tests read markdown and sidebars.ts from disk. They do not hit the
 * network. The file lives next to analyticsFunnel.test.ts because
 * src/utils/__tests__/** is excluded from the default vitest run.
 */

const DOCS_ROOT = path.join(__dirname, '../../docs/getting-started');
const SIDEBARS = path.join(__dirname, '../../sidebars.ts');
const API_SECURITY = path.join(DOCS_ROOT, 'api-security.md');
const JS_SDK = path.join(DOCS_ROOT, 'js-sdk.md');
const CONTRACT_INTERACTION = path.join(DOCS_ROOT, 'contract-interaction.md');

/** StrKey secret seeds are 56 characters, alphabet A–Z and 2–7, prefix S. */
const STELLAR_SECRET_KEY = /\bS[A-Z2-7]{55}\b/;

function gettingStartedMarkdownFiles(): string[] {
  return fs
    .readdirSync(DOCS_ROOT)
    .filter((name) => name.endsWith('.md') || name.endsWith('.mdx'))
    .map((name) => path.join(DOCS_ROOT, name));
}

describe('dapp API security docs (#609)', () => {
  it('lists api-security and js-sdk in the Getting Started sidebar', () => {
    const sidebars = fs.readFileSync(SIDEBARS, 'utf8');
    expect(sidebars).toContain("'getting-started/js-sdk'");
    expect(sidebars).toContain("'getting-started/api-security'");
    const jsSdkAt = sidebars.indexOf("'getting-started/js-sdk'");
    const apiAt = sidebars.indexOf("'getting-started/api-security'");
    const contractAt = sidebars.indexOf("'getting-started/contract-interaction'");
    expect(jsSdkAt).toBeGreaterThan(contractAt);
    expect(apiAt).toBeGreaterThan(jsSdkAt);
  });

  it('links api-security from the js-sdk page', () => {
    expect(fs.existsSync(JS_SDK)).toBe(true);
    const jsSdk = fs.readFileSync(JS_SDK, 'utf8');
    expect(jsSdk).toMatch(/\]\(\.\/api-security\.md\)/);
  });

  it('links api-security from contract-interaction', () => {
    const page = fs.readFileSync(CONTRACT_INTERACTION, 'utf8');
    expect(page).toMatch(/\]\(\.\/api-security\.md\)/);
  });

  it('covers Freighter, CORS, dedicated RPC, and non-endorsement', () => {
    const page = fs.readFileSync(API_SECURITY, 'utf8');
    expect(page).toMatch(/Freighter/);
    expect(page).toMatch(/CORS/);
    expect(page).toMatch(/dedicated/i);
    expect(page).toMatch(/not an endorsement|not endorsements/i);
  });

  it('does not teach Keypair.fromSecret on js-sdk or contract-interaction pages', () => {
    const jsSdk = fs.readFileSync(JS_SDK, 'utf8');
    const contract = fs.readFileSync(CONTRACT_INTERACTION, 'utf8');
    expect(jsSdk).not.toMatch(/fromSecret/);
    expect(contract).not.toMatch(/fromSecret/);
  });

  it('does not embed Stellar secret keys in Getting Started markdown', () => {
    const hits: string[] = [];
    for (const file of gettingStartedMarkdownFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      if (STELLAR_SECRET_KEY.test(text)) {
        hits.push(path.basename(file));
      }
    }
    expect(hits).toEqual([]);
  });
});
