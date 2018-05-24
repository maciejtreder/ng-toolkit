cd schematics

CATALOGS=(utils serverless init universal)

exitStatus=0

for i in "${CATALOGS[@]}"
do :
   cd $i
   npm install
   if npm run ci-publish
   then
    echo $i passed
   else
    exitStatus=1
   fi
   cd ..
   sleep 1
done

exit $exitStatus
