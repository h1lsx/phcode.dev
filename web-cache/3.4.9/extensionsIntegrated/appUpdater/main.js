define(function(require,exports,module){const AppInit=require("utils/AppInit"),Metrics=require("utils/Metrics"),Commands=require("command/Commands"),CommandManager=require("command/CommandManager"),Menus=require("command/Menus"),Dialogs=require("widgets/Dialogs"),NodeUtils=require("utils/NodeUtils"),DefaultDialogs=require("widgets/DefaultDialogs"),Strings=require("strings"),marked=require("thirdparty/marked.min"),semver=require("thirdparty/semver.browser"),TaskManager=require("features/TaskManager"),StringUtils=require("utils/StringUtils"),NativeApp=require("utils/NativeApp"),PreferencesManager=require("preferences/PreferencesManager");let updaterWindow,updateTask,updatePendingRestart,updateFailed;const TAURI_UPDATER_WINDOW_LABEL="updater",KEY_LAST_UPDATE_CHECK_TIME="PH_LAST_UPDATE_CHECK_TIME",KEY_UPDATE_AVAILABLE="PH_UPDATE_AVAILABLE";function showOrHideUpdateIcon(){let updateAvailable;updaterWindow||(updaterWindow=window.__TAURI__.window.WebviewWindow.getByLabel(TAURI_UPDATER_WINDOW_LABEL)),updaterWindow&&!updateTask&&(updateTask=TaskManager.addNewTask(Strings.UPDATING_APP,Strings.UPDATING_APP_MESSAGE,'<i class="fa-solid fa-cogs"></i>',{onSelect:function(){updatePendingRestart?Dialogs.showInfoDialog(Strings.UPDATE_READY_RESTART_TITLE,Strings.UPDATE_READY_RESTART_MESSAGE):updateFailed?Dialogs.showInfoDialog(Strings.UPDATE_FAILED_TITLE,Strings.UPDATE_FAILED_MESSAGE):Dialogs.showInfoDialog(Strings.UPDATING_APP,Strings.UPDATING_APP_DIALOG_MESSAGE)}})).show(),PreferencesManager.getViewState(KEY_UPDATE_AVAILABLE)?$("#update-notification").removeClass("forced-hidden"):$("#update-notification").addClass("forced-hidden")}function fetchJSON(url){return fetch(url).then(response=>response.ok?response.json():null)}function createTauriUpdateWindow(downloadURL){if(updaterWindow)return;Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"window","create"+Phoenix.platform);const url=downloadURL?`tauri-updater.html?stage=${Phoenix.config.environment}&downloadURL=${encodeURIComponent(downloadURL)}`:`tauri-updater.html?stage=${Phoenix.config.environment}`;updaterWindow=new window.__TAURI__.window.WebviewWindow(TAURI_UPDATER_WINDOW_LABEL,{url:url,title:"Desktop App Updater",fullscreen:!1,resizable:!1,height:320,minHeight:320,width:240,minWidth:240,acceptFirstMouse:!1,visible:!1}),window.__TAURI__.window.WebviewWindow.getByLabel(TAURI_UPDATER_WINDOW_LABEL)&&Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"window","okCreate"+Phoenix.platform)}async function doUpdate(downloadURL){createTauriUpdateWindow(downloadURL),showOrHideUpdateIcon()}async function getUpdatePlatformKey(){const platformArch=await Phoenix.app.getPlatformArch();let os="windows";return"mac"===brackets.platform?os="darwin":"linux"===brackets.platform&&(os="linux"),`${os}-${platformArch}`}async function getUpdateDetails(){const updatePlatformKey=await getUpdatePlatformKey(),updateDetails={shouldUpdate:!1,updatePendingRestart:!1,downloadURL:null,currentVersion:Phoenix.metadata.apiVersion,updateVersion:null,releaseNotesMarkdown:null,updatePlatform:updatePlatformKey};try{updaterWindow||(updaterWindow=window.__TAURI__.window.WebviewWindow.getByLabel(TAURI_UPDATER_WINDOW_LABEL));const updateMetadata=await fetchJSON(brackets.config.app_update_url),phoenixBinaryVersion=await NodeUtils.getPhoenixBinaryVersion(),phoenixLoadedAppVersion=Phoenix.metadata.apiVersion;semver.gt(updateMetadata.version,phoenixBinaryVersion)?(console.log("Update available: ",updateMetadata,"Detected platform: ",updatePlatformKey),PreferencesManager.setViewState(KEY_UPDATE_AVAILABLE,!0),updateDetails.shouldUpdate=!0,updateDetails.updateVersion=updateMetadata.version,updateDetails.releaseNotesMarkdown=updateMetadata.notes,updateMetadata.platforms&&updateMetadata.platforms[updatePlatformKey]&&(updateDetails.downloadURL=updateMetadata.platforms[updatePlatformKey].url)):semver.eq(updateMetadata.version,phoenixBinaryVersion)&&!semver.eq(phoenixLoadedAppVersion,phoenixBinaryVersion)&&updaterWindow?(console.log("Updates applied, waiting for app restart: ",phoenixBinaryVersion,phoenixLoadedAppVersion),updateDetails.updatePendingRestart=!0,PreferencesManager.setViewState(KEY_UPDATE_AVAILABLE,!0)):(console.log("no updates available for platform: ",updateDetails.updatePlatform),PreferencesManager.setViewState(KEY_UPDATE_AVAILABLE,!1)),showOrHideUpdateIcon()}catch(e){console.error("Error getting update metadata",e),updateFailed=!0,Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"fail","Unknown"+Phoenix.platform)}return updateDetails}async function isUpgradableLocation(){try{if("linux"===brackets.platform){let homeDir=await window.__TAURI__.path.homeDir();homeDir.endsWith("/")||(homeDir+="/");const phoenixInstallDir=`${homeDir}.phoenix-code/`,cliArgs=await window.__TAURI__.invoke("_get_commandline_args"),phoenixBinLoadedPath=cliArgs[0];return phoenixBinLoadedPath.startsWith(phoenixInstallDir)}}catch(e){return logger.reportError(e),console.error(e),!1}return!0}async function checkForUpdates(isAutoUpdate){if(showOrHideUpdateIcon(),updateTask)return void $("#status-tasks .btn-dropdown").click();const updateDetails=await getUpdateDetails();if(updateFailed)return void Dialogs.showInfoDialog(Strings.UPDATE_FAILED_TITLE,Strings.UPDATE_FAILED_MESSAGE);if(updatePendingRestart||updateDetails.updatePendingRestart)return void Dialogs.showInfoDialog(Strings.UPDATE_READY_RESTART_TITLE,Strings.UPDATE_READY_RESTART_MESSAGE);if(!updateDetails.shouldUpdate)return void(!isAutoUpdate&&Dialogs.showInfoDialog(Strings.UPDATE_NOT_AVAILABLE_TITLE,Strings.UPDATE_UP_TO_DATE));const buttons=[{className:Dialogs.DIALOG_BTN_CLASS_NORMAL,id:Dialogs.DIALOG_BTN_CANCEL,text:Strings.UPDATE_LATER},{className:Dialogs.DIALOG_BTN_CLASS_PRIMARY,id:Dialogs.DIALOG_BTN_OK,text:Strings.GET_IT_NOW}];let markdownHtml=marked.parse(updateDetails.releaseNotesMarkdown||"");Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"dialog","shown"+Phoenix.platform),Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO,Strings.UPDATE_AVAILABLE_TITLE,markdownHtml,buttons).done(option=>{isUpgradableLocation().then(isUpgradableLoc=>{if(isUpgradableLoc)option!==Dialogs.DIALOG_BTN_OK||updaterWindow?Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"dialog","cancel"+Phoenix.platform):doUpdate(updateDetails.downloadURL);else{const downloadPage=brackets.config.homepage_url||"https://phcode.io";NativeApp.openURLInDefaultBrowser(downloadPage)}})})}const UPDATE_COMMANDS={GET_STATUS:"GET_STATUS",GET_DOWNLOAD_PROGRESS:"GET_DOWNLOAD_PROGRESS",GET_INSTALLER_LOCATION:"GET_INSTALLER_LOCATION"},UPDATE_EVENT_STATUS="STATUS",UPDATE_EVENT_LOG_ERROR="LOG_ERROR",UPDATE_EVENT_DOWNLOAD_PROGRESS="DOWNLOAD_PROGRESS",UPDATE_EVENT_INSTALLER_LOCATION="INSTALLER_LOCATION",UPDATE_STATUS_STARTED="STARTED",UPDATE_STATUS_DOWNLOADING="DOWNLOADING",UPDATE_STATUS_INSTALLER_DOWNLOADED="INSTALLER_DOWNLOADED",UPDATE_STATUS_FAILED="FAILED",UPDATE_STATUS_FAILED_UNKNOWN_OS="FAILED_UNKNOWN_OS",UPDATE_STATUS_INSTALLED="INSTALLED";function _sendUpdateCommand(command,data){window.__TAURI__.event.emit("updateCommands",{command:command,data:data})}function _refreshUpdateStatus(){_sendUpdateCommand(UPDATE_COMMANDS.GET_STATUS)}async function launchWindowsInstaller(){return new Promise((resolve,reject)=>{const appdataDir=window._tauriBootVars.appLocalDir;window.__TAURI__.path.resolveResource("src-node/installer/launch-windows-installer.js").then(async nodeSrcPath=>{const argsArray=[nodeSrcPath,appdataDir],command=window.__TAURI__.shell.Command.sidecar("phnode",argsArray);command.on("close",data=>{if(console.log(`PhNode: command finished with code ${data.code} and signal ${data.signal}`),0!==data.code)return console.error("Install failed"),void reject();resolve()}),command.on("error",error=>{console.error(`PhNode: command error: "${error}"`),reject()}),command.stdout.on("data",line=>{console.log(`PhNode: ${line}`)}),command.stderr.on("data",line=>console.error(`PhNode: ${line}`)),command.spawn()})})}async function launchLinuxUpdater(){const stageValue=Phoenix.config.environment;console.log("Stage:",stageValue);let execCommand="wget -qO- https://updates.phcode.io/linux/installer.sh | bash -s -- --upgrade",runCommand="run-update-linux-command";"dev"!==stageValue&&"stage"!==stageValue||(runCommand="run-update-linux-command-dev",execCommand="wget -qO- https://updates.phcode.io/linux/installer-latest-experimental-build.sh | bash -s -- --upgrade");const command=new window.__TAURI__.shell.Command(runCommand,["-e",execCommand]),result=await command.execute();if(0!==result.code)throw new Error("Update script exit with non-0 exit code: "+result.code)}async function getCurrentMacAppPath(){const cliArgs=await window.__TAURI__.invoke("_get_commandline_args");let fullPath=cliArgs[0];const normalizedPath=path.normalize(fullPath),parts=normalizedPath.split(path.sep),appIndex=parts.findIndex(part=>part.endsWith(".app"));if(-1!==appIndex){const appPathParts=parts.slice(0,appIndex+1);return appPathParts.join(path.sep)}return null}async function doMacUpdate(){const currentAppPath=await getCurrentMacAppPath();if(!(currentAppPath&&installerLocation&&currentAppPath.endsWith(".app")&&installerLocation.endsWith(".app")))throw new Error("Cannot resolve .app location to copy.");const removeCommand=new window.__TAURI__.shell.Command("recursive-rm-unix",["-r",currentAppPath]);let result=await removeCommand.execute();if(0!==result.code)throw console.error("Could not remove old app: ",currentAppPath),new Error("Could not remove old app: "+currentAppPath);const copyCommand=new window.__TAURI__.shell.Command("recursive-copy-unix",["-r",installerLocation,currentAppPath]);if(0!==(result=await copyCommand.execute()).code)throw new Error("Update script exit with non-0 exit code: "+result.code)}let installerLocation;async function quitTimeAppUpdateHandler(){if(installerLocation)return console.log("Installing update from: ",installerLocation),new Promise(resolve=>{let dialog;function failUpdateDialogAndExit(err){console.error("error updating: ",err),dialog&&dialog.close(),Dialogs.showInfoDialog(Strings.UPDATE_FAILED_TITLE,Strings.UPDATE_FAILED_VISIT_SITE_MESSAGE).done(()=>{NativeApp.openURLInDefaultBrowser(Phoenix.config.update_download_page).catch(console.error).finally(resolve)})}"win"!==brackets.platform?(dialog=Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_INFO,Strings.UPDATE_INSTALLING,Strings.UPDATE_INSTALLING_MESSAGE,[{className:"forced-hidden",id:Dialogs.DIALOG_BTN_OK,text:Strings.OK}],!1),"linux"===brackets.platform?launchLinuxUpdater().then(resolve).catch(failUpdateDialogAndExit):"mac"===brackets.platform?doMacUpdate().then(resolve).catch(failUpdateDialogAndExit):resolve()):launchWindowsInstaller().then(resolve).catch(failUpdateDialogAndExit)})}let updateInstalledDialogShown=!1,updateFailedDialogShown=!1;AppInit.appReady(function(){if(!Phoenix.browser.isTauri||Phoenix.isTestWindow)return;updaterWindow=window.__TAURI__.window.WebviewWindow.getByLabel(TAURI_UPDATER_WINDOW_LABEL),window.__TAURI__.event.listen("updater-event",receivedEvent=>{console.log("received Event updater-event",receivedEvent);const{eventName:eventName,data:data}=receivedEvent.payload;if(eventName===UPDATE_EVENT_STATUS)data!==UPDATE_STATUS_FAILED_UNKNOWN_OS||updateFailedDialogShown?data!==UPDATE_STATUS_FAILED||updateFailedDialogShown?data!==UPDATE_STATUS_INSTALLED||updateInstalledDialogShown?data===UPDATE_STATUS_INSTALLER_DOWNLOADED?(Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"downloaded",Phoenix.platform),updatePendingRestart=!0,updateTask.setSucceded(),updateTask.setTitle(Strings.UPDATE_DONE),updateTask.setMessage(Strings.UPDATE_RESTART_INSTALL),updateInstalledDialogShown||(Dialogs.showInfoDialog(Strings.UPDATE_READY_RESTART_TITLE,Strings.UPDATE_READY_RESTART_INSTALL_MESSAGE),updateInstalledDialogShown=!0),_sendUpdateCommand(UPDATE_COMMANDS.GET_INSTALLER_LOCATION)):data===UPDATE_STATUS_DOWNLOADING&&(updateTask.setMessage(Strings.UPDATE_DOWNLOADING),_sendUpdateCommand(UPDATE_COMMANDS.GET_DOWNLOAD_PROGRESS)):(updateInstalledDialogShown=!0,Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"done",Phoenix.platform),updatePendingRestart=!0,updateTask.setSucceded(),updateTask.setTitle(Strings.UPDATE_DONE),updateTask.setMessage(Strings.UPDATE_RESTART),Dialogs.showInfoDialog(Strings.UPDATE_READY_RESTART_TITLE,Strings.UPDATE_READY_RESTART_MESSAGE)):(updateFailedDialogShown=!0,Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"fail",Phoenix.platform),updateFailed=!0,updateTask.setFailed(),updateTask.setMessage(Strings.UPDATE_FAILED_TITLE),Dialogs.showInfoDialog(Strings.UPDATE_FAILED_TITLE,Strings.UPDATE_FAILED_MESSAGE)):(updateFailedDialogShown=!0,Metrics.countEvent(Metrics.EVENT_TYPE.UPDATES,"fail","Unknown"+Phoenix.platform),updateFailed=!0,updateTask.setFailed(),updateTask.setMessage(Strings.UPDATE_FAILED_TITLE)),showOrHideUpdateIcon();else if(eventName===UPDATE_EVENT_DOWNLOAD_PROGRESS){const{progressPercent:progressPercent,fileSize:fileSize}=data;updateTask.setProgressPercent(progressPercent),updateTask.setMessage(StringUtils.format(Strings.UPDATE_DOWNLOAD_PROGRESS,Math.floor(fileSize*progressPercent/100),fileSize))}else eventName===UPDATE_EVENT_INSTALLER_LOCATION?(installerLocation=data,Phoenix.app.registerQuitTimeAppUpdateHandler(quitTimeAppUpdateHandler)):eventName===UPDATE_EVENT_LOG_ERROR&&logger.reportErrorMessage(data)}),$("#update-notification").click(()=>{checkForUpdates()});const commandID=Commands.HELP_CHECK_UPDATES;CommandManager.register(Strings.CMD_CHECK_FOR_UPDATE,commandID,()=>{checkForUpdates()});const helpMenu=Menus.getMenu(Menus.AppMenuBar.HELP_MENU);helpMenu.addMenuItem(commandID,"",Menus.AFTER,Commands.HELP_GET_INVOLVED),showOrHideUpdateIcon(),_refreshUpdateStatus();let lastUpdateCheckTime=PreferencesManager.getViewState(KEY_LAST_UPDATE_CHECK_TIME);const currentTime=Date.now(),oneDayInMilliseconds=864e5;lastUpdateCheckTime&&currentTime-lastUpdateCheckTime<864e5?console.log("Skipping update check: last update check was within one day"):(PreferencesManager.setViewState(KEY_LAST_UPDATE_CHECK_TIME,currentTime),checkForUpdates(!0))})});
//# sourceMappingURL=main.js.map