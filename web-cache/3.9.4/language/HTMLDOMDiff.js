define(function(require,exports,module){function generateAttributeEdits(oldNode,newNode){var oldAttributes=$.extend({},oldNode.attributes),newAttributes=newNode.attributes,edits=[];return Object.keys(newAttributes).forEach(function(attributeName){if(oldAttributes[attributeName]!==newAttributes[attributeName]){var type=oldAttributes.hasOwnProperty(attributeName)?"attrChange":"attrAdd";edits.push({type:type,tagID:oldNode.tagID,attribute:attributeName,value:newAttributes[attributeName]})}delete oldAttributes[attributeName]}),Object.keys(oldAttributes).forEach(function(attributeName){edits.push({type:"attrDelete",tagID:oldNode.tagID,attribute:attributeName})}),edits}function getParentID(node){return node.parent&&node.parent.tagID}var generateChildEdits=function(oldParent,oldNodeMap,newParent,newNodeMap){for(var newIndex=0,oldIndex=0,newChildren=newParent.children,oldChildren=oldParent?oldParent.children:[],newChild,oldChild,newEdits=[],newEdit,textAfterID,edits=[],moves=[],newElements=[],finalizeNewEdits=function(beforeID,isBeingDeleted){newEdits.forEach(function(edit){"elementDelete"!==edit.type&&(edit.beforeID=beforeID)}),edits.push.apply(edits,newEdits),newEdits=[],isBeingDeleted||(textAfterID=beforeID)},addElementInsert=function(){return!oldNodeMap[newChild.tagID]&&(newEdit={type:"elementInsert",tag:newChild.tag,tagID:newChild.tagID,parentID:newChild.parent.tagID,attributes:newChild.attributes},newEdits.push(newEdit),newElements.push(newChild),textAfterID=newChild.tagID,newIndex++,!0)},addElementDelete=function(){return!newNodeMap[oldChild.tagID]&&(finalizeNewEdits(oldChild.tagID,!0),newEdit={type:"elementDelete",tagID:oldChild.tagID},newEdits.push(newEdit),oldIndex++,!0)},addTextInsert=function(){newEdit={type:"textInsert",content:newChild.content,parentID:newChild.parent.tagID},textAfterID?newEdit.afterID=textAfterID:newEdit.firstChild=!0,newEdits.push(newEdit),newIndex++},prevNode=function(){return newIndex>0?newParent.children[newIndex-1]:null},addTextDelete=function(){var prev=prevNode();newEdit=prev&&!prev.children?{type:"textReplace",content:prev.content}:{type:"textDelete"};var previousEdit=newEdits.length>0&&newEdits[newEdits.length-1];previousEdit&&"textReplace"===previousEdit.type&&previousEdit.afterID===textAfterID?oldIndex++:(newEdit.parentID=oldChild.parent.tagID,1===oldChild.parent.children.length?newEdits.push(newEdit):(textAfterID&&(newEdit.afterID=textAfterID),newEdits.push(newEdit)),oldIndex++)},addElementMove=function(){var possiblyMovedElement=oldNodeMap[newChild.tagID];return!(!possiblyMovedElement||newParent.tagID===getParentID(possiblyMovedElement))&&(newEdit={type:"elementMove",tagID:newChild.tagID,parentID:newChild.parent.tagID},moves.push(newEdit.tagID),newEdits.push(newEdit),newIndex++,!0)},hasMoved=function(oldChild){var oldChildInNewTree=newNodeMap[oldChild.tagID];return oldChild.children&&oldChildInNewTree&&getParentID(oldChild)!==getParentID(oldChildInNewTree)};newIndex<newChildren.length&&oldIndex<oldChildren.length;)(newChild=newChildren[newIndex]).children&&addElementMove()||(hasMoved(oldChild=oldChildren[oldIndex])?oldIndex++:newChild.isElement()||oldChild.isElement()?newChild.isElement()&&oldChild.isText()?(addTextDelete(),addElementInsert()):oldChild.isElement()&&newChild.isText()?addElementDelete()||addTextInsert():newChild.tagID!==oldChild.tagID?addElementDelete()||addElementInsert()||(console.error("HTML Instrumentation: This should not happen. Two elements have different tag IDs and there was no insert/delete. This generally means there was a reordering of elements."),newIndex++,oldIndex++):(finalizeNewEdits(oldChild.tagID,!1),newIndex++,oldIndex++):(newChild.textSignature!==oldChild.textSignature&&(newEdit={type:"textReplace",content:newChild.content,parentID:newChild.parent.tagID},textAfterID&&(newEdit.afterID=textAfterID),newEdits.push(newEdit)),newIndex++,oldIndex++));for(;oldIndex<oldChildren.length;)hasMoved(oldChild=oldChildren[oldIndex])?oldIndex++:oldChild.isElement()?addElementDelete()||(console.error("HTML Instrumentation: failed to add elementDelete for remaining element in the original DOM. This should not happen.",oldChild),oldIndex++):addTextDelete();for(;newIndex<newChildren.length;)(newChild=newChildren[newIndex]).isElement()?addElementMove()||addElementInsert()||(console.error("HTML Instrumentation: failed to add elementInsert for remaining element in the updated DOM. This should not happen."),newIndex++):addTextInsert();return newEdits.forEach(function(edit){"textInsert"!==edit.type&&"elementInsert"!==edit.type&&"elementMove"!==edit.type||(edit.lastChild=!0,delete edit.firstChild,delete edit.afterID)}),edits.push.apply(edits,newEdits),{edits:edits,moves:moves,newElements:newElements}};function domdiff(oldNode,newNode){var queue=[],edits=[],moves=[],newElement,oldElement,oldNodeMap=oldNode?oldNode.nodeMap:{},newNodeMap=newNode.nodeMap,queuePush=function(node){node.children&&oldNodeMap[node.tagID]&&queue.push(node)},addEdits=function(delta){edits.push.apply(edits,delta.edits),moves.push.apply(moves,delta.moves),queue.push.apply(queue,delta.newElements)};queue.push(newNode);do{newElement=queue.pop(),(oldElement=oldNodeMap[newElement.tagID])?(newElement.attributeSignature!==oldElement.attributeSignature&&edits.push.apply(edits,generateAttributeEdits(oldElement,newElement)),newElement.childSignature!==oldElement.childSignature&&addEdits(generateChildEdits(oldElement,oldNodeMap,newElement,newNodeMap)),newElement.subtreeSignature!==oldElement.subtreeSignature&&newElement.children.forEach(queuePush)):(newElement.parent||edits.push({type:"elementInsert",tag:newElement.tag,tagID:newElement.tagID,parentID:null,attributes:newElement.attributes}),addEdits(generateChildEdits(null,oldNodeMap,newElement,newNodeMap)))}while(queue.length);return moves.length>0&&edits.unshift({type:"rememberNodes",tagIDs:moves}),edits}exports.domdiff=domdiff});
//# sourceMappingURL=HTMLDOMDiff.js.map