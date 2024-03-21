define(function(require,exports,module){var EditorManager=require("editor/EditorManager"),EventDispatcher=require("utils/EventDispatcher"),KeyEvent=require("utils/KeyEvent");function InlineWidget(){var self=this;this.htmlContent=window.document.createElement("div"),this.$htmlContent=$(this.htmlContent).addClass("inline-widget").attr("tabindex","-1"),this.$htmlContent.append("<div class='shadow top' />").append("<div class='shadow bottom' />").append("<a href='#' class='close no-focus'>&times;</a>"),this.$closeBtn=this.$htmlContent.find(".close"),this.$closeBtn.click(function(e){self.close(),e.stopImmediatePropagation()}),this.$htmlContent.on("keydown",function(e){e.keyCode===KeyEvent.DOM_VK_ESCAPE&&(self.close(),e.stopImmediatePropagation())})}InlineWidget.prototype.htmlContent=null,InlineWidget.prototype.$htmlContent=null,InlineWidget.prototype.id=null,InlineWidget.prototype.hostEditor=null,EventDispatcher.makeEventDispatcher(InlineWidget.prototype),InlineWidget.prototype.height=0,InlineWidget.prototype.close=function(){return EditorManager.closeInlineWidget(this.hostEditor,this)},InlineWidget.prototype.hasFocus=function(){const focusedItem=window.document.activeElement,htmlContent=this.$htmlContent[0],containsFocus=$.contains(htmlContent,focusedItem);return containsFocus||htmlContent===focusedItem},InlineWidget.prototype.onClosed=function(){this.trigger("close")},InlineWidget.prototype.onAdded=function(){this.trigger("add")},InlineWidget.prototype.load=function(hostEditor){this.hostEditor=hostEditor},InlineWidget.prototype.onParentShown=function(){},InlineWidget.prototype.refresh=function(){},exports.InlineWidget=InlineWidget});
//# sourceMappingURL=InlineWidget.js.map