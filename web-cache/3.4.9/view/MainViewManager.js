define(function(require,exports,module){var _=require("thirdparty/lodash"),EventDispatcher=require("utils/EventDispatcher"),Strings=require("strings"),AppInit=require("utils/AppInit"),CommandManager=require("command/CommandManager"),MainViewFactory=require("view/MainViewFactory"),ViewStateManager=require("view/ViewStateManager"),Commands=require("command/Commands"),EditorManager=require("editor/EditorManager"),FileSystemError=require("filesystem/FileSystemError"),DocumentManager=require("document/DocumentManager"),PreferencesManager=require("preferences/PreferencesManager"),ProjectManager=require("project/ProjectManager"),WorkspaceManager=require("view/WorkspaceManager"),AsyncUtils=require("utils/Async"),ViewUtils=require("utils/ViewUtils"),Resizer=require("utils/Resizer"),Pane=require("view/Pane").Pane,KeyBindingManager=brackets.getModule("command/KeyBindingManager");const EVENT_CURRENT_FILE_CHANGE="currentFileChange";var PREFS_NAME="mainView.state",OLD_PREFS_NAME="project.files",ALL_PANES="ALL_PANES",ACTIVE_PANE="ACTIVE_PANE",FIRST_PANE="first-pane",SECOND_PANE="second-pane",VERTICAL="VERTICAL",HORIZONTAL="HORIZONTAL",MIN_PANE_SIZE=75,_orientation=null,_activePaneId=null,_$el,_panes={},_paneScrollStates={},_traversingFileList=!1,_mruList=[],_paneTitles={};function _makeMRUListEntry(file,paneId){return{file:file,paneId:paneId}}function _findFileInMRUList(paneId,file){return _.findIndex(_mruList,function(record){return record.file.fullPath===file.fullPath&&record.paneId===paneId})}function isExclusiveToPane(file,paneId){var index;return paneId=paneId===ACTIVE_PANE&&_activePaneId?_activePaneId:paneId,-1===_.findIndex(_mruList,function(record){return record.file.fullPath===file.fullPath&&record.paneId!==paneId})}function getActivePaneId(){return _activePaneId}function _resolvePaneId(paneId){return paneId&&paneId!==ACTIVE_PANE?paneId:getActivePaneId()}function _getPane(paneId){return paneId=_resolvePaneId(paneId),_panes[paneId]?_panes[paneId]:null}function focusActivePane(){const activePane=_getPane(ACTIVE_PANE);activePane&&activePane.focus()}function _isSpecialPaneId(paneId){return paneId===ACTIVE_PANE||paneId===ALL_PANES}function _makeFileMostRecent(paneId,file){var index,entry,pane=_getPane(paneId);_traversingFileList||(pane.makeViewMostRecent(file),index=_findFileInMRUList(pane.id,file),entry=_makeMRUListEntry(file,pane.id),-1!==index&&_mruList.splice(index,1),-1!==_findFileInMRUList(pane.id,file)&&console.log(file.fullPath+" duplicated in mru list"),_mruList.unshift(entry))}function _makePaneMostRecent(paneId){var pane=_getPane(paneId);pane.getCurrentlyViewedFile()&&_makeFileMostRecent(paneId,pane.getCurrentlyViewedFile())}function setActivePaneId(newPaneId){if(!_isSpecialPaneId(newPaneId)&&newPaneId!==_activePaneId){var oldPaneId=_activePaneId,oldPane=_getPane(ACTIVE_PANE),newPane;if(!_getPane(newPaneId))throw new Error("invalid pane id: "+newPaneId);_activePaneId=newPaneId,exports.trigger("activePaneChange",newPaneId,oldPaneId),exports.trigger(EVENT_CURRENT_FILE_CHANGE,_getPane(ACTIVE_PANE).getCurrentlyViewedFile(),newPaneId,oldPane.getCurrentlyViewedFile(),oldPaneId),_makePaneMostRecent(_activePaneId),focusActivePane()}}function _getPaneFromElement($el){return _.find(_panes,function(pane){if(pane.$el[0]===$el[0])return pane})}function getCurrentlyViewedFile(paneId){var pane=_getPane(paneId);return pane?pane.getCurrentlyViewedFile():null}function getCurrentlyViewedPath(paneId){var file=getCurrentlyViewedFile(paneId);return file?file.fullPath:null}function _activeEditorChange(e,current){if(current){var $container=current.$el.parent().parent(),pane=_getPaneFromElement($container);if(pane)pane.id!==_activePaneId&&setActivePaneId(pane.id);else{var parents=$container.parents(".view-pane");1===parents.length&&(pane=_getPaneFromElement($container=$(parents[0])))&&pane.id!==_activePaneId&&(setActivePaneId(pane.id),current.focus())}}}function _forEachPaneOrPanes(paneId,callback){paneId===ALL_PANES?_.forEach(_panes,callback):callback(_getPane(paneId))}function cacheScrollState(paneId){_forEachPaneOrPanes(paneId,function(pane){_paneScrollStates[pane.id]=pane.getScrollState()})}function restoreAdjustedScrollState(paneId,heightDelta){_forEachPaneOrPanes(paneId,function(pane){pane.restoreAndAdjustScrollState(_paneScrollStates[pane.id],heightDelta),delete _paneScrollStates[pane.id]})}function getWorkingSet(paneId){var result=[];return _forEachPaneOrPanes(paneId,function(pane){var viewList=pane.getViewList();result=_.union(result,viewList)}),result}function getAllOpenFiles(){var result=getWorkingSet(ALL_PANES);return _.forEach(_panes,function(pane){var file=pane.getCurrentlyViewedFile();file&&(result=_.union(result,[file]))}),result}function getPaneIdList(){return Object.keys(_panes)}function getWorkingSetSize(paneId){var result=0;return _forEachPaneOrPanes(paneId,function(pane){result+=pane.getViewListSize()}),result}function getPaneTitle(paneId){return _paneTitles[paneId][_orientation]}function getPaneCount(){return Object.keys(_panes).length}function _doFindInWorkingSet(paneId,fullPath,method){var result=-1;return _forEachPaneOrPanes(paneId,function(pane){var index=pane[method].call(pane,fullPath);if(index>=0)return result=index,!1}),result}function findInAllWorkingSets(fullPath){var index,result=[];return _.forEach(_panes,function(pane){(index=pane.findInViewList(fullPath))>=0&&result.push({paneId:pane.id,index:index})}),result}function findInWorkingSet(paneId,fullPath){return _doFindInWorkingSet(paneId,fullPath,"findInViewList")}function findInWorkingSetByAddedOrder(paneId,fullPath){return _doFindInWorkingSet(paneId,fullPath,"findInViewListAddedOrder")}function findInWorkingSetByMRUOrder(paneId,fullPath){return _doFindInWorkingSet(paneId,fullPath,"findInViewListMRUOrder")}function _getPaneIdForPath(fullPath){var info=findInAllWorkingSets(fullPath).shift();return info||_.forEach(_panes,function(pane){if(pane.getCurrentlyViewedPath()===fullPath)return info={paneId:pane.id},!1}),info?info.paneId:null}_paneTitles[FIRST_PANE]={},_paneTitles[SECOND_PANE]={},_paneTitles[FIRST_PANE][VERTICAL]=Strings.LEFT,_paneTitles[FIRST_PANE][HORIZONTAL]=Strings.TOP,_paneTitles[SECOND_PANE][VERTICAL]=Strings.RIGHT,_paneTitles[SECOND_PANE][HORIZONTAL]=Strings.BOTTOM;let _viewStateSaveScheduled=!1;function _scheduleViewStateSave(){function _saveViewStateAndResetScheduler(){_saveViewState(),_viewStateSaveScheduled=!1}_viewStateSaveScheduled||(_viewStateSaveScheduled=!0,window.setTimeout(_saveViewStateAndResetScheduler,1e3))}function addToWorkingSet(paneId,file,index,force){var pane=_getPane(paneId);if(!pane)throw new Error("invalid pane id: "+paneId);var result=pane.reorderItem(file,index,force),entry=_makeMRUListEntry(file,pane.id);result===pane.ITEM_FOUND_NEEDS_SORT?(console.warn("pane.reorderItem returned pane.ITEM_FOUND_NEEDS_SORT which shouldn't happen "+file),exports.trigger("workingSetSort",pane.id)):result===pane.ITEM_NOT_FOUND&&(index=pane.addToViewList(file,index),-1===_findFileInMRUList(pane.id,file)&&(pane.getCurrentlyViewedFile()===file?_mruList.unshift(entry):_mruList.push(entry)),exports.trigger("workingSetAdd",file,index,pane.id))}function addListToWorkingSet(paneId,fileList){var uniqueFileList,pane=_getPane(paneId);(uniqueFileList=pane.addListToViewList(fileList)).forEach(function(file){-1!==_findFileInMRUList(pane.id,file)&&console.log(file.fullPath+" duplicated in mru list"),_mruList.push(_makeMRUListEntry(file,pane.id))}),exports.trigger("workingSetAddList",uniqueFileList,pane.id);var unsolvedList=fileList.filter(function(item){return-1===pane.findInViewList(item.fullPath)&&_getPaneIdForPath(item.fullPath)});unsolvedList.length&&addListToWorkingSet(_getPaneIdForPath(unsolvedList[0].fullPath),unsolvedList)}function _removeFileFromMRU(paneId,file){var index,compare=function(record){return record.file===file&&record.paneId===paneId};do{-1!==(index=_.findIndex(_mruList,compare))&&_mruList.splice(index,1)}while(-1!==index)}function _removeView(paneId,file,suppressRedraw){var pane=_getPane(paneId);pane.removeView(file)&&(_removeFileFromMRU(pane.id,file),exports.trigger("workingSetRemove",file,suppressRedraw,pane.id))}function _moveView(sourcePaneId,destinationPaneId,file,destinationIndex){var result=new $.Deferred,sourcePane=_getPane(sourcePaneId),destinationPane=_getPane(destinationPaneId);return sourcePane.moveView(file,destinationPane,destinationIndex).done(function(){_removeFileFromMRU(destinationPane.id,file),_mruList.every(function(record){return record.file!==file||record.paneId!==sourcePane.id||(record.paneId=destinationPane.id,!1)}),exports.trigger("workingSetMove",file,sourcePane.id,destinationPane.id),result.resolve()}),result.promise()}function switchPaneFocus(){var $firstPane=$("#first-pane"),$secondPane=$("#second-pane");$firstPane.hasClass("active-pane")?$secondPane.click():$firstPane.click()}function _removeDeletedFileFromMRU(e,fullPath){var index,compare=function(record){return record.file.fullPath===fullPath};do{-1!==(index=_.findIndex(_mruList,compare))&&_mruList.splice(index,1)}while(-1!==index)}function _sortWorkingSet(paneId,compareFn){_forEachPaneOrPanes(paneId,function(pane){pane.sortViewList(compareFn),exports.trigger("workingSetSort",pane.id)})}function _moveWorkingSetItem(paneId,fromIndex,toIndex){var pane=_getPane(paneId);pane.moveWorkingSetItem(fromIndex,toIndex),exports.trigger("workingSetSort",pane.id),exports.trigger("_workingSetDisableAutoSort",pane.id)}function _swapWorkingSetListIndexes(paneId,index1,index2){var pane=_getPane(paneId);pane.swapViewListIndexes(index1,index2),exports.trigger("workingSetSort",pane.id),exports.trigger("_workingSetDisableAutoSort",pane.id)}function traverseToNextViewByMRU(direction){var file=getCurrentlyViewedFile(),paneId=getActivePaneId(),index=_.findIndex(_mruList,function(record){return record.file===file&&record.paneId===paneId});return ViewUtils.traverseViewArray(_mruList,index,direction)}function traverseToNextViewInListOrder(direction){var file=getCurrentlyViewedFile(),curPaneId=getActivePaneId(),allFiles=[],index;return getPaneIdList().forEach(function(paneId){var paneFiles=getWorkingSet(paneId).map(function(file){return{file:file,pane:paneId}});allFiles=allFiles.concat(paneFiles)}),index=_.findIndex(allFiles,function(record){return record.file===file&&record.pane===curPaneId}),ViewUtils.traverseViewArray(allFiles,index,direction)}function beginTraversal(){_traversingFileList=!0}function endTraversal(){var pane=_getPane(ACTIVE_PANE);_traversingFileList&&(_traversingFileList=!1,_makeFileMostRecent(pane.id,pane.getCurrentlyViewedFile()))}function _synchronizePaneSize(pane,forceRefresh){var available;available=_orientation===VERTICAL?_$el.innerWidth():_$el.innerHeight(),Resizer.resyncSizer(pane.$el),pane.$el.data("maxsize",available-MIN_PANE_SIZE),pane.updateLayout(forceRefresh)}function _updateLayout(event,viewAreaHeight,forceRefresh){var available;available=_orientation===VERTICAL?_$el.innerWidth():_$el.innerHeight(),_.forEach(_panes,function(pane){if(pane.id===SECOND_PANE&&_orientation===HORIZONTAL){var percentage=(_panes[FIRST_PANE].$el.height()+1)/available;pane.$el.css("height",100-100*percentage+"%")}_synchronizePaneSize(pane,forceRefresh)})}function _initialLayout(forceRefresh){var panes,size=100/Object.keys(_panes).length;_.forEach(_panes,function(pane){pane.id===FIRST_PANE?_orientation===VERTICAL?pane.$el.css({height:"100%",width:size+"%",float:"left"}):pane.$el.css({height:size+"%",width:"100%"}):_orientation===VERTICAL?pane.$el.css({height:"100%",width:"auto",float:"none"}):pane.$el.css({width:"100%",height:"50%"}),_synchronizePaneSize(pane,forceRefresh)})}function _updatePaneHeaders(){_forEachPaneOrPanes(ALL_PANES,function(pane){pane.updateHeaderText()})}function _createPaneIfNecessary(paneId){var newPane;return _panes.hasOwnProperty(paneId)||(newPane=new Pane(paneId,_$el),_panes[paneId]=newPane,exports.trigger("paneCreate",newPane.id),newPane.$el.on("click.mainview dragover.mainview",function(){setActivePaneId(newPane.id)}),newPane.on("viewListChange.mainview",function(){_updatePaneHeaders(),exports.trigger("workingSetUpdate",newPane.id)}),newPane.on("currentViewChange.mainview",function(e,newView,oldView){_updatePaneHeaders(),_activePaneId===newPane.id&&exports.trigger(EVENT_CURRENT_FILE_CHANGE,newView&&newView.getFile(),newPane.id,oldView&&oldView.getFile(),newPane.id)}),newPane.on("viewDestroy.mainView",function(e,view){_removeFileFromMRU(newPane.id,view.getFile())})),newPane}function _makeFirstPaneResizable(){var firstPane=_panes[FIRST_PANE];Resizer.makeResizable(firstPane.$el,_orientation===HORIZONTAL?Resizer.DIRECTION_VERTICAL:Resizer.DIRECTION_HORIZONTAL,_orientation===HORIZONTAL?Resizer.POSITION_BOTTOM:Resizer.POSITION_RIGHT,MIN_PANE_SIZE,!1,!1,!1,!0,void 0,!0),firstPane.$el.on("panelResizeUpdate",function(){_updateLayout()})}function _doSplit(orientation){var firstPane,newPane;orientation!==_orientation&&(firstPane=_panes[FIRST_PANE],Resizer.removeSizable(firstPane.$el),_orientation&&_$el.removeClass("split-"+_orientation.toLowerCase()),_$el.addClass("split-"+orientation.toLowerCase()),_orientation=orientation,newPane=_createPaneIfNecessary(SECOND_PANE),_makeFirstPaneResizable(),_initialLayout(),exports.trigger("paneLayoutChange",_orientation),newPane&&getCurrentlyViewedFile(firstPane.id)&&setActivePaneId(newPane.id))}function _edit(paneId,doc,optionsIn){var options=optionsIn||{},pane=_getPane(paneId);!doc.isUntitled()&&ProjectManager.isWithinProject(doc.file.fullPath)||addToWorkingSet(paneId,doc.file),EditorManager.openDocument(doc,pane,options),_makeFileMostRecent(paneId,doc.file),options.noPaneActivate||setActivePaneId(paneId)}function _open(paneId,file,optionsIn){var result=new $.Deferred,options=optionsIn||{};function doPostOpenActivation(){options.noPaneActivate||setActivePaneId(paneId)}if(!file||!_getPane(paneId))return result.reject("bad argument").promise();var pane=_getPane(paneId),factory=MainViewFactory.findSuitableFactoryForPath(file.fullPath);return factory?file.exists(function(fileError,fileExists){fileExists?factory.openFile(file,pane).done(function(){ProjectManager.isWithinProject(file.fullPath)||addToWorkingSet(paneId,file),doPostOpenActivation(),result.resolve(file)}).fail(function(fileError){result.reject(fileError)}):result.reject(fileError||FileSystemError.NOT_FOUND)}):DocumentManager.getDocumentForPath(file.fullPath,file).done(function(doc){doc?(_edit(paneId,doc,$.extend({},options,{noPaneActivate:!0})),doPostOpenActivation(),result.resolve(doc.file)):result.resolve(null)}).fail(function(fileError){result.reject(fileError)}),result.done(function(){_makeFileMostRecent(paneId,file)}),result}function _mergePanes(){if(_panes.hasOwnProperty(SECOND_PANE)){var firstPane=_panes[FIRST_PANE],secondPane=_panes[SECOND_PANE],fileList=secondPane.getViewList(),lastViewed=getCurrentlyViewedFile();Resizer.removeSizable(firstPane.$el),firstPane.mergeFrom(secondPane),exports.trigger("workingSetRemoveList",fileList,secondPane.id),setActivePaneId(firstPane.id),secondPane.$el.off(".mainview"),secondPane.off(".mainview"),secondPane.destroy(),delete _panes[SECOND_PANE],exports.trigger("paneDestroy",secondPane.id),exports.trigger("workingSetAddList",fileList,firstPane.id),_mruList.forEach(function(record){record.paneId===secondPane.id&&(record.paneId=firstPane.id)}),_$el.removeClass("split-"+_orientation.toLowerCase()),_orientation=null,_initialLayout(),exports.trigger("paneLayoutChange",_orientation),lastViewed&&getCurrentlyViewedFile()!==lastViewed&&exports._open(firstPane.id,lastViewed)}}function _close(paneId,file,optionsIn){var options=optionsIn||{};_forEachPaneOrPanes(paneId,function(pane){if(pane.removeView(file,options.noOpenNextFile)&&(paneId===ACTIVE_PANE||pane.id===paneId))return _removeFileFromMRU(pane.id,file),exports.trigger("workingSetRemove",file,!1,pane.id),!1})}function _closeList(paneId,fileList){_forEachPaneOrPanes(paneId,function(pane){var closedList=pane.removeViews(fileList);closedList.forEach(function(file){_removeFileFromMRU(pane.id,file)}),exports.trigger("workingSetRemoveList",closedList,pane.id)})}function _closeAll(paneId){_forEachPaneOrPanes(paneId,function(pane){var closedList=pane.getViewList();closedList.forEach(function(file){_removeFileFromMRU(pane.id,file)}),pane._reset(),exports.trigger("workingSetRemoveList",closedList,pane.id)})}function _findPaneForDocument(document){var pane=_getPaneFromElement($(document._masterEditor.$el.parent().parent()));if(!pane){var info=findInAllWorkingSets(document.file.fullPath).shift();info&&(pane=_panes[info.paneId])}return pane}function _destroyEditorIfNotNeeded(document){if(!(document instanceof DocumentManager.Document))throw new Error("_destroyEditorIfUnneeded() should be passed a Document");if(document._masterEditor){var pane=_findPaneForDocument(document);pane?pane.destroyViewIfNotNeeded(document._masterEditor):document._masterEditor.destroy()}}function _loadViewState(e){var panes,promises=[],state=PreferencesManager.getViewState(PREFS_NAME,PreferencesManager.STATE_PROJECT_CONTEXT);function convertViewState(){let files=PreferencesManager.getViewState(OLD_PREFS_NAME,PreferencesManager.STATE_PROJECT_CONTEXT);if(files){var result={orientation:null,activePaneId:FIRST_PANE,panes:{"first-pane":[]}};return files.forEach(function(value){result.panes[FIRST_PANE].push(value)}),result}}state||(state=convertViewState()),_mergePanes(),_mruList=[],ViewStateManager.reset(),state&&(panes=Object.keys(state.panes),_orientation=panes.length>1?state.orientation:null,_.forEach(state.panes,function(paneState,paneId){_createPaneIfNecessary(paneId),promises.push(_panes[paneId].loadState(paneState))}),AsyncUtils.waitForAll(promises).then(function(opensList){var prop;(_initialLayout(),panes.length>1)&&(_makeFirstPaneResizable(),$.isNumeric(state.splitPercentage)&&state.splitPercentage>0&&(prop=_orientation===VERTICAL?"width":"height",_panes[FIRST_PANE].$el.css(prop,100*state.splitPercentage+"%"),_updateLayout()));_orientation&&(_$el.addClass("split-"+_orientation.toLowerCase()),exports.trigger("paneLayoutChange",_orientation)),_.forEach(_panes,function(pane){var fileList=pane.getViewList();fileList.forEach(function(file){-1!==_findFileInMRUList(pane.id,file)&&console.log(file.fullPath+" duplicated in mru list"),_mruList.push(_makeMRUListEntry(file,pane.id))}),exports.trigger("workingSetAddList",fileList,pane.id)}),promises=[],opensList.forEach(function(openData){openData&&promises.push(CommandManager.execute(Commands.FILE_OPEN,openData))}),AsyncUtils.waitForAll(promises).then(function(){setActivePaneId(state.activePaneId)})}))}function _saveViewState(){function _computeSplitPercentage(){var available,used;return 1===getPaneCount()?1:(_orientation===VERTICAL?(available=_$el.innerWidth(),used=_panes[FIRST_PANE].$el.width()):(available=_$el.innerHeight(),used=_panes[FIRST_PANE].$el.height()),used/available)}let projectRoot;if(!ProjectManager.getProjectRoot())return;let state={orientation:_orientation,activePaneId:getActivePaneId(),splitPercentage:_computeSplitPercentage(),panes:{}};_.forEach(_panes,function(pane){state.panes[pane.id]=pane.saveState()}),PreferencesManager.setViewState(PREFS_NAME,state,PreferencesManager.STATE_PROJECT_CONTEXT)}function _initialize($container){if(_activePaneId)throw new Error("MainViewManager has already been initialized");_$el=$container,_createPaneIfNecessary(FIRST_PANE),_activePaneId=FIRST_PANE,_panes[FIRST_PANE]._handleActivePaneChange(void 0,_activePaneId),_initialLayout(),WorkspaceManager.on("workspaceUpdateLayout",_updateLayout),exports.on(EVENT_CURRENT_FILE_CHANGE,_scheduleViewStateSave),exports.on("paneLayoutChange",_scheduleViewStateSave),CommandManager.register(Strings.CMD_SWITCH_PANE_FOCUS,Commands.CMD_SWITCH_PANE_FOCUS,switchPaneFocus)}function setLayoutScheme(rows,columns){return rows<1||rows>2||columns<1||columns>2||2===columns&&2===rows?(console.error("setLayoutScheme unsupported layout "+rows+", "+columns),!1):(rows===columns?_mergePanes():_doSplit(rows>columns?HORIZONTAL:VERTICAL),!0)}function getLayoutScheme(){var result={rows:1,columns:1};return _orientation===HORIZONTAL?result.rows=2:_orientation===VERTICAL&&(result.columns=2),result}AppInit.htmlReady(function(){_initialize($("#editor-holder"))}),EventDispatcher.on_duringInit(ProjectManager,"projectOpen",_loadViewState),EventDispatcher.on_duringInit(ProjectManager,"beforeProjectClose beforeAppClose",_saveViewState),EventDispatcher.on_duringInit(EditorManager,"activeEditorChange",_activeEditorChange),EventDispatcher.on_duringInit(DocumentManager,"pathDeleted",_removeDeletedFileFromMRU),EventDispatcher.makeEventDispatcher(exports),EventDispatcher.setLeakThresholdForEvent(EVENT_CURRENT_FILE_CHANGE,25),exports._initialize=_initialize,exports._getPane=_getPane,exports._removeView=_removeView,exports._moveView=_moveView,exports._sortWorkingSet=_sortWorkingSet,exports._moveWorkingSetItem=_moveWorkingSetItem,exports._swapWorkingSetListIndexes=_swapWorkingSetListIndexes,exports._destroyEditorIfNotNeeded=_destroyEditorIfNotNeeded,exports._edit=_edit,exports._open=_open,exports._close=_close,exports._closeAll=_closeAll,exports._closeList=_closeList,exports._getPaneIdForPath=_getPaneIdForPath,exports.addToWorkingSet=addToWorkingSet,exports.addListToWorkingSet=addListToWorkingSet,exports.getWorkingSetSize=getWorkingSetSize,exports.getWorkingSet=getWorkingSet,exports.cacheScrollState=cacheScrollState,exports.restoreAdjustedScrollState=restoreAdjustedScrollState,exports.findInWorkingSet=findInWorkingSet,exports.findInWorkingSetByAddedOrder=findInWorkingSetByAddedOrder,exports.findInWorkingSetByMRUOrder=findInWorkingSetByMRUOrder,exports.findInAllWorkingSets=findInAllWorkingSets,exports.findInGlobalMRUList=_findFileInMRUList,exports.beginTraversal=beginTraversal,exports.endTraversal=endTraversal,exports.traverseToNextViewByMRU=traverseToNextViewByMRU,exports.traverseToNextViewInListOrder=traverseToNextViewInListOrder,exports.getActivePaneId=getActivePaneId,exports.setActivePaneId=setActivePaneId,exports.getPaneIdList=getPaneIdList,exports.getPaneTitle=getPaneTitle,exports.getPaneCount=getPaneCount,exports.isExclusiveToPane=isExclusiveToPane,exports.getAllOpenFiles=getAllOpenFiles,exports.focusActivePane=focusActivePane,exports.switchPaneFocus=switchPaneFocus,exports.setLayoutScheme=setLayoutScheme,exports.getLayoutScheme=getLayoutScheme,exports.getCurrentlyViewedFile=getCurrentlyViewedFile,exports.getCurrentlyViewedPath=getCurrentlyViewedPath,exports.ALL_PANES=ALL_PANES,exports.ACTIVE_PANE=ACTIVE_PANE,exports.FIRST_PANE=FIRST_PANE,exports.SECOND_PANE=SECOND_PANE,exports.EVENT_CURRENT_FILE_CHANGE=EVENT_CURRENT_FILE_CHANGE});
//# sourceMappingURL=MainViewManager.js.map