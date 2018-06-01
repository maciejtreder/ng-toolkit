cd schematics

CATALOGS=(_utils serverless init universal)

exitStatus=0

for i in "${CATALOGS[@]}"
do :
   cd $i
   version=$( cat package.json | grep version | cut -d':' -f2 )
   version=${version:2}
   version=${version::${#version}-2}
   remoteVersion=$(npm view @ng-toolkit/$i version)
   echo "$i to deploy: $version"
   echo "$i remote version: $remoteVersion";
   if [ "$version" != "$remoteVersion" ]; 
   then
        echo "deploying"
        npm install
        if npm run ci-publish
        then
            echo $i passed
        else
            exitStatus=1
        fi
   fi

   cd ..
   sleep 1
done

exit $exitStatus
