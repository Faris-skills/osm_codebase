// const fs = require('fs');
// const path = require('path');
// const countries = require('i18n-iso-countries');

// // Load English country names
// countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

// function generateAdminLevelMap(wikiText) {
//   const result = {};
//   const skipped = {
//     noFlagMatch: [],
//     noISO: [],
//     noLevels: [],
//   };

//   function getISO2(countryName) {
//     return (
//       countries.getAlpha2Code(countryName.trim(), 'en')?.toLowerCase() || null
//     );
//   }

//   // Split table rows
//   const rows = wikiText.split('|-').slice(1);

//   for (const row of rows) {
//     // Extract country name from {{Flagicon|Country}}
//     const countryMatch = row.match(/\{\{Flagicon\|([^}]+)\}\}/);
//     if (!countryMatch) {
//       skipped.noFlagMatch.push(row.slice(0, 100)); // partial row for debugging
//       continue;
//     }

//     const countryName = countryMatch[1].trim();
//     const isoCode = getISO2(countryName);

//     if (!isoCode) {
//       skipped.noISO.push(countryName);
//       continue;
//     }

//     const levels = {};

//     const levelMatches = [
//       ...row.matchAll(/\{\{\{[a-z]+:n(\d+)\s*\|\s*([^}]*)/g),
//     ];

//     for (const match of levelMatches) {
//       const level = Number(match[1]);
//       let value = match[2];

//       if (!value || value.includes('{{n/a')) continue;

//       // Remove wiki links [[...|...]]
//       value = value.replace(/\[\[.*?\|(.*?)\]\]/g, '$1');

//       // Remove simple links [[...]]
//       value = value.replace(/\[\[(.*?)\]\]/g, '$1');

//       // Remove templates {{...}}
//       value = value.replace(/\{\{.*?\}\}/g, '');

//       // Remove HTML tags
//       value = value.replace(/<.*?>/g, '');

//       // Remove extra explanatory text
//       value = value.split(' borders')[0];

//       value = value.trim();
//       if (!value) continue;

//       levels[level] = value;
//     }

//     if (Object.keys(levels).length > 0) {
//       result[isoCode] = levels;
//     } else {
//       skipped.noLevels.push(countryName);
//     }
//   }

//   // return { result, skipped };
//   return result;
// }

// function logMissingCountriesFromFile() {
//   const jsonPath = path.join(__dirname, 'admin_level_map.json');
//   const adminLevelMap = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

//   // If you saved { result, skipped }
//   const mappedData = adminLevelMap.result || adminLevelMap;

//   const mappedISOs = new Set(Object.keys(mappedData));

//   const allISOs = Object.keys(countries.getAlpha2Codes());

//   const missing = [];

//   for (const iso of allISOs) {
//     const lowerISO = iso.toLowerCase();

//     if (!mappedISOs.has(lowerISO)) {
//       missing.push({
//         iso: lowerISO,
//         name: countries.getName(iso, 'en'),
//       });
//     }
//   }

//   console.log('-----------------------------');
//   console.log('Total ISO countries:', allISOs.length);
//   console.log('Mapped countries:', mappedISOs.size);
//   console.log('Missing countries:', missing.length);
//   console.log('-----------------------------');

//   missing
//     .sort((a, b) => a.name.localeCompare(b.name))
//     .forEach((c) => console.log(`${c.iso} - ${c.name}`));

//   return missing;
// }

// const filePath = path.join(__dirname, 'wiki_text.txt');
// const wikiText = fs.readFileSync(filePath, 'utf8');
// const adminLevelMap = generateAdminLevelMap(wikiText);
// const missingDetails = logMissingCountriesFromFile();

// console.log(missingDetails);
// return;
// // Write JSON file
// fs.writeFileSync(
//   path.join(__dirname, 'admin_level_map.json'),
//   JSON.stringify(adminLevelMap, null, 2), // pretty print
//   'utf8',
// );

// console.log('admin_level_map.json written successfully.');























// const axios = require('axios');

// function transformGeoBoundariesToAdminMap(iso2, gbData) {
//   const result = {};
//   const iso = iso2.toLowerCase();

//   result[iso] = {};

//   for (const entry of gbData) {
//     if (!entry.boundaryType) continue;

//     // Extract level number from "ADM5"
//     const levelMatch = entry.boundaryType.match(/ADM(\d+)/);
//     if (!levelMatch) continue;

//     const level = Number(levelMatch[1]);

//     if (!entry.boundaryCanonical) continue;

//     // Take first canonical label (usually most important)
//     const cleanedLabel = entry.boundaryCanonical
//       .split(',')
//       .map((s) => s.trim())
//       .filter(Boolean)[0];

//     result[iso][level] = cleanedLabel;
//   }

//   return result;
// }

// const iso = 'FRA'
// const url = `https://www.geoboundaries.org/api/current/gbOpen/${iso}/ALL/`;

// axios.get(url).then((res) => {
//   try {
    
//     const transformed = transformGeoBoundariesToAdminMap('fra', res.data);
//     console.log(JSON.stringify(transformed, null, 2));
//   } catch (error) {
//     console.log(error.response.data)
//   }
// });



const fs = require('fs');
const path = require('path');
const axios = require('axios');
const countries = require('i18n-iso-countries');

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const OUTPUT_PATH = path.join(__dirname, 'admin_level_map_geoboundaries2.json');
const BASE_URL = 'https://www.geoboundaries.org/api/current/gbOpen';

function mapADMToOSMLevel(admLevel) {
  const mapping = {
    0: 2,  // Country
    1: 4,  // Region / State
    2: 6,  // Province / Department
    3: 8,  // District / County
    4: 9,  // Municipality
    5: 10  // Sub-municipal
  };

  return mapping[admLevel] || null;
}

function cleanCanonicalLabel(label) {
  if (!label) return null;

  return label
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)[0];
}

async function fetchCountryAdminLevels(alpha2) {
  const alpha3 = countries.alpha2ToAlpha3(alpha2.toUpperCase());
  if (!alpha3) return null;

  const url = `${BASE_URL}/${alpha3}/ALL/`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    if (!Array.isArray(data)) return null;

    const levels = {};

    for (const entry of data) {
      if (!entry.boundaryType) continue;

      const match = entry.boundaryType.match(/ADM(\d+)/);
      if (!match) continue;

      const admLevel = Number(match[1]);
      const osmLevel = mapADMToOSMLevel(admLevel);
      if (!osmLevel) continue;

      const label = cleanCanonicalLabel(entry.boundaryCanonical);
      if (!label) continue;

      levels[osmLevel] = label;
    }

    if (Object.keys(levels).length === 0) return null;

    return levels;

  } catch (error) {
    return null;
  }
}

async function buildGlobalAdminMap() {
  const result = {};
  const alpha2Codes = Object.keys(countries.getAlpha2Codes());

  for (const alpha2 of alpha2Codes) {
    const iso2 = alpha2.toLowerCase();
    console.log(`Processing ${iso2}...`);

    const levels = await fetchCountryAdminLevels(alpha2);

    if (levels) {
      result[iso2] = levels;
    }
  }

  return result;
}

async function main() {
  console.log('Building admin level map from geoBoundaries...');
  const adminMap = await buildGlobalAdminMap();

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(adminMap, null, 2),
    'utf8'
  );

  console.log('----------------------------------');
  console.log('Completed.');
  console.log(`Countries mapped: ${Object.keys(adminMap).length}`);
  console.log(`Output written to: ${OUTPUT_PATH}`);
}

main();