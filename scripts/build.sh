cd schematics

#UTILS

cd utils
npm install
npm run build
cd ..
sleep 1

cd serverless
npm install
npm run build
cd ..

cd init
npm install
npm run build
cd ..