define(function(require,exports,module){const STATUS_INACTIVE=exports.STATUS_INACTIVE=0,STATUS_CONNECTING=exports.STATUS_CONNECTING=1,STATUS_ACTIVE=exports.STATUS_ACTIVE=2,STATUS_OUT_OF_SYNC=exports.STATUS_OUT_OF_SYNC=3,STATUS_SYNC_ERROR=exports.STATUS_SYNC_ERROR=4,STATUS_RELOADING=exports.STATUS_RELOADING=5,STATUS_RESTARTING=exports.STATUS_RESTARTING=6,EVENT_OPEN_PREVIEW_URL="openPreviewURL",EVENT_CONNECTION_CLOSE="ConnectionClose",EVENT_STATUS_CHANGE="statusChange",CommandManager=require("command/CommandManager"),Commands=require("command/Commands"),Dialogs=require("widgets/Dialogs"),DefaultDialogs=require("widgets/DefaultDialogs"),DocumentManager=require("document/DocumentManager"),EditorManager=require("editor/EditorManager"),EventDispatcher=require("utils/EventDispatcher"),FileUtils=require("file/FileUtils"),MainViewManager=require("view/MainViewManager"),PreferencesDialogs=require("preferences/PreferencesDialogs"),ProjectManager=require("project/ProjectManager"),Strings=require("strings"),_=require("thirdparty/lodash"),LiveDevelopmentUtils=require("LiveDevelopment/LiveDevelopmentUtils"),LiveDevServerManager=require("LiveDevelopment/LiveDevServerManager"),ServiceWorkerTransport=require("LiveDevelopment/MultiBrowserImpl/transports/ServiceWorkerTransport"),LiveDevProtocol=require("LiveDevelopment/MultiBrowserImpl/protocol/LiveDevProtocol"),Metrics=require("utils/Metrics"),LiveCSSDocument=require("LiveDevelopment/MultiBrowserImpl/documents/LiveCSSDocument"),LiveHTMLDocument=require("LiveDevelopment/MultiBrowserImpl/documents/LiveHTMLDocument");var _liveDocument;let livePreviewUrlPinned=!1;var _relatedDocuments={},_protocol=LiveDevProtocol,_server;function _classForDocument(doc){return"css"===doc.getLanguage().getId()?LiveCSSDocument:LiveDevelopmentUtils.isHtmlFileExt(doc.file.fullPath)?LiveHTMLDocument:null}function isActive(){return exports.status>STATUS_INACTIVE}function getLiveDocForPath(path){return _server?_server.get(path):null}function _closeDocument(liveDocument){liveDocument.off(".livedev"),_protocol.off(".livedev"),liveDocument.close()}function _handleRelatedDocumentDeleted(url){var liveDoc=_relatedDocuments[url];liveDoc&&delete _relatedDocuments[url],_server&&_server.remove(liveDoc),_closeDocument(liveDoc)}function _setStatus(status,closeReason){if(status!==exports.status){exports.status=status;var reason=status===STATUS_INACTIVE?closeReason:null;exports.trigger(EVENT_STATUS_CHANGE,status,reason)}}function _closeDocuments(){_liveDocument&&(_closeDocument(_liveDocument),_liveDocument=void 0),Object.keys(_relatedDocuments).forEach(function(url){_closeDocument(_relatedDocuments[url]),delete _relatedDocuments[url]}),_server&&_server.clear()}function _resolveUrl(path){return _server&&_server.pathToUrl(path)}function _createLiveDocument(doc,editor,roots){var DocClass=_classForDocument(doc),liveDocument;return DocClass?((liveDocument=new DocClass(_protocol,_resolveUrl,doc,editor,roots)).on("errorStatusChanged.livedev",function(event,hasErrors){isActive()&&_setStatus(hasErrors?STATUS_SYNC_ERROR:STATUS_ACTIVE)}),liveDocument):null}function _docIsOutOfSync(doc){var liveDoc=_server&&_server.get(doc.file.fullPath),isLiveEditingEnabled=liveDoc&&liveDoc.isLiveEditingEnabled();return doc.isDirty&&!isLiveEditingEnabled}function _styleSheetAdded(event,url,roots){var path=_server&&_server.urlToPath(url),alreadyAdded=!!_relatedDocuments[url],docPromise;path&&!alreadyAdded&&DocumentManager.getDocumentForPath(path).done(function(doc){if(_classForDocument(doc)===LiveCSSDocument&&(!_liveDocument||doc!==_liveDocument.doc)){var liveDoc=_createLiveDocument(doc,doc._masterEditor,roots);liveDoc&&(_server.add(liveDoc),_relatedDocuments[doc.url]=liveDoc,liveDoc.on("updateDoc",function(event,url){var path,doc;getLiveDocForPath(_server.urlToPath(url))._updateBrowser()}))}})}function _getInitialDocFromCurrent(){var doc=DocumentManager.getCurrentDocument(),refPath,i;if(doc&&(refPath=doc.file.fullPath,LiveDevelopmentUtils.isStaticHtmlFileExt(refPath)||LiveDevelopmentUtils.isServerHtmlFileExt(refPath)))return(new $.Deferred).resolve(doc);var result=new $.Deferred,baseUrl=ProjectManager.getBaseUrl(),hasOwnServerForLiveDevelopment=baseUrl&&baseUrl.length;return ProjectManager.getAllFiles().done(function(allFiles){var projectRoot=ProjectManager.getProjectRoot().fullPath,containingFolder,indexFileFound=!1,stillInProjectTree=!0;containingFolder=refPath?FileUtils.getDirectoryPath(refPath):projectRoot;for(var filteredFiltered=allFiles.filter(function(item){var parent=FileUtils.getParentPath(item.fullPath);return 0===containingFolder.indexOf(parent)}),filterIndexFile=function(fileInfo){if(0===fileInfo.fullPath.indexOf(containingFolder)){if("index"!==FileUtils.getFilenameWithoutExtension(fileInfo.name))return!1;if(hasOwnServerForLiveDevelopment){if(LiveDevelopmentUtils.isServerHtmlFileExt(fileInfo.name)||LiveDevelopmentUtils.isStaticHtmlFileExt(fileInfo.name))return!0}else if(LiveDevelopmentUtils.isStaticHtmlFileExt(fileInfo.name))return!0}};!indexFileFound&&stillInProjectTree;)-1===(i=_.findIndex(filteredFiltered,filterIndexFile))?-1===(containingFolder=FileUtils.getParentPath(containingFolder)).indexOf(projectRoot)&&(stillInProjectTree=!1):indexFileFound=!0;-1===i?result.resolve(null):DocumentManager.getDocumentForPath(filteredFiltered[i].fullPath).then(result.resolve,result.resolve)}),result.promise()}function _close(doCloseWindow,reason){exports.status!==STATUS_INACTIVE&&(_closeDocuments(),_protocol.closeAllConnections(),_server&&(_server.stop(),_server=null)),_setStatus(STATUS_INACTIVE,reason||"explicit_close")}function close(){return _close(!0),(new $.Deferred).resolve().promise()}function _showLiveDevServerNotReadyError(){Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.LIVE_DEVELOPMENT_ERROR_TITLE,Strings.LIVE_DEV_SERVER_NOT_READY_MESSAGE)}function _createLiveDocumentForFrame(doc){doc._ensureMasterEditor(),_liveDocument=_createLiveDocument(doc,doc._masterEditor),_server.add(_liveDocument)}function _launch(url,fullPath){exports.trigger(EVENT_OPEN_PREVIEW_URL,{url:url,fullPath:fullPath})}function _open(doc){doc&&_liveDocument&&doc===_liveDocument.doc?_server?(exports.status<STATUS_ACTIVE&&_launch(_resolveUrl(doc.file.fullPath),doc.file.fullPath),exports.status===STATUS_RESTARTING&&_protocol.navigate(_resolveUrl(doc.file.fullPath)),_protocol.on("ConnectionConnect.livedev",function(event,msg){1===_protocol.getConnectionIds().length&&_liveDocument&&msg.url===_resolveUrl(_liveDocument.doc.file.fullPath)&&_setStatus(STATUS_ACTIVE),Metrics.countEvent(Metrics.EVENT_TYPE.LIVE_PREVIEW,"connect",`${_protocol.getConnectionIds().length}-preview`)}).on("ConnectionClose.livedev",function(event,{clientId:clientId}){exports.trigger(EVENT_CONNECTION_CLOSE,{clientId:clientId}),window.loggingOptions.livePreview.log("Live Preview: Phoenix received ConnectionClose, live preview left: ",_protocol.getConnectionIds().length,clientId)}).on("DocumentRelated.livedev",function(event,msg){var relatedDocs=msg.related,docs;Object.keys(relatedDocs.stylesheets).forEach(function(url){_styleSheetAdded(null,url,relatedDocs.stylesheets[url])})}).on("StylesheetAdded.livedev",function(event,msg){_styleSheetAdded(null,msg.href,msg.roots)}).on("StylesheetRemoved.livedev",function(event,msg){_handleRelatedDocumentDeleted(msg.href)})):console.error("LiveDevelopment._open(): No server active"):close()}function _doLaunchAfterServerReady(initialDoc){_createLiveDocumentForFrame(initialDoc),_server.start(),_open(initialDoc)}function _prepareServer(doc){var deferred=new $.Deferred,showBaseUrlPrompt=!1;if(showBaseUrlPrompt=!(_server=LiveDevServerManager.getServer(doc.file.fullPath))&&LiveDevelopmentUtils.isServerHtmlFileExt(doc.file.fullPath))PreferencesDialogs.showProjectPreferencesDialog("",Strings.LIVE_DEV_NEED_BASEURL_MESSAGE).done(function(id){id===Dialogs.DIALOG_BTN_OK&&ProjectManager.getBaseUrl()?_prepareServer(doc).then(deferred.resolve,deferred.reject):deferred.reject()});else if(_server){var readyPromise=_server.readyToServe();readyPromise?readyPromise.then(deferred.resolve,function(){_showLiveDevServerNotReadyError(),deferred.reject()}):(_showLiveDevServerNotReadyError(),deferred.reject())}else deferred.reject();return deferred.promise()}function _onFileChange(){let doc=DocumentManager.getCurrentDocument();if(!isActive()||!doc||livePreviewUrlPinned)return;let docUrl=_resolveUrl(doc.file.fullPath),isViewable=_server&&_server.canServe(doc.file.fullPath);_liveDocument.doc.url!==docUrl&&isViewable&&(_closeDocuments(),_createLiveDocumentForFrame(doc),_setStatus(STATUS_RESTARTING),_open(doc))}function open(){_getInitialDocFromCurrent().done(function(doc){var prepareServerPromise=doc&&_prepareServer(doc)||(new $.Deferred).reject(),otherDocumentsInWorkingFiles;doc&&!doc._masterEditor&&(otherDocumentsInWorkingFiles=MainViewManager.getWorkingSetSize(MainViewManager.ALL_PANES),MainViewManager.addToWorkingSet(MainViewManager.ACTIVE_PANE,doc.file),otherDocumentsInWorkingFiles||CommandManager.execute(Commands.CMD_OPEN,{fullPath:doc.file.fullPath})),prepareServerPromise.done(function(){_setStatus(STATUS_CONNECTING),_doLaunchAfterServerReady(doc)}).fail(function(){console.log("Live preview: no document to preview.")})})}function _onDocumentSaved(event,doc){if(isActive()&&_server){var absolutePath=doc.file.fullPath,liveDocument=absolutePath&&_server.get(absolutePath),liveEditingEnabled;liveDocument&&liveDocument.isLiveEditingEnabled&&liveDocument.isLiveEditingEnabled()||_liveDocument.isRelated(absolutePath)&&"javascript"===doc.getLanguage().getId()&&(_setStatus(STATUS_RELOADING),_protocol.reload())}}function _onDirtyFlagChange(event,doc){if(isActive()&&_server){var absolutePath=doc.file.fullPath;_liveDocument.isRelated(absolutePath)&&_setStatus(_docIsOutOfSync(doc)?STATUS_OUT_OF_SYNC:STATUS_ACTIVE)}}function setTransport(transport){_protocol.setTransport(transport)}function init(config){exports.config=config,MainViewManager.on("currentFileChange",_onFileChange),DocumentManager.on("documentSaved",_onDocumentSaved).on("dirtyFlagChange",_onDirtyFlagChange),ProjectManager.on("beforeProjectClose beforeAppClose",close),setTransport(ServiceWorkerTransport),_setStatus(STATUS_INACTIVE)}function getLiveDocForEditor(editor){return editor?getLiveDocForPath(editor.document.file.fullPath):null}function showHighlight(){var doc=getLiveDocForEditor(EditorManager.getActiveEditor());doc&&doc.updateHighlight&&doc.updateHighlight()}function hideHighlight(){_protocol&&_protocol.evaluate("_LD.hideHighlight()")}function redrawHighlight(){_protocol&&_protocol.evaluate("_LD.redrawHighlights()")}function reconnect(){return $.Deferred().resolve()}function reload(){_protocol&&_protocol.reload()}function setLivePreviewPinned(urlPinned){livePreviewUrlPinned=urlPinned}function getCurrentProjectServerConfig(){return{baseUrl:ProjectManager.getBaseUrl(),pathResolver:ProjectManager.makeProjectRelativeIfPossible,root:ProjectManager.getProjectRoot().fullPath}}function getServerBaseUrl(){return _server&&_server.getBaseUrl()}function getCurrentLiveDoc(){return _liveDocument}function getConnectionIds(){return _protocol.getConnectionIds()}EventDispatcher.makeEventDispatcher(exports),exports._server=_server,exports._getInitialDocFromCurrent=_getInitialDocFromCurrent,exports.EVENT_OPEN_PREVIEW_URL=EVENT_OPEN_PREVIEW_URL,exports.EVENT_CONNECTION_CLOSE=EVENT_CONNECTION_CLOSE,exports.EVENT_STATUS_CHANGE=EVENT_STATUS_CHANGE,exports.open=open,exports.close=close,exports.reconnect=reconnect,exports.reload=reload,exports.getLiveDocForPath=getLiveDocForPath,exports.showHighlight=showHighlight,exports.hideHighlight=hideHighlight,exports.redrawHighlight=redrawHighlight,exports.init=init,exports.isActive=isActive,exports.setLivePreviewPinned=setLivePreviewPinned,exports.getServerBaseUrl=getServerBaseUrl,exports.getCurrentLiveDoc=getCurrentLiveDoc,exports.getCurrentProjectServerConfig=getCurrentProjectServerConfig,exports.getConnectionIds=getConnectionIds,exports.setTransport=setTransport});
//# sourceMappingURL=LiveDevMultiBrowser.js.map
