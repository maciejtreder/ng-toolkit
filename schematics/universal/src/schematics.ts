import { Rule, chain, externalSchematic, mergeWith, apply, move, url, SchematicsException } from '@angular-devkit/schematics';
import { applyAndLog, addImportStatement, addToNgModule, createOrOverwriteFile, removeFromNgModule, addDependencyInjection, getNgToolkitInfo, updateNgToolkitInfo } from '@ng-toolkit/_utils';
import * as bugsnag from 'bugsnag';
import { Tree, MergeStrategy } from '@angular-devkit/schematics/src/tree/interface';
import { getFileContent } from '@schematics/angular/utility/test';
import { getWorkspace } from '@schematics/angular/utility/config';
import {
  addPackageJsonDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies';
import * as ts from 'typescript';
import { BrowserBuilderOptions } from '@schematics/angular/utility/workspace-models';

export default function index(options: any): Rule {
  
  const templateSource = apply(url('files'), [
    move('/')
  ]);

  const expressOptions = JSON.parse(JSON.stringify(options));

  delete expressOptions.disableBugsnag;
  delete expressOptions.http;

  bugsnag.register('0b326fddc255310e516875c9874fed91');
  bugsnag.onBeforeNotify((notification) => {
      let metaData = notification.events[0].metaData;
      metaData.subsystem = {
          package: 'universal',
          options: options
      };
  });

  function getSourceRoot(tree: Tree): string {
    const workspace = getWorkspace(tree);
    return `/${workspace.projects[options.clientProject].sourceRoot}`;
  }

  function enhanceServerModule(): Rule {
    return (tree: Tree) => {
      const serverModulePath = `${getSourceRoot(tree)}/${options.appDir}/${options.rootModuleFileName}`;

      addImportStatement(tree, serverModulePath, 'ServerTransferStateModule', '@angular/platform-server');
      addToNgModule(tree, serverModulePath, 'imports', 'ServerTransferStateModule');

      return tree;
    };
  }

  function renameAndEnhanceBrowserModule(): Rule {
    return (tree: Tree) => {
      const browserModulePath = `${getSourceRoot(tree)}/${options.appDir}/${options.appDir}.browser.module.ts`;
      const modulePath = `${getSourceRoot(tree)}/${options.appDir}/${options.appDir}.module.ts`;
      const mainPath = `${getSourceRoot(tree)}/main.ts`;
      
      //create browser entry module
      createOrOverwriteFile(tree, browserModulePath, getFileContent(tree, modulePath).replace('AppModule', 'AppBrowserModule'));

      //change app.module.ts
      addImportStatement(tree, modulePath, 'CommonModule', '@angular/common');
      addToNgModule(tree, modulePath, 'imports', 'CommonModule');
      if(options.http) {
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
    return tree => {
      const webpackConfig = getFileContent(tree, `./webpack.server.config.js`);
      createOrOverwriteFile(tree, `./webpack.server.config.js`, webpackConfig.replace('output: {', `output: {\n\tlibraryTarget: 'commonjs2',`));
      return tree;
    }
  }

  function addWrappers(): Rule {
    return tree => {
      const modulePath = `${getSourceRoot(tree)}/${options.appDir}/${options.appDir}.module.ts`;
      addImportStatement(tree, modulePath, 'NgtUniversalModule', '@ng-toolkit/universal');
      addToNgModule(tree, modulePath, 'imports', 'NgtUniversalModule');

      // search for 'window' occurences and replace them with injected Window instance

      tree.getDir(getSourceRoot(tree)).visit(visitor => {
          if (visitor.endsWith('.ts')) {
              let fileContent  = getFileContent(tree, visitor);
              if (fileContent.match(/class.*{[\s\S]*?((?:[()'"`\s])localStorage)/)) {
                  addDependencyInjection(tree, visitor, 'localStorage', 'any', '@ng-toolkit/universal', 'LOCAL_STORAGE');
                  updateCode(tree, visitor, 'localStorage');
                  fileContent  = getFileContent(tree, visitor);
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

  function applyOtherNgToolkitSchematics(): Rule {
    return tree => {
      //applying other schematics (if installed)
      const ngToolkitSettings = getNgToolkitInfo(tree, options);
      ngToolkitSettings.universal = options;
      updateNgToolkitInfo(tree, options, ngToolkitSettings);
      let externals: Rule[] = [];
      if (ngToolkitSettings.serverless) {
          ngToolkitSettings.serverless.directory = options.directory;
          ngToolkitSettings.serverless.skipInstall = true;
          externals.push(externalSchematic('@ng-toolkit/serverless', 'ng-add', ngToolkitSettings.serverless));
      } else if(tree.exists(`${options.directory}/.firebaserc`)) {
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
        (<Partial<BrowserBuilderOptions>> projectArchitect.build.configurations.production).serviceWorker != undefined) {
          if (!ngToolkitSettings.pwa) {
              ngToolkitSettings.pwa = {};
          }
          ngToolkitSettings.pwa.directory = '/';
          ngToolkitSettings.pwa.skipInstall = true;
          externals.push(externalSchematic('@ng-toolkit/pwa', 'ng-add', ngToolkitSettings.pwa));
      }

      if (externals.length > 0) {
          return chain(externals)
          // (tree, context);
      }
      return tree;
    }
  }

  function applyExpressEngine(): Rule {
    return tree => {
      const workspace = getWorkspace(tree);
      console.log(workspace.projects[options.clientProject].architect);
      return externalSchematic('@nguniversal/express-engine', 'ng-add', expressOptions);
    }
  }

  let rule: Rule = chain([
    (tree: Tree) => {
      const packageJsonSource = JSON.parse(getFileContent(tree, `./package.json`));
      if (packageJsonSource.dependencies['@ng-toolkit/serverless']) {
          tree.delete(`./local.js`);
          tree.delete(`./server.ts`);
          tree.delete(`./webpack.server.config.js`);
      } 
      return tree;
    },
    mergeWith(templateSource, MergeStrategy.Overwrite),
    applyExpressEngine(),
    (tree: Tree) => {
      tree.overwrite(`/local.js`, getFileContent(tree, `/local.js`).replace(/__distFolder__/g, 'dist/server').replace(/__serverPort__/g, options.serverPort));
      tree.overwrite(`/${options.serverFileName}`, getFileContent(tree, `/${options.serverFileName}`).replace(/\/\/ Start up the Node server.*/gs, '').replace('const app = express();', 'export const app = express();'));

      const pkgPath = '/package.json';
      const buffer = tree.read(pkgPath);
      if (buffer === null) {
        throw new SchematicsException('Could not find package.json');
      }

      const pkg = JSON.parse(buffer.toString());

      pkg.scripts['server'] = 'node local.js';
      pkg.scripts['build:prod'] = 'npm run build:ssr';
      pkg.scripts['serve:ssr'] = 'node local.js';

      tree.overwrite(pkgPath, JSON.stringify(pkg, null, 2));

      addPackageJsonDependency(tree, {
        type: NodeDependencyType.Default,
        name: '@nguniversal/common',
        version: '0.0.0'
      });

      return tree;
    },
    enhanceServerModule(),
    renameAndEnhanceBrowserModule(),
    updateWebpackConfig(),
    addWrappers(),
    applyOtherNgToolkitSchematics()
  ]);

  if (!options.disableBugsnag) {
      return applyAndLog(rule);
  } else {
      return rule;
  }
}

function findStatements(tree: Tree, node: ts.Node, filePath: string, subject: string, replacement: string, toReplace: any[]){
  let fileContent = getFileContent(tree, filePath);
  node.forEachChild(node => {
    if (ts.isIdentifier(node)) {
      let statement = fileContent.substr(node.pos, node.end - node.pos);
      let index = statement.indexOf(subject);
      if (index >= 0) {
        toReplace.push({key: replacement, start: node.pos + index, end: node.end});
      }
    }
    else {
      findStatements(tree, node, filePath, subject, replacement, toReplace);
    }
  });
}

function updateCode(tree: Tree, filePath: string, varName: string) {
  let fileContent  = getFileContent(tree, filePath);
  let sourceFile: ts.SourceFile = ts.createSourceFile('temp.ts', fileContent, ts.ScriptTarget.Latest);

  sourceFile.forEachChild(node => {
    if (ts.isClassDeclaration(node)) {
      let replacementTable: any[] = [];
      node.members.forEach(node => {
        if (ts.isMethodDeclaration(node)) {
          (node.body as ts.Block).statements.forEach(statement => {
            findStatements(tree, statement, filePath, varName, `this.${varName}`, replacementTable);
          })
        }
      });
      replacementTable.reverse().forEach(element => {
        fileContent = fileContent.substr(0, element.start) + element.key + fileContent.substr(element.end);
      });
      createOrOverwriteFile(tree, filePath, fileContent);
    }
  });
}
