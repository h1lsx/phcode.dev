!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";CodeMirror.defineMode("cmake",function(){var variable_regex=/({)?[a-zA-Z0-9_]+(})?/;function tokenString(stream,state){for(var current,prev,found_var=!1;!stream.eol()&&(current=stream.next())!=state.pending;){if("$"===current&&"\\"!=prev&&'"'==state.pending){found_var=!0;break}prev=current}return found_var&&stream.backUp(1),current==state.pending?state.continueString=!1:state.continueString=!0,"string"}function tokenize(stream,state){var ch=stream.next();return"$"===ch?stream.match(variable_regex)?"variable-2":"variable":state.continueString?(stream.backUp(1),tokenString(stream,state)):stream.match(/(\s+)?\w+\(/)||stream.match(/(\s+)?\w+\ \(/)?(stream.backUp(1),"def"):"#"==ch?(stream.skipToEnd(),"comment"):"'"==ch||'"'==ch?(state.pending=ch,tokenString(stream,state)):"("==ch||")"==ch?"bracket":ch.match(/[0-9]/)?"number":(stream.eatWhile(/[\w-]/),null)}return{startState:function(){var state={inDefinition:!1,inInclude:!1,continueString:!1,pending:!1};return state},token:function(stream,state){return stream.eatSpace()?null:tokenize(stream,state)}}}),CodeMirror.defineMIME("text/x-cmake","cmake")});
//# sourceMappingURL=cmake.js.map