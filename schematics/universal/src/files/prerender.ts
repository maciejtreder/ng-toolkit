const domino = require('domino');
const fs = require('fs');
const template = fs.readFileSync('./dist/browser/index.html').toString();
const win = domino.createWindow(template);
const filesBrowser = fs.readdirSync(`${process.cwd()}/dist/browser`)

global['window'] = win;
Object.defineProperty(win.document.body.style, 'transform', {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});
global['document'] = win.document;
global['CSS'] = null;
global['Prism'] = null;

import * as ts from 'typescript';

// Load zone.js for the server.
import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { enableProdMode } from '@angular/core';
// Faster server renders w/ Prod mode (dev mode never needed)
enableProdMode();

// Import module map for lazy loading
import { provideModuleMap } from '@nguniversal/module-map-ngfactory-loader';
import { renderModuleFactory } from '@angular/platform-server';
import { ROUTES } from './static.paths';

const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require(`./dist/server/main.js`);
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';

const BROWSER_FOLDER = join(process.cwd(), 'dist/static');

// Load the index.html file containing referances to your application bundle.
const index = readFileSync('./dist/browser/index.html', 'utf8');

let previousRender = Promise.resolve();


const angularConfiguration = JSON.parse(fs.readFileSync('./angular.json').toString());

let universalProjectEntryFile;

for (let project in angularConfiguration.projects) {
  if(angularConfiguration.projects.hasOwnProperty(project)) {
    for (let architect in angularConfiguration.projects[project].architect ) {
      if (angularConfiguration.projects[project].architect.hasOwnProperty(architect)) {
        const architectSettings = angularConfiguration.projects[project].architect[architect];
        if (architectSettings.builder === '@angular-devkit/build-angular:server') {
          universalProjectEntryFile = architectSettings.options.main;
        }
      }
    }
  }
}

const sourceDir = universalProjectEntryFile.substring(0,universalProjectEntryFile.lastIndexOf('/')+1);

const entryFileSource = ts.createSourceFile('temp', fs.readFileSync(universalProjectEntryFile).toString(), ts.ScriptTarget.Latest);

let entryModulePath;

entryFileSource.forEachChild(node => {
  if(ts.isExportDeclaration(node)) {
    node.forEachChild(node => {
      if (ts.isStringLiteral(node)) {
        entryModulePath = (sourceDir + node.text + '.ts');
      }
    })
  }
});

// let importedModules = findImports(fs.readFileSync(entryModulePath).toString(), entryModulePath);

let routing = findRoutes(fs.readFileSync(entryModulePath).toString(), entryModulePath).routes;

function routingMapper(entry) {
  if (entry.children) {
    return {path: entry.path, children: entry.children.map(routingMapper), visit: (!!entry.component || !!entry.redirectTo)};
  } else {
    return {path: entry.path, visit: (!!entry.component || !!entry.redirectTo)};
  }
};

routing = routing.map(routingMapper);

let allRoutes = ROUTES;

if(allRoutes.length == 0) {
  allRoutes.push('/');
}

console.log(`Got following static routes:`);
allRoutes.forEach(route => console.log(route));
console.log(`And following found in the application:`)

function addToRoutes(routing: any[], basePath: string) {
  routing.forEach(element => {
    if (element.visit && element.path.indexOf(':') == -1) {
      if (allRoutes.indexOf(basePath + element.path) == -1 ) {
        allRoutes = allRoutes.concat(basePath + element.path);
        console.log(basePath + element.path);
      }
      if (element.children) {
        basePath += element.path != ''?element.path + '/':element.path;
        addToRoutes(element.children, basePath);
      }
    }
  });
}

addToRoutes(routing, '/');

// Iterate each route path
allRoutes.forEach((route) => {
  const fullPath = join(BROWSER_FOLDER, route);

  // Make sure the directory structure is there
  if (!existsSync(fullPath)) {
    let syncpath = BROWSER_FOLDER;
    route.split('/').forEach((element) => {
      syncpath = syncpath + '/' + element;
      if (!fs.existsSync(syncpath)) {
        mkdirSync(syncpath);
      }
    });
  }

  // Writes rendered HTML to index.html, replacing the file if it already exists.
  previousRender = previousRender
    .then((_) =>
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
          }
        ],
      }),
    )
    .then((html) => writeFileSync(join(fullPath, 'index.html'), html));
});

// copy static files
filesBrowser.forEach(file => {
    if (file !== 'index.html') {
        fs.copyFileSync(`./dist/browser/${file}`, `./dist/static/${file}`);
    }
});

function findRoutes(sourceCode: string, path: string) {
  let identifiers = [];
  let routes = [];
  const SourceCodeObj = ts.createSourceFile('temp', sourceCode, ts.ScriptTarget.Latest);
  SourceCodeObj.getChildren().forEach(node => {
    node.getChildren().filter(node => ts.isClassDeclaration(node)).forEach((node: ts.Node) => {
      if (node.decorators) {
        node.forEachChild(node => node.forEachChild(decoratorNode => {
          if (ts.isCallExpression(decoratorNode) && 
          ts.isIdentifier(decoratorNode.expression) && 
          decoratorNode.expression.escapedText === 'NgModule'
          ) {
            decoratorNode.arguments.forEach(node => {
              if (ts.isObjectLiteralExpression(node)) {
                const importsNode = node.properties.find(node => {
                  return (<ts.Identifier> node.name).escapedText === 'imports';
                });
                const identifierNodes = (<ts.ArrayLiteralExpression>(<ts.PropertyAssignment> importsNode).initializer).elements.filter(node => {
                  return ts.isIdentifier(node) || ts.isCallExpression(node);
                });

                identifierNodes.forEach(node => {
                  if (ts.isCallExpression(node)) {
                    if ((<ts.Identifier> (<ts.PropertyAccessExpression> node.expression).expression).escapedText === 'RouterModule') {
                      // RouterModule Found!
                      const argument = node.arguments[0];
                      let routes;
                      if (ts.isIdentifier(argument)) {
                        // variable 
                        const varName = argument.escapedText;
                        SourceCodeObj.forEachChild(node => {
                          if(ts.isVariableStatement(node) && (<ts.Identifier> node.declarationList.declarations[0].name).escapedText === varName)  {
                            const initializer = node.declarationList.declarations[0].initializer;
                            routes = sourceCode.substring(initializer.pos, initializer.end);
                          }
                        });

                      } else {
                        // array
                        routes = sourceCode.substring(node.arguments.pos, node.arguments.end);
                      }
                      
                      routes = routes.replace(/(.*?:\s)([^'"`].*?[^'"`])((\s*?),|(\s*?)})/g, "$1'$2'$3");
                      eval('routes = ' + routes);
                      // console.log(routes);
                    }
                    node = (<ts.PropertyAccessExpression> node.expression).expression;
                  }
                  identifiers.push((<ts.Identifier> node).escapedText);
                });
              }
            });
          }
        }))
      }
    });
  });

  SourceCodeObj.forEachChild(node => {
    if (ts.isImportDeclaration(node)) {
      node.importClause.namedBindings.forEachChild(name => {
        const identifierIndex = identifiers.indexOf((<ts.ImportSpecifier> name).name.escapedText);
        if (identifierIndex > -1 && (<ts.StringLiteral>node.moduleSpecifier).text.indexOf('.') == 0) {
          identifiers[identifierIndex] = {
            module: identifiers[identifierIndex],
            path: path.substring(0,entryModulePath.lastIndexOf('/')+1) + (<ts.StringLiteral>node.moduleSpecifier).text + '.ts'
          }
        }
      });
    }
  });

  identifiers = identifiers.filter(element => element.hasOwnProperty('module')).map(entry => {
    return {path: entry.path, importedIn: path};
  });

  if (routes.length == 0) {
    identifiers.forEach(identifier => {
      const nested = findRoutes(fs.readFileSync(identifier.path).toString(), identifier.path);
      // if (nested.length >= 1) {
        identifiers = identifiers.concat(nested.identifiers);
        routes = routes.concat(nested.routes);
      // }
    });
  }


  return {identifiers: identifiers, routes: routes };
}