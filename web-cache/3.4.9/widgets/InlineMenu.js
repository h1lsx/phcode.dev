define(function(require,exports,module){var KeyBindingManager=require("command/KeyBindingManager"),Menus=require("command/Menus"),KeyEvent=require("utils/KeyEvent"),StringUtils=require("utils/StringUtils"),ValidationUtils=require("utils/ValidationUtils"),ViewUtils=require("utils/ViewUtils"),PopUpManager=require("widgets/PopUpManager"),Mustache=require("thirdparty/mustache/mustache"),MenuHTML=require("text!htmlContent/inline-menu.html");function InlineMenu(editor,menuText){this.items=[],this.selectedIndex=-1,this.opened=!1,this.editor=editor,this.handleSelect=null,this.handleClose=null,this.$menu=$("<li class='dropdown inlinemenu-menu'></li>").append($("<a href='#' class='dropdown-toggle' data-toggle='dropdown'></a>").hide()).append("<ul class='dropdown-menu'><li class='inlinemenu-header'><a>"+menuText+"</a></li></ul>"),this._keydownHook=this._keydownHook.bind(this)}InlineMenu.prototype._setSelectedIndex=function(index){var items=this.$menu.find("li.inlinemenu-item");if(index=Math.max(-1,Math.min(index,items.length-1)),-1!==this.selectedIndex&&$(items[this.selectedIndex]).find("a").removeClass("highlight"),this.selectedIndex=index,-1!==this.selectedIndex){var $item=$(items[this.selectedIndex]),$view=this.$menu.find("ul.dropdown-menu");$item.find("a").addClass("highlight"),ViewUtils.scrollElementIntoView($view,$item,!1)}this.handleHover&&this.handleHover(this.items[index].id)},InlineMenu.prototype._buildListView=function(items){var self=this,view={items:[]},_addItem;if(this.items=items,_addItem=function(item){view.items.push({formattedItem:"<span>"+item.name+"</span>"})},this.$menu.find("li.inlinemenu-item").remove(),0===this.items.length)this.handleClose&&this.handleClose();else{this.items.some(function(item,index){_addItem(item)});var $ul=this.$menu.find("ul.dropdown-menu"),$parent=$ul.parent();$ul.remove().append(Mustache.render(MenuHTML,view)),$ul.children("li.inlinemenu-item").each(function(index,element){var item=self.items[index],$element;$(element).data("itemid",item.id)}),$ul.on("click","li.inlinemenu-item",function(e){e.stopPropagation(),self.handleSelect&&self.handleSelect($(this).data("itemid"))}),$ul.on("mouseover","li.inlinemenu-item",function(e){e.stopPropagation(),self._setSelectedIndex(self.items.findIndex(function(element){return element.id===$(e.currentTarget).data("itemid")}))}),$parent.append($ul),this._setSelectedIndex(0)}},InlineMenu.prototype._calcMenuLocation=function(){var cursor=this.editor._codeMirror.cursorCoords(),posTop=cursor.bottom,posLeft=cursor.left,textHeight=this.editor.getTextHeight(),$window=$(window),$menuWindow=this.$menu.children("ul"),menuHeight=$menuWindow.outerHeight(),bottomOverhang;posTop+menuHeight-$window.height()>0&&(posTop-=textHeight+2+menuHeight),posTop-=30;var menuWidth=$menuWindow.width(),availableWidth=menuWidth,rightOverhang=posLeft+menuWidth-$window.width();return rightOverhang>0&&(posLeft=Math.max(0,posLeft-rightOverhang)),{left:posLeft,top:posTop,width:availableWidth}},InlineMenu.prototype.isHandlingKeyCode=function(keyCodeOrEvent){var keyCode="object"==typeof keyCodeOrEvent?keyCodeOrEvent.keyCode:keyCodeOrEvent,ctrlKey="object"==typeof keyCodeOrEvent&&keyCodeOrEvent.ctrlKey;return keyCode===KeyEvent.DOM_VK_UP||keyCode===KeyEvent.DOM_VK_DOWN||keyCode===KeyEvent.DOM_VK_PAGE_UP||keyCode===KeyEvent.DOM_VK_PAGE_DOWN||keyCode===KeyEvent.DOM_VK_RETURN||keyCode===KeyEvent.DOM_VK_ESCAPE},InlineMenu.prototype._keydownHook=function(event){var keyCode,self=this;function _rotateSelection(distance){var len=self.items.length,pos;self.selectedIndex<0?pos=distance>0?distance-1:len-1:(pos=self.selectedIndex,pos=distance>0?pos===len-1?0:Math.min(pos+distance,len-1):0===pos?len-1:Math.max(pos+distance,0)),self._setSelectedIndex(pos)}function _itemsPerPage(){var itemsPerPage=1,$items=self.$menu.find("li.inlinemenu-item"),$view=self.$menu.find("ul.dropdown-menu"),itemHeight;return 0!==$items.length&&(itemHeight=$($items[0]).height())&&(itemsPerPage=Math.floor($view.height()/itemHeight),itemsPerPage=Math.max(1,Math.min(itemsPerPage,$items.length))),itemsPerPage}if(!this.isOpen())return this.handleClose(),!1;if("keydown"===event.type&&this.isHandlingKeyCode(event)){if(keyCode=event.keyCode,event.keyCode===KeyEvent.DOM_VK_ESCAPE)return event.stopImmediatePropagation(),this.handleClose(),!1;if(event.shiftKey&&(event.keyCode===KeyEvent.DOM_VK_UP||event.keyCode===KeyEvent.DOM_VK_DOWN||event.keyCode===KeyEvent.DOM_VK_PAGE_UP||event.keyCode===KeyEvent.DOM_VK_PAGE_DOWN))return this.handleClose(),!1;if(keyCode===KeyEvent.DOM_VK_UP)_rotateSelection.call(this,-1);else if(keyCode===KeyEvent.DOM_VK_DOWN)_rotateSelection.call(this,1);else if(keyCode===KeyEvent.DOM_VK_PAGE_UP)_rotateSelection.call(this,-_itemsPerPage());else if(keyCode===KeyEvent.DOM_VK_PAGE_DOWN)_rotateSelection.call(this,_itemsPerPage());else{if(-1===this.selectedIndex||keyCode!==KeyEvent.DOM_VK_RETURN)return!1;$(this.$menu.find("li.inlinemenu-item")[this.selectedIndex]).trigger("click")}return event.stopImmediatePropagation(),event.preventDefault(),!0}return!1},InlineMenu.prototype.isOpen=function(){return this.opened&&!this.$menu.hasClass("open")&&(this.opened=!1),this.opened},InlineMenu.prototype.open=function(items){if(Menus.closeAll(),this._buildListView(items),this.items.length){$("#inlinemenu-menu-bar > ul").append(this.$menu);var menuPos=this._calcMenuLocation();this.$menu.addClass("open").css({left:menuPos.left,top:menuPos.top,width:menuPos.width+"px"}),this.opened=!0,KeyBindingManager.addGlobalKeydownHook(this._keydownHook)}},InlineMenu.prototype.openRemovedMenu=function(){if(!0===this.opened&&this.$menu&&!this.$menu.hasClass("open")){var menuPos=this._calcMenuLocation();this.$menu.addClass("open").css({left:menuPos.left,top:menuPos.top,width:menuPos.width+"px"})}},InlineMenu.prototype.close=function(){this.opened=!1,this.$menu&&(this.$menu.removeClass("open"),PopUpManager.removePopUp(this.$menu),this.$menu.remove()),KeyBindingManager.removeGlobalKeydownHook(this._keydownHook)},InlineMenu.prototype.onSelect=function(callback){this.handleSelect=callback},InlineMenu.prototype.onHover=function(callback){this.handleHover=callback},InlineMenu.prototype.onClose=function(callback){this.handleClose=callback},exports.InlineMenu=InlineMenu});
//# sourceMappingURL=InlineMenu.js.map