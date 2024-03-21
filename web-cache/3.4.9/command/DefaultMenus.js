define(function(require,exports,module){var AppInit=require("utils/AppInit"),Commands=require("command/Commands"),Menus=require("command/Menus"),Strings=require("strings"),MainViewManager=require("view/MainViewManager"),CommandManager=require("command/CommandManager");function _setContextMenuItemsVisible(enabled,items){items.forEach(function(item){CommandManager.get(item).setEnabled(enabled)})}function _setMenuItemsVisible(){var file=MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE);file&&file.exists(function(err,isPresent){if(err)return err;_setContextMenuItemsVisible(isPresent,[Commands.FILE_RENAME,Commands.NAVIGATE_SHOW_IN_FILE_TREE,Commands.NAVIGATE_SHOW_IN_OS])})}const isBrowser=!Phoenix.browser.isTauri,isDesktop=Phoenix.browser.isTauri,fileNewShortcut=isDesktop?"Ctrl-N":"",fileNewWindowShortcut=isDesktop?"Ctrl-Shift-N":"",fileCloseShortcut=isDesktop?"Ctrl-W":"",fileCloseAllShortcut=isDesktop?"Ctrl-Shift-W":"",openFileShortcut=isDesktop?"Ctrl-O":"",openFolderShortcut=isBrowser?"Ctrl-O":"";AppInit.htmlReady(function(){var menu;(menu=Menus.addMenu(Strings.FILE_MENU,Menus.AppMenuBar.FILE_MENU)).addMenuItem(Commands.FILE_NEW,fileNewShortcut),menu.addMenuItem(Commands.FILE_NEW_FOLDER),menu.addMenuItem(Commands.FILE_NEW_WINDOW,fileNewWindowShortcut),menu.addMenuDivider(),Phoenix.browser.isTauri&&menu.addMenuItem(Commands.FILE_OPEN,openFileShortcut),menu.addMenuItem(Commands.FILE_OPEN_FOLDER,openFolderShortcut),menu.addMenuItem(Commands.FILE_CLOSE,fileCloseShortcut),menu.addMenuItem(Commands.FILE_CLOSE_ALL,fileCloseAllShortcut),menu.addMenuDivider(),menu.addMenuItem(Commands.FILE_SAVE),menu.addMenuItem(Commands.FILE_SAVE_ALL),menu.addMenuItem(Commands.FILE_DUPLICATE_FILE),menu.addMenuItem(Commands.FILE_DOWNLOAD_PROJECT,void 0,void 0,void 0,{hideWhenCommandDisabled:!0}),menu.addMenuDivider(),menu.addMenuItem(Commands.FILE_EXTENSION_MANAGER),Phoenix.browser.isTauri&&(menu.addMenuDivider(),menu.addMenuItem(Commands.FILE_QUIT)),(menu=Menus.addMenu(Strings.EDIT_MENU,Menus.AppMenuBar.EDIT_MENU)).addMenuItem(Commands.EDIT_UNDO),menu.addMenuItem(Commands.EDIT_REDO),menu.addMenuDivider(),menu.addMenuItem(Commands.EDIT_CUT),menu.addMenuItem(Commands.EDIT_COPY),!window.Phoenix.browser.isTauri&&window.Phoenix.browser.desktop.isFirefox||menu.addMenuItem(Commands.EDIT_PASTE),menu.addMenuDivider(),menu.addMenuItem(Commands.EDIT_SELECT_ALL),menu.addMenuItem(Commands.EDIT_SELECT_LINE),menu.addMenuItem(Commands.EDIT_SPLIT_SEL_INTO_LINES),menu.addMenuItem(Commands.EDIT_ADD_CUR_TO_PREV_LINE),menu.addMenuItem(Commands.EDIT_ADD_CUR_TO_NEXT_LINE),menu.addMenuDivider(),menu.addMenuItem(Commands.EDIT_INDENT),menu.addMenuItem(Commands.EDIT_UNINDENT),menu.addMenuItem(Commands.EDIT_DUPLICATE),menu.addMenuItem(Commands.EDIT_DELETE_LINES),menu.addMenuItem(Commands.EDIT_LINE_UP),menu.addMenuItem(Commands.EDIT_LINE_DOWN),menu.addMenuDivider(),menu.addMenuItem(Commands.EDIT_LINE_COMMENT),menu.addMenuItem(Commands.EDIT_BLOCK_COMMENT),menu.addMenuDivider(),menu.addMenuItem(Commands.SHOW_CODE_HINTS),menu.addMenuDivider(),menu.addMenuItem(Commands.TOGGLE_CLOSE_BRACKETS),(menu=Menus.addMenu(Strings.FIND_MENU,Menus.AppMenuBar.FIND_MENU)).addMenuItem(Commands.CMD_FIND),menu.addMenuItem(Commands.CMD_FIND_NEXT),menu.addMenuItem(Commands.CMD_FIND_PREVIOUS),menu.addMenuItem(Commands.CMD_ADD_NEXT_MATCH),menu.addMenuItem(Commands.CMD_FIND_ALL_AND_SELECT),menu.addMenuItem(Commands.CMD_SKIP_CURRENT_MATCH),menu.addMenuDivider(),menu.addMenuItem(Commands.CMD_FIND_IN_FILES),menu.addMenuItem(Commands.CMD_FIND_ALL_REFERENCES),menu.addMenuDivider(),menu.addMenuItem(Commands.CMD_REPLACE),menu.addMenuItem(Commands.CMD_REPLACE_IN_FILES),(menu=Menus.addMenu(Strings.VIEW_MENU,Menus.AppMenuBar.VIEW_MENU)).addMenuItem(Commands.CMD_THEMES_OPEN_SETTINGS),menu.addMenuDivider(),menu.addMenuItem(Commands.CMD_SPLITVIEW_NONE),menu.addMenuItem(Commands.CMD_SPLITVIEW_VERTICAL),menu.addMenuItem(Commands.CMD_SPLITVIEW_HORIZONTAL),menu.addMenuDivider(),menu.addMenuItem(Commands.VIEW_HIDE_SIDEBAR),menu.addMenuItem(Commands.TOGGLE_SEARCH_AUTOHIDE),menu.addMenuDivider();let subMenu=menu.addSubMenu(Strings.CMD_ZOOM_UI,Commands.VIEW_ZOOM_SUBMENU);subMenu.addMenuItem(Commands.VIEW_ZOOM_IN),subMenu.addMenuItem(Commands.VIEW_ZOOM_OUT),subMenu.addMenuItem(Commands.VIEW_INCREASE_FONT_SIZE),subMenu.addMenuItem(Commands.VIEW_DECREASE_FONT_SIZE),subMenu.addMenuItem(Commands.VIEW_RESTORE_FONT_SIZE),menu.addMenuDivider(),menu.addMenuItem(Commands.TOGGLE_ACTIVE_LINE),menu.addMenuItem(Commands.TOGGLE_LINE_NUMBERS),menu.addMenuItem(Commands.TOGGLE_WORD_WRAP),menu.addMenuDivider(),menu.addMenuItem(Commands.FILE_LIVE_HIGHLIGHT),menu.addMenuDivider(),menu.addMenuItem(Commands.VIEW_TOGGLE_INSPECTION),(menu=Menus.addMenu(Strings.NAVIGATE_MENU,Menus.AppMenuBar.NAVIGATE_MENU)).addMenuItem(Commands.NAVIGATE_QUICK_OPEN),menu.addMenuItem(Commands.NAVIGATE_GOTO_LINE),menu.addMenuItem(Commands.NAVIGATE_GOTO_DEFINITION),menu.addMenuItem(Commands.NAVIGATE_GOTO_DEFINITION_PROJECT),menu.addMenuItem(Commands.NAVIGATE_JUMPTO_DEFINITION),menu.addMenuItem(Commands.NAVIGATE_GOTO_FIRST_PROBLEM),menu.addMenuDivider(),menu.addMenuItem(Commands.NAVIGATE_NEXT_DOC),menu.addMenuItem(Commands.NAVIGATE_PREV_DOC),menu.addMenuItem(Commands.NAVIGATE_NEXT_DOC_LIST_ORDER),menu.addMenuItem(Commands.NAVIGATE_PREV_DOC_LIST_ORDER),menu.addMenuDivider(),menu.addMenuItem(Commands.NAVIGATE_SHOW_IN_FILE_TREE),menu.addMenuDivider(),menu.addMenuItem(Commands.TOGGLE_QUICK_EDIT),menu.addMenuItem(Commands.QUICK_EDIT_PREV_MATCH),menu.addMenuItem(Commands.QUICK_EDIT_NEXT_MATCH),menu.addMenuItem(Commands.CSS_QUICK_EDIT_NEW_RULE),menu.addMenuDivider(),menu.addMenuItem(Commands.TOGGLE_QUICK_DOCS),menu=Menus.addMenu(Strings.HELP_MENU,Menus.AppMenuBar.HELP_MENU),brackets.config.support_url&&menu.addMenuItem(Commands.HELP_SUPPORT),brackets.config.suggest_feature_url&&menu.addMenuItem(Commands.HELP_SUGGEST),brackets.config.get_involved_url&&menu.addMenuItem(Commands.HELP_GET_INVOLVED);var hasAboutItem=!0;menu.addMenuDivider(),brackets.config.twitter_url&&menu.addMenuItem(Commands.HELP_TWITTER),brackets.config.homepage_url&&menu.addMenuItem(Commands.HELP_HOMEPAGE),menu.addMenuItem(Commands.HELP_ABOUT),Menus.addMenu(Strings.DEBUG_MENU,Menus.AppMenuBar.DEBUG_MENU,Menus.BEFORE,Menus.AppMenuBar.HELP_MENU);var workingset_cmenu=Menus.registerContextMenu(Menus.ContextMenuIds.WORKING_SET_CONTEXT_MENU);workingset_cmenu.addMenuItem(Commands.FILE_SAVE),workingset_cmenu.addMenuItem(Commands.NAVIGATE_SHOW_IN_FILE_TREE),Phoenix.browser.isTauri&&workingset_cmenu.addMenuItem(Commands.NAVIGATE_SHOW_IN_OS),workingset_cmenu.addMenuDivider(),workingset_cmenu.addMenuItem(Commands.FILE_COPY),workingset_cmenu.addMenuItem(Commands.FILE_COPY_PATH),workingset_cmenu.addMenuItem(Commands.FILE_DUPLICATE),workingset_cmenu.addMenuItem(Commands.FILE_DOWNLOAD,void 0,void 0,void 0,{hideWhenCommandDisabled:!0}),workingset_cmenu.addMenuDivider(),workingset_cmenu.addMenuItem(Commands.FILE_RENAME),workingset_cmenu.addMenuItem(Commands.FILE_DELETE),workingset_cmenu.addMenuDivider(),workingset_cmenu.addMenuItem(Commands.CMD_FIND_IN_SUBTREE),workingset_cmenu.addMenuItem(Commands.CMD_REPLACE_IN_SUBTREE),workingset_cmenu.addMenuDivider(),workingset_cmenu.addMenuItem(Commands.FILE_CLOSE);var splitview_menu=Menus.registerContextMenu(Menus.ContextMenuIds.SPLITVIEW_MENU);splitview_menu.addMenuItem(Commands.CMD_SPLITVIEW_NONE),splitview_menu.addMenuItem(Commands.CMD_SPLITVIEW_VERTICAL),splitview_menu.addMenuItem(Commands.CMD_SPLITVIEW_HORIZONTAL),splitview_menu.addMenuDivider(),splitview_menu.addMenuItem(Commands.CMD_WORKINGSET_SORT_BY_ADDED),splitview_menu.addMenuItem(Commands.CMD_WORKINGSET_SORT_BY_NAME),splitview_menu.addMenuItem(Commands.CMD_WORKINGSET_SORT_BY_TYPE),splitview_menu.addMenuDivider(),splitview_menu.addMenuItem(Commands.CMD_WORKING_SORT_TOGGLE_AUTO),splitview_menu.addMenuItem(Commands.FILE_SHOW_FOLDERS_FIRST);var project_cmenu=Menus.registerContextMenu(Menus.ContextMenuIds.PROJECT_MENU);project_cmenu.addMenuItem(Commands.FILE_NEW),project_cmenu.addMenuItem(Commands.FILE_NEW_FOLDER),Phoenix.browser.isTauri&&project_cmenu.addMenuItem(Commands.NAVIGATE_SHOW_IN_OS),project_cmenu.addMenuDivider(),project_cmenu.addMenuItem(Commands.FILE_CUT),project_cmenu.addMenuItem(Commands.FILE_COPY),project_cmenu.addMenuItem(Commands.FILE_COPY_PATH),project_cmenu.addMenuItem(Commands.FILE_DUPLICATE),project_cmenu.addMenuItem(Commands.FILE_PASTE),project_cmenu.addMenuItem(Commands.FILE_DOWNLOAD,void 0,void 0,void 0,{hideWhenCommandDisabled:!0}),project_cmenu.addMenuDivider(),project_cmenu.addMenuItem(Commands.FILE_RENAME),project_cmenu.addMenuItem(Commands.FILE_DELETE),project_cmenu.addMenuDivider(),project_cmenu.addMenuItem(Commands.CMD_FIND_IN_SUBTREE),project_cmenu.addMenuItem(Commands.CMD_REPLACE_IN_SUBTREE),project_cmenu.addMenuDivider(),project_cmenu.addMenuItem(Commands.FILE_REFRESH);var editor_cmenu=Menus.registerContextMenu(Menus.ContextMenuIds.EDITOR_MENU);editor_cmenu.addMenuItem(Commands.TOGGLE_QUICK_EDIT),editor_cmenu.addMenuItem(Commands.TOGGLE_QUICK_DOCS),editor_cmenu.addMenuItem(Commands.NAVIGATE_JUMPTO_DEFINITION),editor_cmenu.addMenuItem(Commands.CMD_FIND_ALL_REFERENCES),editor_cmenu.addMenuDivider(),editor_cmenu.addMenuItem(Commands.EDIT_CUT),editor_cmenu.addMenuItem(Commands.EDIT_COPY),!window.Phoenix.browser.isTauri&&window.Phoenix.browser.desktop.isFirefox||editor_cmenu.addMenuItem(Commands.EDIT_PASTE),editor_cmenu.addMenuDivider(),editor_cmenu.addMenuItem(Commands.EDIT_SELECT_ALL);var inline_editor_cmenu=Menus.registerContextMenu(Menus.ContextMenuIds.INLINE_EDITOR_MENU);inline_editor_cmenu.addMenuItem(Commands.TOGGLE_QUICK_EDIT),inline_editor_cmenu.addMenuItem(Commands.EDIT_SELECT_ALL),inline_editor_cmenu.addMenuDivider(),inline_editor_cmenu.addMenuItem(Commands.QUICK_EDIT_PREV_MATCH),inline_editor_cmenu.addMenuItem(Commands.QUICK_EDIT_NEXT_MATCH),$("#editor-holder").on("contextmenu",function(e){require(["editor/EditorManager"],function(EditorManager){if(0===$(e.target).parents(".CodeMirror-gutter").length){var editor=EditorManager.getFocusedEditor(),inlineWidget=EditorManager.getFocusedInlineWidget();editor&&(inlineWidget?inline_editor_cmenu.open(e):editor_cmenu.open(e))}})}),$("#project-files-container").on("contextmenu",function(e){project_cmenu.open(e)}),Menus.ContextMenu.assignContextMenuToSelector(".working-set-splitview-btn",splitview_menu),$(window).contextmenu(function(e){e.preventDefault()}),$(window.document).on("mousedown",".dropdown",function(e){e.preventDefault()}),$(window.document).on("mouseenter","#titlebar .dropdown",function(e){var open=$(this).siblings(".open");open.length>0&&(open.removeClass("open"),$(this).addClass("open"))}),Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_CONTEXT_MENU).on("beforeContextMenuOpen",_setMenuItemsVisible),Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU).on("beforeContextMenuOpen",_setMenuItemsVisible)})});
//# sourceMappingURL=DefaultMenus.js.map