cd schematics

#UTILS

cd utils
npm install
npm test
cd ..
sleep 1

cd serverless
npm install
npm test
cd ..

cd init
npm install
npm test
cd ..