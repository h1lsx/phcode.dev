define(function(require,exports,module){var CommandManager=require("command/CommandManager"),EventDispatcher=require("utils/EventDispatcher"),Commands=require("command/Commands"),DocumentManager=require("document/DocumentManager"),Editor=require("editor/Editor"),EditorManager=require("editor/EditorManager"),ProjectManager=require("project/ProjectManager"),FileViewController=require("project/FileViewController"),FileUtils=require("file/FileUtils"),FindUtils=require("search/FindUtils"),WorkspaceManager=require("view/WorkspaceManager"),StringUtils=require("utils/StringUtils"),Strings=require("strings"),Metrics=require("utils/Metrics"),_=require("thirdparty/lodash"),Mustache=require("thirdparty/mustache/mustache"),searchPanelTemplate=require("text!htmlContent/search-panel.html"),searchResultsTemplate=require("text!htmlContent/search-results.html"),searchSummaryTemplate=require("text!htmlContent/search-summary.html"),RESULTS_PER_PAGE=100,UPDATE_TIMEOUT=400;function SearchResultsView(model,panelID,panelName,type){const self=this;let panelHtml=Mustache.render(searchPanelTemplate,{panelID:panelID});function _showPanelIfResultsAvailable(_e,shownPanelID){0===self._model.numMatches&&self._panel.hide(),shownPanelID!==self._panel.panelID||self._model.isReplace||self._handleModelChange()}this._panel=WorkspaceManager.createBottomPanel(panelName,$(panelHtml),100),this._$summary=this._panel.$panel.find(".title"),this._$table=this._panel.$panel.find(".table-container"),this._$previewEditor=this._panel.$panel.find(".search-editor-preview"),this._model=model,this._searchResultsType=type,this._hasPreviousPage=!1,this._hasNextPage=!1,new ResizeObserver(()=>{self._$previewEditor.editor&&self._$previewEditor.editor.updateLayout()}).observe(this._panel.$panel[0]),WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_PANEL_SHOWN,_showPanelIfResultsAvailable)}EventDispatcher.makeEventDispatcher(SearchResultsView.prototype),SearchResultsView.prototype._model=null,SearchResultsView.prototype._searchList=[],SearchResultsView.prototype._panel=null,SearchResultsView.prototype._initialFilePath=null,SearchResultsView.prototype._currentStart=0,SearchResultsView.prototype._allChecked=!1,SearchResultsView.prototype._$selectedRow=null,SearchResultsView.prototype._$summary=null,SearchResultsView.prototype._$table=null,SearchResultsView.prototype._timeoutID=null,SearchResultsView.prototype._searchResultsType=null,SearchResultsView.prototype._handleModelChange=function(quickChange){if(this._model.isReplace)this.close();else{var self=this;this._timeoutID&&window.clearTimeout(this._timeoutID),quickChange?this._timeoutID=window.setTimeout(function(){self._updateResults(),self._timeoutID=null},400):this._updateResults()}},SearchResultsView.prototype.OpenSelectedFile=function(){const self=this;if(self._$selectedRow){let searchItem=self._searchList[self._$selectedRow.data("file-index")],item=searchItem.items[self._$selectedRow.data("item-index")];CommandManager.execute(Commands.FILE_OPEN,{fullPath:searchItem.fullPath}).done(function(){EditorManager.getCurrentFullEditor().setSelection(item.start,item.end,!0)})}},SearchResultsView.prototype._previewSelectedFile=function(){const self=this;if(self._$selectedRow){let searchItem=self._searchList[self._$selectedRow.data("file-index")],item=searchItem.items[self._$selectedRow.data("item-index")];self._showPreviewEditor(searchItem.fullPath,item.start,item.end)}},SearchResultsView.prototype.selectNextResult=function(){const self=this;if(self._$selectedRow){const selectedElement=self._$selectedRow[0];let nextElement=selectedElement.nextElementSibling,searchItem=self._searchList[self._$selectedRow.data("file-index")];if(!self._model.results[searchItem.fullPath])return;let collapsed=self._model.results[searchItem.fullPath].collapsed;for(;nextElement&&(collapsed||!$(nextElement).hasClass("file-search-item"))&&(nextElement=nextElement.nextElementSibling);)searchItem=self._searchList[$(nextElement).data("file-index")],collapsed=self._model.results[searchItem.fullPath].collapsed;nextElement?(self._$selectedRow.removeClass("selected"),self._$selectedRow=$(nextElement),self._$selectedRow.addClass("selected"),nextElement.scrollIntoView({block:"nearest"}),self._previewSelectedFile()):self._hasNextPage&&self.trigger("getNextPage")}},SearchResultsView.prototype.selectNextPage=function(){const self=this;self._hasNextPage&&self.trigger("getNextPage")},SearchResultsView.prototype.selectLastResultInPage=function(){const self=this;if(self._$selectedRow){let selectedElement,lastElement=self._$selectedRow[0].parentNode.lastChild;for(;lastElement&&!$(lastElement).hasClass("file-search-item");)lastElement=lastElement.previousElementSibling;lastElement&&(self._$selectedRow.removeClass("selected"),self._$selectedRow=$(lastElement),self._$selectedRow.addClass("selected"),lastElement.scrollIntoView({block:"nearest"}),self._previewSelectedFile())}},SearchResultsView.prototype.selectPrevResult=function(){const self=this;if(self._$selectedRow){let selectedElement,prevElement=self._$selectedRow[0].previousElementSibling,searchItem=self._searchList[self._$selectedRow.data("file-index")];if(!self._model.results[searchItem.fullPath])return;let collapsed=self._model.results[searchItem.fullPath].collapsed;for(;prevElement&&(collapsed||!$(prevElement).hasClass("file-search-item"))&&(prevElement=prevElement.previousElementSibling);)searchItem=self._searchList[$(prevElement).data("file-index")],collapsed=self._model.results[searchItem.fullPath].collapsed;prevElement?(self._$selectedRow.removeClass("selected"),self._$selectedRow=$(prevElement),self._$selectedRow.addClass("selected"),prevElement.scrollIntoView({block:"nearest"}),self._previewSelectedFile()):self._hasPreviousPage&&(self.showPreviousPage(),self.selectLastResultInPage())}},SearchResultsView.prototype.selectPrevPage=function(){const self=this;self._hasPreviousPage&&self.showPreviousPage()},SearchResultsView.prototype._addPanelListeners=function(){var self=this;function updateHeaderCheckbox($checkAll){var $allFileRows=self._panel.$panel.find(".file-section"),$checkedFileRows;$allFileRows.filter(function(index){return $(this).find(".check-one-file").is(":checked")}).length===$allFileRows.length&&$checkAll.prop("checked",!0)}function updateFileAndHeaderCheckboxes($clickedRow,isChecked){var $firstMatch,$fileRow=(0===$clickedRow.data("item-index")?$clickedRow:$clickedRow.prevUntil(".file-section").last()).prev(),$siblingRows=$fileRow.nextUntil(".file-section"),$fileCheckbox=$fileRow.find(".check-one-file"),$checkAll=self._panel.$panel.find(".check-all"),$checkedSibilings;isChecked?$fileCheckbox.is(":checked")||$siblingRows.filter(function(index){return $(this).find(".check-one").is(":checked")}).length===$siblingRows.length&&($fileCheckbox.prop("checked",!0),$checkAll.is(":checked")||updateHeaderCheckbox($checkAll)):($checkAll.is(":checked")&&$checkAll.prop("checked",!1),$fileCheckbox.is(":checked")&&$fileCheckbox.prop("checked",!1))}this._panel.$panel.off(".searchResults").on("dblclick.searchResults",".toolbar",function(){self._panel.hide()}).on("click.searchResults",".close",function(){self._panel.hide()}).on("click.searchResults",".first-page:not(.disabled)",function(){self._currentStart=0,self._render(),Metrics.countEvent(Metrics.EVENT_TYPE.SEARCH,"result.panel.btn","firstPage")}).on("click.searchResults",".prev-page:not(.disabled)",function(){self._currentStart-=100,self._render(),Metrics.countEvent(Metrics.EVENT_TYPE.SEARCH,"result.panel.btn","prevPage")}).on("click.searchResults",".next-page:not(.disabled)",function(){self.trigger("getNextPage"),Metrics.countEvent(Metrics.EVENT_TYPE.SEARCH,"result.panel.btn","nextPage")}).on("click.searchResults",".last-page:not(.disabled)",function(){self.trigger("getLastPage"),Metrics.countEvent(Metrics.EVENT_TYPE.SEARCH,"result.panel.btn","lastPage")}).on("dblclick.searchResults",".table-container tr:not(.file-section)",function(e){let $row=$(e.target).closest("tr"),searchFile=self._searchList[$row.data("file-index")],item=searchFile.items[$row.data("item-index")];FileViewController.openFileAndAddToWorkingSet(searchFile.fullPath).done(function(){EditorManager.getCurrentFullEditor().setSelection(item.start,item.end,!0)})}).on("click.searchResults .table-container",function(e){let $row=$(e.target).closest("tr"),isLineNumberClick=$row.context&&$($row.context).hasClass("line-number");if($row.length){self._$selectedRow&&self._$selectedRow.removeClass("selected"),$row.addClass("selected"),self._$selectedRow=$row;var searchItem=self._searchList[$row.data("file-index")],fullPath=searchItem.fullPath;if($row.hasClass("file-section")){var $titleRows,collapsed=!self._model.results[fullPath].collapsed;($titleRows=e.metaKey||e.ctrlKey?$(e.target).closest("table").find(".file-section"):$row).each(function(){fullPath=self._searchList[$(this).data("file-index")].fullPath,(searchItem=self._model.results[fullPath]).collapsed!==collapsed&&(searchItem.collapsed=collapsed,$(this).nextUntil(".file-section").toggle(),$(this).find(".disclosure-triangle").toggleClass("expanded"))}),(e.metaKey||e.ctrlKey)&&(FindUtils.setCollapseResults(collapsed),_.forEach(self._model.results,function(item){item.collapsed=collapsed}))}else{let item=searchItem.items[$row.data("item-index")];self._showPreviewEditor(fullPath,item.start,item.end),isLineNumberClick&&CommandManager.execute(Commands.FILE_OPEN,{fullPath:fullPath}).done(function(){EditorManager.getCurrentFullEditor().setSelection(item.start,item.end,!0)})}}}),this._model.isReplace&&this._panel.$panel.on("click.searchResults",".check-all",function(e){var isChecked=$(this).is(":checked");_.forEach(self._model.results,function(results){results.matches.forEach(function(match){match.isChecked=isChecked})}),self._$table.find(".check-one").prop("checked",isChecked),self._$table.find(".check-one-file").prop("checked",isChecked),self._allChecked=isChecked}).on("click.searchResults",".check-one-file",function(e){var isChecked=$(this).is(":checked"),$row=$(e.target).closest("tr"),item=self._searchList[$row.data("file-index")],$matchRows=$row.nextUntil(".file-section"),$checkAll=self._panel.$panel.find(".check-all");item&&self._model.results[item.fullPath].matches.forEach(function(match){match.isChecked=isChecked}),$matchRows.find(".check-one").prop("checked",isChecked),isChecked?$checkAll.is(":checked")||updateHeaderCheckbox($checkAll):$checkAll.is(":checked")&&$checkAll.prop("checked",!1),e.stopPropagation()}).on("click.searchResults",".check-one",function(e){var $row=$(e.target).closest("tr"),item=self._searchList[$row.data("file-index")],match=self._model.results[item.fullPath].matches[$row.data("match-index")];match.isChecked=$(this).is(":checked"),updateFileAndHeaderCheckboxes($row,match.isChecked),e.stopPropagation()}).on("click.searchResults",".replace-checked",function(e){self.trigger("replaceBatch")})},SearchResultsView.prototype._showSummary=function(){let self=this,count=this._model.countFilesMatches(),lastIndex=this._getLastIndex(count.matches),typeStr=count.matches>1?Strings.FIND_IN_FILES_MATCHES:Strings.FIND_IN_FILES_MATCH,filesStr,summary;"reference"===this._searchResultsType&&(typeStr=count.matches>1?Strings.REFERENCES_IN_FILES:Strings.REFERENCE_IN_FILES),filesStr=StringUtils.format(Strings.FIND_NUM_FILES,count.files,count.files>1?Strings.FIND_IN_FILES_FILES:Strings.FIND_IN_FILES_FILE),summary=StringUtils.format(Strings.FIND_TITLE_SUMMARY,this._model.exceedsMaximum?Strings.FIND_IN_FILES_MORE_THAN:"",String(count.matches),typeStr,filesStr),this._hasPreviousPage=this._currentStart>0,this._hasNextPage=lastIndex<count.matches,this._$summary.html(Mustache.render(searchSummaryTemplate,{query:this._model.queryInfo&&this._model.queryInfo.query&&this._model.queryInfo.query.toString()||"",replaceWith:this._model.replaceText,titleLabel:this._model.isReplace?Strings.FIND_REPLACE_TITLE_LABEL:Strings.FIND_TITLE_LABEL,scope:this._model.scope?"&nbsp;"+FindUtils.labelForScope(this._model.scope)+"&nbsp;":"",summary:summary,allChecked:this._allChecked,hasPages:count.matches>100,results:StringUtils.format(Strings.FIND_IN_FILES_PAGING,this._currentStart+1,lastIndex),hasPrev:this._hasPreviousPage,hasNext:this._hasNextPage,replace:this._model.isReplace,Strings:Strings}))},SearchResultsView.prototype._render=function(){let searchItems,match,i,item,multiLine,count=this._model.countFilesMatches(),searchFiles=this._model.prioritizeOpenFile(this._initialFilePath),lastIndex=this._getLastIndex(count.matches),matchesCounter=0,showMatches=!1,allInFileChecked=!0,self=this,previewFileSelected=!1;this._showSummary(),this._searchList=[],searchFiles.some(function(fullPath){if(showMatches=!0,item=self._model.results[fullPath],matchesCounter+item.matches.length<self._currentStart)matchesCounter+=item.matches.length,showMatches=!1;else if(matchesCounter<self._currentStart)i=self._currentStart-matchesCounter,matchesCounter=self._currentStart;else{if(!(matchesCounter<lastIndex))return!0;i=0}if(showMatches&&i<item.matches.length){for(searchItems=[],allInFileChecked=!0;i<item.matches.length&&matchesCounter<lastIndex;)match=item.matches[i],multiLine=match.start.line!==match.end.line,previewFileSelected||(previewFileSelected=!0,self._showPreviewEditor(fullPath,match.start,match.end)),searchItems.push({fileIndex:self._searchList.length,itemIndex:searchItems.length,matchIndex:i,line:match.start.line+1,pre:match.line.substr(0,match.start.ch-match.highlightOffset),highlight:match.line.substring(match.start.ch-match.highlightOffset,multiLine?void 0:match.end.ch-match.highlightOffset),post:multiLine?"…":match.line.substr(match.end.ch-match.highlightOffset),start:match.start,end:match.end,isChecked:match.isChecked,isCollapsed:item.collapsed}),match.isChecked||(allInFileChecked=!1),matchesCounter++,i++;let relativePath=FileUtils.getDirectoryPath(ProjectManager.makeProjectRelativeIfPossible(fullPath)),directoryPath=FileUtils.getDirectoryPath(relativePath),displayFileName=StringUtils.format(Strings.FIND_IN_FILES_FILE_PATH,StringUtils.breakableUrl(FileUtils.getBaseName(fullPath)),StringUtils.breakableUrl(directoryPath),directoryPath?"&mdash;":"");self._searchList.push({fileIndex:self._searchList.length,filename:displayFileName,fullPath:fullPath,isChecked:allInFileChecked,items:searchItems,isCollapsed:item.collapsed})}}),this._$table.empty().append(Mustache.render(searchResultsTemplate,{replace:this._model.isReplace,searchList:this._searchList,Strings:Strings})),this._$selectedRow&&this._$selectedRow.removeClass("selected");let searchResults=this._$table.find(".file-search-item");searchResults.length>0&&(this._$selectedRow=$(searchResults[0]),this._$selectedRow.addClass("selected")),this._panel.show(),this._$table.scrollTop(0)},SearchResultsView.prototype._showPreviewEditor=function(fullPath,selectStart,selectEnd){let self=this;self._$previewEditor.editor&&self._$previewEditor.editor.document.file.fullPath===fullPath?self._$previewEditor.editor.setSelection(selectStart,selectEnd,!0,Editor.BOUNDARY_BULLSEYE):DocumentManager.getDocumentForPath(fullPath).done(function(doc){self._$previewEditor.editor&&self._closePreviewEditor();let editorOptions={isReadOnly:!0};self._$previewEditor.editor=new Editor.Editor(doc,!1,self._$previewEditor,null,editorOptions),exports._previewEditorForTests=self._$previewEditor.editor,self._$previewEditor.editor.updateLayout(),self._$previewEditor.editor.setSelection(selectStart,selectEnd,!0,Editor.BOUNDARY_BULLSEYE)})},SearchResultsView.prototype._closePreviewEditor=function(){let self=this;self._$previewEditor.editor&&(exports._previewEditorForTests=null,self._$previewEditor.editor.destroy(),self._$previewEditor.editor=null)},SearchResultsView.prototype._updateResults=function(){if(this._panel.isVisible()){var scrollTop=this._$table.scrollTop(),index=this._$selectedRow?this._$selectedRow.index():null,numMatches=this._model.countFilesMatches().matches;this._currentStart>numMatches&&(this._currentStart=this._getLastCurrentStart(numMatches)),this._render(),this._$table.scrollTop(scrollTop),index&&(this._$selectedRow=this._$table.find("tr:eq("+index+")"),this._$selectedRow.addClass("selected"))}},SearchResultsView.prototype._getLastIndex=function(numMatches){return Math.min(this._currentStart+100,numMatches)},SearchResultsView.prototype.showNextPage=function(){this._currentStart+=100,this._render()},SearchResultsView.prototype.showPreviousPage=function(){this._currentStart-=100,this._currentStart<0&&(this._currentStart=0),this._render()},SearchResultsView.prototype.showLastPage=function(){this._currentStart=this._getLastCurrentStart(),this._render()},SearchResultsView.prototype._getLastCurrentStart=function(numMatches){return numMatches=numMatches||this._model.countFilesMatches().matches,100*Math.floor((numMatches-1)/100)},SearchResultsView.prototype.open=function(){this._currentStart=0,this._$selectedRow=null,this._allChecked=!0;var currentDoc=DocumentManager.getCurrentDocument();this._initialFilePath=currentDoc?currentDoc.file.fullPath:null,this._render(),this._addPanelListeners(),this._model.off("change.SearchResultsView"),this._model.on("change.SearchResultsView",this._handleModelChange.bind(this))},SearchResultsView.prototype.close=function(){this._panel&&this._panel.isVisible()&&(this._$table.empty(),this._panel.hide(),this._panel.$panel.off(".searchResults"),this._model.off("change.SearchResultsView"),this.trigger("close"))},exports.SearchResultsView=SearchResultsView});
//# sourceMappingURL=SearchResultsView.js.map