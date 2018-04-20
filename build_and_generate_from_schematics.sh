# Testing with CLI 1.7
npm install -g @angular/cli;
rm -rf application;
cd schematics;
npm install;
npm run build;
npm link;
cd ..;
ng new --collection angular-universal-pwa application;

## testing with CLI 6.x
rm -rf application;
npm install -g @angular/cli@next;
ng new --collection angular-universal-pwa application --gaTrackingCode UA-109145893-2;
