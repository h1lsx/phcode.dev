define(function(require,exports,module){const Dialogs=require("widgets/Dialogs"),Mustache=require("thirdparty/mustache/mustache"),newProjectTemplate=require("text!./html/new-project-template.html"),Strings=require("strings"),StringUtils=require("utils/StringUtils"),ExtensionInterface=require("utils/ExtensionInterface"),CommandManager=require("command/CommandManager"),Commands=require("command/Commands"),Menus=require("command/Menus"),Metrics=require("utils/Metrics"),DefaultDialogs=require("widgets/DefaultDialogs"),FileSystem=require("filesystem/FileSystem"),FileUtils=require("file/FileUtils"),ZipUtils=require("utils/ZipUtils"),ProjectManager=require("project/ProjectManager"),EventDispatcher=require("utils/EventDispatcher"),DocumentCommandHandlers=require("document/DocumentCommandHandlers"),createProjectDialogue=require("text!./html/create-project-dialogue.html"),replaceProjectDialogue=require("text!./html/replace-project-dialogue.html"),replaceKeepProjectDialogue=require("text!./html/replace-keep-project-dialogue.html"),defaultProjects=require("./default-projects"),guidedTour=require("./guided-tour");EventDispatcher.makeEventDispatcher(exports);const NEW_PROJECT_INTERFACE="Extn.Phoenix.newProject",MAX_DEDUPE_COUNT=1e4;ExtensionInterface.registerExtensionInterface(NEW_PROJECT_INTERFACE,exports);let newProjectDialogueObj,createProjectDialogueObj,downloadCancelled=!1;function _showNewProjectDialogue(){if(window.testEnvironment)return;if(newProjectDialogueObj&&newProjectDialogueObj.isVisible())return;let templateVars={Strings:Strings,newProjectURL:`${window.Phoenix.baseURL}assets/new-project/code-editor.html`},dialogueContents=Mustache.render(newProjectTemplate,templateVars);newProjectDialogueObj=Dialogs.showModalDialogUsingTemplate(dialogueContents,!0),setTimeout(()=>{document.getElementById("newProjectFrame").contentWindow.focus()},100),Metrics.countEvent(Metrics.EVENT_TYPE.NEW_PROJECT,"dialogue","open")}function _addMenuEntries(){CommandManager.register(Strings.CMD_PROJECT_NEW,Commands.FILE_NEW_PROJECT,_showNewProjectDialogue);const fileMenu=Menus.getMenu(Menus.AppMenuBar.FILE_MENU);fileMenu.addMenuItem(Commands.FILE_NEW_PROJECT,"",Menus.AFTER,Commands.FILE_NEW_FOLDER)}function closeDialogue(){Metrics.countEvent(Metrics.EVENT_TYPE.NEW_PROJECT,"dialogue","close"),newProjectDialogueObj.close(),exports.trigger(exports.EVENT_NEW_PROJECT_DIALOGUE_CLOSED),guidedTour.startTourIfNeeded()}function showErrorDialogue(title,message){Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,title,message)}function openFolder(){CommandManager.execute(Commands.FILE_OPEN_FOLDER).then(closeDialogue)}async function _shouldNotShowDialog(){if(!Phoenix.isNativeApp)return!1;if(ProjectManager.getProjectRoot().fullPath!==ProjectManager.getWelcomeProjectPath()||DocumentCommandHandlers._isOpenWithFileFromOS())return!0;const cliArgs=await Phoenix.app.getCommandLineArgs(),args=cliArgs&&cliArgs.args;return!(!args||args.length<=1)}function projectOpened(){ProjectManager.getProjectRoot().fullPath===ProjectManager.getPlaceholderProjectPath()&&_showNewProjectDialogue()}function init(){_addMenuEntries();const shouldShowWelcome=PhStore.getItem("new-project.showWelcomeScreen")||"Y";if("Y"!==shouldShowWelcome)return Metrics.countEvent(Metrics.EVENT_TYPE.NEW_PROJECT,"dialogue","disabled"),void guidedTour.startTourIfNeeded();_shouldNotShowDialog().then(notShow=>{notShow||(_showNewProjectDialogue(),DocumentCommandHandlers.on(DocumentCommandHandlers._EVENT_OPEN_WITH_FILE_FROM_OS,()=>{closeDialogue()}))})}function _showProjectErrorDialogue(desc,projectPath,err){let message=StringUtils.format(desc,projectPath,err);showErrorDialogue(Strings.ERROR_LOADING_PROJECT,message)}function _showReplaceProjectConfirmDialogue(projectPath){let message=StringUtils.format(Strings.DIRECTORY_REPLACE_MESSAGE,projectPath),templateVars={Strings:Strings,MESSAGE:message};return Dialogs.showModalDialogUsingTemplate(Mustache.render(replaceProjectDialogue,templateVars))}function _showReplaceKeepProjectConfirmDialogue(projectPath){let message=StringUtils.format(Strings.DIRECTORY_REPLACE_MESSAGE,projectPath),templateVars={Strings:Strings,MESSAGE:message};return Dialogs.showModalDialogUsingTemplate(Mustache.render(replaceKeepProjectDialogue,templateVars))}function _checkIfPathIsWritable(path){return new Promise((resolve,reject)=>{let file=FileSystem.getFileForPath(`${path}/.phcode.json`);FileUtils.writeText(file,"{}",!0).done(resolve).fail(reject)})}async function _validateProjectFolder(projectPath){return new Promise((resolve,reject)=>{let dir=FileSystem.getDirectoryForPath(projectPath),displayPath=Phoenix.app.getDisplayPath(projectPath);dir||(_showProjectErrorDialogue(Strings.REQUEST_NATIVE_FILE_SYSTEM_ERROR,displayPath,Strings.NOT_FOUND_ERR),reject()),dir.getContents(function(err,contents){if(err)return _showProjectErrorDialogue(Strings.READ_DIRECTORY_ENTRIES_ERROR,displayPath,Strings.NOT_FOUND_ERR),void reject();function _resolveIfWritable(){_checkIfPathIsWritable(projectPath).then(resolve).catch(reject)}contents.length>0?_showReplaceProjectConfirmDialogue(displayPath).done(function(id){id!==Dialogs.DIALOG_BTN_OK?reject():_resolveIfWritable()}):_resolveIfWritable()})})}async function _findFreeFolderName(basePath){return new Promise(async(resolve,reject)=>{try{for(let i=0;i<MAX_DEDUPE_COUNT;i++){let newPath=`${basePath}-${i}`,exists;if(!await window.Phoenix.VFS.existsAsync(newPath))return await window.Phoenix.VFS.ensureExistsDirAsync(newPath),void resolve(newPath)}reject()}catch(e){reject(e)}})}async function _getSuggestedProjectDir(suggestedProjectName){return new Promise(async(resolve,reject)=>{try{let projectPath=`${ProjectManager.getLocalProjectsPath()}${suggestedProjectName}`,exists;if(!await window.Phoenix.VFS.existsAsync(projectPath))return void resolve(projectPath);_showReplaceKeepProjectConfirmDialogue(suggestedProjectName).done(function(id){id!==Dialogs.DIALOG_BTN_OK?id!==Dialogs.DIALOG_BTN_CANCEL?_findFreeFolderName(projectPath).then(projectPath=>resolve(projectPath)).catch(reject):reject():resolve(projectPath)})}catch(e){reject(e)}})}function _showCreateProjectDialogue(title,message){let templateVars={Strings:Strings,TITLE:title,MESSAGE:message};return createProjectDialogueObj=Dialogs.showModalDialogUsingTemplate(Mustache.render(createProjectDialogue,templateVars))}function _closeCreateProjectDialogue(){createProjectDialogueObj.close()}function _updateCreateProjectDialogueMessage(message,title){let el=document.getElementById("new-prj-msg-dlg-message");el&&(el.textContent=message),(el=document.getElementById("new-prj-msg-dlg-title"))&&title&&(el.textContent=title)}function _unzipProject(data,projectPath,flattenFirstLevelInZip,progressCb){return new Promise((resolve,reject)=>{_updateCreateProjectDialogueMessage(Strings.UNZIP_IN_PROGRESS,Strings.DOWNLOAD_COMPLETE),ZipUtils.unzipBinDataToLocation(data,projectPath,flattenFirstLevelInZip,progressCb).then(resolve).catch(reject)})}async function downloadAndOpenProject(downloadURL,projectPath,suggestedProjectName,flattenFirstLevelInZip){return new Promise(async(resolve,reject)=>{try{projectPath?await _validateProjectFolder(projectPath):projectPath=await _getSuggestedProjectDir(suggestedProjectName),console.log(`downloadAndOpenProject ${suggestedProjectName} from URL: ${downloadURL} to: ${projectPath}`),downloadCancelled=!1,_showCreateProjectDialogue(Strings.SETTING_UP_PROJECT,Strings.DOWNLOADING).done(function(id){id===Dialogs.DIALOG_BTN_CANCEL&&(downloadCancelled=!0)}),window.JSZipUtils.getBinaryContent(downloadURL,{callback:async function(err,data){if(downloadCancelled)reject();else if(err)console.error("could not load phoenix default project from zip file!",err),_closeCreateProjectDialogue(),showErrorDialogue(Strings.DOWNLOAD_FAILED,Strings.DOWNLOAD_FAILED_MESSAGE),reject();else{function _progressCB(done,total){let message;return _updateCreateProjectDialogueMessage(StringUtils.format(Strings.EXTRACTING_FILES_PROGRESS,done,total)),!downloadCancelled}_unzipProject(data,projectPath,flattenFirstLevelInZip,_progressCB).then(()=>{_closeCreateProjectDialogue(),ProjectManager.openProject(projectPath).then(resolve).fail(reject),console.log("Project Setup complete: ",projectPath)}).catch(()=>{_closeCreateProjectDialogue(),showErrorDialogue(Strings.ERROR_LOADING_PROJECT,Strings.UNZIP_FAILED),reject()})}},progress:function(status){status.percent>0&&_updateCreateProjectDialogueMessage(`${Strings.DOWNLOADING} ${Math.round(status.percent)}%`)},abortCheck:function(){return downloadCancelled}})}catch(e){reject(e)}})}function showFolderSelect(){return new Promise((resolve,reject)=>{FileSystem.showOpenDialog(!1,!0,Strings.CHOOSE_FOLDER,"",null,function(err,files){err||1!==files.length?reject():resolve(files[0])})})}function showAboutBox(){CommandManager.execute(Commands.HELP_ABOUT)}ProjectManager.on(ProjectManager.EVENT_AFTER_PROJECT_OPEN,projectOpened),exports.init=init,exports.openFolder=openFolder,exports.closeDialogue=closeDialogue,exports.downloadAndOpenProject=downloadAndOpenProject,exports.showFolderSelect=showFolderSelect,exports.showErrorDialogue=showErrorDialogue,exports.setupExploreProject=defaultProjects.setupExploreProject,exports.setupStartupProject=defaultProjects.setupStartupProject,exports.alreadyExists=window.Phoenix.VFS.existsAsync,exports.Metrics=Metrics,exports.EVENT_NEW_PROJECT_DIALOGUE_CLOSED="newProjectDlgClosed",exports.getWelcomeProjectPath=ProjectManager.getWelcomeProjectPath,exports.getExploreProjectPath=ProjectManager.getExploreProjectPath,exports.getLocalProjectsPath=ProjectManager.getLocalProjectsPath,exports.getMountDir=Phoenix.VFS.getMountDir,exports.path=Phoenix.path,exports.getTauriDir=Phoenix.VFS.getTauriDir,exports.getTauriPlatformPath=Phoenix.fs.getTauriPlatformPath,exports.showAboutBox=showAboutBox});
//# sourceMappingURL=new-project.js.map