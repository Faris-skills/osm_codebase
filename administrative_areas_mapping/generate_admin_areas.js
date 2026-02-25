const fs = require('fs');
const path = require('path');
const countries = require('i18n-iso-countries');

// Load English country names
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

function generateAdminLevelMap(wikiText) {
  const result = {};

  function getISO2(countryName) {
    return (
      countries.getAlpha2Code(countryName.trim(), 'en')?.toLowerCase() || null
    );
  }

  // Split table rows
  const rows = wikiText.split('|-').slice(1);

  for (const row of rows) {
    // Extract country name from {{Flagicon|Country}}
    const countryMatch = row.match(/\{\{Flagicon\|([^}]+)\}\}/);
    if (!countryMatch) continue;

    const countryName = countryMatch[1].trim();
    const isoCode = getISO2(countryName);
    if (!isoCode) continue;

    const levels = {};

    const levelMatches = [
      ...row.matchAll(/\{\{\{[a-z]+:n(\d+)\s*\|\s*([^}]*)/g),
    ];

    for (const match of levelMatches) {
      const level = Number(match[1]);
      let value = match[2];

      if (!value || value.includes('{{n/a')) continue;

      // Remove wiki links [[...|...]]
      value = value.replace(/\[\[.*?\|(.*?)\]\]/g, '$1');

      // Remove simple links [[...]]
      value = value.replace(/\[\[(.*?)\]\]/g, '$1');

      // Remove templates {{...}}
      value = value.replace(/\{\{.*?\}\}/g, '');

      // Remove HTML tags
      value = value.replace(/<.*?>/g, '');

      // Remove extra explanatory text
      value = value.split(' borders')[0];

      value = value.trim();
      if (!value) continue;

      levels[level] = value;
    }

    if (Object.keys(levels).length > 0) {
      result[isoCode] = levels;
    }
  }

  return result;
}

const filePath = path.join(__dirname, 'wiki_text.txt');
const wikiText = fs.readFileSync(filePath, 'utf8');
const adminLevelMap = generateAdminLevelMap(wikiText);

// Write JSON file
fs.writeFileSync(
  path.join(__dirname, 'admin_level_map.json'),
  JSON.stringify(adminLevelMap, null, 2), // pretty print
  'utf8',
);

console.log('admin_level_map.json written successfully.');
