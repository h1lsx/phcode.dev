define(function(require,exports,module){const _=require("thirdparty/lodash"),Commands=require("command/Commands"),WorkspaceManager=require("view/WorkspaceManager"),CommandManager=require("command/CommandManager"),DocumentManager=require("document/DocumentManager"),EditorManager=require("editor/EditorManager"),Editor=require("editor/Editor").Editor,MainViewManager=require("view/MainViewManager"),LanguageManager=require("language/LanguageManager"),PreferencesManager=require("preferences/PreferencesManager"),PerfUtils=require("utils/PerfUtils"),Strings=require("strings"),StringUtils=require("utils/StringUtils"),AppInit=require("utils/AppInit"),StatusBar=require("widgets/StatusBar"),Async=require("utils/Async"),PanelTemplate=require("text!htmlContent/problems-panel.html"),ResultsTemplate=require("text!htmlContent/problems-panel-table.html"),Mustache=require("thirdparty/mustache/mustache"),CODE_INSPECTION_GUTTER_PRIORITY=500,CODE_INSPECTION_GUTTER="code-inspection-gutter",INDICATOR_ID="status-inspection",Type={ERROR:"error",WARNING:"warning",META:"meta"};function _getIconClassForType(type){switch(type){case Type.ERROR:return"line-icon-problem_type_error fa-solid fa-times-circle";case Type.WARNING:return"line-icon-problem_type_warning fa-solid fa-exclamation-triangle";case Type.META:default:return"line-icon-problem_type_info fa-solid fa-info-circle"}}const CODE_MARK_TYPE_INSPECTOR="codeInspector",PREF_ENABLED="enabled",PREF_COLLAPSED="collapsed",PREF_ASYNC_TIMEOUT="asyncTimeout",PREF_PREFER_PROVIDERS="prefer",PREF_PREFERRED_ONLY="usePreferredOnly",prefs=PreferencesManager.getExtensionPrefs("linting");var _enabled=!1,_collapsed=!1,$problemsPanel,problemsPanel,$problemsPanelTable,_gotoEnabled=!1,_providers={};let _registeredLanguageIDs=[];var _hasErrors,_currentPromise=null;function setGotoEnabled(gotoEnabled){CommandManager.get(Commands.NAVIGATE_GOTO_FIRST_PROBLEM).setEnabled(gotoEnabled),_gotoEnabled=gotoEnabled}function _unregisterAll(){_providers={}}function getProvidersForPath(filePath){var language=LanguageManager.getLanguageForPath(filePath).getId(),context=PreferencesManager._buildContext(filePath,language),installedProviders=getProvidersForLanguageId(language),preferredProviders,prefPreferredProviderNames=prefs.get(PREF_PREFER_PROVIDERS,context),prefPreferredOnly=prefs.get(PREF_PREFERRED_ONLY,context),providers;return prefPreferredProviderNames&&prefPreferredProviderNames.length?("string"==typeof prefPreferredProviderNames&&(prefPreferredProviderNames=[prefPreferredProviderNames]),preferredProviders=prefPreferredProviderNames.reduce(function(result,key){var provider=_.find(installedProviders,{name:key});return provider&&result.push(provider),result},[]),providers=prefPreferredOnly?preferredProviders:_.union(preferredProviders,installedProviders)):providers=installedProviders,providers}function getProviderIDsForLanguage(languageId){return _providers[languageId]?_providers[languageId].map(function(provider){return provider.name}):[]}function inspectFile(file,providerList){var response=new $.Deferred,results=[];return(providerList=providerList||getProvidersForPath(file.fullPath)).length?(DocumentManager.getDocumentText(file).done(function(fileText){var perfTimerInspector=PerfUtils.markStart("CodeInspection:\t"+file.fullPath),masterPromise;(masterPromise=Async.doInParallel(providerList,function(provider){var perfTimerProvider=PerfUtils.markStart("CodeInspection '"+provider.name+"':\t"+file.fullPath),runPromise=new $.Deferred;if(runPromise.done(function(scanResult){results.push({provider:provider,result:scanResult})}),provider.scanFileAsync)window.setTimeout(function(){var errTimeout={pos:{line:-1,col:0},message:StringUtils.format(Strings.LINTER_TIMED_OUT,provider.name,prefs.get(PREF_ASYNC_TIMEOUT)),type:Type.ERROR};runPromise.resolve({errors:[errTimeout]})},prefs.get(PREF_ASYNC_TIMEOUT)),jsPromise(provider.scanFileAsync(fileText,file.fullPath)).then(function(scanResult){PerfUtils.addMeasurement(perfTimerProvider),runPromise.resolve(scanResult)}).catch(function(err){PerfUtils.finalizeMeasurement(perfTimerProvider);var errError={pos:{line:-1,col:0},message:StringUtils.format(Strings.LINTER_FAILED,provider.name,err),type:Type.ERROR};console.error("[CodeInspection] Provider "+provider.name+" (async) failed: "+err.stack),runPromise.resolve({errors:[errError]})});else try{var scanResult=provider.scanFile(fileText,file.fullPath);PerfUtils.addMeasurement(perfTimerProvider),runPromise.resolve(scanResult)}catch(err){PerfUtils.finalizeMeasurement(perfTimerProvider);var errError={pos:{line:-1,col:0},message:StringUtils.format(Strings.LINTER_FAILED,provider.name,err),type:Type.ERROR};console.error("[CodeInspection] Provider "+provider.name+" (sync) threw an error: "+err.stack),runPromise.resolve({errors:[errError]})}return runPromise.promise()},!1)).then(function(){results.sort(function(a,b){return providerList.indexOf(a.provider)-providerList.indexOf(b.provider)}),PerfUtils.addMeasurement(perfTimerInspector),response.resolve(results)})}).fail(function(err){console.error("[CodeInspection] Could not read file for inspection: "+file.fullPath),response.reject(err)}),response.promise()):(response.resolve(null),response.promise())}function updatePanelTitleAndStatusBar(numProblems,providersReportingProblems,aborted){var message,tooltip;if(1===providersReportingProblems.length)$problemsPanelTable.find(".inspector-section").hide(),$problemsPanelTable.find("tr").removeClass("forced-hidden"),1!==numProblems||aborted?(aborted&&(numProblems+="+"),message=StringUtils.format(Strings.MULTIPLE_ERRORS,providersReportingProblems[0].name,numProblems)):message=StringUtils.format(Strings.SINGLE_ERROR,providersReportingProblems[0].name);else{if(!(providersReportingProblems.length>1))return;$problemsPanelTable.find(".inspector-section").show(),aborted&&(numProblems+="+"),message=StringUtils.format(Strings.ERRORS_PANEL_TITLE_MULTIPLE,numProblems)}$problemsPanel.find(".title").text(message),tooltip=StringUtils.format(Strings.STATUSBAR_CODE_INSPECTION_TOOLTIP,message),StatusBar.updateIndicator(INDICATOR_ID,!0,"inspection-errors",tooltip)}function _getMarkOptions(error){switch(error.type){case Type.ERROR:return Editor.MARK_OPTION_UNDERLINE_ERROR;case Type.WARNING:return Editor.MARK_OPTION_UNDERLINE_WARN;case Type.META:return Editor.MARK_OPTION_UNDERLINE_INFO}}function _getMarkTypePriority(type){switch(type){case Type.ERROR:return 3;case Type.WARNING:return 2;case Type.META:return 1}}function _shouldMarkTokenAtPosition(editor,error){if(isNaN(error.pos.line)||isNaN(error.pos.ch)||error.pos.line<0||error.pos.ch<0)return console.warn("CodeInspector: Invalid error position: ",error),!1;let markings=editor.findMarksAt(error.pos,CODE_MARK_TYPE_INSPECTOR),MarkToApplyPriority=_getMarkTypePriority(error.type),shouldMark=!0;for(let mark of markings){let markTypePriority;_getMarkTypePriority(mark.type)<=MarkToApplyPriority?mark.clear():shouldMark=!1}return shouldMark}function _createMarkerElement(editor,line,ch,type,message){let $marker=$("<div><span>").attr("title",message).addClass(CODE_INSPECTION_GUTTER);return $marker.click(function(){editor.setCursorPos(line,ch)}),$marker.find("span").addClass(_getIconClassForType(type)).addClass("brackets-inspection-gutter-marker").html("&nbsp;"),$marker[0]}function _addDummyGutterMarkerIfNotExist(editor,line){let marker;if(!editor.getGutterMarker(line,CODE_INSPECTION_GUTTER)){let $marker=$("<div>").addClass(CODE_INSPECTION_GUTTER);editor.setGutterMarker(line,CODE_INSPECTION_GUTTER,$marker[0])}}function _populateDummyGutterElements(editor,from,to){for(let line=from;line<=to;line++)_addDummyGutterMarkerIfNotExist(editor,line)}function _updateGutterMarks(editor,gutterErrorMessages){for(let lineno of Object.keys(gutterErrorMessages)){let highestPriorityMarkTypeSeen=Type.META,gutterMessage=gutterErrorMessages[lineno].reduce((prev,current)=>(_getMarkTypePriority(current.type)>_getMarkTypePriority(highestPriorityMarkTypeSeen)&&(highestPriorityMarkTypeSeen=current.type),{message:`${prev.message}\n${current.message} at column: ${current.ch+1}`}),{message:""}),line=gutterErrorMessages[lineno][0].line,ch=gutterErrorMessages[lineno][0].ch,message=gutterMessage.message,marker=_createMarkerElement(editor,line,ch,highestPriorityMarkTypeSeen,message);editor.setGutterMarker(line,CODE_INSPECTION_GUTTER,marker)}_populateDummyGutterElements(editor,0,editor.getLastVisibleLine())}function _editorVieportChangeHandler(_evt,editor,from,to){_populateDummyGutterElements(editor,from,to)}function _updateEditorMarks(resultProviderEntries){let editor=EditorManager.getCurrentFullEditor();editor&&resultProviderEntries&&resultProviderEntries.length&&editor.operation(function(){editor.clearAllMarks(CODE_MARK_TYPE_INSPECTOR),editor.clearGutter(CODE_INSPECTION_GUTTER),editor.off("viewportChange.codeInspection"),editor.on("viewportChange.codeInspection",_editorVieportChangeHandler);let gutterErrorMessages={};for(let resultProvider of resultProviderEntries){let errors=resultProvider.result&&resultProvider.result.errors||[];for(let error of errors){let line=error.pos.line||0,ch=error.pos.ch||0,gutterMessage=gutterErrorMessages[line]||[];if(gutterMessage.push({message:error.message,type:error.type,line:line,ch:ch}),gutterErrorMessages[line]=gutterMessage,_shouldMarkTokenAtPosition(editor,error)){let mark;editor.markToken(CODE_MARK_TYPE_INSPECTOR,error.pos,_getMarkOptions(error)).type=error.type}}}_updateGutterMarks(editor,gutterErrorMessages)})}function run(){if(!_enabled)return _hasErrors=!1,_currentPromise=null,problemsPanel.hide(),StatusBar.updateIndicator(INDICATOR_ID,!0,"inspection-disabled",Strings.LINT_DISABLED),void setGotoEnabled(!1);var currentDoc=DocumentManager.getCurrentDocument(),providerList=currentDoc&&getProvidersForPath(currentDoc.file.fullPath);if(providerList&&providerList.length){var numProblems=0,aborted=!1,allErrors=[],html,providersReportingProblems=[];$problemsPanelTable.empty(),(_currentPromise=inspectFile(currentDoc.file,providerList)).then(function(results){if(_updateEditorMarks(results),this===_currentPromise){var errors=results.reduce(function(a,item){return a+(item.result?item.result.errors.length:0)},0);if(_hasErrors=Boolean(errors),!errors){problemsPanel.hide();var message=Strings.NO_ERRORS_MULTIPLE_PROVIDER;return 1===providerList.length&&(message=StringUtils.format(Strings.NO_ERRORS,providerList[0].name)),StatusBar.updateIndicator(INDICATOR_ID,!0,"inspection-valid",message),void setGotoEnabled(!1)}var perfTimerDOM=PerfUtils.markStart("ProblemsPanel render:\t"+currentDoc.file.fullPath);results.forEach(function(inspectionResult){var provider=inspectionResult.provider,isExpanded=!1!==prefs.get(provider.name+".collapsed");inspectionResult.result&&(inspectionResult.result.errors.forEach(function(error){!isNaN(error.pos.line)&&error.pos.line+1>0&&void 0!==(error.codeSnippet=currentDoc.getLine(error.pos.line))&&(error.friendlyLine=error.pos.line+1,error.codeSnippet=error.codeSnippet.substr(0,175)),error.type!==Type.META&&numProblems++,error.iconClass=_getIconClassForType(error.type),error.display=isExpanded?"":"forced-hidden"}),inspectionResult.result.aborted&&(aborted=!0),inspectionResult.result.errors.length&&(allErrors.push({isExpanded:isExpanded,providerName:provider.name,results:inspectionResult.result.errors}),providersReportingProblems.push(provider)))}),html=Mustache.render(ResultsTemplate,{reportList:allErrors}),$problemsPanelTable.empty().append(html).scrollTop(0),_collapsed||problemsPanel.show(),updatePanelTitleAndStatusBar(numProblems,providersReportingProblems,aborted),setGotoEnabled(!0),PerfUtils.addMeasurement(perfTimerDOM)}})}else{_hasErrors=!1,_currentPromise=null,problemsPanel&&problemsPanel.hide();var language=currentDoc&&LanguageManager.getLanguageForPath(currentDoc.file.fullPath);language?StatusBar.updateIndicator(INDICATOR_ID,!0,"inspection-disabled",StringUtils.format(Strings.NO_LINT_AVAILABLE,language.getName())):StatusBar.updateIndicator(INDICATOR_ID,!0,"inspection-disabled",Strings.NOTHING_TO_LINT),setGotoEnabled(!1)}}function register(languageId,provider){if(_providers[languageId]){var indexOfProvider=_.findIndex(_providers[languageId],function(entry){return entry.name===provider.name});-1!==indexOfProvider&&_providers[languageId].splice(indexOfProvider,1)}else _providers[languageId]=[];_providers[languageId].push(provider),_registeredLanguageIDs.includes(languageId)||(_registeredLanguageIDs.push(languageId),Editor.unregisterGutter(CODE_INSPECTION_GUTTER),Editor.registerGutter(CODE_INSPECTION_GUTTER,CODE_INSPECTION_GUTTER_PRIORITY,_registeredLanguageIDs)),run()}function getProvidersForLanguageId(languageId){var result=[];return _providers[languageId]&&(result=result.concat(_providers[languageId])),_providers["*"]&&(result=result.concat(_providers["*"])),result}function updateListeners(){_enabled?(MainViewManager.on("currentFileChange.codeInspection",function(){run()}),DocumentManager.on("currentDocumentLanguageChanged.codeInspection",function(){run()}).on("documentSaved.codeInspection documentRefreshed.codeInspection",function(event,document){document===DocumentManager.getCurrentDocument()&&run()})):(DocumentManager.off(".codeInspection"),MainViewManager.off(".codeInspection"))}function toggleEnabled(enabled,doNotSave){void 0===enabled&&(enabled=!_enabled),enabled!==_enabled&&(_enabled=enabled,CommandManager.get(Commands.VIEW_TOGGLE_INSPECTION).setChecked(_enabled),updateListeners(),doNotSave||(prefs.set(PREF_ENABLED,_enabled),prefs.save()),run())}function toggleCollapsed(collapsed,doNotSave){void 0===collapsed&&(collapsed=!_collapsed),collapsed!==_collapsed&&(_collapsed=collapsed,doNotSave||(prefs.set(PREF_COLLAPSED,_collapsed),prefs.save()),_collapsed?problemsPanel.hide():_hasErrors&&problemsPanel.show())}function handleGotoFirstProblem(){run(),_gotoEnabled&&$problemsPanel.find("tr:not(.inspector-section)").first().trigger("click")}CommandManager.register(Strings.CMD_VIEW_TOGGLE_INSPECTION,Commands.VIEW_TOGGLE_INSPECTION,toggleEnabled),CommandManager.register(Strings.CMD_GOTO_FIRST_PROBLEM,Commands.NAVIGATE_GOTO_FIRST_PROBLEM,handleGotoFirstProblem),prefs.definePreference(PREF_ENABLED,"boolean",brackets.config["linting.enabled_by_default"],{description:Strings.DESCRIPTION_LINTING_ENABLED}).on("change",function(e,data){toggleEnabled(prefs.get(PREF_ENABLED),!0)}),prefs.definePreference(PREF_COLLAPSED,"boolean",!1,{description:Strings.DESCRIPTION_LINTING_COLLAPSED}).on("change",function(e,data){toggleCollapsed(prefs.get(PREF_COLLAPSED),!0)}),prefs.definePreference(PREF_ASYNC_TIMEOUT,"number",1e4,{description:Strings.DESCRIPTION_ASYNC_TIMEOUT}),prefs.definePreference(PREF_PREFER_PROVIDERS,"array",[],{description:Strings.DESCRIPTION_LINTING_PREFER,valueType:"string"}),prefs.definePreference(PREF_PREFERRED_ONLY,"boolean",!1,{description:Strings.DESCRIPTION_USE_PREFERED_ONLY}),AppInit.htmlReady(function(){Editor.registerGutter(CODE_INSPECTION_GUTTER,CODE_INSPECTION_GUTTER_PRIORITY);var panelHtml=Mustache.render(PanelTemplate,Strings),$selectedRow;problemsPanel=WorkspaceManager.createBottomPanel("errors",$(panelHtml),100),$problemsPanel=$("#problems-panel"),$problemsPanelTable=$problemsPanel.find(".table-container").on("click","tr",function(e){if($selectedRow&&$selectedRow.removeClass("selected"),($selectedRow=$(e.currentTarget)).addClass("selected"),$selectedRow.hasClass("inspector-section")){var $triangle=$(".disclosure-triangle",$selectedRow),isExpanded=$triangle.hasClass("expanded");isExpanded?$selectedRow.nextUntil(".inspector-section").addClass("forced-hidden"):$selectedRow.nextUntil(".inspector-section").removeClass("forced-hidden"),$triangle.toggleClass("expanded");var providerName=$selectedRow.find("input[type='hidden']").val();prefs.set(providerName+".collapsed",!isExpanded),prefs.save()}else{var lineTd=$selectedRow.find(".line-number"),line=parseInt(lineTd.text(),10)-1;if(!isNaN(line)){var character=lineTd.data("character"),editor;EditorManager.getCurrentFullEditor().setCursorPos(line,character,!0),MainViewManager.focusActivePane()}}}),$("#problems-panel .close").click(function(){toggleCollapsed(!0),MainViewManager.focusActivePane()});var statusIconHtml=Mustache.render('<div id="status-inspection">&nbsp;</div>',Strings);StatusBar.addIndicator(INDICATOR_ID,$(statusIconHtml),!0,"","","status-indent"),$("#status-inspection").click(function(){_hasErrors&&toggleCollapsed()}),toggleEnabled(prefs.get(PREF_ENABLED),!0),toggleCollapsed(prefs.get(PREF_COLLAPSED),!0)}),exports._unregisterAll=_unregisterAll,exports._PREF_ASYNC_TIMEOUT=PREF_ASYNC_TIMEOUT,exports._PREF_PREFER_PROVIDERS=PREF_PREFER_PROVIDERS,exports._PREF_PREFERRED_ONLY=PREF_PREFERRED_ONLY,exports.CODE_INSPECTION_GUTTER=CODE_INSPECTION_GUTTER,exports.register=register,exports.Type=Type,exports.toggleEnabled=toggleEnabled,exports.inspectFile=inspectFile,exports.requestRun=run,exports.getProvidersForPath=getProvidersForPath,exports.getProviderIDsForLanguage=getProviderIDsForLanguage});
//# sourceMappingURL=CodeInspection.js.map
