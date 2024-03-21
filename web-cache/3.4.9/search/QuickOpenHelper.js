define(function(require,exports,module){var EditorManager=require("editor/EditorManager"),QuickOpen=require("search/QuickOpen"),DocumentManager=require("document/DocumentManager"),StringMatch=require("utils/StringMatch");function match(query){return"@"===query[0]}function itemFocus(selectedItem,query,explicit){if(!(!selectedItem||query.length<2&&!explicit)){var fileLocation=selectedItem.fileLocation,from={line:fileLocation.line,ch:fileLocation.chFrom},to={line:fileLocation.line,ch:fileLocation.chTo};EditorManager.getCurrentFullEditor().setSelection(from,to,!0)}}function itemSelect(selectedItem,query){itemFocus(selectedItem,query,!0)}exports.match=match,exports.itemFocus=itemFocus,exports.itemSelect=itemSelect});
//# sourceMappingURL=QuickOpenHelper.js.map