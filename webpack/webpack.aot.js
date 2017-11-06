const { root } = require('./helpers');
const { AngularCompilerPlugin } = require('@ngtools/webpack');

const tsconfigs = {
    client: root('./tsconfig.browser.json'),
    server: root('./tsconfig.server.json')
};

const aotTsconfigs = {
    client: root('./tsconfig.browser.json'),
    server: root('./tsconfig.server.json')
};

/**
 * Generates a AotPlugin for @ngtools/webpack
 *
 * @param {string} platform Should either be client or server
 * @param {boolean} aot Enables/Disables AoT Compilation
 * @returns
 */
function getAotPlugin(platform, aot) {
    return new AngularCompilerPlugin({
        tsConfigPath: tsconfigs[platform],
        // tsConfigPath: aot ? aotTsconfigs[platform] : tsconfigs[platform],
        // tsConfigPath: 'tsconfig.browser.json',
        skipCodeGeneration: !aot,
        compilerOptions: {
            genDir: root("./src/ngfactory"),
            entryModule: root("./src/app/server-app.module#ServerAppModule")
        }
    });
}

module.exports = {
    getAotPlugin: getAotPlugin,
};
