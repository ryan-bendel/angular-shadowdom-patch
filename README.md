# Angular shadowdom patch

#### *Use this patch at your own risk, it is not maintained by the Angular team and may not work with the latest versions of Angular.*

#### Tested in Angular version `19.x` and `20.x` but cannot guarantee it will work with future versions.

### What this patch does:

Currently, Angular's shadow dom implementation pulls in extra styling from the `sharedStylesHost`, which can massively add to bloat per component implementation.

This patch removes the `sharedStylesHost` from the `dom_renderer.js` shadow dom class, only rendering the styles that are defined in the component itself.

This patch will search your `node_modules` for the `@angular/platform-browser` package and patch the `dom_renderer.js` file to remove the `sharedStylesHost`.

### Why this patch is needed:

Angular's shadow dom implementation is currently not optimized for performance, as it pulls in all styles from the sharedStylesHost, which can lead to unnecessary bloat and performance issues in applications that use shadow dom.

### How to use this patch:

Install the npm module.

Add a `postinstall` script to your package.json:

```json
"scripts": {
"postinstall": "node ./tools/patch-angular-shadowdom-renderer.js",
}
```
Now when you run `npm install`, the patch will be applied automatically.

You should see a message in the console indicating that the patch has been applied.

### Before

<img src="/src/images/before.png" width="400" height="100%">

### After

<img src="/src/images/after.png" width="400" height="100%">

#### Questions

##### I am still seeing extra styles in my shadow dom components, what should I do?

Sometimes node_modules can be cached, so what I usually do is kill your dev server, delete the @angular/platform-browser directory in node_modules, and then run `npm install` again.
