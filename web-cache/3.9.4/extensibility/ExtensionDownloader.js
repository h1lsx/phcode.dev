define(function(require,exports,module){const EventDispatcher=require("utils/EventDispatcher"),ExtensionLoader=require("utils/ExtensionLoader"),FileUtils=require("file/FileUtils"),NodeUtils=require("utils/NodeUtils"),Package=require("extensibility/Package"),FileSystem=require("filesystem/FileSystem"),FileSystemError=require("filesystem/FileSystemError"),ZipUtils=require("utils/ZipUtils");EventDispatcher.makeEventDispatcher(exports);const EVENT_DOWNLOAD_FILE_PROGRESS="DownloadProgress",EVENT_EXTRACT_FILE_PROGRESS="ExtractProgress",downloadCancelled={};function _unzipExtension(data,projectPath,flattenFirstLevelInZip,progressCb){return new Promise((resolve,reject)=>{ZipUtils.unzipBinDataToLocation(data,projectPath,flattenFirstLevelInZip,progressCb).then(resolve).catch(reject)})}function _getExtensionName(fileNameHint){let guessedName=path.basename(fileNameHint,".zip");return guessedName=guessedName.substring(0,guessedName.lastIndexOf("-"))}function downloadFile(downloadId,{url:url,filenameHint:filenameHint,destinationDirectory:destinationDirectory},_proxy){const d=new $.Deferred;let guessedName=_getExtensionName(filenameHint);return destinationDirectory=destinationDirectory||ExtensionLoader.getUserExtensionPath(),console.log("Download extension",downloadId,url,filenameHint,guessedName),window.JSZipUtils.getBinaryContent(url,{callback:async function(err,data){if(downloadCancelled[downloadId])d.reject(),delete downloadCancelled[downloadId];else if(err)console.error("could not download extension zip file!",err),d.reject();else{function _progressCB(done,total){return exports.trigger(EVENT_EXTRACT_FILE_PROGRESS,done,total),!downloadCancelled[downloadId]}FileSystem.getFileForPath(destinationDirectory+"/"+guessedName).unlink(()=>{console.log("[Extension] extracting",downloadId,url,filenameHint,guessedName),_unzipExtension(data,destinationDirectory+"/"+guessedName,!0,_progressCB).then(()=>{console.log("[Extension] extraction done",downloadId,url,filenameHint,guessedName),d.resolve(destinationDirectory+"/"+guessedName)}).catch(extractErr=>{console.error("Error extracting extension zip, cleaning up",extractErr),FileSystem.getFileForPath(destinationDirectory+"/"+guessedName).unlink(unlinkError=>{unlinkError&&console.error("Error cleaning up extenstion folder: ",destinationDirectory+"/"+unlinkError),d.reject()})})})}},progress:function(status){100!==status.percent?exports.trigger(EVENT_DOWNLOAD_FILE_PROGRESS,status.percent||0):exports.trigger(EVENT_EXTRACT_FILE_PROGRESS,0)},abortCheck:function(){return downloadCancelled[downloadId]}}),d.promise()}function abortDownload(downloadId){downloadCancelled[downloadId]=!0}async function _validateAndNpmInstallIfNodeExtension(nodeExtPath){const packageJSONFile=FileSystem.getFileForPath(path.join(nodeExtPath,"package.json"));let packageJson=await catchToNull(jsPromise(FileUtils.readAsText(packageJSONFile)),"package.json not found for installing extension, trying to continue "+nodeExtPath);try{packageJson&&(packageJson=JSON.parse(packageJson))}catch(e){return console.error("Error parsing package json for extension",nodeExtPath,e),null}if(!packageJson||!packageJson.nodeConfig||!packageJson.nodeConfig.main)return null;if(packageJson.nodeConfig.nodeIsRequired&&!Phoenix.isNativeApp)return"Extension can only be installed in native builds!";if(!Phoenix.isNativeApp)return null;let nodeMainFile=path.join(nodeExtPath,packageJson.nodeConfig.main),file=FileSystem.getFileForPath(nodeMainFile),isExists=await file.existsAsync();if(!isExists)return console.error("Extension cannot be installed; could not find node main file: ",nodeMainFile,packageJson.nodeConfig.main),"Extension is broken, (Err: node main file not found)";let npmInstallFolder=packageJson.nodeConfig.npmInstall;if(!npmInstallFolder)return null;npmInstallFolder=path.join(nodeExtPath,packageJson.nodeConfig.npmInstall);const nodeModulesFolder=path.join(npmInstallFolder,"node_modules");let directory=FileSystem.getDirectoryForPath(npmInstallFolder);if(!(isExists=await directory.existsAsync()))return console.error("Extension cannot be installed; could not find folder to run npm install: ",npmInstallFolder),"Extension is broken, (Err: node source folder not found)";const nodePackageJson=path.join(npmInstallFolder,"package.json");let nodePackageFile=FileSystem.getFileForPath(nodePackageJson);if(!(isExists=await nodePackageFile.existsAsync()))return console.error("Extension cannot be installed; could not find package.json file to npm install in: ",npmInstallFolder),"Extension is broken, (Err: it's node package.json not found)";if(directory=FileSystem.getDirectoryForPath(nodeModulesFolder),isExists=await directory.existsAsync())return console.error("Could not install extension as the extension has node_modules folder in the package",nodeModulesFolder,"Extensions that defines a nodeConfig.npmInstall path should not package node_modules!"),"Extension is broken. (Err: cannot npm install inside extension folder as it already has node_modules)";const npmInstallPlatformPath=Phoenix.fs.getTauriPlatformPath(npmInstallFolder);return NodeUtils._npmInstallInFolder(npmInstallPlatformPath)}function install(path,destinationDirectory,config){const d=new $.Deferred;return _validateAndNpmInstallIfNodeExtension(path).then(validationErr=>{validationErr?d.resolve({name:_getExtensionName(config.nameHint),installationStatus:Package.InstallationStatuses.FAILED,errors:[validationErr]}):d.resolve({name:_getExtensionName(config.nameHint),installationStatus:Package.InstallationStatuses.INSTALLED,installedTo:path})}).catch(err=>{console.error("Error installing extension",err),d.resolve({name:_getExtensionName(config.nameHint),installationStatus:Package.InstallationStatuses.FAILED,errors:["Error installing extension"]})}),d.promise()}function _markForDeleteOnRestart(extensionDirectory){let file=FileSystem.getFileForPath(path.join(extensionDirectory.fullPath,ExtensionLoader._DELETED_EXTENSION_FILE_MARKER));return jsPromise(FileUtils.writeText(file,"This extension is marked for delete on restart of phcode",!0))}function remove(extensionPath){const d=new $.Deferred,extensionDirectory=FileSystem.getDirectoryForPath(extensionPath);return extensionDirectory.unlink(err=>{err&&err!==FileSystemError.NOT_FOUND?_markForDeleteOnRestart(extensionDirectory).then(d.resolve).catch(d.reject):d.resolve()}),d.promise()}exports.downloadFile=downloadFile,exports.abortDownload=abortDownload,exports.install=install,exports.remove=remove,exports.update=install,exports.EVENT_DOWNLOAD_FILE_PROGRESS=EVENT_DOWNLOAD_FILE_PROGRESS,exports.EVENT_EXTRACT_FILE_PROGRESS=EVENT_EXTRACT_FILE_PROGRESS});
//# sourceMappingURL=ExtensionDownloader.js.map