define(function(require,exports,module){const Directory=require("filesystem/Directory"),File=require("filesystem/File"),FileIndex=require("filesystem/FileIndex"),FileSystemError=require("filesystem/FileSystemError"),RemoteFile=require("filesystem/RemoteFile"),WatchedRoot=require("filesystem/WatchedRoot"),EventDispatcher=require("utils/EventDispatcher"),PathUtils=require("thirdparty/path-utils/path-utils"),_=require("thirdparty/lodash");let _fileProtocolPlugins={};const MAX_DEDUPE_NUMBER=1e3;function registerProtocolAdapter(protocol,adapter){var adapters;protocol&&((adapters=_fileProtocolPlugins[protocol]||[]).push(adapter),adapters.sort(function(a,b){return(b.priority||0)-(a.priority||0)}),_fileProtocolPlugins[protocol]=adapters)}function _getProtocolAdapter(protocol,filePath){var protocolAdapters=_fileProtocolPlugins[protocol]||[],selectedAdapter;return _.forEach(protocolAdapters,function(adapter){if(adapter.canRead&&adapter.canRead(filePath))return selectedAdapter=adapter,!1}),selectedAdapter}function FileSystem(){this._index=new FileIndex,this._watchedRoots={},this._watchRequests=[],this._externalChanges=[]}function _ensureTrailingSlash(path){return"/"!==path[path.length-1]&&(path+="/"),path}EventDispatcher.makeEventDispatcher(FileSystem.prototype),FileSystem.prototype._impl=null,FileSystem.prototype._index=null,FileSystem.prototype._activeChangeCount=0,FileSystem.prototype._getActiveChangeCount=function(){return this._activeChangeCount},FileSystem.prototype._externalChanges=null,FileSystem.prototype._triggerExternalChangesNow=function(){this._externalChanges.forEach(function(info){this._handleExternalChange(info.path,info.stat)},this),this._externalChanges.length=0},FileSystem.prototype._enqueueExternalChange=function(path,stat){this._externalChanges.push({path:path,stat:stat}),this._activeChangeCount||this._triggerExternalChangesNow()},FileSystem.prototype._watchRequests=null,FileSystem.prototype._dequeueWatchRequest=function(){if(this._watchRequests.length>0){var request=this._watchRequests[0];request.fn.call(null,function(){var callbackArgs=arguments;try{request.cb.apply(null,callbackArgs)}finally{this._watchRequests.shift(),this._dequeueWatchRequest()}}.bind(this))}},FileSystem.prototype._enqueueWatchRequest=function(fn,cb){this._watchRequests.push({fn:fn,cb:cb}),1===this._watchRequests.length&&this._dequeueWatchRequest()},FileSystem.prototype._watchedRoots=null,FileSystem.prototype._findWatchedRootForPath=function(fullPath){var watchedRoot=null;return Object.keys(this._watchedRoots).some(function(watchedPath){if(0===fullPath.indexOf(watchedPath))return watchedRoot=this._watchedRoots[watchedPath],!0},this),watchedRoot},FileSystem.prototype._watchOrUnwatchEntry=function(entry,watchedRoot,callback,shouldWatch){var impl=this._impl,recursiveWatch=impl.recursiveWatch,commandName=shouldWatch?"watchPath":"unwatchPath",filterGlobs=watchedRoot.filterGlobs;recursiveWatch?entry!==watchedRoot.entry?callback(null):this._enqueueWatchRequest(function(requestCb){impl[commandName].call(impl,entry.fullPath,filterGlobs,requestCb)}.bind(this),callback):shouldWatch?this._enqueueWatchRequest(function(requestCb){var entriesToWatch=[],visitor=function(child){return!!watchedRoot.filter(child.name,child.parentPath)&&((child.isDirectory||child===watchedRoot.entry)&&entriesToWatch.push(child),!0)};entry.visit(visitor,function(err){if(err)requestCb(err);else{var count=entriesToWatch.length;if(0!==count){var watchCallback=function(){0==--count&&requestCb(null)};entriesToWatch.forEach(function(entry){impl.watchPath(entry.fullPath,filterGlobs,watchCallback)})}else requestCb(null)}})},callback):this._enqueueWatchRequest(function(requestCb){impl.unwatchPath(entry.fullPath,requestCb)},callback)},FileSystem.prototype._watchEntry=function(entry,watchedRoot,callback){this._watchOrUnwatchEntry(entry,watchedRoot,callback,!0)},FileSystem.prototype._unwatchEntry=function(entry,watchedRoot,callback){this._watchOrUnwatchEntry(entry,watchedRoot,function(err){this._index.visitAll(function(child){0===child.fullPath.indexOf(entry.fullPath)&&child._clearCachedData(!0)}.bind(this)),callback(err)}.bind(this),!1)},FileSystem.prototype.init=function(impl){console.assert(!this._impl,"This FileSystem has already been initialized!");var changeCallback=this._enqueueExternalChange.bind(this),offlineCallback=this._unwatchAll.bind(this);this._impl=impl,this._impl.initWatchers(changeCallback,offlineCallback)},FileSystem.prototype.close=function(){this._impl.unwatchAll(),this._index.clear()},FileSystem.prototype.alwaysIndex=function(filePath){this._index.doNotRemoveFromIndex(filePath)},FileSystem.prototype._indexFilter=function(path,name){var parentRoot=this._findWatchedRootForPath(path);return!parentRoot||parentRoot.filter(name,path)},FileSystem.prototype._beginChange=function(){this._activeChangeCount++},FileSystem.prototype._endChange=function(){this._activeChangeCount--,this._activeChangeCount<0&&console.error("FileSystem _activeChangeCount has fallen below zero!"),this._activeChangeCount||this._triggerExternalChangesNow()},FileSystem.isAbsolutePath=function(fullPath){return"/"===fullPath[0]||":"===fullPath[1]&&"/"===fullPath[2]};var _DUPLICATED_SLASH_RE=/\/{2,}/g,_instance;function _getNewPath(suggestedPath,isDir,i,pathLib){if(suggestedPath=pathLib.normalize(suggestedPath),isDir)return`${suggestedPath} (copy ${i})`;{const dir=pathLib.dirname(suggestedPath),extName=pathLib.extname(suggestedPath),baseName=pathLib.basename(suggestedPath,extName);return pathLib.join(dir,`${baseName}(copy ${i})${extName}`)}}function _wrap(func){return function(){return func.apply(_instance,arguments)}}FileSystem.prototype._normalizePath=function(path,isDirectory){if(!FileSystem.isAbsolutePath(path))throw new Error("Paths must be absolute: '"+path+"'");var isUNCPath=this._impl.normalizeUNCPaths&&0===path.search(_DUPLICATED_SLASH_RE);if(-1!==(path=path.replace(_DUPLICATED_SLASH_RE,"/")).indexOf("..")){var segments=path.split("/"),i;for(i=1;i<segments.length;i++)if(".."===segments[i]){if(i<2)throw new Error("Invalid absolute path: '"+path+"'");segments.splice(i-1,2),i-=2}path=segments.join("/")}return isDirectory&&(path=_ensureTrailingSlash(path)),isUNCPath&&(path="/"+path),path},FileSystem.prototype.addEntryForPathIfRequired=function(fileEntry,path){var entry;this._index.getEntry(path)||this._index.addEntry(fileEntry)},FileSystem.prototype._getEntryForPath=function(EntryConstructor,path){var isDirectory=EntryConstructor===Directory;path=this._normalizePath(path,isDirectory);var entry=this._index.getEntry(path);return entry||(entry=new EntryConstructor(path,this),this._index.addEntry(entry)),entry},FileSystem.prototype.getFileForPath=function(path){let virtualServingPath=Phoenix.VFS.getPathForVirtualServingURL(path);virtualServingPath&&(path=virtualServingPath);var protocol=PathUtils.parseUrl(path).protocol,protocolAdapter=_getProtocolAdapter(protocol);return protocolAdapter&&protocolAdapter.fileImpl?new protocolAdapter.fileImpl(protocol,path,this):this._getEntryForPath(File,path)},FileSystem.prototype.copy=function(src,dst,callback){let self=this;self._beginChange(),self._impl.copy(src,dst,async function(err,stat){if(err)return callback(err),void self._endChange();let target;if(stat.isFile){let parentDir=window.path.dirname(stat.realPath);target=self.getDirectoryForPath(parentDir)}else target=self.getDirectoryForPath(stat.realPath);self._handleDirectoryChange(target,function(added,removed){try{callback(null,stat)}finally{target._isWatched()&&self._fireChangeEvent(target,added,removed),self._endChange()}})})},FileSystem.prototype.getFreePath=function(suggestedPath,callback){let self=this;self._impl.stat(suggestedPath,async function(err,stat){if(stat){let isDir=stat.isDirectory;for(let i=1;i<1e3;i++){let newPath=_getNewPath(suggestedPath,isDir,i,self._impl.pathLib),exists;if(!await self._impl.existsAsync(newPath))return void callback(null,newPath)}callback(FileSystemError.TOO_MANY_ENTRIES)}else err&&err===FileSystemError.NOT_FOUND?callback(null,suggestedPath):callback(err)})},FileSystem.prototype.getDirectoryForPath=function(path){let virtualServingPath=Phoenix.VFS.getPathForVirtualServingURL(path);return virtualServingPath&&(path=virtualServingPath),this._getEntryForPath(Directory,path)},FileSystem.prototype.resolve=function(path,callback){var normalizedPath=this._normalizePath(path,!1),item=this._index.getEntry(normalizedPath);item||(normalizedPath=_ensureTrailingSlash(normalizedPath),item=this._index.getEntry(normalizedPath)),item?item.stat(function(err,stat){err?callback(err):callback(null,item,stat)}):this._impl.stat(path,function(err,stat){err?callback(err):((item=stat.isFile?this.getFileForPath(path):this.getDirectoryForPath(path))._isWatched()&&(item._stat=stat),callback(null,item,stat))}.bind(this))},FileSystem.prototype.existsAsync=function(path){return this._impl.existsAsync(path)},FileSystem.prototype.resolveAsync=function(path){let self=this;return new Promise((resolve,reject)=>{self.resolve(path,(err,item,stat)=>{err?reject(err):resolve({entry:item,stat:stat})})})},FileSystem.prototype.showOpenDialog=function(allowMultipleSelection,chooseDirectories,title,initialPath,fileTypes,callback){this._impl.showOpenDialog(allowMultipleSelection,chooseDirectories,title,initialPath,fileTypes,callback)},FileSystem.prototype.showSaveDialog=function(title,initialPath,proposedNewFilename,callback){this._impl.showSaveDialog(title,initialPath,proposedNewFilename,callback)},FileSystem.prototype._fireRenameEvent=function(oldPath,newPath){this.trigger("rename",oldPath,newPath)},FileSystem.prototype._fireChangeEvent=function(entry,added,removed){this.trigger("change",entry,added,removed)},FileSystem.prototype._handleRename=function(oldFullPath,newFullPath,isDirectory){this._index.entryRenamed(oldFullPath,newFullPath,isDirectory)},FileSystem.prototype._handleDirectoryChange=function(directory,callback){var oldContents=directory._contents;directory._clearCachedData(),directory.getContents(function(err,contents){var addedEntries=oldContents&&contents.filter(function(entry){return-1===oldContents.indexOf(entry)}),removedEntries=oldContents&&oldContents.filter(function(entry){return-1===contents.indexOf(entry)}),watchedRoot=this._findWatchedRootForPath(directory.fullPath);if(!watchedRoot||!watchedRoot.filter(directory.name,directory.parentPath))return this._index.visitAll(function(entry){0===entry.fullPath.indexOf(directory.fullPath)&&entry._clearCachedData(!0)}.bind(this)),void callback(addedEntries,removedEntries);var addedCounter,removedCounter,counter=(addedEntries?addedEntries.length:0)+(removedEntries?removedEntries.length:0);if(0!==counter){var watchOrUnwatchCallback=function(err){err&&console.error("FileSystem error in _handleDirectoryChange after watch/unwatch entries: "+err),0==--counter&&callback(addedEntries,removedEntries)};addedEntries&&addedEntries.forEach(function(entry){this._watchEntry(entry,watchedRoot,watchOrUnwatchCallback)},this),removedEntries&&removedEntries.forEach(function(entry){this._unwatchEntry(entry,watchedRoot,watchOrUnwatchCallback)},this)}else callback(addedEntries,removedEntries)}.bind(this))},FileSystem.prototype._handleExternalChange=function(path,stat){if(!path)return this._index.visitAll(function(entry){entry._clearCachedData(!0)}),void this._fireChangeEvent(null);path=this._normalizePath(path,!1);var entry=this._index.getEntry(path);if(entry){var oldStat=entry._stat;entry.isFile?stat&&oldStat&&stat.mtime.getTime()<=oldStat.mtime.getTime()||(entry._clearCachedData(),entry._stat=stat,this._fireChangeEvent(entry)):this._handleDirectoryChange(entry,function(added,removed){entry._stat=stat,entry._isWatched()&&this._fireChangeEvent(entry,added,removed)}.bind(this))}},FileSystem.prototype.getAllDirectoryContents=function(directory){return new Promise((resolve,reject)=>{let contents=[];function visitor(entry){return directory.fullPath!==entry.fullPath&&contents.push(entry),!0}directory.visit(visitor,err=>{err?reject():resolve(contents)})})},FileSystem.prototype.clearAllCaches=function(){this._handleExternalChange(null)},FileSystem.prototype.watch=function(entry,filter,filterGlobs,callback){void 0===callback&&"function"==typeof filterGlobs&&(callback=filterGlobs,filterGlobs=null);var fullPath=entry.fullPath;callback=callback||function(){};var watchingParentRoot=this._findWatchedRootForPath(fullPath);if(!watchingParentRoot||watchingParentRoot.status!==WatchedRoot.STARTING&&watchingParentRoot.status!==WatchedRoot.ACTIVE){var watchingChildRoot=Object.keys(this._watchedRoots).some(function(path){var watchedRoot,watchedPath;return 0===this._watchedRoots[path].entry.fullPath.indexOf(fullPath)},this);if(!watchingChildRoot||watchingChildRoot.status!==WatchedRoot.STARTING&&watchingChildRoot.status!==WatchedRoot.ACTIVE){var watchedRoot=new WatchedRoot(entry,filter,filterGlobs);this._watchedRoots[fullPath]=watchedRoot,watchedRoot.status=WatchedRoot.STARTING,this._watchEntry(entry,watchedRoot,function(err){if(err)return console.warn("Failed to watch root: ",entry.fullPath,err),delete this._watchedRoots[fullPath],void callback(err);watchedRoot.status=WatchedRoot.ACTIVE,callback(null)}.bind(this))}else callback("A child of this root is already watched")}else callback("A parent of this root is already watched")},FileSystem.prototype.unwatch=function(entry,callback){var fullPath=entry.fullPath,watchedRoot=this._watchedRoots[fullPath];callback=callback||function(){},watchedRoot?(watchedRoot.status=WatchedRoot.INACTIVE,this._unwatchEntry(entry,watchedRoot,function(err){if(delete this._watchedRoots[fullPath],this._index.visitAll(function(child){0===child.fullPath.indexOf(entry.fullPath)&&this._index.removeEntry(child)}.bind(this)),err)return console.warn("Failed to unwatch root: ",entry.fullPath,err),void callback(err);callback(null)}.bind(this))):callback(FileSystemError.ROOT_NOT_WATCHED)},FileSystem.prototype._unwatchAll=function(){console.warn("File watchers went offline!"),Object.keys(this._watchedRoots).forEach(function(path){var watchedRoot=this._watchedRoots[path];watchedRoot.status=WatchedRoot.INACTIVE,delete this._watchedRoots[path],this._unwatchEntry(watchedRoot.entry,watchedRoot,function(){console.warn("Watching disabled for",watchedRoot.entry.fullPath)})},this),this._handleExternalChange(null)},exports.init=_wrap(FileSystem.prototype.init),exports.close=_wrap(FileSystem.prototype.close),exports.getFileForPath=_wrap(FileSystem.prototype.getFileForPath),exports.addEntryForPathIfRequired=_wrap(FileSystem.prototype.addEntryForPathIfRequired),exports.getDirectoryForPath=_wrap(FileSystem.prototype.getDirectoryForPath),exports.resolve=_wrap(FileSystem.prototype.resolve),exports.resolveAsync=_wrap(FileSystem.prototype.resolveAsync),exports.showOpenDialog=_wrap(FileSystem.prototype.showOpenDialog),exports.showSaveDialog=_wrap(FileSystem.prototype.showSaveDialog),exports.watch=_wrap(FileSystem.prototype.watch),exports.unwatch=_wrap(FileSystem.prototype.unwatch),exports.clearAllCaches=_wrap(FileSystem.prototype.clearAllCaches),exports.alwaysIndex=_wrap(FileSystem.prototype.alwaysIndex),exports.getFreePath=_wrap(FileSystem.prototype.getFreePath),exports.copy=_wrap(FileSystem.prototype.copy),exports.existsAsync=_wrap(FileSystem.prototype.existsAsync),exports.getAllDirectoryContents=_wrap(FileSystem.prototype.getAllDirectoryContents),exports.isAbsolutePath=FileSystem.isAbsolutePath,exports.registerProtocolAdapter=registerProtocolAdapter,exports._getActiveChangeCount=_wrap(FileSystem.prototype._getActiveChangeCount),exports.on=function(event,handler){_instance.on(event,handler)},exports.off=function(event,handler){_instance.off(event,handler)},exports._FileSystem=FileSystem,(_instance=new FileSystem).init(require("fileSystemImpl"));var HTTP_PROTOCOL="http:",HTTPS_PROTOCOL="https:",protocolAdapter={priority:0,fileImpl:RemoteFile,canRead:function(filePath){return!0}};registerProtocolAdapter("http:",protocolAdapter),registerProtocolAdapter("https:",protocolAdapter)});
//# sourceMappingURL=FileSystem.js.map
