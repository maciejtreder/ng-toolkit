import { apply, chain, mergeWith, move, Rule, Tree, url, MergeStrategy, noop, SchematicsException, externalSchematic } from '@angular-devkit/schematics';
import {
	applyAndLog, addImportStatement, addToNgModule, createOrOverwriteFile, removeFromNgModule,
	addDependencyInjection, getNgToolkitInfo, updateNgToolkitInfo, addDependencyToPackageJson, updateCode
} from '@ng-toolkit/_utils';
import { getFileContent } from '@schematics/angular/utility/test';
import { getWorkspace } from '@schematics/angular/utility/config';
import { NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { BrowserBuilderOptions } from '@schematics/angular/utility/workspace-models';
import { IToolkitUniversalSchema, IUniversalSchema } from './schema';
import * as bugsnag from 'bugsnag';

export default function addUniversal(options: IToolkitUniversalSchema): Rule {
	const { disableBugsnag, http, directory, ...optionsReduced } = options;
	const expressOptions: IUniversalSchema = optionsReduced;

	bugsnag.register('0b326fddc255310e516875c9874fed91');
	bugsnag.onBeforeNotify((notification) => {
		let metaData = notification.events[0].metaData;
		metaData.subsystem = {
			package: 'universal',
			options: options
		};
	});

	const templateSource = apply(url('./files'), [
		move(options.directory)
	]);

	const rules: Rule[] = [];
	rules.push((tree: Tree) => {
		const packageJsonSource = JSON.parse(getFileContent(tree, `package.json`));
		if (packageJsonSource.dependencies['@ng-toolkit/serverless']) {
			tree.delete(`./local.js`);
			tree.delete(`./server.ts`);
			tree.delete(`./webpack.server.config.js`);
		}
		return tree;
	});
	rules.push(mergeWith(templateSource, MergeStrategy.Overwrite));
	rules.push(applyExpressEngine(options, expressOptions));
	rules.push(applyPackageJsonScripts(options));
	rules.push(enhanceServerModule(options));
	rules.push(renameAndEnhanceBrowserModule(options));
	rules.push(updateWebpackConfig());
	rules.push(addWrappers(options));
	rules.push(applyOtherNgToolkitSchematics(options));
	rules.push(addPrerender(options));

	if (!options.disableBugsnag) {
		return applyAndLog(chain(rules));
	} else {
		return chain(rules);
	}
}

function getSourceRoot(tree: Tree, options: IToolkitUniversalSchema): string {
	const workspace = getWorkspace(tree);
	return `/${workspace.projects[options.clientProject].sourceRoot}`;
}

function enhanceServerModule(options: IToolkitUniversalSchema): Rule {
	return (tree: Tree) => {
		const serverModulePath = `${getSourceRoot(tree, options)}/${options.appDir}/${options.rootModuleFileName}`;
		addImportStatement(tree, serverModulePath, 'ServerTransferStateModule', '@angular/platform-server');
		addToNgModule(tree, serverModulePath, 'imports', 'ServerTransferStateModule');
		return tree;
	};
}

function renameAndEnhanceBrowserModule(options: IToolkitUniversalSchema): Rule {
	return (tree: Tree) => {
		const browserModulePath = `${getSourceRoot(tree, options)}/${options.appDir}/${options.appDir}.browser.module.ts`;
		const modulePath = `${getSourceRoot(tree, options)}/${options.appDir}/${options.appDir}.module.ts`;
		const mainPath = `${getSourceRoot(tree, options)}/main.ts`;

		//create browser entry module
		createOrOverwriteFile(tree, browserModulePath, getFileContent(tree, modulePath).replace('AppModule', 'AppBrowserModule'));

		//change app.module.ts
		addImportStatement(tree, modulePath, 'CommonModule', '@angular/common');
		addToNgModule(tree, modulePath, 'imports', 'CommonModule');
		if (options.http) {
			addImportStatement(tree, modulePath, 'TransferHttpCacheModule', '@nguniversal/common');
			addImportStatement(tree, modulePath, 'HttpClientModule', '@angular/common/http');
			addToNgModule(tree, modulePath, 'imports', 'TransferHttpCacheModule');
			addToNgModule(tree, modulePath, 'imports', 'HttpClientModule');
		}

		//change app.browser.module.ts
		removeFromNgModule(tree, browserModulePath, 'imports', `BrowserModule.withServerTransition({ appId: '${options.appId}' })`);
		removeFromNgModule(tree, browserModulePath, 'declarations');
		addImportStatement(tree, browserModulePath, 'AppModule', './app.module');
		addToNgModule(tree, browserModulePath, 'imports', 'AppModule');
		addImportStatement(tree, browserModulePath, 'BrowserTransferStateModule', '@angular/platform-browser');
		addToNgModule(tree, browserModulePath, 'imports', 'BrowserTransferStateModule');

		//change entry in main.ts
		addImportStatement(tree, mainPath, 'AppBrowserModule', `./${options.appDir}/app.browser.module`)
		createOrOverwriteFile(tree, mainPath, getFileContent(tree, mainPath).replace('.bootstrapModule(AppModule)', '.bootstrapModule(AppBrowserModule)'));

		return tree;
	}
}

function updateWebpackConfig(): Rule {
	return (tree: Tree) => {
		const webpackConfig = getFileContent(tree, `./webpack.server.config.js`);
		createOrOverwriteFile(tree, `./webpack.server.config.js`, webpackConfig.replace('output: {', `output: {\n\tlibraryTarget: 'commonjs2',`));
		return tree;
	}
}

function addWrappers(options: IToolkitUniversalSchema): Rule {
	return (tree: Tree) => {
		const modulePath = `${getSourceRoot(tree, options)}/${options.appDir}/${options.appDir}.module.ts`;
		addImportStatement(tree, modulePath, 'NgtUniversalModule', '@ng-toolkit/universal');
		addToNgModule(tree, modulePath, 'imports', 'NgtUniversalModule');

		// search for 'window' occurences and replace them with injected Window instance
		tree.getDir(getSourceRoot(tree, options)).visit(visitor => {
			if (visitor.endsWith('.ts')) {
				let fileContent = getFileContent(tree, visitor);
				if (fileContent.match(/class.*{[\s\S]*?((?:[()'"`\s])localStorage)/)) {
					addDependencyInjection(tree, visitor, 'localStorage', 'any', '@ng-toolkit/universal', 'LOCAL_STORAGE');
					updateCode(tree, visitor, 'localStorage');
					fileContent = getFileContent(tree, visitor);
				}
				if (fileContent.match(/class.*{[\s\S]*?((?:[()'"`\s])window)/)) {
					addDependencyInjection(tree, visitor, 'window', 'Window', '@ng-toolkit/universal', 'WINDOW');
					updateCode(tree, visitor, 'window');
				}
				// if (fileContent.match(/class.*{[\s\S]*?((?:[()'"`\s])document)/)) {
				//     addDependencyInjection(tree, visitor, 'document', 'Document', '@ng-toolkit/universal', 'NGT_DOCUMENT');
				//     updateCode(tree, visitor, 'document');
				// }
			}
		});
		return tree;
	}
}

function applyOtherNgToolkitSchematics(options: IToolkitUniversalSchema): Rule {
	return (tree: Tree) => {
		//applying other schematics (if installed)
		const ngToolkitSettings = getNgToolkitInfo(tree, options);
		ngToolkitSettings.universal = options;
		updateNgToolkitInfo(tree, ngToolkitSettings, options);
		let externals: Rule[] = [];
		if (ngToolkitSettings.serverless) {
			ngToolkitSettings.serverless.directory = options.directory;
			ngToolkitSettings.serverless.skipInstall = true;
			externals.push(externalSchematic('@ng-toolkit/serverless', 'ng-add', ngToolkitSettings.serverless));
		} else if (tree.exists(`${options.directory}/.firebaserc`)) {
			ngToolkitSettings.serverless = {};
			ngToolkitSettings.serverless.directory = options.directory;
			ngToolkitSettings.serverless.skipInstall = true;
			ngToolkitSettings.serverless.provider = 'firebase';

			externals.push(externalSchematic('@ng-toolkit/serverless', 'ng-add', ngToolkitSettings.serverless));
		}

		const workspace = getWorkspace(tree);
		const projectArchitect = workspace.projects[options.clientProject].architect;

		if (
			projectArchitect &&
			projectArchitect.build &&
			projectArchitect.build.configurations &&
			projectArchitect.build.configurations.production &&
			(<Partial<BrowserBuilderOptions>>projectArchitect.build.configurations.production).serviceWorker != undefined) {
			if (!ngToolkitSettings.pwa) {
				ngToolkitSettings.pwa = {};
			}
			ngToolkitSettings.pwa.directory = '/';
			ngToolkitSettings.pwa.skipInstall = true;
			externals.push(externalSchematic('@ng-toolkit/pwa', 'ng-add', ngToolkitSettings.pwa));
		}

		if (externals.length > 0) {
			return chain(externals);
		}
		return tree;
	}
}

function applyExpressEngine(options: IToolkitUniversalSchema, expressOptions: IUniversalSchema): Rule {
	return (tree: Tree) => {
		let hasUniversalBuild = false;
		const workspace = getWorkspace(tree);
		const architect = workspace.projects[options.clientProject].architect;
		if (architect) {
			for (let builder in architect) {
				if (architect[builder].builder === '@angular-devkit/build-angular:server') {
					hasUniversalBuild = true;
				}
			}
		}
		if (!hasUniversalBuild) {
			return externalSchematic('@nguniversal/express-engine', 'ng-add', expressOptions);
		} else {
			return noop();
		}
	}
}

function applyPackageJsonScripts(options: IToolkitUniversalSchema) {
	return (tree: Tree) => {
		const serverPort = options.serverPort ? options.serverPort.toString() : '4000';
		tree.overwrite(`local.js`, getFileContent(tree, `local.js`).replace(/__distFolder__/g, 'dist/server').replace(/__serverPort__/g, serverPort));
		tree.overwrite(`${options.serverFileName}`, getFileContent(tree, `${options.serverFileName}`).replace(/\/\/ Start up the Node server.*/gs, '').replace('const app = express();', 'export const app = express();'));

		const pkgPath = `/package.json`;
		const buffer = tree.read(pkgPath);
		if (buffer === null) {
			throw new SchematicsException('Could not find package.json');
		}

		const pkg = JSON.parse(buffer.toString());

		pkg.scripts['server'] = 'node local.js';
		pkg.scripts['build:prod'] = 'npm run build:ssr';
		pkg.scripts['serve:ssr'] = 'node local.js';

		tree.overwrite(pkgPath, JSON.stringify(pkg, null, 4));

		addDependencyToPackageJson(tree, options, {
			type: NodeDependencyType.Default,
			name: '@nguniversal/common',
			version: '8.1.0'
		});

		return tree;
	}
}

function addPrerender(options: IToolkitUniversalSchema): Rule {
	return (tree: Tree) => {
		// add dependencies
		addDependencyToPackageJson(tree, options, {
			type: NodeDependencyType.Default,
			name: 'domino',
			version: '^2.1.3'
		});

		// add scripts
		const pkgPath = `package.json`;
		const buffer = tree.read(pkgPath);
		if (buffer === null) {
			throw new SchematicsException('Could not find package.json');
		}

		const pkg = JSON.parse(buffer.toString());

		pkg.scripts['serve:prerender'] = 'node static.js';
		pkg.scripts['build:prerender'] = 'npm run build:prod && node dist/prerender.js';

		tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2));

		//add entry in webpack configuration
		const webpackConfig = getFileContent(tree, `./webpack.server.config.js`);
		createOrOverwriteFile(tree, `./webpack.server.config.js`, webpackConfig.replace(`server: './server.ts'`, `server: './server.ts',\n\tprerender: './prerender.ts'`));

		return tree;
	}
}
