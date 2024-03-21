define(function(require,exports,module){var _=brackets.getModule("thirdparty/lodash"),EditorManager=brackets.getModule("editor/EditorManager"),TokenUtils=brackets.getModule("utils/TokenUtils"),Strings=brackets.getModule("strings"),RefactoringUtils=require("RefactoringUtils"),RefactoringSession=RefactoringUtils.RefactoringSession,WRAP_IN_CONDITION="wrapCondition",ARROW_FUNCTION="arrowFunction",GETTERS_SETTERS="gettersSetters",TRY_CATCH="tryCatch",current=null;function initializeRefactoringSession(editor){current=new RefactoringSession(editor)}function _wrapSelectedStatements(wrapperName,err){var editor=EditorManager.getActiveEditor();if(editor){initializeRefactoringSession(editor);var startIndex=current.startIndex,endIndex=current.endIndex,selectedText=current.selectedText,pos;if(0===selectedText.length){var statementNode=RefactoringUtils.findSurroundASTNode(current.ast,{start:startIndex},["Statement"]);if(!statementNode)return void current.editor.displayErrorMessageAtCursor(err);selectedText=current.text.substr(statementNode.start,statementNode.end-statementNode.start),startIndex=statementNode.start,endIndex=statementNode.end}else{var selectionDetails=RefactoringUtils.normalizeText(selectedText,startIndex,endIndex);selectedText=selectionDetails.text,startIndex=selectionDetails.start,endIndex=selectionDetails.end}if(RefactoringUtils.checkStatement(current.ast,startIndex,endIndex,selectedText))if(pos={start:current.cm.posFromIndex(startIndex),end:current.cm.posFromIndex(endIndex)},current.document.batchOperation(function(){current.replaceTextFromTemplate(wrapperName,{body:selectedText},pos)}),wrapperName===TRY_CATCH){var cursorLine=current.editor.getSelection().end.line-1,startCursorCh=current.document.getLine(cursorLine).indexOf("//"),endCursorCh=current.document.getLine(cursorLine).length;current.editor.setSelection({line:cursorLine,ch:startCursorCh},{line:cursorLine,ch:endCursorCh})}else wrapperName===WRAP_IN_CONDITION&&current.editor.setSelection({line:pos.start.line,ch:pos.start.ch+4},{line:pos.start.line,ch:pos.start.ch+13});else current.editor.displayErrorMessageAtCursor(err)}}function wrapInTryCatch(){_wrapSelectedStatements(TRY_CATCH,Strings.ERROR_TRY_CATCH)}function wrapInCondition(){_wrapSelectedStatements(WRAP_IN_CONDITION,Strings.ERROR_WRAP_IN_CONDITION)}function convertToArrowFunction(){var editor=EditorManager.getActiveEditor();if(editor){initializeRefactoringSession(editor);var funcExprNode=RefactoringUtils.findSurroundASTNode(current.ast,{start:current.startIndex},["Function"]);if(funcExprNode&&"FunctionExpression"===funcExprNode.type&&!funcExprNode.id)if("FunctionDeclaration"!==funcExprNode){if(funcExprNode.body){var noOfStatements=funcExprNode.body.body.length,selectedText=current.text.substr(funcExprNode.start,funcExprNode.end-funcExprNode.start),param=[],dontChangeParam=!1,numberOfParams=funcExprNode.params.length,treatAsManyParam=!1;funcExprNode.params.forEach(function(item){"Identifier"===item.type?param.push(item.name):"AssignmentPattern"===item.type&&(dontChangeParam=!0)}),dontChangeParam&&(numberOfParams>=1&&(param.splice(0,param.length),param.push(current.text.substr(funcExprNode.params[0].start,funcExprNode.params[numberOfParams-1].end-funcExprNode.params[0].start)),1===numberOfParams&&(treatAsManyParam=!0)),dontChangeParam=!1);var loc={fullFunctionScope:{start:funcExprNode.start,end:funcExprNode.end},functionsDeclOnly:{start:funcExprNode.start,end:funcExprNode.body.start}},locPos={fullFunctionScope:{start:current.cm.posFromIndex(loc.fullFunctionScope.start),end:current.cm.posFromIndex(loc.fullFunctionScope.end)},functionsDeclOnly:{start:current.cm.posFromIndex(loc.functionsDeclOnly.start),end:current.cm.posFromIndex(loc.functionsDeclOnly.end)}},isReturnStatement=noOfStatements>=1&&"ReturnStatement"===funcExprNode.body.body[0].type,bodyStatements=funcExprNode.body.body[0],params;bodyStatements||(bodyStatements=funcExprNode.body),params={params:param.join(", "),statement:_.trimRight(current.text.substr(bodyStatements.start,bodyStatements.end-bodyStatements.start),";")},isReturnStatement&&(params.statement=params.statement.substr(7).trim()),1===noOfStatements?current.document.batchOperation(function(){1!==numberOfParams||treatAsManyParam?current.replaceTextFromTemplate(ARROW_FUNCTION,params,locPos.fullFunctionScope,"manyParamOneStament"):current.replaceTextFromTemplate(ARROW_FUNCTION,params,locPos.fullFunctionScope,"oneParamOneStament")}):current.document.batchOperation(function(){1!==numberOfParams||treatAsManyParam?current.replaceTextFromTemplate(ARROW_FUNCTION,{params:param.join(", ")},locPos.functionsDeclOnly,"manyParamManyStament"):current.replaceTextFromTemplate(ARROW_FUNCTION,{params:param},locPos.functionsDeclOnly,"oneParamManyStament")}),current.editor.setCursorPos(locPos.functionsDeclOnly.end.line,locPos.functionsDeclOnly.end.ch,!1)}}else current.editor.displayErrorMessageAtCursor(Strings.ERROR_ARROW_FUNCTION);else current.editor.displayErrorMessageAtCursor(Strings.ERROR_ARROW_FUNCTION)}}function createGettersAndSetters(){var editor=EditorManager.getActiveEditor();if(editor){initializeRefactoringSession(editor);var startIndex=current.startIndex,endIndex=current.endIndex,selectedText=current.selectedText;if(selectedText.length>=1){var selectionDetails=RefactoringUtils.normalizeText(selectedText,startIndex,endIndex);selectedText=selectionDetails.text,startIndex=selectionDetails.start,endIndex=selectionDetails.end}var token=TokenUtils.getTokenAt(current.cm,current.cm.posFromIndex(endIndex)),commaString=",",isLastNode,templateParams,parentNode,propertyEndPos;if("property"===token.type)if((parentNode=current.getParentNode(current.ast,endIndex))&&parentNode.properties){var propertyNodeArray=parentNode.properties,properyNodeIndex=propertyNodeArray.findIndex(function(element){return endIndex>=element.start&&endIndex<element.end}),propertyNode=propertyNodeArray[properyNodeIndex],nextPropertNode,nextPropertyStartPos,getSetPos;propertyEndPos=editor.posFromIndex(propertyNode.end),!(isLastNode=current.isLastNodeInScope(current.ast,endIndex))&&properyNodeIndex+1<=propertyNodeArray.length-1&&(nextPropertNode=propertyNodeArray[properyNodeIndex+1],nextPropertyStartPos=editor.posFromIndex(nextPropertNode.start),propertyEndPos.line!==nextPropertyStartPos.line?propertyEndPos=current.lineEndPosition(current.startPos.line):(propertyEndPos=nextPropertyStartPos,commaString=", ")),getSetPos=isLastNode?current.document.adjustPosForChange(propertyEndPos,commaString.split("\n"),propertyEndPos,propertyEndPos):propertyEndPos,templateParams={getName:token.string,setName:token.string,tokenName:token.string},current.document.batchOperation(function(){isLastNode&&current.document.replaceRange(commaString,propertyEndPos,propertyEndPos),current.editor.setSelection(getSetPos),current.replaceTextFromTemplate(GETTERS_SETTERS,templateParams),isLastNode||current.document.replaceRange(commaString,current.editor.getSelection().start,current.editor.getSelection().start)})}else current.editor.displayErrorMessageAtCursor(Strings.ERROR_GETTERS_SETTERS);else current.editor.displayErrorMessageAtCursor(Strings.ERROR_GETTERS_SETTERS)}}exports.wrapInCondition=wrapInCondition,exports.wrapInTryCatch=wrapInTryCatch,exports.convertToArrowFunction=convertToArrowFunction,exports.createGettersAndSetters=createGettersAndSetters});
//# sourceMappingURL=WrapSelection.js.map