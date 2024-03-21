define(function(require,exports,module){var CodeMirror=brackets.getModule("thirdparty/CodeMirror/lib/codemirror"),prefs=require("Prefs");function State(options){this.options=options,this.from=this.to=0}function parseOptions(opts){return!0===opts&&(opts={}),opts.gutter||(opts.gutter="CodeMirror-foldgutter"),opts.indicatorOpen||(opts.indicatorOpen="CodeMirror-foldgutter-open"),opts.indicatorFolded||(opts.indicatorFolded="CodeMirror-foldgutter-folded"),opts}function marker(spec){var elt=window.document.createElement("div");return elt.className=spec,elt}function isFold(m){return m.__isFold}function updateFoldInfo(cm,from,to){var minFoldSize=prefs.getSetting("minFoldSize")||2,opts=cm.state.foldGutter.options,fade=prefs.getSetting("hideUntilMouseover"),$gutter=$(cm.getGutterElement()),i=from;function clear(m){return m.clear()}function _isCurrentlyFolded(line){for(var keys=Object.keys(cm._lineFolds),i=0,range;i<keys.length;){if((range=cm._lineFolds[keys[i]]).from.line<line&&range.to.line>=line)return range;i++}}for(i===to&&window.setTimeout(function(){var vp=cm.getViewport();updateFoldInfo(cm,vp.from,vp.to)},200);i<to;){var sr=_isCurrentlyFolded(i),range,mark=marker("CodeMirror-foldgutter-blank"),pos=CodeMirror.Pos(i,0),func=opts.rangeFinder||CodeMirror.fold.auto;sr?i=sr.to.line+1:(range=cm._lineFolds[i]||func&&func(cm,pos),(!fade||fade&&$gutter.is(":hover"))&&(cm.isFolded(i)?range?mark=marker(opts.indicatorFolded):cm.findMarksAt(pos).filter(isFold).forEach(clear):range&&range.to.line-range.from.line>=minFoldSize&&(mark=marker(opts.indicatorOpen))),cm.setGutterMarker(i,opts.gutter,mark),i++)}}function updateInViewport(cm,from,to){var vp=cm.getViewport(),state=cm.state.foldGutter;from=isNaN(from)?vp.from:from,to=isNaN(to)?vp.to:to,state&&(cm.operation(function(){updateFoldInfo(cm,from,to)}),state.from=from,state.to=to)}function getFoldOnLine(cm,line){var pos=CodeMirror.Pos(line,0),folds=cm.findMarksAt(pos)||[];return(folds=folds.filter(isFold)).length?folds[0]:void 0}function syncDocToFoldsCache(cm,from,lineAdded){var minFoldSize=prefs.getSetting("minFoldSize")||2,i,fold,range;if(!(lineAdded<=0))for(i=from;i<=from+lineAdded;i+=1)(fold=getFoldOnLine(cm,i))&&((range=fold.find())&&range.to.line-range.from.line>=minFoldSize?(cm._lineFolds[i]=range,i=range.to.line):delete cm._lineFolds[i])}function moveRange(range,numLines){return{from:CodeMirror.Pos(range.from.line+numLines,range.from.ch),to:CodeMirror.Pos(range.to.line+numLines,range.to.ch)}}function updateFoldsCache(cm,from,linesDiff){var oldRange,newRange,minFoldSize=prefs.getSetting("minFoldSize")||2,foldedLines=Object.keys(cm._lineFolds).map(function(d){return+d}),opts,rf=(cm.state.foldGutter.options||{}).rangeFinder||CodeMirror.fold.auto;if(0===linesDiff)foldedLines.indexOf(from)>=0&&((newRange=rf(cm,CodeMirror.Pos(from,0)))&&newRange.to.line-newRange.from.line>=minFoldSize?cm._lineFolds[from]=newRange:delete cm._lineFolds[from]);else if(foldedLines.length){var newFolds={};foldedLines.forEach(function(line){oldRange=cm._lineFolds[line],newRange=moveRange(oldRange,linesDiff),linesDiff<0?line<from?newFolds[line]=oldRange:line>=from+Math.abs(linesDiff)&&(newFolds[line+linesDiff]=newRange):line<from?newFolds[line]=oldRange:line>=from&&(newFolds[line+linesDiff]=newRange)}),cm._lineFolds=newFolds}}function onChange(cm,changeObj){if("setValue"===changeObj.origin){var folds=cm.getValidFolds(cm._lineFolds);cm._lineFolds=folds,Object.keys(folds).forEach(function(line){cm.foldCode(+line)})}else{var state=cm.state.foldGutter,lineChanges=changeObj.text.length-changeObj.removed.length;"undo"===changeObj.origin&&lineChanges>0?(updateFoldsCache(cm,changeObj.from.line,lineChanges),syncDocToFoldsCache(cm,changeObj.from.line,lineChanges)):updateFoldsCache(cm,changeObj.from.line,lineChanges),0!==lineChanges&&updateFoldInfo(cm,Math.max(0,changeObj.from.line+lineChanges),Math.max(0,changeObj.from.line+lineChanges)+1),state.from=changeObj.from.line,state.to=0,window.clearTimeout(state.changeUpdate),state.changeUpdate=window.setTimeout(function(){updateInViewport(cm)},600)}}function onViewportChange(cm){var state=cm.state.foldGutter;window.clearTimeout(state.changeUpdate),state.changeUpdate=window.setTimeout(function(){var vp=cm.getViewport();state.from===state.to||vp.from-state.to>20||state.from-vp.to>20?updateInViewport(cm):cm.operation(function(){vp.from<state.from&&(updateFoldInfo(cm,vp.from,state.from),state.from=vp.from),vp.to>state.to?(updateFoldInfo(cm,state.to,vp.to),state.to=vp.to):(updateFoldInfo(cm,vp.from,vp.to),state.to=vp.to,state.from=vp.from)})},400)}function onCursorActivity(cm){var state=cm.state.foldGutter,vp=cm.getViewport();window.clearTimeout(state.changeUpdate),state.changeUpdate=window.setTimeout(function(){updateInViewport(cm,vp.from,vp.to)},400)}function onFold(cm,from,to){var state=cm.state.foldGutter;updateFoldInfo(cm,from.line,from.line+1)}function onUnFold(cm,from,to){var state=cm.state.foldGutter,vp=cm.getViewport();delete cm._lineFolds[from.line],updateFoldInfo(cm,from.line,to.line||vp.to)}function init(){CodeMirror.defineOption("foldGutter",!1,function(cm,val,old){old&&old!==CodeMirror.Init&&(cm.clearGutter(cm.state.foldGutter.options.gutter),cm.state.foldGutter=null,cm.off("gutterClick",old.onGutterClick),cm.off("change",onChange),cm.off("viewportChange",onViewportChange),cm.off("cursorActivity",onCursorActivity),cm.off("fold",onFold),cm.off("unfold",onUnFold),cm.off("swapDoc",updateInViewport)),val&&(cm.state.foldGutter=new State(parseOptions(val)),updateInViewport(cm),cm.on("gutterClick",val.onGutterClick),cm.on("change",onChange),cm.on("viewportChange",onViewportChange),cm.on("cursorActivity",onCursorActivity),cm.on("fold",onFold),cm.on("unfold",onUnFold),cm.on("swapDoc",updateInViewport))})}exports.init=init,exports.updateInViewport=updateInViewport});
//# sourceMappingURL=foldgutter.js.map