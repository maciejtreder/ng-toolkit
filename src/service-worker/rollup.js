const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonJs = require('rollup-plugin-commonjs');

rollup.rollup({
    entry: './src/service-worker/worker-basic.js',
    plugins: [
        nodeResolve({jsnext: true, main: true}),
        commonJs({
            include: 'node_modules/**',
            namedExports: {
                'node_modules/jshashes/hashes.js': ['SHA1']
            }
        }),
    ],

}).then(bundle => bundle.write({
    format: 'iife',
    dest: 'dist/worker-basic.min.js',
}));