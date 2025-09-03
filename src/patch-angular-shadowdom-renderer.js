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
    } else if (/^dom_renderer.*\.(js|mjs)$/.test(file)) {
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

  // Only patch the ShadowDomRenderer instantiation in DomRendererFactory2
  src = src.replace(/(case ViewEncapsulation\.ShadowDom:\s*\n\s*)return new ShadowDomRenderer\(([^)]*)\);/g, (match, p1, args) => {
    const newArgs = args
      .split(',')
      .filter(arg => !/sharedStylesHost/.test(arg))
      .join(',');
    return `${p1}return new ShadowDomRenderer(${newArgs});`;
  });

  const newShadowDomRendererClass = `
class ShadowDomRenderer extends DefaultDomRenderer2 {
   hostEl;
    shadowRoot;
    constructor(eventManager, hostEl, component, doc, ngZone, nonce, platformIsServer, tracingService, registry, maxAnimationTimeout) {
        super(eventManager, doc, ngZone, platformIsServer, tracingService, registry, maxAnimationTimeout);
        this.hostEl = hostEl;
        this.shadowRoot = hostEl.attachShadow({ mode: 'open' });
        let styles = component.styles;
        if (ngDevMode) {
            // We only do this in development, as for production users should not add CSS sourcemaps to components.
            const baseHref = _getDOM().getBaseHref(doc) ?? '';
            styles = addBaseHrefToCssSourceMap(baseHref, styles);
        }
        styles = shimStylesContent(component.id, styles);
        for (const style of styles) {
            const styleEl = document.createElement('style');
            if (nonce) {
                styleEl.setAttribute('nonce', nonce);
            }
            styleEl.textContent = style;
            this.shadowRoot.appendChild(styleEl);
        }
    }
    nodeOrShadowRoot(node) {
        return node === this.hostEl ? this.shadowRoot : node;
    }
    appendChild(parent, newChild) {
        return super.appendChild(this.nodeOrShadowRoot(parent), newChild);
    }
    insertBefore(parent, newChild, refChild) {
        return super.insertBefore(this.nodeOrShadowRoot(parent), newChild, refChild);
    }
    removeChild(_parent, oldChild) {
        return super.removeChild(null, oldChild);
    }
    parentNode(node) {
        return this.nodeOrShadowRoot(super.parentNode(this.nodeOrShadowRoot(node)));
    }
}
`;

  src = src.replace(/class ShadowDomRenderer extends DefaultDomRenderer2\s*\{[\s\S]*?\n\}/m, newShadowDomRendererClass);

  fs.writeFileSync(file, src, 'utf8');
  console.log(`Patched: ${file}`);
});

console.log('Angular dom_renderer shadowdom patch complete.');
