define(function(require,exports,module){var AppInit=brackets.getModule("utils/AppInit"),CodeHintManager=brackets.getModule("editor/CodeHintManager"),ExtensionUtils=brackets.getModule("utils/ExtensionUtils"),HTMLUtils=brackets.getModule("language/HTMLUtils"),PreferencesManager=brackets.getModule("preferences/PreferencesManager"),Strings=brackets.getModule("strings"),HtmlSpecialChars=require("text!SpecialChars.json"),specialChars;function _encodeValue(value){return value.replace("&","&amp;").replace("#","&#35;")}function _decodeValue(value){return value.replace("&amp;","&").replace("&#35;","#")}function SpecialCharHints(){this.primaryTriggerKeys="&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#0123456789",this.currentQuery=""}PreferencesManager.definePreference("codehint.SpecialCharHints","boolean",!0,{description:Strings.DESCRIPTION_SPECIAL_CHAR_HINTS}),SpecialCharHints.prototype.hasHints=function(editor,implicitChar){return this.editor=editor,null!==this._getQuery()},SpecialCharHints.prototype.getHints=function(implicitChar){var query,result;return null===implicitChar||-1!==this.primaryTriggerKeys.indexOf(implicitChar)?(this.currentQuery=query=this._getQuery(),result=$.map(specialChars,function(value,index){var shownValue;if(0===value.indexOf(query))return _encodeValue(value)+"; <span class='entity-display-character'>"+value+";</span>"}).sort(this._internalSort),null!==query&&(query=_encodeValue(query)),{hints:result,match:query,selectInitial:!0,handleWideResults:!1}):null},SpecialCharHints.prototype._internalSort=function(a,b){var num1,num2;return a=_decodeValue(a.slice(0,a.indexOf(" "))).toLowerCase(),b=_decodeValue(b.slice(0,b.indexOf(" "))).toLowerCase(),-1!==a.indexOf("#")&&-1!==b.indexOf("#")?parseInt(a.slice(a.indexOf("#")+1,a.length-1),10)-parseInt(b.slice(b.indexOf("#")+1,b.length-1),10):a.localeCompare(b)},SpecialCharHints.prototype._getQuery=function(){var query,lineContentBeforeCursor,startChar,endChar,cursor=this.editor.getCursorPos();return""!==HTMLUtils.getTagInfo(this.editor,cursor).tagName?null:(startChar=(lineContentBeforeCursor=this.editor.document.getRange({line:cursor.line,ch:0},cursor)).lastIndexOf("&"),endChar=lineContentBeforeCursor.lastIndexOf(";"),-1===startChar||endChar>startChar?null:query=this.editor.document.getRange({line:cursor.line,ch:startChar},cursor))},SpecialCharHints.prototype.insertHint=function(completion){var start={line:-1,ch:-1},end={line:-1,ch:-1},cursor=this.editor.getCursorPos(),line=this.editor.document.getLine(cursor.line),subLine,ampersandPos,semicolonPos,entityMatch;return end.line=start.line=cursor.line,start.ch=cursor.ch-this.currentQuery.length,ampersandPos=(subLine=line.slice(cursor.ch)).indexOf("&"),semicolonPos=subLine.indexOf(";"),end.ch=start.ch+this.currentQuery.length,-1!==semicolonPos&&(-1===ampersandPos||ampersandPos>semicolonPos)&&(entityMatch=(subLine=subLine.slice(0,semicolonPos)).match(/^(#?[0-9]+)|([a-zA-Z]+)$/))&&entityMatch.length>0&&0===entityMatch.index&&entityMatch[0].length===subLine.length&&(end.ch=line.indexOf(";",start.ch)+1),completion=_decodeValue(completion=completion.slice(0,completion.indexOf(" "))),start.ch!==end.ch?this.editor.document.replaceRange(completion,start,end):this.editor.document.replaceRange(completion,start),!1},AppInit.appReady(function(){ExtensionUtils.loadStyleSheet(module,"styles.css"),specialChars=JSON.parse(HtmlSpecialChars);var specialCharHints=new SpecialCharHints;CodeHintManager.registerHintProvider(specialCharHints,["html"],1)}),exports.SpecialCharHints=SpecialCharHints});
//# sourceMappingURL=main.js.map