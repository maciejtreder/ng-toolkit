CATALOGS=(_utils serverless pwa universal firebug init)
echo "//localhost:4873/:_authToken=\"CjmKyL6UDkX6FDpNnP64fw==\"" >>~/.npmrc

npm install -g @angular/cli
npm install -g verdaccio
verdaccio --config scripts/default.yaml >>verdacio_output &
sleep 5
head verdacio_output
npm set registry http://localhost:4873/

exitStatus=0

center() {
    termwidth="$(tput cols)"
    padding="$(printf '%0.1s' ={1..500})"
    printf '\e[1;44m%*.*s %s %*.*s\e[0m\n' 0 "$(((termwidth - 2 - ${#1}) / 2))" "$padding" "$1" 0 "$(((termwidth - 1 - ${#1}) / 2))" "$padding"
}

cd schematics

for i in "${CATALOGS[@]}"; do
    center "$i"
    cd $i
    npm install --verbose
    printf '\e[1;32m--- NPM INSTALL COMPLETED FOR %s ---\e[0m\n' "$i"
    if ./publish_verdaccio.sh; then
        printf '\e[1;33m*** %s PASSED ***\e[0m\n' "$i"
    else
        exitStatus=1
    fi
    cd ..
    sleep 1
done

npm set registry=https://registry.npmjs.org/

exit $exitStatus
