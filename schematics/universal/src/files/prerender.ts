/** 
 * TODO: Check for Domino support with this new prerendering script.
*/

// const domino = require('domino');
// const fs = require('fs');
// const template = fs.readFileSync('./dist/browser/index.html').toString();
// const win = domino.createWindow(template);
// const filesBrowser = fs.readdirSync(`${process.cwd()}/dist/browser`)

// global['window'] = win;
// Object.defineProperty(win.document.body.style, 'transform', {
//   value: () => {
//     return {
//       enumerable: true,
//       configurable: true,
//     };
//   },
// });
// global['document'] = win.document;
// global['CSS'] = null;
// global['Prism'] = null;

// tslint:disable: ordered-imports
import 'zone.js/dist/zone-node';

import 'reflect-metadata';
// tslint:disable-next-line: ordered-imports
import { readFileSync, writeFile, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
// tslint:disable-next-line: no-var-requires
const { AppServerModuleNgFactory, LAZY_MODULE_MAP, provideModuleMap, renderModuleFactory } = require('./dist/server/main');

import routeData from './static.paths';

const BROWSER_FOLDER = join(process.cwd(), 'dist', 'browser');

// Load the index.html file containing references to your application bundle.
const index = readFileSync(join(BROWSER_FOLDER, 'index.html'), 'utf8');

let previousRender = Promise.resolve();

// Iterate each route path
routeData.routes.forEach(route => {
	const fullPath = join(BROWSER_FOLDER, route);

	// Make sure the directory structure is there
	if (!existsSync(fullPath)) {
		mkdirSync(fullPath);
	}

	// Writes rendered HTML to index.html, replacing the file if it already exists.
	previousRender = previousRender
		.then(_ =>
			renderModuleFactory(AppServerModuleNgFactory, {
				document: index,
				url: route,
				extraProviders: [provideModuleMap(LAZY_MODULE_MAP)],
			}),
		)
		.then(html => writeFileSync(join(fullPath, 'index.html'), html));
});

const siteMap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${routeData.routes.map(route => `<url><loc>${routeData.hostname ? routeData.hostname : ''}${route}</loc></url>`)}
</urlset>`;

writeFile(join(BROWSER_FOLDER, 'sitemap.xml'), siteMap, 'utf8', err => {
	if (err) {
		throw err;
	}
	// tslint:disable-next-line: no-console
	console.log('Sitemap has been created.');
});

/**
 * This section provides the logic to auto-import routes for an already existing app,
 * so the user does not have to add them manually on the static.paths file.
 */
// tslint:disable: no-implicit-dependencies no-console
import ts from 'typescript';
import { Route, Routes } from '@angular/router';
import { WorkspaceSchema, Builders, WorkspaceTargets } from '@schematics/angular/utility/workspace-models';
import { getProjectTargets } from '@schematics/angular/utility/project-targets';
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';

interface IRouteIdentifiers {
	identifiers: any[];
	routes: any[];
}

interface IRoutingMapper {
	path: string;
	visit: boolean;
	children?: any;
}

// Store our Angular configuration file.
const angularConfiguration: WorkspaceSchema = JSON.parse(readFileSync('./angular.json').toString());

// Initialize our universal entry file variable to store later.
let universalProjectEntryFile: string;

// Loop on each project defined on Angular Configuration file.
for (const project in angularConfiguration.projects) {
	// For each project, get workspace targets (build, server, lint, ...)
	if (angularConfiguration.projects.hasOwnProperty(project)) {
		const workspaceTargets: WorkspaceTargets = getProjectTargets(angularConfiguration.projects[project]);
		// Loop over each workspace target and check if it exists (just in case).
		for (const targetKey in workspaceTargets) {
			if (workspaceTargets.hasOwnProperty(targetKey)) {
				const target = workspaceTargets[targetKey];
				// If the architect builder setting is equal to `build-angular:server`, assign it to our universal entry file.
				if (target.builder === Builders.Server) {
					universalProjectEntryFile = target.options.main;
				}
			}
		}
	}
}

console.log('------- Universal Project Entry File -------');
console.log(universalProjectEntryFile);

// Extract the source directory from the universal entry file (usually src).
const sourceDir: string = universalProjectEntryFile.substring(0, universalProjectEntryFile.lastIndexOf('/') + 1);

// Create a temporal source file from the entry file string.
const entryFileSource: ts.SourceFile = ts.createSourceFile(
	'temp',
	readFileSync(universalProjectEntryFile).toString(),
	ts.ScriptTarget.Latest,
);

// Initialize entry module path variable to store later.
let entryModulePath: string;

// Read the temporal source file and navigate into each export declaration to extract entry module path (app.server.module in this case).
entryFileSource.forEachChild((parentNode: ts.Node) => {
	if (ts.isExportDeclaration(parentNode)) {
		parentNode.forEachChild((childNode: ts.Node) => {
			if (ts.isStringLiteral(childNode)) {
				const moduleDir: string = childNode.text.substring(childNode.text.lastIndexOf('/') + 1, childNode.text.length);
				if (moduleDir === 'app.server.module') {
					entryModulePath = sourceDir + childNode.text + '.ts';
				}
			}
		});
	}
});

console.log('------- Entry Module Path -------');
console.log(entryModulePath);

// Find all app routes.
const routesList: Routes = findRoutes(readFileSync(entryModulePath).toString(), entryModulePath).routes;

// Map the route list in order to
const mappedRoutes: IRoutingMapper[] = routesList.map(routingMapper);

// Load existing routes from the `static.paths` file.
let allRoutes = routeData.routes;

// Print the entire static routes along with the ones found at the app.
console.log('-------- Static Routes Found --------');

allRoutes.forEach((route, idx) => console.log(`Route ${idx}: ${route}`));
// After mapping, add those to allRoutes array by using addToRoutes function.
addToRoutes(mappedRoutes, '/');

// If the routes array is empty, push the base route.
if (allRoutes.length === 0) {
	allRoutes.push('/');
}

//  Print the app routes.
console.log('---------- App Routes Found ---------');
allRoutes.forEach((route, idx) => console.log(`Route ${idx}: ${route}`));

// Iterate each route path
allRoutes.forEach(route => {
	const fullPath = join(BROWSER_FOLDER, route);

	// Make sure the directory structure is there
	if (!existsSync(fullPath)) {
		let syncpath = BROWSER_FOLDER;
		route.split('/').forEach(element => {
			syncpath = syncpath + '/' + element;
			if (!existsSync(syncpath)) {
				mkdirSync(syncpath);
			}
		});
	}

	// Writes rendered HTML to index.html, replacing the file if it already exists.
	previousRender = previousRender
		.then(_ =>
			renderModuleFactory(AppServerModuleNgFactory, {
				document: index,
				url: route,
				extraProviders: [
					provideModuleMap(LAZY_MODULE_MAP),
					{
						provide: REQUEST,
						useValue: { cookie: '', headers: {} },
					},
					{
						provide: RESPONSE,
						useValue: {},
					},
				],
			}),
		)
		.then(html => writeFileSync(join(fullPath, 'index.html'), html))
		.finally(() => console.log('🚀 Pre-rendering Finished!'));
});

function routingMapper(entry: Route): IRoutingMapper {
	if (entry.children) {
		return { path: entry.path, children: entry.children.map(routingMapper), visit: !!entry.component || !!entry.redirectTo };
	} else {
		return { path: entry.path, visit: !!entry.component || !!entry.redirectTo };
	}
}

function addToRoutes(routing: IRoutingMapper[], basePath: string): void {
	routing.forEach(element => {
		if (element.visit && element.path.indexOf(':') === -1) {
			if (allRoutes.indexOf(basePath + element.path) === -1) {
				allRoutes = allRoutes.concat(basePath + element.path);
			}
			if (element.children) {
				basePath += element.path !== '' ? element.path + '/' : element.path;
				addToRoutes(element.children, basePath);
			}
		}
	});
}

function findRoutes(sourceCode: string, path: string): IRouteIdentifiers {
	let identifiers = [];
	let routes = [];
	const SourceCodeObj = ts.createSourceFile('temp', sourceCode, ts.ScriptTarget.Latest);
	SourceCodeObj.getChildren().forEach(nodes => {
		nodes
			.getChildren()
			.filter(node => ts.isClassDeclaration(node))
			.forEach((node: ts.Node) => {
				if (node.decorators) {
					node.forEachChild(subNode =>
						subNode.forEachChild(decoratorNode => {
							if (
								ts.isCallExpression(decoratorNode) &&
								ts.isIdentifier(decoratorNode.expression) &&
								decoratorNode.expression.escapedText === 'NgModule'
							) {
								decoratorNode.arguments.forEach((argumentNode: ts.Expression) => {
									if (ts.isObjectLiteralExpression(argumentNode)) {
										const importsNode = argumentNode.properties.find((propertyNode: ts.ObjectLiteralElementLike) => {
											return (propertyNode.name as ts.Identifier).escapedText === 'imports';
										});
										if (!!importsNode) {
											const identifierNodes = ((importsNode as ts.PropertyAssignment)
												.initializer as ts.ArrayLiteralExpression).elements.filter(initNode => {
												return ts.isIdentifier(initNode) || ts.isCallExpression(initNode);
											});

											identifierNodes.forEach((identifierNode: ts.Expression) => {
												if (ts.isCallExpression(identifierNode)) {
													if (
														((identifierNode.expression as ts.PropertyAccessExpression)
															.expression as ts.Identifier).escapedText === 'RouterModule'
													) {
														// RouterModule Found!
														const argument = identifierNode.arguments[0];
														let subRoutes: any;
														if (ts.isIdentifier(argument)) {
															// variable
															const varName = argument.escapedText;
															SourceCodeObj.forEachChild((sourceNode: ts.Node) => {
																if (
																	ts.isVariableStatement(sourceNode) &&
																	(sourceNode.declarationList.declarations[0].name as ts.Identifier)
																		.escapedText === varName
																) {
																	const initializer =
																		sourceNode.declarationList.declarations[0].initializer;
																	subRoutes = sourceCode.substring(initializer.pos, initializer.end);
																}
															});
														} else {
															// array
															subRoutes = sourceCode.substring(
																identifierNode.arguments.pos,
																identifierNode.arguments.end,
															);
														}

														routes = subRoutes.replace(
															/(.*?:\s)([^'"`].*?[^'"`])((\s*?),|(\s*?)})/g,
															"$1'$2'$3",
														);
														// tslint:disable-next-line: no-eval
														eval('routes = ' + routes);
														// console.log(routes);
													}
													node = (identifierNode.expression as ts.PropertyAccessExpression).expression;
												}
												if ((identifierNode as ts.Identifier).escapedText) {
													identifiers.push((identifierNode as ts.Identifier).escapedText);
												}
											});
										}
									}
								});
							}
						}),
					);
				}
			});
	});

	SourceCodeObj.forEachChild(node => {
		if (ts.isImportDeclaration(node)) {
			node.importClause.namedBindings.forEachChild(name => {
				const identifierIndex = identifiers.indexOf((name as ts.ImportSpecifier).name.escapedText);
				if (identifierIndex > -1 && (node.moduleSpecifier as ts.StringLiteral).text.indexOf('.') === 0) {
					identifiers[identifierIndex] = {
						module: identifiers[identifierIndex],
						path:
							path.substring(0, entryModulePath.lastIndexOf('/') + 1) +
							(node.moduleSpecifier as ts.StringLiteral).text +
							'.ts',
					};
				}
			});
		}
	});

	identifiers = identifiers
		.filter(element => element.hasOwnProperty('module'))
		.map(entry => {
			return { path: entry.path, importedIn: path };
		});

	if (routes.length === 0) {
		identifiers.forEach(identifier => {
			const nested = findRoutes(readFileSync(identifier.path).toString(), identifier.path);
			// if (nested.length >= 1) {
			identifiers = identifiers.concat(nested.identifiers);
			routes = routes.concat(nested.routes);
			// }
		});
	}

	return { identifiers, routes } as IRouteIdentifiers;
}