# Testing with CLI 6.x
npm install -g @angular/cli@next;
rm -rf application;
cd schematics;
npm install;
npm run build;
npm link;
cd ..;
ng new --collection angular-universal-pwa application;

## testing with CLI 1.7
rm -rf application;
npm install -g @angular/cli;
ng new --collection angular-universal-pwa application;