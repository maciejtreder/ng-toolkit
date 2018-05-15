cd schematics

#UTILS

cd utils
npm install
npm test
npm run ci-publish
cd ..
sleep 1

cd serverless
npm install
npm test
npm run ci-publish
cd ..

cd init
npm install
npm test
npm run ci-publish
cd ..