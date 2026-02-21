#!/usr/bin/env tsx
/**
 * Hungarian Law MCP -- Ingestion Pipeline
 *
 * Fetches Hungarian legislation from the official Nemzeti Jogszabalytar portal
 * (https://njt.hu), parses section-level provisions, and writes seed JSON files.
 *
 * Usage:
 *   npm run ingest                    # Full ingestion
 *   npm run ingest -- --limit 3       # Process first 3 acts
 *   npm run ingest -- --skip-fetch    # Reuse locally cached HTML
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRateLimit, postJsonWithRateLimit } from './lib/fetcher.js';
import { parseHungarianHtml, KEY_HUNGARIAN_ACTS, type ActIndexEntry, type ParsedAct } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const SEED_DIR = path.resolve(__dirname, '../data/seed');
const BLOCK_ENDPOINT = 'https://njt.hu/ajax/njtGetBlock.json';

function parseArgs(): { limit: number | null; skipFetch: boolean } {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let skipFetch = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--skip-fetch') {
      skipFetch = true;
    }
  }

  return { limit, skipFetch };
}

function extractNjtDocumentId(url: string): string | null {
  const match = url.match(/\/jogszabaly\/([^/?#]+)/);
  return match ? match[1] : null;
}

function extractDeferredBlockStarts(html: string): number[] {
  return [...html.matchAll(/class=\"pH borderStart\"data-show-order=\"(\d+)\"/g)]
    .map(match => Number.parseInt(match[1], 10))
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);
}

async function hydrateDeferredBlocks(html: string, act: ActIndexEntry): Promise<string> {
  const starts = extractDeferredBlockStarts(html);
  if (starts.length === 0) return html;

  const documentId = extractNjtDocumentId(act.url);
  if (!documentId) return html;

  const blockRanges = starts.map((start, index) => ({
    start,
    last: index + 1 < starts.length ? starts[index + 1] : null,
  }));

  const chunkSize = 20;
  let appended = '';

  for (let i = 0; i < blockRanges.length; i += chunkSize) {
    const chunk = blockRanges.slice(i, i + chunkSize).map(range =>
      range.last === null ? { start: range.start } : { start: range.start, last: range.last }
    );

    const response = await postJsonWithRateLimit(BLOCK_ENDPOINT, {
      documentId,
      data: chunk,
    });

    if (response.status !== 200) {
      throw new Error(`Deferred block fetch failed for ${act.id} (HTTP ${response.status})`);
    }

    appended += `\n${response.body}`;
  }

  console.log(`    -> hydrated ${blockRanges.length} deferred block ranges`);
  return `${html}\n${appended}`;
}

async function fetchAndParseActs(acts: ActIndexEntry[], skipFetch: boolean): Promise<void> {
  console.log(`\nProcessing ${acts.length} Hungarian statutes from njt.hu...\n`);

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  let processed = 0;
  let cached = 0;
  let failed = 0;
  let totalProvisions = 0;
  let totalDefinitions = 0;

  const results: { act: string; provisions: number; definitions: number; status: string }[] = [];

  for (const act of acts) {
    const sourceFile = path.join(SOURCE_DIR, `${act.id}.html`);
    const seedFile = path.join(SEED_DIR, `${act.id}.json`);

    if (skipFetch && fs.existsSync(seedFile)) {
      const existing = JSON.parse(fs.readFileSync(seedFile, 'utf-8')) as ParsedAct;
      const provCount = existing.provisions?.length ?? 0;
      const defCount = existing.definitions?.length ?? 0;
      totalProvisions += provCount;
      totalDefinitions += defCount;
      results.push({ act: act.shortName ?? act.id, provisions: provCount, definitions: defCount, status: 'cached' });
      cached++;
      processed++;
      continue;
    }

    try {
      let html: string;

      if (skipFetch && fs.existsSync(sourceFile)) {
        html = fs.readFileSync(sourceFile, 'utf-8');
        console.log(`  Using cached HTML for ${act.shortName ?? act.id}`);
      } else {
        process.stdout.write(`  Fetching ${act.shortName ?? act.id} (${act.url})...`);
        const result = await fetchWithRateLimit(act.url);

        if (result.status !== 200) {
          console.log(` HTTP ${result.status}`);
          results.push({
            act: act.shortName ?? act.id,
            provisions: 0,
            definitions: 0,
            status: `HTTP ${result.status}`,
          });
          failed++;
          processed++;
          continue;
        }

        html = result.body;

        if (!html.includes('jogszabalyMainTitle') || !html.includes('szakasz-jel')) {
          console.log(' NO_SECTION_CONTENT');
          results.push({
            act: act.shortName ?? act.id,
            provisions: 0,
            definitions: 0,
            status: 'NO_SECTION_CONTENT',
          });
          failed++;
          processed++;
          continue;
        }

        fs.writeFileSync(sourceFile, html);
        console.log(` OK (${(html.length / 1024).toFixed(0)} KB)`);
      }

      const hydratedHtml = await hydrateDeferredBlocks(html, act);
      const parsed = parseHungarianHtml(hydratedHtml, act);
      fs.writeFileSync(seedFile, JSON.stringify(parsed, null, 2));

      totalProvisions += parsed.provisions.length;
      totalDefinitions += parsed.definitions.length;

      console.log(`    -> ${parsed.provisions.length} provisions, ${parsed.definitions.length} definitions extracted`);
      results.push({
        act: act.shortName ?? act.id,
        provisions: parsed.provisions.length,
        definitions: parsed.definitions.length,
        status: 'OK',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ERROR ${act.shortName ?? act.id}: ${message}`);
      results.push({
        act: act.shortName ?? act.id,
        provisions: 0,
        definitions: 0,
        status: `ERROR: ${message.substring(0, 80)}`,
      });
      failed++;
    }

    processed++;
  }

  console.log(`\n${'='.repeat(72)}`);
  console.log('Ingestion Report');
  console.log('='.repeat(72));
  console.log('\n  Source:       https://njt.hu');
  console.log('  Authority:    Nemzeti Jogszabalytar / Magyar Kozlony');
  console.log(`  Processed:    ${processed}`);
  console.log(`  Cached:       ${cached}`);
  console.log(`  Failed:       ${failed}`);
  console.log(`  Provisions:   ${totalProvisions}`);
  console.log(`  Definitions:  ${totalDefinitions}`);
  console.log('\n  Per-Act breakdown:');
  console.log(`  ${'Act'.padEnd(26)} ${'Provisions'.padStart(12)} ${'Definitions'.padStart(13)} ${'Status'.padStart(16)}`);
  console.log(`  ${'-'.repeat(26)} ${'-'.repeat(12)} ${'-'.repeat(13)} ${'-'.repeat(16)}`);
  for (const result of results) {
    console.log(
      `  ${result.act.padEnd(26)} ${String(result.provisions).padStart(12)} ${String(result.definitions).padStart(13)} ${result.status.padStart(16)}`
    );
  }
  console.log('');
}

async function main(): Promise<void> {
  const { limit, skipFetch } = parseArgs();

  console.log('Hungarian Law MCP -- Ingestion Pipeline');
  console.log('======================================\n');
  console.log('  Source: https://njt.hu (official Hungarian legal portal)');
  console.log('  Parse target: section-level text (szakasz, "§")');
  console.log('  Rate limit: 1200ms/request');

  if (limit) console.log(`  --limit ${limit}`);
  if (skipFetch) console.log('  --skip-fetch');

  const acts = limit ? KEY_HUNGARIAN_ACTS.slice(0, limit) : KEY_HUNGARIAN_ACTS;
  await fetchAndParseActs(acts, skipFetch);
}

main().catch(error => {
  console.error('Fatal ingestion error:', error);
  process.exit(1);
});
