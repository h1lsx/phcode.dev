!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";function Bar(cls,orientation,scroll){this.orientation=orientation,this.scroll=scroll,this.screen=this.total=this.size=1,this.pos=0,this.node=document.createElement("div"),this.node.className=cls+"-"+orientation,this.inner=this.node.appendChild(document.createElement("div"));var self=this;function onWheel(e){var moved=CodeMirror.wheelEventPixels(e)["horizontal"==self.orientation?"x":"y"],oldPos=self.pos;self.moveTo(self.pos+moved),self.pos!=oldPos&&CodeMirror.e_preventDefault(e)}CodeMirror.on(this.inner,"mousedown",function(e){if(1==e.which){CodeMirror.e_preventDefault(e);var axis="horizontal"==self.orientation?"pageX":"pageY",start=e[axis],startpos=self.pos;CodeMirror.on(document,"mousemove",move),CodeMirror.on(document,"mouseup",done)}function done(){CodeMirror.off(document,"mousemove",move),CodeMirror.off(document,"mouseup",done)}function move(e){if(1!=e.which)return done();self.moveTo(startpos+(e[axis]-start)*(self.total/self.size))}}),CodeMirror.on(this.node,"click",function(e){CodeMirror.e_preventDefault(e);var innerBox=self.inner.getBoundingClientRect(),where;where="horizontal"==self.orientation?e.clientX<innerBox.left?-1:e.clientX>innerBox.right?1:0:e.clientY<innerBox.top?-1:e.clientY>innerBox.bottom?1:0,self.moveTo(self.pos+where*self.screen)}),CodeMirror.on(this.node,"mousewheel",onWheel),CodeMirror.on(this.node,"DOMMouseScroll",onWheel)}Bar.prototype.setPos=function(pos,force){return pos<0&&(pos=0),pos>this.total-this.screen&&(pos=this.total-this.screen),!(!force&&pos==this.pos)&&(this.pos=pos,this.inner.style["horizontal"==this.orientation?"left":"top"]=pos*(this.size/this.total)+"px",!0)},Bar.prototype.moveTo=function(pos){this.setPos(pos)&&this.scroll(pos,this.orientation)};var minButtonSize=10;function SimpleScrollbars(cls,place,scroll){this.addClass=cls,this.horiz=new Bar(cls,"horizontal",scroll),place(this.horiz.node),this.vert=new Bar(cls,"vertical",scroll),place(this.vert.node),this.width=null}Bar.prototype.update=function(scrollSize,clientSize,barSize){var sizeChanged=this.screen!=clientSize||this.total!=scrollSize||this.size!=barSize;sizeChanged&&(this.screen=clientSize,this.total=scrollSize,this.size=barSize);var buttonSize=this.screen*(this.size/this.total);buttonSize<10&&(this.size-=10-buttonSize,buttonSize=10),this.inner.style["horizontal"==this.orientation?"width":"height"]=buttonSize+"px",this.setPos(this.pos,sizeChanged)},SimpleScrollbars.prototype.update=function(measure){if(null==this.width){var style=window.getComputedStyle?window.getComputedStyle(this.horiz.node):this.horiz.node.currentStyle;style&&(this.width=parseInt(style.height))}var width=this.width||0,needsH=measure.scrollWidth>measure.clientWidth+1,needsV=measure.scrollHeight>measure.clientHeight+1;return this.vert.node.style.display=needsV?"block":"none",this.horiz.node.style.display=needsH?"block":"none",needsV&&(this.vert.update(measure.scrollHeight,measure.clientHeight,measure.viewHeight-(needsH?width:0)),this.vert.node.style.bottom=needsH?width+"px":"0"),needsH&&(this.horiz.update(measure.scrollWidth,measure.clientWidth,measure.viewWidth-(needsV?width:0)-measure.barLeft),this.horiz.node.style.right=needsV?width+"px":"0",this.horiz.node.style.left=measure.barLeft+"px"),{right:needsV?width:0,bottom:needsH?width:0}},SimpleScrollbars.prototype.setScrollTop=function(pos){this.vert.setPos(pos)},SimpleScrollbars.prototype.setScrollLeft=function(pos){this.horiz.setPos(pos)},SimpleScrollbars.prototype.clear=function(){var parent=this.horiz.node.parentNode;parent.removeChild(this.horiz.node),parent.removeChild(this.vert.node)},CodeMirror.scrollbarModel.simple=function(place,scroll){return new SimpleScrollbars("CodeMirror-simplescroll",place,scroll)},CodeMirror.scrollbarModel.overlay=function(place,scroll){return new SimpleScrollbars("CodeMirror-overlayscroll",place,scroll)}});
//# sourceMappingURL=simplescrollbars.js.map