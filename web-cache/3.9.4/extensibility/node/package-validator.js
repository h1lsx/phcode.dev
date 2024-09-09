var DecompressZip=require("decompress-zip"),semver=require("semver"),path=require("path"),temp=require("temp"),fs=require("fs-extra"),performNpmInstallIfRequired=require("./npm-installer").performNpmInstallIfRequired;temp.track();var Errors={NOT_FOUND_ERR:"NOT_FOUND_ERR",INVALID_ZIP_FILE:"INVALID_ZIP_FILE",INVALID_PACKAGE_JSON:"INVALID_PACKAGE_JSON",MISSING_PACKAGE_NAME:"MISSING_PACKAGE_NAME",BAD_PACKAGE_NAME:"BAD_PACKAGE_NAME",MISSING_PACKAGE_VERSION:"MISSING_PACKAGE_VERSION",INVALID_VERSION_NUMBER:"INVALID_VERSION_NUMBER",MISSING_MAIN:"MISSING_MAIN",MISSING_PACKAGE_JSON:"MISSING_PACKAGE_JSON",INVALID_BRACKETS_VERSION:"INVALID_BRACKETS_VERSION",DISALLOWED_WORDS:"DISALLOWED_WORDS"},ignoredFolders=["__MACOSX"];function validateName(name){return!!/^[a-z0-9][a-z0-9._\-]*$/.exec(name)}var _personRegex=/^([^<\(]+)(?:\s+<([^>]+)>)?(?:\s+\(([^\)]+)\))?$/;function parsePersonString(obj){if("string"==typeof obj){var parts=_personRegex.exec(obj);if(!parts)return{name:obj};var result={name:parts[1]};return parts[2]&&(result.email=parts[2]),parts[3]&&(result.url=parts[3]),result}return obj}function containsWords(wordlist,str){var i,matches=[];for(i=0;i<wordlist.length;i++){var re;new RegExp("\\b"+wordlist[i]+"\\b","i").exec(str)&&matches.push(wordlist[i])}return matches}function findCommonPrefix(extractDir,callback){fs.readdir(extractDir,function(err,files){if(ignoredFolders.forEach(function(folder){var index=files.indexOf(folder);-1!==index&&files.splice(index,1)}),err)callback(err);else if(1===files.length){var name=files[0];fs.statSync(path.join(extractDir,name)).isDirectory()?callback(null,name):callback(null,"")}else callback(null,"")})}function validatePackageJSON(path,packageJSON,options,callback){var errors=[];fs.existsSync(packageJSON)?fs.readFile(packageJSON,{encoding:"utf8"},function(err,data){if(err)callback(err,null,null);else{var metadata;try{metadata=JSON.parse(data)}catch(e){return errors.push([Errors.INVALID_PACKAGE_JSON,e.toString(),path]),void callback(null,errors,void 0)}if(metadata.name?validateName(metadata.name)||errors.push([Errors.BAD_PACKAGE_NAME,metadata.name]):errors.push([Errors.MISSING_PACKAGE_NAME,path]),metadata.version?semver.valid(metadata.version)||errors.push([Errors.INVALID_VERSION_NUMBER,metadata.version,path]):errors.push([Errors.MISSING_PACKAGE_VERSION,path]),metadata.author&&(metadata.author=parsePersonString(metadata.author)),metadata.contributors&&(metadata.contributors.map?metadata.contributors=metadata.contributors.map(function(person){return parsePersonString(person)}):metadata.contributors=[parsePersonString(metadata.contributors)]),metadata.engines&&metadata.engines.brackets){var range=metadata.engines.brackets;semver.validRange(range)||errors.push([Errors.INVALID_BRACKETS_VERSION,range,path])}options.disallowedWords&&["title","description","name"].forEach(function(field){var words=containsWords(options.disallowedWords,metadata[field]);words.length>0&&errors.push([Errors.DISALLOWED_WORDS,field,words.toString(),path])}),callback(null,errors,metadata)}}):(options.requirePackageJSON&&errors.push([Errors.MISSING_PACKAGE_JSON,path]),callback(null,errors,null))}function extractAndValidateFiles(zipPath,extractDir,options,callback){var unzipper=new DecompressZip(zipPath);unzipper.on("error",function(err){callback(null,{errors:[[Errors.INVALID_ZIP_FILE,zipPath,err]]})}),unzipper.on("extract",function(log){findCommonPrefix(extractDir,function(err,commonPrefix){if(err)callback(err,null);else{var packageJSON=path.join(extractDir,commonPrefix,"package.json");validatePackageJSON(zipPath,packageJSON,options,function(err,errors,metadata){if(err)callback(err,null);else{var mainJS=path.join(extractDir,commonPrefix,"main.js"),isTheme;metadata&&metadata.theme||fs.existsSync(mainJS)||errors.push([Errors.MISSING_MAIN,zipPath,mainJS]);var npmOptions=["--production"];options.proxy&&npmOptions.push("--proxy "+options.proxy),process.platform.startsWith("win")&&(npmOptions.push("--arch=ia32"),npmOptions.push("--npm_config_arch=ia32"),npmOptions.push("--npm_config_target_arch=ia32")),performNpmInstallIfRequired(npmOptions,{errors:errors,metadata:metadata,commonPrefix:commonPrefix,extractDir:extractDir},callback)}})}})}),unzipper.extract({path:extractDir,filter:function(file){return"SymbolicLink"!==file.type}})}function validate(path,options,callback){options=options||{},fs.exists(path,function(doesExist){doesExist?temp.mkdir("bracketsPackage_",function _tempDirCreated(err,extractDir){err?callback(err,null):extractAndValidateFiles(path,extractDir,options,callback)}):callback(null,{errors:[[Errors.NOT_FOUND_ERR,path]]})})}exports._parsePersonString=parsePersonString,exports.errors=Errors,exports.validate=validate;
//# sourceMappingURL=package-validator.js.map