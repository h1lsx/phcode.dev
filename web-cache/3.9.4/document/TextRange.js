define(function(require,exports,module){var EventDispatcher;function TextRange(document,startLine,endLine){this.startLine=startLine,this.endLine=endLine,this.document=document,document.addRef(),this._handleDocumentChange=this._handleDocumentChange.bind(this),this._handleDocumentDeleted=this._handleDocumentDeleted.bind(this),document.on("change",this._handleDocumentChange),document.on("deleted",this._handleDocumentDeleted)}require("utils/EventDispatcher").makeEventDispatcher(TextRange.prototype),TextRange.prototype.dispose=function(editor,change){this.document.releaseRef(),this.document.off("change",this._handleDocumentChange),this.document.off("deleted",this._handleDocumentDeleted)},TextRange.prototype.document=null,TextRange.prototype.startLine=null,TextRange.prototype.endLine=null,TextRange.prototype._applySingleChangeToRange=function(change){if(!change.from||!change.to)return this.startLine=null,this.endLine=null,{hasChanged:!0,hasContentChanged:!0};if(change.from.line<this.startLine&&change.to.line>=this.startLine||change.from.line<=this.endLine&&change.to.line>this.endLine)return this.startLine=null,this.endLine=null,{hasChanged:!0,hasContentChanged:!0};var numAdded=change.text.length-(change.to.line-change.from.line+1),result={hasChanged:!1,hasContentChanged:!1};return 0!==numAdded&&(change.to.line<this.startLine&&(this.startLine+=numAdded,result.hasChanged=!0),change.to.line<=this.endLine&&(this.endLine+=numAdded,result.hasChanged=!0)),change.from.line>=this.startLine&&change.from.line<=this.endLine&&(result.hasContentChanged=!0),result},TextRange.prototype._applyChangesToRange=function(changeList){var hasChanged=!1,hasContentChanged=!1,i;for(i=0;i<changeList.length;i++){var result=this._applySingleChangeToRange(changeList[i]);if(hasChanged=hasChanged||result.hasChanged,hasContentChanged=hasContentChanged||result.hasContentChanged,null===this.startLine||null===this.endLine){this.trigger("lostSync");break}}hasChanged&&this.trigger("change"),hasContentChanged&&this.trigger("contentChange")},TextRange.prototype._handleDocumentChange=function(event,doc,changeList){this._applyChangesToRange(changeList)},TextRange.prototype._handleDocumentDeleted=function(event){this.trigger("lostSync")},TextRange.prototype.toString=function(){return"[TextRange "+this.startLine+"-"+this.endLine+" in "+this.document+"]"},exports.TextRange=TextRange});
//# sourceMappingURL=TextRange.js.map