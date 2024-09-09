define(function(require,exports,module){var _=require("thirdparty/lodash"),TextRange=require("document/TextRange").TextRange,InlineTextEditor=require("editor/InlineTextEditor").InlineTextEditor,EditorManager=require("editor/EditorManager"),FileUtils=require("file/FileUtils"),PreferencesManager=require("preferences/PreferencesManager"),ProjectManager=require("project/ProjectManager"),Commands=require("command/Commands"),Strings=require("strings"),CommandManager=require("command/CommandManager"),_prevMatchCmd,_nextMatchCmd;function _parseStyleSize($target,styleName){return parseInt($target.css(styleName),10)}function SearchResultItem(rangeResult){this.name=rangeResult.name,this.textRange=new TextRange(rangeResult.document,rangeResult.lineStart,rangeResult.lineEnd)}function _updateRangeLabel(listItem,range,labelCB){labelCB&&(range.name=labelCB(range.textRange));var text=_.escape(range.name)+" <span class='related-file'>:"+(range.textRange.startLine+1)+"</span>";listItem.html(text),listItem.attr("title",listItem.text())}function MultiRangeInlineEditor(ranges,messageCB,labelCB,fileComparator){InlineTextEditor.call(this),this._ranges=ranges.map(function(rangeResult){return new SearchResultItem(rangeResult)}),this._messageCB=messageCB,this._labelCB=labelCB,this._selectedRangeIndex=-1,this._collapsedFiles={},this._fileComparator=fileComparator||function defaultComparator(file1,file2){return FileUtils.comparePaths(file1.fullPath,file2.fullPath)},this._ranges.sort(function(result1,result2){return this._fileComparator(result1.textRange.document.file,result2.textRange.document.file)}.bind(this))}function getFocusedMultiRangeInlineEditor(){var focusedWidget=EditorManager.getFocusedInlineWidget();return focusedWidget instanceof MultiRangeInlineEditor?focusedWidget:null}function _previousRange(){var focusedMultiRangeInlineEditor=getFocusedMultiRangeInlineEditor();focusedMultiRangeInlineEditor&&focusedMultiRangeInlineEditor._selectPreviousRange()}function _nextRange(){var focusedMultiRangeInlineEditor=getFocusedMultiRangeInlineEditor();focusedMultiRangeInlineEditor&&focusedMultiRangeInlineEditor._selectNextRange()}SearchResultItem.prototype.name=null,SearchResultItem.prototype.textRange=null,SearchResultItem.prototype.$listItem=null,MultiRangeInlineEditor.prototype=Object.create(InlineTextEditor.prototype),MultiRangeInlineEditor.prototype.constructor=MultiRangeInlineEditor,MultiRangeInlineEditor.prototype.parentClass=InlineTextEditor.prototype,MultiRangeInlineEditor.prototype.$messageDiv=null,MultiRangeInlineEditor.prototype.$relatedContainer=null,MultiRangeInlineEditor.prototype.$related=null,MultiRangeInlineEditor.prototype.$selectedMarker=null,MultiRangeInlineEditor.prototype.$rangeList=null,MultiRangeInlineEditor.prototype._ranges=null,MultiRangeInlineEditor.prototype._selectedRangeIndex=null,MultiRangeInlineEditor.prototype._collapsedFiles=null,MultiRangeInlineEditor.prototype._messageCB=null,MultiRangeInlineEditor.prototype._labelCB=null,MultiRangeInlineEditor.prototype._fileComparator=null,MultiRangeInlineEditor.prototype._$headers=null,MultiRangeInlineEditor.prototype._createListItem=function(range){var self=this,$rangeItem=$("<li/>");$rangeItem.data("filename",range.textRange.document.file.name),$rangeItem.appendTo(this.$rangeList),_updateRangeLabel($rangeItem,range),$rangeItem.mousedown(function(){self.setSelectedIndex(self._ranges.indexOf(range))}),range.$listItem=$rangeItem},MultiRangeInlineEditor.prototype._toggleSection=function(fullPath,duringInit){var $headerItem=this._$headers[fullPath],$disclosureIcon=$headerItem.find(".disclosure-triangle"),isCollapsing=$disclosureIcon.hasClass("expanded");if($disclosureIcon.toggleClass("expanded"),$headerItem.nextUntil(".section-header").toggle(!isCollapsing),this._collapsedFiles[fullPath]=isCollapsing,!duringInit){var setting=PreferencesManager.getViewState("inlineEditor.collapsedFiles",PreferencesManager.STATE_PROJECT_CONTEXT)||{};isCollapsing?setting[fullPath]=!0:delete setting[fullPath],PreferencesManager.setViewState("inlineEditor.collapsedFiles",setting,PreferencesManager.STATE_PROJECT_CONTEXT)}if(this._updateSelectedMarker(!1),this._ruleListHeightChanged(),-1===this._selectedRangeIndex&&!isCollapsing&&!duringInit){var index=_.findIndex(this._ranges,function(resultItem){return resultItem.textRange.document.file.fullPath===fullPath});this.setSelectedIndex(index)}},MultiRangeInlineEditor.prototype._createHeaderItem=function(doc){var $headerItem=$("<li class='section-header'><span class='disclosure-triangle expanded'/><span class='filename'>"+_.escape(doc.file.name)+"</span></li>").attr("title",ProjectManager.makeProjectRelativeIfPossible(doc.file.fullPath)).appendTo(this.$rangeList);$headerItem.click(function(){this._toggleSection(doc.file.fullPath)}.bind(this)),this._$headers[doc.file.fullPath]=$headerItem},MultiRangeInlineEditor.prototype._renderList=function(){this.$rangeList.empty(),this._$headers={};var self=this,lastSectionDoc,numItemsInSection=0;function finalizeSection(){lastSectionDoc&&(self._$headers[lastSectionDoc.file.fullPath].append(" ("+numItemsInSection+")"),self._collapsedFiles[lastSectionDoc.file.fullPath]&&self._toggleSection(lastSectionDoc.file.fullPath,!0))}this._ranges.forEach(function(resultItem){lastSectionDoc!==resultItem.textRange.document&&(finalizeSection(),lastSectionDoc=resultItem.textRange.document,numItemsInSection=0,this._createHeaderItem(lastSectionDoc)),numItemsInSection++,this._createListItem(resultItem)},this),finalizeSection()},MultiRangeInlineEditor.prototype.load=function(hostEditor){MultiRangeInlineEditor.prototype.parentClass.load.apply(this,arguments),this.$messageDiv=$("<div/>").addClass("inline-editor-message"),this.$editorHolder.on("mousewheel.MultiRangeInlineEditor",function(e){e.stopPropagation()}),this.$relatedContainer=$("<div/>").addClass("related-container"),this.$selectedMarker=$("<div/>").appendTo(this.$relatedContainer).addClass("selection"),this.$related=$("<div/>").appendTo(this.$relatedContainer).addClass("related"),this.$rangeList=$("<ul/>").appendTo(this.$related);var toCollapse=PreferencesManager.getViewState("inlineEditor.collapsedFiles",PreferencesManager.STATE_PROJECT_CONTEXT)||{};Object.keys(toCollapse).forEach(function(fullPath){this._collapsedFiles[fullPath]=!0}.bind(this)),this._renderList(),this._ranges.length>1&&this.$wrapper.before(this.$relatedContainer);var self=this;this._ranges.forEach(function(range,index){range.textRange.on("change",function(){_updateRangeLabel(range.$listItem,range)}).on("contentChange",function(){_updateRangeLabel(range.$listItem,range,self._labelCB)}),range.textRange.on("lostSync",function(){self._removeRange(range)})});var indexToSelect=_.findIndex(this._ranges,function(range){return!this._collapsedFiles[range.textRange.document.file.fullPath]}.bind(this));1===this._ranges.length&&-1===indexToSelect&&(indexToSelect=0),-1!==indexToSelect?this.setSelectedIndex(indexToSelect):this.setSelectedIndex(-1);var clickHandler=this._onClick.bind(this);this.$htmlContent.on("click.MultiRangeInlineEditor",clickHandler),this.$htmlContent.on("mouseup.MultiRangeInlineEditor",clickHandler),this.$htmlContent.on("focusin.MultiRangeInlineEditor",this._updateCommands.bind(this)).on("focusout.MultiRangeInlineEditor",this._updateCommands.bind(this))},MultiRangeInlineEditor.prototype._updateCommands=function(){var enabled=this.hasFocus()&&this._ranges.length>1;_prevMatchCmd.setEnabled(enabled&&this._selectedRangeIndex>0),_nextMatchCmd.setEnabled(enabled&&-1!==this._selectedRangeIndex&&this._selectedRangeIndex<this._ranges.length-1)},MultiRangeInlineEditor.prototype.onAdded=function(){this._updateSelectedMarker(!1),MultiRangeInlineEditor.prototype.parentClass.onAdded.apply(this,arguments),this._ruleListHeightChanged(),this._updateCommands()},MultiRangeInlineEditor.prototype.setSelectedIndex=function(index,force){var newIndex=Math.min(Math.max(-1,index),this._ranges.length-1),self=this;if(force||-1===newIndex||newIndex!==this._selectedRangeIndex){var $previousItem=this._selectedRangeIndex>=0?this._ranges[this._selectedRangeIndex].$listItem:null;if($previousItem&&$previousItem.removeClass("selected"),this.editor&&this.editor.off(".MultiRangeInlineEditor"),this._selectedRangeIndex=newIndex,-1===newIndex){this.setInlineContent(null);var hasHiddenMatches=this._ranges.length>0;hasHiddenMatches?this.$messageDiv.text(Strings.INLINE_EDITOR_HIDDEN_MATCHES):this._messageCB?this._messageCB(hasHiddenMatches).done(function(msg){self.$messageDiv.html(msg)}):this.$messageDiv.text(Strings.INLINE_EDITOR_NO_MATCHES),this.$htmlContent.append(this.$messageDiv),this.sizeInlineWidgetToContents()}else{this.$messageDiv.remove();var range=this._getSelectedRange();range.$listItem.addClass("selected"),this.setInlineContent(range.textRange.document,range.textRange.startLine,range.textRange.endLine),this.editor.focus(),this._updateEditorMinHeight(),this.editor.refresh(),this.editor.on("cursorActivity.MultiRangeInlineEditor",this._ensureCursorVisible.bind(this)),this.sizeInlineWidgetToContents(),this._updateSelectedMarker(!0)}this._updateCommands()}},MultiRangeInlineEditor.prototype._updateEditorMinHeight=function(){if(this.editor){var ruleListNaturalHeight=this.$related.outerHeight(),headerHeight=$(".inline-editor-header",this.$htmlContent).outerHeight();ruleListNaturalHeight&&headerHeight&&$(this.editor.getScrollerElement()).css("min-height",ruleListNaturalHeight-headerHeight+"px")}},MultiRangeInlineEditor.prototype._ruleListHeightChanged=function(){this._updateEditorMinHeight(),this.sizeInlineWidgetToContents()},MultiRangeInlineEditor.prototype._removeRange=function(range){if(this._ranges.length<=1)this.close();else{var index=this._ranges.indexOf(range);index===this._selectedRangeIndex&&(index+1<this._ranges.length?this.setSelectedIndex(index+1):this.setSelectedIndex(index-1)),range.textRange.dispose(),this._ranges.splice(index,1),this._renderList(),index<this._selectedRangeIndex&&(this._selectedRangeIndex--,this._updateSelectedMarker(!0)),1===this._ranges.length&&(this.$relatedContainer.remove(),this.editor&&this.editor.refresh()),this._updateCommands()}},MultiRangeInlineEditor.prototype.addAndSelectRange=function(name,doc,lineStart,lineEnd){var newRange=new SearchResultItem({name:name,document:doc,lineStart:lineStart,lineEnd:lineEnd}),i;for(i=0;i<this._ranges.length&&!(this._fileComparator(this._ranges[i].textRange.document.file,doc.file)>0);i++);this._ranges.splice(i,0,newRange),this._renderList(),this._ranges.length>1&&!this.$relatedContainer.parent().length&&this.$wrapper.before(this.$relatedContainer),this._collapsedFiles[doc.file.fullPath]&&this._toggleSection(doc.file.fullPath),this.setSelectedIndex(i,!0),this._updateCommands()},MultiRangeInlineEditor.prototype._updateSelectedMarker=function(animate){if(this._selectedRangeIndex<0||this._collapsedFiles[this._getSelectedRange().textRange.document.file.fullPath])this.$selectedMarker.hide();else{var $rangeItem=this._ranges[this._selectedRangeIndex].$listItem,containerHeight=this.$relatedContainer.height(),itemTop=$rangeItem.position().top,scrollTop=this.$relatedContainer.scrollTop();if(this.$selectedMarker.show().toggleClass("animate",animate).css("top",itemTop).height($rangeItem.outerHeight()),!(containerHeight<=0)){var paddingTop=_parseStyleSize($rangeItem.parent(),"paddingTop");if(itemTop-paddingTop<scrollTop)this.$relatedContainer.scrollTop(itemTop-paddingTop);else{var itemBottom=itemTop+$rangeItem.height()+_parseStyleSize($rangeItem.parent(),"paddingBottom");itemBottom>scrollTop+containerHeight&&this.$relatedContainer.scrollTop(itemBottom-containerHeight)}}}},MultiRangeInlineEditor.prototype.onClosed=function(){MultiRangeInlineEditor.prototype.parentClass.onClosed.apply(this,arguments),this._ranges.forEach(function(searchResult){searchResult.textRange.dispose()}),this.$htmlContent.off(".MultiRangeInlineEditor"),this.$editorHolder.off(".MultiRangeInlineEditor")},MultiRangeInlineEditor.prototype._onClick=function(event){if(this.editor){var childEditor=this.editor,editorRoot=childEditor.getRootElement(),editorPos=$(editorRoot).offset();if(!containsClick($(editorRoot))&&!containsClick($(".filename",this.$htmlContent))&&(childEditor.focus(),!containsClick(this.$relatedContainer)))if(event.pageY<editorPos.top)childEditor.setCursorPos(0,0);else if(event.pageY>editorPos.top+$(editorRoot).height()){var lastLine=childEditor.getLastVisibleLine();childEditor.setCursorPos(lastLine,childEditor.document.getLine(lastLine).length)}}function containsClick($parent){return $parent.find(event.target).length>0||$parent[0]===event.target}},MultiRangeInlineEditor.prototype._ensureCursorVisible=function(){if(this.editor&&$.contains(this.editor.getRootElement(),window.document.activeElement)){var hostScrollPos=this.hostEditor.getScrollPos(),cursorCoords=this.editor._codeMirror.cursorCoords(),scrollerTop=this.hostEditor.getVirtualScrollAreaTop();this.hostEditor._codeMirror.scrollIntoView({left:hostScrollPos.x,top:cursorCoords.top-scrollerTop,right:hostScrollPos.x,bottom:cursorCoords.bottom-scrollerTop})}},MultiRangeInlineEditor.prototype._onLostContent=function(event,cause){if(!cause||"deleted"!==cause.type)return MultiRangeInlineEditor.prototype.parentClass._onLostContent.apply(this,arguments)},MultiRangeInlineEditor.prototype._getRanges=function(){return this._ranges},MultiRangeInlineEditor.prototype._getSelectedRange=function(){return this._selectedRangeIndex>=0?this._ranges[this._selectedRangeIndex]:null},MultiRangeInlineEditor.prototype._selectNextPrev=function(dir){if(-1!==this._selectedRangeIndex){var origDoc=this._ranges[this._selectedRangeIndex].textRange.document,i;for(i=this._selectedRangeIndex+dir;i>=0&&i<this._ranges.length;i+=dir){var doc=this._ranges[i].textRange.document;if(doc===origDoc&&this._collapsedFiles[doc.file.fullPath]&&this._toggleSection(doc.file.fullPath),!this._collapsedFiles[doc.file.fullPath])return void this.setSelectedIndex(i)}}},MultiRangeInlineEditor.prototype._selectNextRange=function(){this._selectNextPrev(1)},MultiRangeInlineEditor.prototype._selectPreviousRange=function(){this._selectNextPrev(-1)},MultiRangeInlineEditor.prototype.sizeInlineWidgetToContents=function(){MultiRangeInlineEditor.prototype.parentClass.sizeInlineWidgetToContents.call(this);var widgetHeight=Math.max(this.$related.height(),this.$header.outerHeight()+(-1===this._selectedRangeIndex?this.$messageDiv.outerHeight():this.$editorHolder.height()));widgetHeight&&this.hostEditor.setInlineWidgetHeight(this,widgetHeight,!1)},MultiRangeInlineEditor.prototype.onParentShown=function(){MultiRangeInlineEditor.prototype.parentClass.onParentShown.apply(this,arguments),this._updateSelectedMarker(!1)},MultiRangeInlineEditor.prototype.refresh=function(){MultiRangeInlineEditor.prototype.parentClass.refresh.apply(this,arguments),this.sizeInlineWidgetToContents(),this.editor&&this.editor.refresh()},(_prevMatchCmd=CommandManager.register(Strings.CMD_QUICK_EDIT_PREV_MATCH,Commands.QUICK_EDIT_PREV_MATCH,_previousRange)).setEnabled(!1),(_nextMatchCmd=CommandManager.register(Strings.CMD_QUICK_EDIT_NEXT_MATCH,Commands.QUICK_EDIT_NEXT_MATCH,_nextRange)).setEnabled(!1),exports.MultiRangeInlineEditor=MultiRangeInlineEditor,exports.getFocusedMultiRangeInlineEditor=getFocusedMultiRangeInlineEditor});
//# sourceMappingURL=MultiRangeInlineEditor.js.map