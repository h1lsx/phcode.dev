!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";CodeMirror.defineMode("troff",function(){var words={};function tokenBase(stream){if(stream.eatSpace())return null;var sol=stream.sol(),ch=stream.next();if("\\"===ch)return stream.match("fB")||stream.match("fR")||stream.match("fI")||stream.match("u")||stream.match("d")||stream.match("%")||stream.match("&")?"string":stream.match("m[")?(stream.skipTo("]"),stream.next(),"string"):stream.match("s+")||stream.match("s-")?(stream.eatWhile(/[\d-]/),"string"):stream.match("(")||stream.match("*(")?(stream.eatWhile(/[\w-]/),"string"):"string";if(sol&&("."===ch||"'"===ch)&&stream.eat("\\")&&stream.eat('"'))return stream.skipToEnd(),"comment";if(sol&&"."===ch){if(stream.match("B ")||stream.match("I ")||stream.match("R "))return"attribute";if(stream.match("TH ")||stream.match("SH ")||stream.match("SS ")||stream.match("HP "))return stream.skipToEnd(),"quote";if(stream.match(/[A-Z]/)&&stream.match(/[A-Z]/)||stream.match(/[a-z]/)&&stream.match(/[a-z]/))return"attribute"}stream.eatWhile(/[\w-]/);var cur=stream.current();return words.hasOwnProperty(cur)?words[cur]:null}function tokenize(stream,state){return(state.tokens[0]||tokenBase)(stream,state)}return{startState:function(){return{tokens:[]}},token:function(stream,state){return tokenize(stream,state)}}}),CodeMirror.defineMIME("text/troff","troff"),CodeMirror.defineMIME("text/x-troff","troff"),CodeMirror.defineMIME("application/x-troff","troff")});
//# sourceMappingURL=troff.js.map