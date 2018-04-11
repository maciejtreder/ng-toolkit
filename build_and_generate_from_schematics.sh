npm install -g @angular/cli;
rm -rf application;
cd schematics;
npm install;
npm run build;
npm link;
cd ..;
ng new --collection angular-universal-pwa application;