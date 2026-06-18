#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Recursively find all dom_renderer*.js and dom_renderer*.mjs files in a directory
function findDomRendererFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findDomRendererFiles(filePath));
    } else if (/dom_renderer.*.(js|mjs)$/.test(file)) {
      results.push(filePath);
    }
  });
  return results;
}

const platformBrowserMain = require.resolve('@angular/platform-browser');
const nodeModulesDir = path.dirname(platformBrowserMain);
const files = findDomRendererFiles(nodeModulesDir);

console.log('Found files:', files);

files.forEach(file => {
    let src = fs.readFileSync(file, 'utf8');

    // Patch the ShadowDomRenderer class
    src = src.replace(/(class ShadowDomRenderer extends DefaultDomRenderer2\s*\{)/, '$1');

    src = src.replace(/(class ShadowDomRenderer extends DefaultDomRenderer2\s*\{[\s\S]*?\n\})/m, (match) => {
        return match
            .replace(/this\.sharedStylesHost = sharedStylesHost;/g, '// this.sharedStylesHost = sharedStylesHost;')
            .replace(/this\.sharedStylesHost\.addHost\(this\.shadowRoot\);/g, '// this.sharedStylesHost.addHost(this.shadowRoot);')
            .replace(/this\.sharedStylesHost\.removeHost\(this\.shadowRoot\);/g, '// this.sharedStylesHost.removeHost(this.shadowRoot);')
            // Remove sharedStylesHost from class properties
            .replace(/sharedStylesHost;/g, '');
    });

    fs.writeFileSync(file, src, 'utf8');
    console.log(`Patched: ${file}`);
});

console.log('Angular dom_renderer shadowdom patch complete.');
