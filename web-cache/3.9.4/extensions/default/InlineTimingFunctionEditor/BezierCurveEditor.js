define(function(require,exports,module){var KeyEvent=brackets.getModule("utils/KeyEvent"),Strings=brackets.getModule("strings"),Mustache=brackets.getModule("thirdparty/mustache/mustache"),TimingFunctionUtils=require("TimingFunctionUtils"),BezierCurveEditorTemplate=require("text!BezierCurveEditorTemplate.html"),HEIGHT_ABOVE=75,HEIGHT_BELOW=75,HEIGHT_MAIN=150,WIDTH_MAIN=150,animationRequest=null;function CubicBezier(coordinates){if(this.coordinates="string"==typeof coordinates?coordinates.split(","):coordinates,!this.coordinates)throw"No offsets were defined";var i;for(this.coordinates=this.coordinates.map(function(n){return+n}),i=3;i>=0;i--){var xy=this.coordinates[i];if(isNaN(xy)||i%2==0&&(xy<0||xy>1))throw"Wrong coordinate at "+i+"("+xy+")"}}function BezierCanvas(canvas,bezier,padding){this.canvas=canvas,this.bezier=bezier,this.padding=this.getPadding(padding);var ctx=this.canvas.getContext("2d"),p=this.padding;ctx.scale(canvas.width*(1-p[1]-p[3]),.5*-canvas.height*(1-p[0]-p[2])),ctx.translate(p[3]/(1-p[1]-p[3]),-1-p[0]/(1-p[0]-p[2])-.5)}function _curveClick(e){var self,bezierEditor=e.target.bezierEditor,curveBoundingBox=bezierEditor._getCurveBoundingBox(),left=curveBoundingBox.left,top=curveBoundingBox.top,x=e.pageX-left,y=e.pageY-top-HEIGHT_ABOVE,$P1=$(bezierEditor.P1),$P2=$(bezierEditor.P2);function distance(x1,y1,x2,y2){return Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2))}var distP1,distP2,$P=distance(x,y,parseInt($P1.css("left"),10),parseInt($P1.css("top"),10))<distance(x,y,parseInt($P2.css("left"),10),parseInt($P2.css("top"),10))?$P1:$P2;$P.css({left:x+"px",top:y+"px"}),$P.get(0).focus(),bezierEditor._cubicBezierCoords=bezierEditor.bezierCanvas.offsetsToCoordinates(bezierEditor.P1).concat(bezierEditor.bezierCanvas.offsetsToCoordinates(bezierEditor.P2)),bezierEditor._commitTimingFunction(),bezierEditor._updateCanvas()}function handlePointMove(e,x,y){var self,bezierEditor=e.target.bezierEditor;function mouseMoveRedraw(){bezierEditor.dragElement?(bezierEditor._commitTimingFunction(),bezierEditor._updateCanvas(),animationRequest=window.requestAnimationFrame(mouseMoveRedraw)):animationRequest=null}if(bezierEditor.dragElement&&1!==e.which)return bezierEditor.dragElement=null,bezierEditor._commitTimingFunction(),bezierEditor._updateCanvas(),void(bezierEditor=null);x=Math.min(Math.max(0,x),WIDTH_MAIN),bezierEditor.dragElement&&$(bezierEditor.dragElement).css({left:x+"px",top:y+"px"}),bezierEditor._cubicBezierCoords=bezierEditor.bezierCanvas.offsetsToCoordinates(bezierEditor.P1).concat(bezierEditor.bezierCanvas.offsetsToCoordinates(bezierEditor.P2)),animationRequest||(animationRequest=window.requestAnimationFrame(mouseMoveRedraw))}function updateTimeProgression(curve,x,y){var percentX=Math.round(100*x/WIDTH_MAIN),percentY=Math.round((HEIGHT_MAIN-y)/HEIGHT_MAIN*100);percentX=Math.min(Math.max(0,percentX),100),curve.parentNode.setAttribute("data-time",percentX),curve.parentNode.setAttribute("data-progression",percentY)}function _curveMouseMove(e){var self=e.target,bezierEditor=self.bezierEditor,curveBoundingBox=bezierEditor._getCurveBoundingBox(),left=curveBoundingBox.left,top=curveBoundingBox.top,x=e.pageX-left,y=e.pageY-top-HEIGHT_ABOVE;if(updateTimeProgression(self,x,y),bezierEditor.dragElement){if(0===e.pageX&&0===e.pageY)return;handlePointMove(e,x,y)}}function _pointMouseMove(e){var self,bezierEditor=e.target.bezierEditor,curveBoundingBox=bezierEditor._getCurveBoundingBox(),left=curveBoundingBox.left,top=curveBoundingBox.top,x=e.pageX-left,y=e.pageY-top-HEIGHT_ABOVE;updateTimeProgression(bezierEditor.curve,x,y),0===e.pageX&&0===e.pageY||handlePointMove(e,x,y)}function _pointMouseDown(e){var self=e.target;self.bezierEditor.dragElement=self}function _pointMouseUp(e){var self=e.target;self.focus(),self.bezierEditor.dragElement&&(self.bezierEditor.dragElement=null,self.bezierEditor._commitTimingFunction(),self.bezierEditor._updateCanvas())}function _pointKeyDown(e){var code=e.keyCode,self,bezierEditor=e.target.bezierEditor;if(code>=KeyEvent.DOM_VK_LEFT&&code<=KeyEvent.DOM_VK_DOWN){e.preventDefault();var $this=$(e.target),left=parseInt($this.css("left"),10),top=parseInt($this.css("top"),10),offset=e.shiftKey?15:3,newVal;switch(code){case KeyEvent.DOM_VK_LEFT:if(left===(newVal=Math.max(0,left-offset)))return!1;$this.css({left:newVal+"px"});break;case KeyEvent.DOM_VK_UP:if(top===(newVal=Math.max(-HEIGHT_ABOVE,top-offset)))return!1;$this.css({top:newVal+"px"});break;case KeyEvent.DOM_VK_RIGHT:if(left===(newVal=Math.min(WIDTH_MAIN,left+offset)))return!1;$this.css({left:newVal+"px"});break;case KeyEvent.DOM_VK_DOWN:if(top===(newVal=Math.min(HEIGHT_MAIN+HEIGHT_BELOW,top+offset)))return!1;$this.css({top:newVal+"px"})}return bezierEditor._cubicBezierCoords=bezierEditor.bezierCanvas.offsetsToCoordinates(bezierEditor.P1).concat(bezierEditor.bezierCanvas.offsetsToCoordinates(bezierEditor.P2)),bezierEditor._commitTimingFunction(),bezierEditor._updateCanvas(),!0}return code===KeyEvent.DOM_VK_ESCAPE||!(code!==KeyEvent.DOM_VK_TAB||e.ctrlKey||e.metaKey||e.altKey)&&($(e.target).hasClass("P1")?$(".P2").focus():$(".P1").focus(),e.preventDefault(),!0)}function BezierCurveEditor($parent,bezierCurve,callback){this.$element=$(Mustache.render(BezierCurveEditorTemplate,Strings)),$parent.append(this.$element),this._callback=callback,this.dragElement=null,this._cubicBezierCoords=this._getCubicBezierCoords(bezierCurve),this.hint={},this.hint.elem=$(".hint",this.$element),bezierCurve.originalString?TimingFunctionUtils.showHideHint(this.hint,!0,bezierCurve.originalString,"cubic-bezier("+this._cubicBezierCoords.join(", ")+")"):TimingFunctionUtils.showHideHint(this.hint,!1),this.P1=this.$element.find(".P1")[0],this.P2=this.$element.find(".P2")[0],this.curve=this.$element.find(".curve")[0],this.P1.bezierEditor=this.P2.bezierEditor=this.curve.bezierEditor=this,this.bezierCanvas=new BezierCanvas(this.curve,null,[0,0]),this._updateCanvas(),$(this.curve).on("click",_curveClick).on("mousemove",_curveMouseMove),$(this.P1).on("mousemove",_pointMouseMove).on("mousedown",_pointMouseDown).on("mouseup",_pointMouseUp).on("keydown",_pointKeyDown),$(this.P2).on("mousemove",_pointMouseMove).on("mousedown",_pointMouseDown).on("mouseup",_pointMouseUp).on("keydown",_pointKeyDown)}BezierCanvas.prototype={getOffsets:function(){var p=this.padding,w=this.canvas.width,h=.5*this.canvas.height;return[{left:w*(this.bezier.coordinates[0]*(1-p[3]-p[1])-p[3])+"px",top:h*(1-this.bezier.coordinates[1]*(1-p[0]-p[2])-p[0])+"px"},{left:w*(this.bezier.coordinates[2]*(1-p[3]-p[1])-p[3])+"px",top:h*(1-this.bezier.coordinates[3]*(1-p[0]-p[2])-p[0])+"px"}]},prettify:function(v){return(Math.round(100*v)/100).toString().replace(/^0\./,".")},offsetsToCoordinates:function(element){var p=this.padding,w=this.canvas.width,h=.5*this.canvas.height;return p=p.map(function(a,i){return a*(i%2?w:h)}),[this.prettify((parseInt($(element).css("left"),10)-p[3])/(w+p[1]+p[3])),this.prettify((h-parseInt($(element).css("top"),10)-p[2])/(h-p[0]-p[2]))]},plot:function(settings){var xy=this.bezier.coordinates,ctx=this.canvas.getContext("2d"),setting,defaultSettings={handleTimingFunction:"#2893ef",handleThickness:.008,vBorderThickness:.02,hBorderThickness:.01,bezierTimingFunction:"#2893ef",bezierThickness:.03};for(setting in settings=settings||{},defaultSettings)defaultSettings.hasOwnProperty(setting)&&(settings.hasOwnProperty(setting)||(settings[setting]=defaultSettings[setting]));ctx.clearRect(-.5,-.5,2,2),ctx.beginPath(),ctx.fillStyle=settings.handleTimingFunction,ctx.lineWidth=settings.handleThickness,ctx.strokeStyle=settings.handleTimingFunction,ctx.moveTo(0,0),ctx.lineTo(xy[0],xy[1]),ctx.moveTo(1,1),ctx.lineTo(xy[2],xy[3]),ctx.stroke(),ctx.closePath(),ctx.beginPath(),ctx.arc(xy[0],xy[1],1.5*settings.handleThickness,0,2*Math.PI,!1),ctx.closePath(),ctx.fill(),ctx.beginPath(),ctx.arc(xy[2],xy[3],1.5*settings.handleThickness,0,2*Math.PI,!1),ctx.closePath(),ctx.fill(),ctx.beginPath(),ctx.lineWidth=settings.bezierThickness,ctx.strokeStyle=settings.bezierColor,ctx.moveTo(0,0),ctx.bezierCurveTo(xy[0],xy[1],xy[2],xy[3],1,1),ctx.stroke(),ctx.closePath()},getPadding:function(padding){var p="number"==typeof padding?[padding]:padding;return 1===p.length&&(p[1]=p[0]),2===p.length&&(p[2]=p[0]),3===p.length&&(p[3]=p[1]),p}},BezierCurveEditor.prototype.destroy=function(){this.P1.bezierEditor=this.P2.bezierEditor=this.curve.bezierEditor=null,$(this.curve).off("click",_curveClick).off("mousemove",_curveMouseMove),$(this.P1).off("mousemove",_pointMouseMove).off("mousedown",_pointMouseDown).off("mouseup",_pointMouseUp).off("keydown",_pointKeyDown),$(this.P2).off("mousemove",_pointMouseMove).off("mousedown",_pointMouseDown).off("mouseup",_pointMouseUp).off("keydown",_pointKeyDown)},BezierCurveEditor.prototype.getRootElement=function(){return this.$element},BezierCurveEditor.prototype.focus=function(){return this.P1.focus(),!0},BezierCurveEditor.prototype._commitTimingFunction=function(){var bezierCurveVal="cubic-bezier("+this._cubicBezierCoords[0]+", "+this._cubicBezierCoords[1]+", "+this._cubicBezierCoords[2]+", "+this._cubicBezierCoords[3]+")";this._callback(bezierCurveVal),TimingFunctionUtils.showHideHint(this.hint,!1)},BezierCurveEditor.prototype._getCubicBezierCoords=function(match){if(match[0].match(/^cubic-bezier/))return match.slice(1,5);switch(match[0]){case"linear":return["0","0","1","1"];case"ease":return[".25",".1",".25","1"];case"ease-in":return[".42","0","1","1"];case"ease-out":return["0","0",".58","1"];case"ease-in-out":return[".42","0",".58","1"]}return window.console.log("brackets-cubic-bezier: getCubicBezierCoords() passed invalid RegExp match array"),["0","0","0","0"]},BezierCurveEditor.prototype._getCurveBoundingBox=function(){var $canvas=this.$element.find(".curve"),canvasOffset=$canvas.offset();return{left:canvasOffset.left,top:canvasOffset.top,width:$canvas.width(),height:$canvas.height()}},BezierCurveEditor.prototype._updateCanvas=function(){if(this._cubicBezierCoords){this.bezierCanvas.bezier=window.bezier=new CubicBezier(this._cubicBezierCoords);var offsets=this.bezierCanvas.getOffsets();$(this.P1).css({left:offsets[0].left,top:offsets[0].top}),$(this.P2).css({left:offsets[1].left,top:offsets[1].top}),this.bezierCanvas.plot()}},BezierCurveEditor.prototype.handleExternalUpdate=function(bezierCurve){this._cubicBezierCoords=this._getCubicBezierCoords(bezierCurve),this._updateCanvas(),bezierCurve.originalString?TimingFunctionUtils.showHideHint(this.hint,!0,bezierCurve.originalString,"cubic-bezier("+this._cubicBezierCoords.join(", ")+")"):TimingFunctionUtils.showHideHint(this.hint,!1)},exports.BezierCurveEditor=BezierCurveEditor});
//# sourceMappingURL=BezierCurveEditor.js.map