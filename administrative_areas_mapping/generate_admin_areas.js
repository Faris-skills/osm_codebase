const fs = require('fs');
const path = require('path');
const countries = require('i18n-iso-countries');

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const INPUT_PATH = path.join(__dirname, 'wiki_text.txt');
const OUTPUT_PATH = path.join(__dirname, 'admin_level_map.json');

function normalizeName(name) {
  return name
    .replace(/^the\s+/i, '')
    .replace(/\u200E|\u200F|\u202A|\u202C/g, '') // remove invisible chars
    .trim();
}

const manualOverrides = {
  Brunei: 'BN',
  'Sahrawi Arab Democratic Republic': 'EH',
  'Vatican City': 'VA',
  'Holy See (Vatican City)': 'VA',
  'Congo-Brazzaville': 'CG',
  'Congo-Kinshasa': 'CD',
  'East Timor': 'TL',
  'Timor-Leste': 'TL',
  Laos: 'LA',
  Syria: 'SY',
  Moldova: 'MD',
  'Micronesia (Federated States of)': 'FM',
};

function getISO2(rawCountryName) {
  if (!rawCountryName) return null;

  // Split aliases from Wikipedia
  const candidates = rawCountryName.split('|');

  for (let name of candidates) {
    name = normalizeName(name);

    // 1. Manual override first
    if (manualOverrides[name]) {
      return manualOverrides[name].toLowerCase();
    }

    // 2. Try ISO lookup
    const iso = countries.getAlpha2Code(name, 'en');
    if (iso) {
      return iso.toLowerCase();
    }
  }

  return null;
}

function cleanWikiText(text) {
  if (!text) return null;

  // Remove table attributes like rowspan="2" | colspan="3" | align=left
  text = text.replace(/\b(rowspan|colspan|style|align)\s*=\s*"[^"]*"/gi, '');

  // Remove leading stray pipes and spaces
  text = text.replace(/^\s*\|\s*/, '');

  // Remove wiki links [[...|...]]
  text = text.replace(/\[\[.*?\|(.*?)\]\]/g, '$1');

  // Remove simple links [[...]]
  text = text.replace(/\[\[(.*?)\]\]/g, '$1');

  // Remove templates {{...}}
  text = text.replace(/\{\{.*?\}\}/gs, '');

  // Remove HTML tags
  text = text.replace(/<.*?>/g, '');

  // Remove bold/italic markup
  text = text.replace(/'{2,}/g, '');

  // Remove explanatory trailing notes
  text = text.split(' borders')[0];

  text = text.trim();

  if (!text || text.toLowerCase().includes('n/a')) return null;

  return text;
}

function generateAdminLevelMap(wikiText) {
  const result = {};
  const skipped = [];

  const rows = wikiText.split('\n|-');

  for (const row of rows) {
    const flagMatch = row.match(/\{\{flagicon\|([^}]+)\}\}/i);
    if (!flagMatch) continue;

    const countryName = flagMatch[1].trim();
    const isoCode = getISO2(countryName);

    if (!isoCode) {
      skipped.push(countryName);
      continue;
    }

    const levels = {};

    const levelRegex =
      /\{\{\{[a-z0-9_]+:n(\d+)(?:_\d+)?\s*\|\s*([\s\S]*?)\}\}\}/gi;

    let match;

    while ((match = levelRegex.exec(row)) !== null) {
      const level = Number(match[1]);
      const rawValue = match[2];

      const cleaned = cleanWikiText(rawValue);
      if (!cleaned) continue;

      levels[level] = cleaned;
    }

    if (Object.keys(levels).length > 0) {
      result[isoCode] = levels;
    }
  }

  console.log('Skipped (no ISO match):', skipped);

  return result;
}

function main() {
  const wikiText = fs.readFileSync(INPUT_PATH, 'utf8');

  const adminLevelMap = generateAdminLevelMap(wikiText);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(adminLevelMap, null, 2), 'utf8');

  console.log('-----------------------------------');
  console.log('admin_level_map.json written.');
  console.log('Countries parsed:', Object.keys(adminLevelMap).length);
}

main();
