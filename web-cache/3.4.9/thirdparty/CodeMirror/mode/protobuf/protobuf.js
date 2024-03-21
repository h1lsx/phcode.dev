!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";function wordRegexp(words){return new RegExp("^(("+words.join(")|(")+"))\\b","i")}var keywordArray=["package","message","import","syntax","required","optional","repeated","reserved","default","extensions","packed","bool","bytes","double","enum","float","string","int32","int64","uint32","uint64","sint32","sint64","fixed32","fixed64","sfixed32","sfixed64","option","service","rpc","returns"],keywords=wordRegexp(keywordArray);CodeMirror.registerHelper("hintWords","protobuf",keywordArray);var identifiers=new RegExp("^[_A-Za-z¡-￿][_A-Za-z0-9¡-￿]*");function tokenBase(stream){if(stream.eatSpace())return null;if(stream.match("//"))return stream.skipToEnd(),"comment";if(stream.match(/^[0-9\.+-]/,!1)){if(stream.match(/^[+-]?0x[0-9a-fA-F]+/))return"number";if(stream.match(/^[+-]?\d*\.\d+([EeDd][+-]?\d+)?/))return"number";if(stream.match(/^[+-]?\d+([EeDd][+-]?\d+)?/))return"number"}return stream.match(/^"([^"]|(""))*"/)?"string":stream.match(/^'([^']|(''))*'/)?"string":stream.match(keywords)?"keyword":stream.match(identifiers)?"variable":(stream.next(),null)}CodeMirror.defineMode("protobuf",function(){return{token:tokenBase,fold:"brace"}}),CodeMirror.defineMIME("text/x-protobuf","protobuf")});
//# sourceMappingURL=protobuf.js.map