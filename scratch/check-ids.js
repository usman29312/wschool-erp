const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');

// Find all document.getElementById('...') in admin.js
const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const ids = new Set();
while ((match = regex.exec(js)) !== null) {
  ids.add(match[1]);
}

console.log(`Checking ${ids.size} IDs found in admin.js against admin.html...`);

let missingCount = 0;
for (const id of ids) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    console.log(`Missing ID: ${id}`);
    missingCount++;
  }
}

console.log(`Done. Missing: ${missingCount}`);
