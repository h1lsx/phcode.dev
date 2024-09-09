define(function(require,exports,module){var Menus=brackets.getModule("command/Menus"),CommandManager=brackets.getModule("command/CommandManager"),Commands=brackets.getModule("command/Commands"),MainViewManager=brackets.getModule("view/MainViewManager"),Strings=brackets.getModule("strings"),PreferencesManager=brackets.getModule("preferences/PreferencesManager"),workingSetListCmenu=Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_CONTEXT_MENU),closeOthers="file.close_others",closeAbove="file.close_above",closeBelow="file.close_below",prefs=PreferencesManager.getExtensionPrefs("closeOthers"),menuEntriesShown={};function handleClose(mode){var targetIndex=MainViewManager.findInWorkingSet(MainViewManager.ACTIVE_PANE,MainViewManager.getCurrentlyViewedPath(MainViewManager.ACTIVE_PANE)),workingSetList=MainViewManager.getWorkingSet(MainViewManager.ACTIVE_PANE),start=mode===closeBelow?targetIndex+1:0,end=mode===closeAbove?targetIndex:workingSetList.length,files=[],i;for(i=start;i<end;i++)(mode===closeOthers&&i!==targetIndex||mode!==closeOthers)&&files.push(workingSetList[i]);CommandManager.execute(Commands.FILE_CLOSE_LIST,{fileList:files})}function contextMenuOpenHandler(){var file=MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE);if(file){var targetIndex=MainViewManager.findInWorkingSet(MainViewManager.ACTIVE_PANE,file.fullPath),workingSetListSize=MainViewManager.getWorkingSetSize(MainViewManager.ACTIVE_PANE);targetIndex===workingSetListSize-1?CommandManager.get(closeBelow).setEnabled(!1):CommandManager.get(closeBelow).setEnabled(!0),1===workingSetListSize?CommandManager.get(closeOthers).setEnabled(!1):CommandManager.get(closeOthers).setEnabled(!0),0===targetIndex?CommandManager.get(closeAbove).setEnabled(!1):CommandManager.get(closeAbove).setEnabled(!0)}}function getPreferences(){return{closeBelow:prefs.get("below",PreferencesManager.CURRENT_PROJECT),closeOthers:prefs.get("others",PreferencesManager.CURRENT_PROJECT),closeAbove:prefs.get("above",PreferencesManager.CURRENT_PROJECT)}}function prefChangeHandler(){var prefs=getPreferences();prefs.closeBelow!==menuEntriesShown.closeBelow&&(prefs.closeBelow?workingSetListCmenu.addMenuItem(closeBelow,"",Menus.AFTER,Commands.FILE_CLOSE):workingSetListCmenu.removeMenuItem(closeBelow)),prefs.closeOthers!==menuEntriesShown.closeOthers&&(prefs.closeOthers?workingSetListCmenu.addMenuItem(closeOthers,"",Menus.AFTER,Commands.FILE_CLOSE):workingSetListCmenu.removeMenuItem(closeOthers)),prefs.closeAbove!==menuEntriesShown.closeAbove&&(prefs.closeAbove?workingSetListCmenu.addMenuItem(closeAbove,"",Menus.AFTER,Commands.FILE_CLOSE):workingSetListCmenu.removeMenuItem(closeAbove)),menuEntriesShown=prefs}function initializeCommands(){var prefs=getPreferences();CommandManager.register(Strings.CMD_FILE_CLOSE_BELOW,closeBelow,function(){handleClose(closeBelow)}),CommandManager.register(Strings.CMD_FILE_CLOSE_OTHERS,closeOthers,function(){handleClose(closeOthers)}),CommandManager.register(Strings.CMD_FILE_CLOSE_ABOVE,closeAbove,function(){handleClose(closeAbove)}),prefs.closeBelow&&workingSetListCmenu.addMenuItem(closeBelow,"",Menus.AFTER,Commands.FILE_CLOSE),prefs.closeOthers&&workingSetListCmenu.addMenuItem(closeOthers,"",Menus.AFTER,Commands.FILE_CLOSE),prefs.closeAbove&&workingSetListCmenu.addMenuItem(closeAbove,"",Menus.AFTER,Commands.FILE_CLOSE),menuEntriesShown=prefs}prefs.definePreference("below","boolean",!0,{description:Strings.DESCRIPTION_CLOSE_OTHERS_BELOW}),prefs.definePreference("others","boolean",!0,{description:Strings.DESCRIPTION_CLOSE_OTHERS}),prefs.definePreference("above","boolean",!0,{description:Strings.DESCRIPTION_CLOSE_OTHERS_ABOVE}),initializeCommands(),workingSetListCmenu.on("beforeContextMenuOpen",contextMenuOpenHandler),prefs.on("change",prefChangeHandler)});
//# sourceMappingURL=main.js.map