// Programmatic runner to avoid ts-node CLI arg parser issues
// Registers ts-node and runs the TypeScript script in CommonJS mode
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
});

require('./match.ts');

