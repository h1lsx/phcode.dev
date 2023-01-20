define(function(require,exports,module){var Strings=require("strings"),EventDispatcher=require("utils/EventDispatcher"),StringUtils=require("utils/StringUtils"),ExtensionManager=require("extensibility/ExtensionManager"),registry_utils=require("extensibility/registry_utils"),Commands=require("command/Commands"),CommandManager=require("command/CommandManager"),ThemeManager=require("view/ThemeManager"),DefaultDialogs=require("widgets/DefaultDialogs"),Dialogs=require("widgets/Dialogs"),InstallExtensionDialog=require("extensibility/InstallExtensionDialog"),LocalizationUtils=require("utils/LocalizationUtils"),LanguageManager=require("language/LanguageManager"),Mustache=require("thirdparty/mustache/mustache"),PathUtils=require("thirdparty/path-utils/path-utils"),itemTemplate=require("text!htmlContent/extension-manager-view-item.html"),PreferencesManager=require("preferences/PreferencesManager"),Metrics=require("utils/Metrics"),_tmpLink=window.document.createElement("a");function ExtensionManagerView(){}EventDispatcher.makeEventDispatcher(ExtensionManagerView.prototype),ExtensionManagerView.prototype.initialize=function(model){var self=this,result=new $.Deferred;return this.model=model,this._itemTemplate=Mustache.compile(itemTemplate),this._itemViews={},this.$el=$("<div class='extension-list tab-pane' id='"+this.model.source+"'/>"),this._$emptyMessage=$("<div class='empty-message'/>").appendTo(this.$el),this._$infoMessage=$("<div class='info-message'/>").appendTo(this.$el).html(this.model.infoMessage),this._$table=$("<table class='table'/>").appendTo(this.$el),$(".sort-extensions").val(PreferencesManager.get("extensions.sort")),this.model.initialize().done(function(){self._setupEventHandlers()}).always(function(){self._render(),result.resolve()}),result.promise()},ExtensionManagerView.prototype.$el=null,ExtensionManagerView.prototype.model=null,ExtensionManagerView.prototype._$emptyMessage=null,ExtensionManagerView.prototype._$table=null,ExtensionManagerView.prototype._itemTemplate=null,ExtensionManagerView.prototype._itemViews=null,ExtensionManagerView.prototype._toggleDescription=function(id,$element,showFull){var description,linkTitle,info=this.model._getEntry(id);showFull?(description=info.metadata.description,linkTitle=Strings.VIEW_TRUNCATED_DESCRIPTION):(description=info.metadata.shortdescription,linkTitle=Strings.VIEW_COMPLETE_DESCRIPTION),$element.data("toggle-desc",showFull?"trunc-desc":"expand-desc").attr("title",linkTitle).prev(".ext-full-description").text(description)},ExtensionManagerView.prototype._setupEventHandlers=function(){var self=this;this.model.on("filter",function(){self._render()}).on("change",function(e,id){var extensions=self.model.extensions,$oldItem=self._itemViews[id];if(self._updateMessage(),-1===self.model.filterSet.indexOf(id))$oldItem&&($oldItem.remove(),delete self._itemViews[id]);else{var $newItem=self._renderItem(extensions[id],self.model._getEntry(id));$oldItem&&($oldItem.replaceWith($newItem),self._itemViews[id]=$newItem)}}),this.$el.on("click","a",function(e){var $target=$(e.target);$target.hasClass("undo-remove")?ExtensionManager.markForRemoval($target.attr("data-extension-id"),!1):$target.hasClass("remove")?ExtensionManager.markForRemoval($target.attr("data-extension-id"),!0):$target.hasClass("undo-update")?ExtensionManager.removeUpdate($target.attr("data-extension-id")):$target.hasClass("undo-disable")?ExtensionManager.markForDisabling($target.attr("data-extension-id"),!1):"expand-desc"===$target.data("toggle-desc")?this._toggleDescription($target.attr("data-extension-id"),$target,!0):"trunc-desc"===$target.data("toggle-desc")?this._toggleDescription($target.attr("data-extension-id"),$target,!1):$target.hasClass("theme_settings")&&CommandManager.execute(Commands.CMD_THEMES_OPEN_SETTINGS)}.bind(this)).on("click","button.install",function(e){Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"btnClick","install"),self._installUsingDialog($(e.target).attr("data-extension-id"))}).on("click","button.update",function(e){Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"btnClick","update"),self._installUsingDialog($(e.target).attr("data-extension-id"),!0)}).on("click","button.remove",function(e){Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"btnClick","remove"),ExtensionManager.markForRemoval($(e.target).attr("data-extension-id"),!0)}).on("click","button.disable",function(e){Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"btnClick","disable"),ExtensionManager.markForDisabling($(e.target).attr("data-extension-id"),!0)}).on("click","button.enable",function(e){Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"btnClick","enable"),ExtensionManager.enable($(e.target).attr("data-extension-id"))}).on("click","button.apply",function(e){Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"btnClick","apply");const themeID=$(e.target).attr("data-extension-id");let themeApplied;ThemeManager.setCurrentTheme(themeID)||Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.THEMES_ERROR,Strings.THEMES_ERROR_CANNOT_APPLY)})},ExtensionManagerView.prototype._renderItem=function(entry,info){var context=$.extend({},info);if(context.Strings=Strings,context.isInstalled=!!entry.installInfo,context.failedToStart=entry.installInfo&&entry.installInfo.status===ExtensionManager.START_FAILED,context.disabled=entry.installInfo&&entry.installInfo.status===ExtensionManager.DISABLED,context.hasVersionInfo=!!info.versions,entry.registryInfo){var latestVerCompatInfo=ExtensionManager.getCompatibilityInfo(entry.registryInfo,brackets.metadata.apiVersion);if(context.isCompatible=latestVerCompatInfo.isCompatible,context.requiresNewer=latestVerCompatInfo.requiresNewer,context.isCompatibleLatest=latestVerCompatInfo.isLatestVersion,!context.isCompatibleLatest){var installWarningBase=context.requiresNewer?Strings.EXTENSION_LATEST_INCOMPATIBLE_NEWER:Strings.EXTENSION_LATEST_INCOMPATIBLE_OLDER;context.installWarning=StringUtils.format(installWarningBase,entry.registryInfo.versions[entry.registryInfo.versions.length-1].version,latestVerCompatInfo.compatibleVersion)}context.downloadCount=entry.registryInfo.totalDownloads}else context.isCompatible=context.isCompatibleLatest=!0;var lang=brackets.getLocale(),shortLang=lang.split("-")[0];info.metadata["package-i18n"]&&[shortLang,lang].forEach(function(locale){info.metadata["package-i18n"].hasOwnProperty(locale)&&["title","description","homepage","keywords"].forEach(function(prop){info.metadata["package-i18n"][locale].hasOwnProperty(prop)&&(info.metadata[prop]=info.metadata["package-i18n"][locale][prop])})}),void 0!==info.metadata.description&&(info.metadata.shortdescription=StringUtils.truncate(info.metadata.description,200)),context.isMarkedForRemoval=ExtensionManager.isMarkedForRemoval(info.metadata.name),context.isMarkedForDisabling=ExtensionManager.isMarkedForDisabling(info.metadata.name),context.isMarkedForUpdate=ExtensionManager.isMarkedForUpdate(info.metadata.name);var hasPendingAction=context.isMarkedForDisabling||context.isMarkedForRemoval||context.isMarkedForUpdate;if(context.showInstallButton=(this.model.source===this.model.SOURCE_REGISTRY||this.model.source===this.model.SOURCE_THEMES)&&!context.updateAvailable,context.showUpdateButton=context.updateAvailable&&!context.isMarkedForUpdate&&!context.isMarkedForRemoval,context.showApplyButton=!!context.metadata.theme&&!context.disabled,context.allowInstall=context.isCompatible&&!context.isInstalled,Array.isArray(info.metadata.i18n)&&info.metadata.i18n.length>0){context.translated=!0,context.translatedLangs=info.metadata.i18n.map(function(value){return"root"===value&&(value="en"),{name:LocalizationUtils.getLocalizedLabel(value),locale:value}}).sort(function(lang1,lang2){var locales=[lang1.locale,lang2.locale],userLangIndex=locales.indexOf(lang);return userLangIndex>-1?userLangIndex:(userLangIndex=locales.indexOf(shortLang))>-1?userLangIndex:lang1.name.localeCompare(lang2.name)}).map(function(value){return value.name}).join(", "),context.translatedLangs=StringUtils.format(Strings.EXTENSION_TRANSLATED_LANGS,context.translatedLangs);var translatedIntoUserLang=brackets.isLocaleDefault()&&info.metadata.i18n.indexOf(shortLang)>-1||info.metadata.i18n.indexOf(lang)>-1;context.extensionTranslated=StringUtils.format(translatedIntoUserLang?Strings.EXTENSION_TRANSLATED_USER_LANG:Strings.EXTENSION_TRANSLATED_GENERAL,info.metadata.i18n.length)}var isInstalledInUserFolder=entry.installInfo&&entry.installInfo.locationType===ExtensionManager.LOCATION_USER;context.allowRemove=isInstalledInUserFolder,context.allowUpdate=context.showUpdateButton&&context.isCompatible&&context.updateCompatible&&isInstalledInUserFolder,context.allowUpdate||(context.updateNotAllowedReason=isInstalledInUserFolder?Strings.CANT_UPDATE:Strings.CANT_UPDATE_DEV),context.removalAllowed="installed"===this.model.source&&!context.failedToStart&&!hasPendingAction;var isDefaultOrInstalled="default"===this.model.source||"installed"===this.model.source,isDefaultAndTheme="default"===this.model.source&&context.metadata.theme;if(context.disablingAllowed=isDefaultOrInstalled&&!isDefaultAndTheme&&!context.disabled&&!hasPendingAction&&!context.metadata.theme,context.enablingAllowed=isDefaultOrInstalled&&!isDefaultAndTheme&&context.disabled&&!hasPendingAction&&!context.metadata.theme,["lastVersionDate","authorInfo"].forEach(function(helper){context[helper]=registry_utils[helper]}),context.metadata.homepage){var parsed=PathUtils.parseUrl(context.metadata.homepage);if(_tmpLink.href=context.metadata.homepage,"file:"===_tmpLink.protocol){var language=LanguageManager.getLanguageForExtension(parsed.filenameExtension.replace(/^\./,""));language&&language.isBinary()&&delete context.metadata.homepage}}return $(this._itemTemplate(context))},ExtensionManagerView.prototype._updateMessage=function(){return this.model.message?(this._$emptyMessage.css("display","block"),this._$emptyMessage.html(this.model.message),this._$infoMessage.css("display","none"),this._$table.css("display","none"),!0):(this._$emptyMessage.css("display","none"),this._$infoMessage.css("display",this.model.infoMessage?"block":"none"),this._$table.css("display",""),!1)},ExtensionManagerView.prototype._render=function(){var self=this;this._$table.empty(),this._updateMessage(),this.model.filterSet.forEach(function(id){var $item=self._itemViews[id];$item||($item=self._renderItem(self.model.extensions[id],self.model._getEntry(id)),self._itemViews[id]=$item),$item.appendTo(self._$table)}),this.trigger("render")},ExtensionManagerView.prototype._installUsingDialog=function(id,_isUpdate){var entry=this.model.extensions[id];if(entry&&entry.registryInfo){var compatInfo=ExtensionManager.getCompatibilityInfo(entry.registryInfo,brackets.metadata.apiVersion),url=ExtensionManager.getExtensionURL(id,compatInfo.compatibleVersion);_isUpdate?(Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"install",id),InstallExtensionDialog.updateUsingDialog(url).done(ExtensionManager.updateFromDownload)):(Metrics.countEvent(Metrics.EVENT_TYPE.EXTENSIONS,"update",id),InstallExtensionDialog.installUsingDialog(url))}},ExtensionManagerView.prototype.filter=function(query){this.model.filter(query)},exports.ExtensionManagerView=ExtensionManagerView});
//# sourceMappingURL=ExtensionManagerView.js.map
