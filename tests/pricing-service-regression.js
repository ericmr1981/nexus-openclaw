import assert from 'assert';
import fs from 'fs';
import path from 'path';

import * as PricingService from '../server/usage/pricing-service.js';

let passed = 0;
let failed = 0;
const PRICING_CACHE_PATH = path.join(process.cwd(), '.nexus-runtime', 'pricing-cache.json');

function snapshotPricingCache() {
  if (!fs.existsSync(PRICING_CACHE_PATH)) {
    return { exists: false, content: null };
  }
  return {
    exists: true,
    content: fs.readFileSync(PRICING_CACHE_PATH, 'utf-8')
  };
}

function restorePricingCache(snapshot) {
  if (!snapshot || !snapshot.exists) {
    fs.rmSync(PRICING_CACHE_PATH, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(PRICING_CACHE_PATH), { recursive: true });
  fs.writeFileSync(PRICING_CACHE_PATH, snapshot.content);
}

function pass(name) {
  passed += 1;
  console.log(`✅ ${name}`);
}

function fail(name, error) {
  failed += 1;
  console.log(`❌ ${name}`);
  console.log(`   ${error?.message || error}`);
}

function run(name, fn) {
  try {
    PricingService.__resetForTests();
    fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  }
}

async function runAsync(name, fn) {
  const cacheSnapshot = snapshotPricingCache();
  try {
    PricingService.__resetForTests();
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  } finally {
    restorePricingCache(cacheSnapshot);
  }
}

run('fallback pricing resolves claude date-suffixed model', () => {
  const pricing = PricingService.getModelPricing('claude-opus-4-5-20251101');
  assert.equal(Boolean(pricing), true);
  assert.equal(pricing.inputPerMillion, 15);
  assert.equal(pricing.outputPerMillion, 75);
});

run('fallback pricing resolves claude thinking variant', () => {
  const pricing = PricingService.getModelPricing('claude-sonnet-4-5-thinking');
  assert.equal(Boolean(pricing), true);
  assert.equal(pricing.inputPerMillion, 3);
  assert.equal(pricing.outputPerMillion, 15);
});

run('fallback pricing resolves dashed and dotted version aliases', () => {
  const dashed = PricingService.getModelPricing('claude-opus-4-6');
  const dotted = PricingService.getModelPricing('claude-opus-4.6');
  assert.equal(Boolean(dashed), true);
  assert.equal(Boolean(dotted), true);
  assert.equal(dashed.inputPerMillion, dotted.inputPerMillion);
  assert.equal(dashed.outputPerMillion, dotted.outputPerMillion);
});

run('fallback pricing resolves provider-prefixed model names', () => {
  const pricing = PricingService.getModelPricing('anthropic/claude-haiku-4-5-20251001');
  assert.equal(Boolean(pricing), true);
  assert.equal(pricing.inputPerMillion, 1);
  assert.equal(pricing.outputPerMillion, 5);
});

run('calculateCostUsd produces non-zero claude cost offline', () => {
  const cost = PricingService.calculateCostUsd('claude-opus-4-6', {
    inputTokens: 1_000_000,
    outputTokens: 100_000,
    cacheReadInputTokens: 500_000,
    cacheCreationInputTokens: 200_000
  });

  assert.equal(typeof cost, 'number');
  assert.equal(cost > 0, true);
});

run('calculateCostBreakdown returns rates and component totals', () => {
  const breakdown = PricingService.calculateCostBreakdown('gpt-5-codex', {
    inputTokens: 1_000_000,
    outputTokens: 100_000,
    cachedInputTokens: 200_000
  });

  assert.equal(Boolean(breakdown), true);
  assert.equal(typeof breakdown.totalCostUsd, 'number');
  assert.equal(breakdown.totalCostUsd > 0, true);
  assert.equal(breakdown.pricing.inputPerMillion, 1.25);
  assert.equal(breakdown.pricing.outputPerMillion, 10);
  assert.equal(typeof breakdown.componentsUsd.inputUsd, 'number');
});

run('calculateCostBreakdown avoids cached-input double charge', () => {
  const breakdown = PricingService.calculateCostBreakdown('gpt-5-codex', {
    inputTokens: 1_000_000,
    outputTokens: 100_000,
    cachedInputTokens: 200_000
  });

  assert.equal(Boolean(breakdown), true);
  // input: (1_000_000 - 200_000) * 1.25 / 1e6 = 1.0
  assert.equal(Math.abs(breakdown.componentsUsd.inputUsd - 1.0) < 1e-9, true);
  // cached input: 200_000 * 0.125 / 1e6 = 0.025
  assert.equal(Math.abs(breakdown.componentsUsd.cachedInputUsd - 0.025) < 1e-9, true);
  // output: 100_000 * 10 / 1e6 = 1.0; total = 2.025
  assert.equal(Math.abs(breakdown.totalCostUsd - 2.025) < 1e-9, true);
});

await runAsync('refreshPricingInBackground accepts LiteLLM token-cost fields', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      'openai/gpt-5-codex': {
        input_cost_per_token: 1.25e-6,
        output_cost_per_token: 1e-5,
        cache_read_input_token_cost: 1.25e-7,
        cache_creation_input_token_cost: 1.25e-6
      }
    })
  });

  try {
    const changed = await PricingService.refreshPricingInBackground({ force: true });
    assert.equal(changed, true);

    const pricing = PricingService.getModelPricing('gpt-5-codex');
    assert.equal(Boolean(pricing), true);
    assert.equal(pricing.inputPerMillion, 1.25);
    assert.equal(pricing.outputPerMillion, 10);
    assert.equal(pricing.cacheReadPerMillion, 0.125);
    assert.equal(pricing.cacheWritePerMillion, 1.25);
  } finally {
    global.fetch = originalFetch;
  }
});

await runAsync('refreshPricingInBackground keeps fallback entries with partial remote dataset', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      'openai/gpt-5-codex': {
        input_cost_per_token: 1.25e-6,
        output_cost_per_token: 1e-5,
        cache_read_input_token_cost: 1.25e-7,
        cache_creation_input_token_cost: 1.25e-6
      }
    })
  });

  try {
    await PricingService.refreshPricingInBackground({ force: true });
    const codexPricing = PricingService.getModelPricing('gpt-5-codex');
    const claudePricing = PricingService.getModelPricing('claude-opus-4-6');
    assert.equal(Boolean(codexPricing), true);
    assert.equal(Boolean(claudePricing), true);
    assert.equal(claudePricing.inputPerMillion, 15);
    assert.equal(claudePricing.outputPerMillion, 75);
  } finally {
    global.fetch = originalFetch;
  }
});

await runAsync('refreshPricingInBackground falls back to local cache when fetch fails', async () => {
  const cachePath = PRICING_CACHE_PATH;
  const cacheDir = path.dirname(cachePath);
  const hadCache = fs.existsSync(cachePath);
  const originalCache = hadCache ? fs.readFileSync(cachePath, 'utf-8') : null;
  const originalFetch = global.fetch;

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify({
    fetchedAt: Date.now(),
    pricingTable: {
      'gpt-5-codex': {
        inputPerMillion: 9,
        outputPerMillion: 90,
        cacheReadPerMillion: 0.9,
        cacheWritePerMillion: 9
      }
    }
  }, null, 2));

  global.fetch = async () => {
    throw new Error('network_down');
  };

  try {
    const changed = await PricingService.refreshPricingInBackground({ force: true });
    assert.equal(changed, true);
    const pricing = PricingService.getModelPricing('gpt-5-codex');
    assert.equal(Boolean(pricing), true);
    assert.equal(pricing.inputPerMillion, 9);
    assert.equal(pricing.outputPerMillion, 90);
  } finally {
    global.fetch = originalFetch;
    if (hadCache && originalCache !== null) {
      fs.writeFileSync(cachePath, originalCache);
    } else {
      fs.rmSync(cachePath, { force: true });
    }
  }
});

console.log('---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
