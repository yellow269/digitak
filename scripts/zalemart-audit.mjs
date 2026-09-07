/**
 * Post-import audit script.
 * Queries the production API and parses the CSV to produce a detailed report.
 */

const PROD_URL = 'https://digitak-r2m5.vercel.app';
const FEED_URL =
  'https://docs.google.com/spreadsheets/d/1RmUoY3_6-8O6jEtI83oml20dB43vxmOOXLrwNAn7lcs/export?format=csv';

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
        if (i + 1 < csvText.length && csvText[i + 1] === '"') { current += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { current += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { fields.push(current); current = ''; i++; }
      else if (ch === '\r') { i++; }
      else if (ch === '\n') {
        fields.push(current); current = '';
        if (fields.length > 1 || fields[0] !== '') rows.push([...fields]);
        fields.length = 0; i++;
      } else { current += ch; i++; }
    }
  }
  fields.push(current);
  if (fields.length > 1 || fields[0] !== '') rows.push([...fields]);
  return rows;
}

function normalizeHandle(raw) { return raw.replace(/-\d+$/, ''); }

async function main() {
  console.log('=== ZALEMART POST-IMPORT AUDIT ===\n');

  // Parse feed for product data
  const feedRes = await fetch(FEED_URL, { headers: { Accept: 'text/csv' } });
  const csvText = await feedRes.text();
  const rows = parseCsvRows(csvText);
  const dataRows = rows.slice(1);

  // Count feed stats
  const feedHandles = new Set();
  const normalizedHandles = new Set();
  const feedProducts = new Map();

  for (const row of dataRows) {
    if (row.length < 25) continue;
    const handle = (row[1] || '').trim();
    const norm = normalizeHandle(handle);
    if (!handle) continue;
    feedHandles.add(handle);
    normalizedHandles.add(norm);
    if (!feedProducts.has(norm)) {
      feedProducts.set(norm, {
        title: (row[0] || '').replace(/<[^>]+>/g, '').trim(),
        handle: norm,
        hasImage: !!(row[27] || '').trim(),
        hasPrice: !!(row[20] || '').trim() && parseFloat(row[20].replace(/[^\d.]/g, '')) > 0,
        stock: Math.max(0, Math.round(parseFloat((row[23] || '0').replace(/[^\d.\-]/g, '')) || 0)),
        hasSku: !!(row[9] || '').trim(),
        hasOptions: !!((row[11] || '').trim() || (row[14] || '').trim() || (row[17] || '').trim()),
      });
    } else {
      const p = feedProducts.get(norm);
      if ((row[27] || '').trim()) p.hasImage = true;
      const price = parseFloat((row[20] || '0').replace(/[^\d.]/g, '')) || 0;
      if (price > 0) p.hasPrice = true;
      const stock = Math.max(0, Math.round(parseFloat((row[23] || '0').replace(/[^\d.\-]/g, '')) || 0));
      p.stock += stock;
      if ((row[9] || '').trim()) p.hasSku = true;
      if ((row[11] || '').trim() || (row[14] || '').trim() || (row[17] || '').trim()) p.hasOptions = true;
    }
  }

  // Get DB stats from API
  let dbStats = {};
  try {
    const res = await fetch(`${PROD_URL}/api/admin/zalemart/sync`);
    if (res.ok) dbStats = await res.json();
  } catch {}

  // Feed analysis
  console.log('--- FEED ANALYSIS ---');
  console.log(`Total CSV rows (variant lines):    ${dataRows.length}`);
  console.log(`Unique handles in CSV:             ${feedHandles.size}`);
  console.log(`Unique products (after normalize): ${normalizedHandles.size}`);
  console.log(`  → ${feedHandles.size - normalizedHandles.size} rows were duplicates (handle -N suffixes)\n`);

  // Product categories from feed
  let withImage = 0, withoutImage = 0, withPrice = 0, withoutPrice = 0;
  let withStock = 0, withZeroStock = 0, withSku = 0, withoutSku = 0;
  let withOptions = 0, withoutOptions = 0;
  for (const [, p] of feedProducts) {
    if (p.hasImage) withImage++; else withoutImage++;
    if (p.hasPrice) withPrice++; else withoutPrice++;
    if (p.stock > 0) withStock++; else withZeroStock++;
    if (p.hasSku) withSku++; else withoutSku++;
    if (p.hasOptions) withOptions++; else withoutOptions++;
  }

  console.log('--- FEED PRODUCT QUALITY ---');
  console.log(`Products with image:               ${withImage}`);
  console.log(`Products without image:            ${withoutImage}`);
  console.log(`Products with price > 0:           ${withPrice}`);
  console.log(`Products with price = 0/missing:   ${withoutPrice}`);
  console.log(`Products with stock > 0:           ${withStock}`);
  console.log(`Products with zero stock:          ${withZeroStock}`);
  console.log(`Products with SKU:                 ${withSku}`);
  console.log(`Products without SKU:              ${withoutSku}`);
  console.log(`Products with options:             ${withOptions}`);
  console.log(`Products without options:          ${withoutOptions}\n`);

  // DB results
  console.log('--- DATABASE RESULTS ---');
  console.log(`Total products in DB:              ${dbStats.totalProducts || 'N/A'}`);
  console.log(`Active (non-out-of-stock):         ${dbStats.activeProducts || 'N/A'}`);
  console.log(`Out of stock:                      ${(dbStats.totalProducts || 0) - (dbStats.activeProducts || 0)}\n`);

  // Expected vs actual
  console.log('--- IMPORT SUMMARY ---');
  console.log(`Expected products:                 ${normalizedHandles.size}`);
  console.log(`Actual products in DB:             ${dbStats.totalProducts || 'N/A'}`);
  console.log(`Match:                             ${(dbStats.totalProducts || 0) === normalizedHandles.size ? 'YES' : 'NO — discrepancy'}`);
  console.log(`\nNote: Zalemart CSV has ${feedHandles.size} raw handles but only ${normalizedHandles.size} unique products.`);
  console.log(`${feedHandles.size - normalizedHandles.size} CSV rows were duplicate variant entries for the same product.`);

  console.log('\n=== AUDIT COMPLETE ===');
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
