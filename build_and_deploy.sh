npm install -g @angular/cli;
rm -rf generatedApp;
cd schematics;
npm install;
npm run build;
npm link;
cd ..;
ng new --collection angular-universal-pwa generatedApp;
cd generatedApp;
npm run build:deploy:aws;
curl -I https://www.angular-universal-pwa.maciejtreder.com;
aws sns publish --subject "New version available" --message "Check out newest version of PWA with Angular Universal by Maciej Treder! " --topic-arn arn:aws:sns:eu-central-1:$ACC_ID:sns-webpush-angular-universal