const data = require('./coverage/coverage-final.json');

console.log('=== All source files sorted by coverage ===');
const results = [];
for (const [path, cov] of Object.entries(data)) {
  if (!path.includes('\\src\\') && !path.includes('/src/')) continue;
  if (path.includes('__tests__') || path.includes('node_modules')) continue;
  const shortP = path.replace(/^.*src[\\\/]/, '');
  const sm = cov.statementMap;
  const s = cov.s;
  let total = 0, covered = 0;
  for (const [k, v] of Object.entries(sm)) {
    if (k.startsWith('_') || !v.start) continue;
    total++;
    if ((s[k] || 0) > 0) covered++;
  }
  if (total > 0) {
    results.push({ path: shortP, total, covered, pct: covered / total });
  }
}
results.sort((a, b) => a.pct - b.pct);
results.forEach(r => {
  console.log(`${r.path} ${r.covered}/${r.total} ${Math.round(r.pct*100)}%`);
});
