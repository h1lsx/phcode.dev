!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror"),require("../../mode/css/css")):"function"==typeof define&&define.amd?define(["../../lib/codemirror","../../mode/css/css"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";var pseudoClasses={active:1,after:1,before:1,checked:1,default:1,disabled:1,empty:1,enabled:1,"first-child":1,"first-letter":1,"first-line":1,"first-of-type":1,focus:1,hover:1,"in-range":1,indeterminate:1,invalid:1,lang:1,"last-child":1,"last-of-type":1,link:1,not:1,"nth-child":1,"nth-last-child":1,"nth-last-of-type":1,"nth-of-type":1,"only-of-type":1,"only-child":1,optional:1,"out-of-range":1,placeholder:1,"read-only":1,"read-write":1,required:1,root:1,selection:1,target:1,valid:1,visited:1};CodeMirror.registerHelper("hint","css",function(cm){var cur=cm.getCursor(),token=cm.getTokenAt(cur),inner=CodeMirror.innerMode(cm.getMode(),token.state);if("css"==inner.mode.name){if("keyword"==token.type&&0=="!important".indexOf(token.string))return{list:["!important"],from:CodeMirror.Pos(cur.line,token.start),to:CodeMirror.Pos(cur.line,token.end)};var start=token.start,end=cur.ch,word=token.string.slice(0,end-start);/[^\w$_-]/.test(word)&&(word="",start=end=cur.ch);var spec=CodeMirror.resolveMode("text/css"),result=[],st=inner.state.state;return"pseudo"==st||"variable-3"==token.type?add(pseudoClasses):"block"==st||"maybeprop"==st?add(spec.propertyKeywords):"prop"==st||"parens"==st||"at"==st||"params"==st?(add(spec.valueKeywords),add(spec.colorKeywords)):"media"!=st&&"media_parens"!=st||(add(spec.mediaTypes),add(spec.mediaFeatures)),result.length?{list:result,from:CodeMirror.Pos(cur.line,start),to:CodeMirror.Pos(cur.line,end)}:void 0}function add(keywords){for(var name in keywords)word&&0!=name.lastIndexOf(word,0)||result.push(name)}})});
//# sourceMappingURL=css-hint.js.map