/**
 * Zalemart FULL IMPORT script — handles normalization, dedup, cleanup.
 *
 * Usage: node scripts/zalemart-import.mjs
 */

const PROD_URL = 'https://digitak-r2m5.vercel.app';
const FEED_URL =
  'https://docs.google.com/spreadsheets/d/1RmUoY3_6-8O6jEtI83oml20dB43vxmOOXLrwNAn7lcs/export?format=csv';

const BATCH_SIZE = 50;

function parseCsvRows(csvText) {
  const rows = [];
  const fields = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
        i++;
      } else if (ch === '\r') {
        i++;
      } else if (ch === '\n') {
        fields.push(current);
        current = '';
        if (fields.length > 1 || fields[0] !== '') {
          rows.push([...fields]);
        }
        fields.length = 0;
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current);
  if (fields.length > 1 || fields[0] !== '') {
    rows.push([...fields]);
  }
  return rows;
}

function normalizeHandle(raw) {
  return raw.replace(/-\d+$/, '');
}

function getHandlesFromCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];
  const handles = new Set();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const handle = (row[1] || '').trim();
    if (handle) handles.add(normalizeHandle(handle));
  }
  return [...handles];
}

async function callSync(handles, mode, markupPct) {
  const body = { mode, markupPercentage: markupPct };
  if (handles && handles.length > 0) {
    body.selectedHandles = handles;
  }
  const res = await fetch(`${PROD_URL}/api/admin/zalemart/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sync API ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('=== ZALEMART FULL IMPORT (with handle normalization) ===\n');

  // Step 1: Fetch feed
  console.log('[1/6] Fetching Zalemart feed...');
  const feedRes = await fetch(FEED_URL, { headers: { Accept: 'text/csv' } });
  if (!feedRes.ok) throw new Error(`Feed fetch failed: ${feedRes.status}`);
  const csvText = await feedRes.text();
  console.log(`  Feed size: ${(csvText.length / 1024 / 1024).toFixed(1)} MB`);

  // Step 2: Parse handles (normalized)
  console.log('\n[2/6] Parsing product handles (normalized)...');
  const allHandles = getHandlesFromCsv(csvText);
  console.log(`  Unique normalized handles: ${allHandles.length}`);

  // Step 3: Split into batches
  const batches = [];
  for (let i = 0; i < allHandles.length; i += BATCH_SIZE) {
    batches.push(allHandles.slice(i, i + BATCH_SIZE));
  }
  console.log(`  Batches of ${BATCH_SIZE}: ${batches.length}`);

  // Step 4: Import batches
  console.log('\n[3/6] Importing batches (import mode)...\n');
  const totals = {
    productsFound: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsDeactivated: 0,
    variantsTotal: 0,
    errors: [],
  };

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const batchNum = b + 1;
    console.log(`  Batch ${batchNum}/${batches.length} (${batch.length} handles)...`);

    try {
      const result = await callSync(batch, 'import', 40);
      totals.productsFound += result.productsFound || 0;
      totals.productsCreated += result.productsCreated || 0;
      totals.productsUpdated += result.productsUpdated || 0;
      totals.productsDeactivated += result.productsDeactivated || 0;
      totals.variantsTotal += result.variantsTotal || 0;
      if (result.errors) {
        totals.errors.push(...result.errors);
      }
      console.log(`    Created: ${result.productsCreated}, Updated: ${result.productsUpdated}, Errors: ${result.errors?.length || 0}`);
    } catch (err) {
      console.error(`    BATCH FAILED: ${err.message}`);
      totals.errors.push(`Batch ${batchNum}: ${err.message}`);
    }

    if (b < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log('\n[4/6] Import pass results:');
  console.log(`  Found:       ${totals.productsFound}`);
  console.log(`  Created:     ${totals.productsCreated}`);
  console.log(`  Updated:     ${totals.productsUpdated}`);
  console.log(`  Deactivated: ${totals.productsDeactivated}`);
  console.log(`  Variants:    ${totals.variantsTotal}`);
  console.log(`  Errors:      ${totals.errors.length}`);
  if (totals.errors.length > 0) {
    console.log('\n  Errors:');
    totals.errors.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
  }

  // Step 5: Get overall stats from the API
  console.log('\n[5/6] Fetching overall stats...');
  try {
    const statsRes = await fetch(`${PROD_URL}/api/admin/zalemart/sync`);
    if (statsRes.ok) {
      const stats = await statsRes.json();
      console.log(`  Total synced products in DB: ${stats.totalProducts}`);
      console.log(`  Active (non-out-of-stock):   ${stats.activeProducts}`);
    }
  } catch (err) {
    console.log(`  Could not fetch stats: ${err.message}`);
  }

  console.log('\n[6/6] === DONE ===');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
