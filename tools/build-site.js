/*
 * Baut das Verzeichnis für Freebuff Sites.
 *   node tools/build-site.js
 *
 * Ins Paket kommen nur die Dateien, die der Browser braucht. Tests,
 * Screenshots und Werkzeuge bleiben draußen. Der Worker liefert die Dateien
 * unverändert aus – mehr braucht diese Seite nicht, deshalb keine
 * Abhängigkeiten und kein Bundler.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var OUT = path.join(ROOT, 'freebuff-sites-build');
var ASSETS = path.join(OUT, 'assets');

/* Reihenfolge wie in index.html; mehr Dateien lädt die Seite nicht. */
var FILES = ['index.html', 'styles.css', 'app.js', 'generator.js', 'data.js'];

var WORKER = 'export default {\n' +
  '  fetch: function (request, env) { return env.ASSETS.fetch(request); }\n' +
  '};\n';

var MANIFEST = {
  entrypoint: 'worker.js',
  compatibilityDate: '2026-10-01',
  modules: [{ name: 'worker.js', type: 'esm', path: 'worker.js' }],
  assetsDirectory: 'assets',
  spa: false
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(ASSETS, { recursive: true });

FILES.forEach(function (name) {
  fs.copyFileSync(path.join(ROOT, name), path.join(ASSETS, name));
});

fs.writeFileSync(path.join(OUT, 'worker.js'), WORKER);
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(MANIFEST, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, '.freebuff-generated'), 'Freebuff Sites build output\n');

var bytes = FILES.reduce(function (sum, name) {
  return sum + fs.statSync(path.join(ASSETS, name)).size;
}, 0);

console.log('freebuff-sites-build: ' + FILES.length + ' Dateien, ' + Math.round(bytes / 1024) + ' KB');
