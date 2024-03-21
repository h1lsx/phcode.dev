!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";CodeMirror.defineMode("ebnf",function(config){var commentType_slash=0,commentType_parenthesis=1,stateType_comment=0,stateType__string=1,stateType_characterClass=2,bracesMode=null;return config.bracesMode&&(bracesMode=CodeMirror.getMode(config,config.bracesMode)),{startState:function(){return{stringType:null,commentType:null,braced:0,lhs:!0,localState:null,stack:[],inDefinition:!1}},token:function(stream,state){if(stream){switch(0===state.stack.length&&('"'==stream.peek()||"'"==stream.peek()?(state.stringType=stream.peek(),stream.next(),state.stack.unshift(stateType__string)):stream.match("/*")?(state.stack.unshift(stateType_comment),state.commentType=commentType_slash):stream.match("(*")&&(state.stack.unshift(stateType_comment),state.commentType=commentType_parenthesis)),state.stack[0]){case stateType__string:for(;state.stack[0]===stateType__string&&!stream.eol();)stream.peek()===state.stringType?(stream.next(),state.stack.shift()):"\\"===stream.peek()?(stream.next(),stream.next()):stream.match(/^.[^\\\"\']*/);return state.lhs?"property string":"string";case stateType_comment:for(;state.stack[0]===stateType_comment&&!stream.eol();)state.commentType===commentType_slash&&stream.match("*/")?(state.stack.shift(),state.commentType=null):state.commentType===commentType_parenthesis&&stream.match("*)")?(state.stack.shift(),state.commentType=null):stream.match(/^.[^\*]*/);return"comment";case stateType_characterClass:for(;state.stack[0]===stateType_characterClass&&!stream.eol();)stream.match(/^[^\]\\]+/)||stream.match(".")||state.stack.shift();return"operator"}var peek=stream.peek();if(null!==bracesMode&&(state.braced||"{"===peek)){null===state.localState&&(state.localState=CodeMirror.startState(bracesMode));var token=bracesMode.token(stream,state.localState),text=stream.current();if(!token)for(var i=0;i<text.length;i++)"{"===text[i]?(0===state.braced&&(token="matchingbracket"),state.braced++):"}"===text[i]&&(state.braced--,0===state.braced&&(token="matchingbracket"));return token}switch(peek){case"[":return stream.next(),state.stack.unshift(stateType_characterClass),"bracket";case":":case"|":case";":return stream.next(),"operator";case"%":if(stream.match("%%"))return"header";if(stream.match(/[%][A-Za-z]+/))return"keyword";if(stream.match(/[%][}]/))return"matchingbracket";break;case"/":if(stream.match(/[\/][A-Za-z]+/))return"keyword";case"\\":if(stream.match(/[\][a-z]+/))return"string-2";case".":if(stream.match("."))return"atom";case"*":case"-":case"+":case"^":if(stream.match(peek))return"atom";case"$":if(stream.match("$$"))return"builtin";if(stream.match(/[$][0-9]+/))return"variable-3";case"<":if(stream.match(/<<[a-zA-Z_]+>>/))return"builtin"}return stream.match("//")?(stream.skipToEnd(),"comment"):stream.match("return")?"operator":stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)?stream.match(/(?=[\(.])/)?"variable":stream.match(/(?=[\s\n]*[:=])/)?"def":"variable-2":-1!=["[","]","(",")"].indexOf(stream.peek())?(stream.next(),"bracket"):(stream.eatSpace()||stream.next(),null)}}}}),CodeMirror.defineMIME("text/x-ebnf","ebnf")});
//# sourceMappingURL=ebnf.js.map