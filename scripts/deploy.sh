cd schematics

#UTILS

cd utils
npm install
npx semantic-release
cd ..
sleep 1

cd serverless
npm install
npx semantic-release
cd ..

cd init
npm install
npx semantic-release
cd ..