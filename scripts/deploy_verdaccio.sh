CATALOGS=(_utils pwa serverless universal firebug)

echo "//localhost:4873/:_authToken=\"CjmKyL6UDkX6FDpNnP64fw==\"" >> ~/.npmrc

npm install -g @angular/cli
npm install -g verdaccio
verdaccio --config scripts/default.yaml >> verdacio_output &
sleep 5
head verdacio_output
npm set registry=http://localhost:4873/

exitStatus=0

cd schematics

for i in "${CATALOGS[@]}"
do :
    echo publishing $i
    cd $i
    npm install
    echo 'INSTALLED INSTALLED'
    ls node_modules/@ng-toolkit/_utils/testing
    if ./publish_verdaccio.sh
    then
        echo $i passed
    else
        exitStatus=1
    fi
    cd ..
    sleep 1
done

npm set registry=https://registry.npmjs.org/

exit $exitStatus
