define(function(require,exports,module){const EventDispatcher=require("utils/EventDispatcher"),ExtensionLoader=require("utils/ExtensionLoader"),Package=require("extensibility/Package"),FileSystem=require("filesystem/FileSystem"),ZipUtils=require("utils/ZipUtils");EventDispatcher.makeEventDispatcher(exports);const EVENT_DOWNLOAD_FILE_PROGRESS="DownloadProgress",EVENT_EXTRACT_FILE_PROGRESS="ExtractProgress",downloadCancelled={};function _unzipExtension(data,projectPath,flattenFirstLevelInZip,progressCb){return new Promise((resolve,reject)=>{ZipUtils.unzipBinDataToLocation(data,projectPath,flattenFirstLevelInZip,progressCb).then(resolve).catch(reject)})}function _getExtensionName(fileNameHint){let guessedName=path.basename(fileNameHint,".zip");return guessedName=guessedName.substring(0,guessedName.lastIndexOf("-"))}function downloadFile(downloadId,{url:url,filenameHint:filenameHint,destinationDirectory:destinationDirectory},_proxy){const d=new $.Deferred;let guessedName=_getExtensionName(filenameHint);return destinationDirectory=destinationDirectory||ExtensionLoader.getUserExtensionPath(),console.log("Download extension",downloadId,url,filenameHint,guessedName),window.JSZipUtils.getBinaryContent(url,{callback:async function(err,data){if(downloadCancelled[downloadId])d.reject(),delete downloadCancelled[downloadId];else if(err)console.error("could not download extension zip file!",err),d.reject();else{function _progressCB(done,total){return exports.trigger(EVENT_EXTRACT_FILE_PROGRESS,done,total),!downloadCancelled[downloadId]}FileSystem.getFileForPath(destinationDirectory+"/"+guessedName).unlink(()=>{console.log("[Extension] extracting",downloadId,url,filenameHint,guessedName),_unzipExtension(data,destinationDirectory+"/"+guessedName,!0,_progressCB).then(()=>{console.log("[Extension] extraction done",downloadId,url,filenameHint,guessedName),d.resolve(destinationDirectory+"/"+guessedName)}).catch(extractErr=>{console.error("Error extracting extension zip, cleaning up",extractErr),FileSystem.getFileForPath(destinationDirectory+"/"+guessedName).unlink(unlinkError=>{unlinkError&&console.error("Error cleaning up extenstion folder: ",destinationDirectory+"/"+unlinkError),d.reject()})})})}},progress:function(status){100!==status.percent?exports.trigger(EVENT_DOWNLOAD_FILE_PROGRESS,status.percent||0):exports.trigger(EVENT_EXTRACT_FILE_PROGRESS,0)},abortCheck:function(){return downloadCancelled[downloadId]}}),d.promise()}function abortDownload(downloadId){downloadCancelled[downloadId]=!0}function install(path,destinationDirectory,config){const d=new $.Deferred;return d.resolve({name:_getExtensionName(config.nameHint),installationStatus:Package.InstallationStatuses.INSTALLED,installedTo:path}),d.promise()}function remove(path){const d=new $.Deferred;return FileSystem.getFileForPath(path).unlink(err=>{err?d.reject():d.resolve()}),d.promise()}exports.downloadFile=downloadFile,exports.abortDownload=abortDownload,exports.install=install,exports.remove=remove,exports.update=install,exports.EVENT_DOWNLOAD_FILE_PROGRESS=EVENT_DOWNLOAD_FILE_PROGRESS,exports.EVENT_EXTRACT_FILE_PROGRESS=EVENT_EXTRACT_FILE_PROGRESS});
//# sourceMappingURL=ExtensionDownloader.js.map