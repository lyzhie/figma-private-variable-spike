const fs = require('node:fs');
const id = process.argv[2];
if (!id || !/^\d+$/.test(id)) {
  console.error('Usage: npm run configure -- YOUR_FIGMA_PLUGIN_ID');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync('manifest.template.json', 'utf8'));
manifest.id = id;
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Local manifest.json created. Keep it out of version control.');
