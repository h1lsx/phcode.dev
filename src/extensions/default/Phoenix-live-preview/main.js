define(function(require,exports,module){const ExtensionUtils=brackets.getModule("utils/ExtensionUtils"),EditorManager=brackets.getModule("editor/EditorManager"),CommandManager=brackets.getModule("command/CommandManager"),Commands=brackets.getModule("command/Commands"),Menus=brackets.getModule("command/Menus"),WorkspaceManager=brackets.getModule("view/WorkspaceManager"),AppInit=brackets.getModule("utils/AppInit"),ProjectManager=brackets.getModule("project/ProjectManager"),MainViewManager=brackets.getModule("view/MainViewManager"),DocumentManager=brackets.getModule("document/DocumentManager"),Strings=brackets.getModule("strings"),Mustache=brackets.getModule("thirdparty/mustache/mustache"),Metrics=brackets.getModule("utils/Metrics"),FileViewController=brackets.getModule("project/FileViewController"),NotificationUI=brackets.getModule("widgets/NotificationUI"),LiveDevelopment=brackets.getModule("LiveDevelopment/main"),marked=require("thirdparty/marked.min"),utils=require("utils"),LIVE_PREVIEW_PANEL_ID="live-preview-panel";marked.setOptions({renderer:new marked.Renderer,pedantic:!1,gfm:!0,breaks:!1,sanitize:!1,smartLists:!0,smartypants:!1,xhtml:!1});let panelHTML=require("text!panel.html"),markdownHTMLTemplate=require("text!markdown.html"),$icon,$iframe,$panel,$pinUrlBtn,$highlightBtn,$livePreviewPopBtn,$reloadBtn;ExtensionUtils.loadStyleSheet(module,"live-preview.css");let panel,urlPinned,tab=null;function _setPanelVisibility(isVisible){isVisible?($icon.toggleClass("active"),panel.show(),_loadPreview(!0)):($icon.toggleClass("active"),$iframe.attr("src","about:blank"),panel.hide())}function _startOrStopLivePreviewIfRequired(explicitClickOnLPIcon){let visible=panel.isVisible();visible&&LiveDevelopment.isInactive()?LiveDevelopment.openLivePreview():visible&&explicitClickOnLPIcon?(LiveDevelopment.closeLivePreview(),LiveDevelopment.openLivePreview()):visible||0!==LiveDevelopment.getConnectionIds().length||tab&&!tab.closed||LiveDevelopment.closeLivePreview()}function _toggleVisibilityOnClick(){let visible;_setPanelVisibility(!panel.isVisible()),_startOrStopLivePreviewIfRequired(!0)}function _togglePinUrl(){let pinStatus=$pinUrlBtn.hasClass("pin-icon");pinStatus?$pinUrlBtn.removeClass("pin-icon").addClass("unpin-icon"):$pinUrlBtn.removeClass("unpin-icon").addClass("pin-icon"),urlPinned=!pinStatus,LiveDevelopment.setLivePreviewPinned(urlPinned),_loadPreview(),Metrics.countEvent(Metrics.EVENT_TYPE.LIVE_PREVIEW,"pinURLBtn","click")}function _updateLiveHighlightToggleStatus(){let isHighlightEnabled;CommandManager.get(Commands.FILE_LIVE_HIGHLIGHT).getChecked()?$highlightBtn.removeClass("pointer-icon").addClass("pointer-fill-icon"):$highlightBtn.removeClass("pointer-fill-icon").addClass("pointer-icon")}function _toggleLiveHighlights(){CommandManager.execute(Commands.FILE_LIVE_HIGHLIGHT),Metrics.countEvent(Metrics.EVENT_TYPE.LIVE_PREVIEW,"HighlightBtn","click")}function _popoutLivePreview(){tab&&!tab.closed||(tab=open(),Metrics.countEvent(Metrics.EVENT_TYPE.LIVE_PREVIEW,"popoutBtn","click")),_loadPreview(!0)}function _setTitle(fileName){let message=Strings.LIVE_DEV_SELECT_FILE_TO_PREVIEW,tooltip=message;fileName&&(message=`${fileName} - ${Strings.LIVE_DEV_STATUS_TIP_OUT_OF_SYNC}`,tooltip=`${Strings.LIVE_DEV_STATUS_TIP_OUT_OF_SYNC} - ${fileName}`),document.getElementById("panel-live-preview-title").textContent=message,document.getElementById("live-preview-plugin-toolbar").title=tooltip}async function _createExtensionPanel(){let templateVars={Strings:Strings,livePreview:Strings.LIVE_DEV_STATUS_TIP_OUT_OF_SYNC,clickToReload:Strings.LIVE_DEV_CLICK_TO_RELOAD_PAGE,toggleLiveHighlight:Strings.LIVE_DEV_TOGGLE_LIVE_HIGHLIGHT,clickToPopout:Strings.LIVE_DEV_CLICK_POPOUT,clickToPinUnpin:Strings.LIVE_DEV_CLICK_TO_PIN_UNPIN};const PANEL_MIN_SIZE=50,INITIAL_PANEL_SIZE=document.body.clientWidth/2.5;($icon=$("#toolbar-go-live")).click(_toggleVisibilityOnClick),$panel=$(Mustache.render(panelHTML,templateVars)),$iframe=$panel.find("#panel-live-preview-frame"),$pinUrlBtn=$panel.find("#pinURLButton"),$highlightBtn=$panel.find("#highlightLPButton"),$reloadBtn=$panel.find("#reloadLivePreviewButton"),$livePreviewPopBtn=$panel.find("#livePreviewPopoutButton"),$iframe[0].onload=function(){$iframe.attr("srcdoc",null)},panel=WorkspaceManager.createPluginPanel(LIVE_PREVIEW_PANEL_ID,$panel,50,$icon,INITIAL_PANEL_SIZE),WorkspaceManager.recomputeLayout(!1),_updateLiveHighlightToggleStatus(),$pinUrlBtn.click(_togglePinUrl),$highlightBtn.click(_toggleLiveHighlights),$livePreviewPopBtn.click(_popoutLivePreview),$reloadBtn.click(()=>{LiveDevelopment.closeLivePreview(),LiveDevelopment.openLivePreview(),_loadPreview(!0),Metrics.countEvent(Metrics.EVENT_TYPE.LIVE_PREVIEW,"reloadBtn","click")})}function _renderMarkdown(fullPath){DocumentManager.getDocumentForPath(fullPath).done(function(doc){let text=doc.getText(),markdownHtml,templateVars={markdownContent:marked.parse(text),BOOTSTRAP_LIB_CSS:`${window.parent.Phoenix.baseURL}thirdparty/bootstrap/bootstrap.min.css`,HIGHLIGHT_JS_CSS:`${window.parent.Phoenix.baseURL}thirdparty/highlight.js/styles/github.min.css`,HIGHLIGHT_JS:`${window.parent.Phoenix.baseURL}thirdparty/highlight.js/highlight.min.js`,GFM_CSS:`${window.parent.Phoenix.baseURL}thirdparty/gfm.min.css`},html=Mustache.render(markdownHTMLTemplate,templateVars);$iframe.attr("srcdoc",html),tab&&!tab.closed&&(tab.location="about:blank",setTimeout(()=>{tab.window.document.write(html)},10))}).fail(function(err){console.error(`Markdown rendering failed for ${fullPath}: `,err)})}function _renderPreview(previewDetails,newSrc){let fullPath=previewDetails.fullPath;previewDetails.isMarkdownFile?($iframe.attr("src","about:blank"),_renderMarkdown(fullPath),Metrics.countEvent(Metrics.EVENT_TYPE.LIVE_PREVIEW,"render","markdown")):($iframe.attr("srcdoc",null),$iframe.attr("src",newSrc),tab&&!tab.closed&&(tab.location=newSrc),Metrics.countEvent(Metrics.EVENT_TYPE.LIVE_PREVIEW,"render",utils.getExtension(fullPath)))}let savedScrollPositions={};function _saveScrollPositionsIfPossible(){let currentSrc=$iframe.src||utils.getNoPreviewURL();try{let scrollX=$iframe[0].contentWindow.scrollX,scrollY=$iframe[0].contentWindow.scrollY;return savedScrollPositions[currentSrc]={scrollX:scrollX,scrollY:scrollY},{scrollX:scrollX,scrollY:scrollY,currentSrc:currentSrc}}catch(e){return{scrollX:0,scrollY:0,currentSrc:currentSrc}}}async function _loadPreview(force){if(panel.isVisible()||tab&&!tab.closed){let saved=_saveScrollPositionsIfPossible(),previewDetails=await utils.getPreviewDetails(),newSrc=saved.currentSrc;!urlPinned&&previewDetails.URL&&(newSrc=encodeURI(previewDetails.URL),_setTitle(previewDetails.filePath)),$iframe[0].onload=function(){if(saved.currentSrc===newSrc)$iframe[0].contentWindow.scrollTo(saved.scrollX,saved.scrollY);else{let savedPositions=savedScrollPositions[newSrc];savedPositions&&$iframe[0].contentWindow.scrollTo(savedPositions.scrollX,savedPositions.scrollY)}},saved.currentSrc===newSrc&&!0!==force||($iframe.src=newSrc,_renderPreview(previewDetails,newSrc))}}async function _projectFileChanges(evt,changedFile){if(changedFile&&changedFile.isFile&&changedFile.fullPath&&"/fs/app/state.json"!==changedFile.fullPath){const previewDetails=await utils.getPreviewDetails();LiveDevelopment.isActive()&&previewDetails.isHTMLFile||_loadPreview(!0),_showPopoutNotificationIfNeeded(changedFile.fullPath)}}let livePreviewEnabledOnProjectSwitch=!1;async function _projectOpened(){if(urlPinned&&_togglePinUrl(),$iframe[0].src=utils.getNoPreviewURL(),tab&&!tab.closed&&(tab.location=utils.getNoPreviewURL()),!panel.isVisible())return;let previewDetails=await utils.getPreviewDetails();previewDetails.fullPath&&FileViewController.openAndSelectDocument(previewDetails.fullPath,FileViewController.PROJECT_MANAGER).done(()=>{LiveDevelopment.closeLivePreview(),LiveDevelopment.openLivePreview(),_loadPreview(!0)}),_loadPreview(!0)}function _projectClosed(){LiveDevelopment.closeLivePreview(),livePreviewEnabledOnProjectSwitch=!1}function _activeDocChanged(){LiveDevelopment.isActive()||livePreviewEnabledOnProjectSwitch||!(panel.isVisible()||tab&&!tab.closed)||(LiveDevelopment.closeLivePreview(),LiveDevelopment.openLivePreview(),livePreviewEnabledOnProjectSwitch=!0)}function _showPopoutNotificationIfNeeded(path){let notificationKey="livePreviewPopoutShown",popoutMessageShown;!localStorage.getItem(notificationKey)&&WorkspaceManager.isPanelVisible(LIVE_PREVIEW_PANEL_ID)&&(path.endsWith(".html")||path.endsWith(".htm"))&&(NotificationUI.createFromTemplate(Strings.GUIDED_LIVE_PREVIEW_POPOUT,"livePreviewPopoutButton",{allowedPlacements:["bottom"],autoCloseTimeS:15,dismissOnClick:!0}),localStorage.setItem(notificationKey,"true"))}async function _openLivePreviewURL(_event,previewDetails){_loadPreview(!0);const currentPreviewDetails=await utils.getPreviewDetails();currentPreviewDetails.isMarkdownFile||currentPreviewDetails.fullPath===previewDetails.fullPath||console.error("Live preview URLs differ between phoenix live preview extension and core live preview",currentPreviewDetails,previewDetails)}AppInit.appReady(function(){let fileMenu;_createExtensionPanel(),ProjectManager.on(ProjectManager.EVENT_PROJECT_FILE_CHANGED,_projectFileChanges),MainViewManager.on("currentFileChange",_loadPreview),ProjectManager.on(ProjectManager.EVENT_PROJECT_OPEN,_projectOpened),ProjectManager.on(ProjectManager.EVENT_PROJECT_CLOSE,_projectClosed),EditorManager.on("activeEditorChange",_activeDocChanged),CommandManager.register(Strings.CMD_LIVE_FILE_PREVIEW,Commands.FILE_LIVE_FILE_PREVIEW,function(){_toggleVisibilityOnClick()}),Menus.getMenu(Menus.AppMenuBar.FILE_MENU).addMenuItem(Commands.FILE_LIVE_FILE_PREVIEW,""),setTimeout(async()=>{let previewDetails;LiveDevelopment.openLivePreview(),(await utils.getPreviewDetails()).filePath&&_setPanelVisibility(!0)},1e3),LiveDevelopment.on(LiveDevelopment.EVENT_OPEN_PREVIEW_URL,_openLivePreviewURL),LiveDevelopment.on(LiveDevelopment.EVENT_CONNECTION_CLOSE,function(){setTimeout(_startOrStopLivePreviewIfRequired,15e3)}),LiveDevelopment.on(LiveDevelopment.EVENT_LIVE_HIGHLIGHT_PREF_CHANGED,_updateLiveHighlightToggleStatus)})});
//# sourceMappingURL=main.js.map
