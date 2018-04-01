"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
function application(options) {
    const templateSource = schematics_1.apply(schematics_1.url('./files'), [
        schematics_1.template(Object.assign({}, options)),
        schematics_1.move(options.directory)
    ]);
    return schematics_1.chain([
        schematics_1.externalSchematic('@schematics/angular', 'application', options),
        schematics_1.mergeWith(templateSource, schematics_1.MergeStrategy.Overwrite)
    ]);
}
exports.application = application;
//# sourceMappingURL=index.js.map