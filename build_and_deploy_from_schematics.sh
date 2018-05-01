npm install -g @angular/cli@next;
rm -rf application;
cd schematics;
npm install;
npm run build;
npm link;
cd ..;
ng new --collection angular-universal-pwa application --gaTrackingCode UA-109145893-2;
cd application;
ls -la
npm run build:deploy:aws;
curl -I https://www.angular-universal-pwa.maciejtreder.com;
aws sns publish --subject "New version available" --message "Check out newest version of PWA with Angular Universal by Maciej Treder! " --topic-arn arn:aws:sns:eu-central-1:$ACC_ID:sns-webpush-angular-universal
