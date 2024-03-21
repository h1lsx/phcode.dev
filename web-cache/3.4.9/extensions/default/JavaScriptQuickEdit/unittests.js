define(function(require,exports,module){var CommandManager,EditorManager,PerfUtils,JSUtils,Commands,SpecRunnerUtils=brackets.getModule("spec/SpecRunnerUtils"),Strings=brackets.getModule("strings"),UnitTestReporter=brackets.getModule("test/UnitTestReporter"),extensionPath=SpecRunnerUtils.getTestPath("/spec/Extension-test-project-files/"),testPath=extensionPath+"/js-quickedit-unittest-files/syntax",tempPath=SpecRunnerUtils.getTempDirectory(),testWindow,initInlineTest;function rewriteProject(spec){var result=new $.Deferred,infos={},options={parseOffsets:!0,infos:infos,removePrefix:!0};return SpecRunnerUtils.copyPath(testPath,tempPath,options).done(function(){spec.infos=infos,result.resolve()}).fail(function(){result.reject()}),result.promise()}function fixPos(pos){return"sticky"in pos||(pos.sticky=null),pos}var _initInlineTest=async function(openFile,openOffset,expectInline,filesToOpen){var spec=this;filesToOpen=filesToOpen||[],expectInline=void 0===expectInline||expectInline,await awaitsForDone(rewriteProject(this),"rewriteProject"),await SpecRunnerUtils.loadProjectInTestWindow(tempPath),filesToOpen.push(openFile),await awaitsForDone(SpecRunnerUtils.openProjectFiles(filesToOpen),"openProjectFiles"),void 0!==openOffset&&await awaitsForDone(SpecRunnerUtils.toggleQuickEditAtOffset(EditorManager.getCurrentFullEditor(),this.infos[openFile].offsets[openOffset]),"toggleQuickEditAtOffset")};describe("extension:JSQuickEdit",function(){describe("javaScriptFunctionProvider",function(){beforeEach(async function(){initInlineTest=_initInlineTest.bind(this),testWindow=await SpecRunnerUtils.createTestWindowAndRun(),EditorManager=testWindow.brackets.test.EditorManager,CommandManager=testWindow.brackets.test.CommandManager,JSUtils=testWindow.brackets.test.JSUtils},3e4),afterEach(async function(){initInlineTest=null,testWindow=null,EditorManager=null,CommandManager=null,JSUtils=null,await SpecRunnerUtils.closeTestWindow()},3e4),it("should ignore tokens that are not function calls or references",async function(){var editor,extensionRequire,jsQuickEditMain,tokensFile="tokens.js",promise,offsets;await initInlineTest(tokensFile),jsQuickEditMain=(extensionRequire=testWindow.brackets.getModule("utils/ExtensionLoader").getRequireContextForExtension("JavaScriptQuickEdit"))("main"),editor=EditorManager.getCurrentFullEditor(),offsets=this.infos[tokensFile],promise=jsQuickEditMain.javaScriptFunctionProvider(editor,offsets[0]),expect(promise).toBe(Strings.ERROR_JSQUICKEDIT_FUNCTIONNOTFOUND),promise=jsQuickEditMain.javaScriptFunctionProvider(editor,offsets[1]),expect(promise).toBe(Strings.ERROR_JSQUICKEDIT_FUNCTIONNOTFOUND),promise=jsQuickEditMain.javaScriptFunctionProvider(editor,offsets[2]),expect(promise).toBe(Strings.ERROR_JSQUICKEDIT_FUNCTIONNOTFOUND),promise=jsQuickEditMain.javaScriptFunctionProvider(editor,offsets[3]),expect(promise).toBe(Strings.ERROR_JSQUICKEDIT_FUNCTIONNOTFOUND),promise=jsQuickEditMain.javaScriptFunctionProvider(editor,offsets[4]),expect(promise).toBe(Strings.ERROR_JSQUICKEDIT_FUNCTIONNOTFOUND)}),it("should open a function with  form: function functionName()",async function(){await initInlineTest("test1main.js",0);var inlineWidget,inlinePos=EditorManager.getCurrentFullEditor().getInlineWidgets()[0].editor.getCursorPos();expect(fixPos(inlinePos)).toEql(fixPos(this.infos["test1inline.js"].offsets[0]))}),it("should open a function with  form: functionName = function()",async function(){await initInlineTest("test1main.js",1);var inlineWidget,inlinePos=EditorManager.getCurrentFullEditor().getInlineWidgets()[0].editor.getCursorPos();expect(fixPos(inlinePos)).toEql(fixPos(this.infos["test1inline.js"].offsets[1]))}),it("should open a function with  form: functionName: function()",async function(){await initInlineTest("test1main.js",2);var inlineWidget,inlinePos=EditorManager.getCurrentFullEditor().getInlineWidgets()[0].editor.getCursorPos();expect(fixPos(inlinePos)).toEql(fixPos(this.infos["test1inline.js"].offsets[2]))}),describe("Code hints tests within quick edit window ",function(){var JSCodeHints,ParameterHintProvider;function expectHints(provider,key){return void 0===key&&(key=null),expect(provider.hasHints(EditorManager.getActiveEditor(),key)).toBe(!0),provider.getHints(null)}async function _waitForHints(hintObj,callback){var complete=!1,hintList=null;hintObj.hasOwnProperty("hints")?(complete=!0,hintList=hintObj.hints):hintObj.done(function(obj){complete=!0,hintList=obj.hints}),await awaitsFor(function(){return complete},"Expected hints did not resolve",3e3),callback(hintList)}async function hintsPresentExact(hintObj,expectedHints){await _waitForHints(hintObj,function(hintList){expect(hintList).toBeTruthy(),expect(hintList.length).toBe(expectedHints.length),expectedHints.forEach(function(expectedHint,index){expect(hintList[index].data("token").value).toBe(expectedHint)})})}async function expectParameterHint(expectedParams,expectedParameter){var requestHints=void 0,request=null;function expectHint(hint){var params=hint.parameters,n=params.length,i;for(expect(params.length).toBe(expectedParams.length),expect(hint.currentIndex).toBe(expectedParameter),i=0;i<n;i++)expect(params[i].name).toBe(expectedParams[i].name),expect(params[i].type).toBe(expectedParams[i].type),params[i].isOptional?expect(expectedParams[i].isOptional).toBeTruthy():expect(expectedParams[i].isOptional).toBeFalsy()}request=ParameterHintProvider._getParameterHint(),null===expectedParams?(request.fail(function(result){requestHints=result}),await awaitsForFail(request,"ParameterHints")):(request.done(function(result){requestHints=result}),await awaitsForDone(request,"ParameterHints")),null===expectedParams?expect(requestHints).toBe(null):expectHint(requestHints)}async function _waitForJump(oldLocation,callback){var cursor=null;await awaitsFor(function(){var activeEditor=EditorManager.getActiveEditor();return(cursor=activeEditor.getCursorPos()).line!==oldLocation.line||cursor.ch!==oldLocation.ch},"Expected jump did not occur",3e3),callback(cursor)}async function editorJumped(jsCodeHints,testEditor,expectedLocation){var oldLocation=testEditor.getCursorPos();jsCodeHints.handleJumpToDefinition(),await _waitForJump(oldLocation,function(newCursor){if(expect(newCursor.line).toBe(expectedLocation.line),expect(newCursor.ch).toBe(expectedLocation.ch),expectedLocation.file){var activeEditor=EditorManager.getActiveEditor();expect(activeEditor.document.file.name).toBe(expectedLocation.file)}})}function initJSCodeHints(){let extensionRequire=testWindow.brackets.getModule("utils/ExtensionLoader").getRequireContextForExtension("JavaScriptCodeHints");JSCodeHints=extensionRequire("main"),ParameterHintProvider=JSCodeHints._phProvider}beforeEach(async function(){await initInlineTest("test.html"),initJSCodeHints()}),afterEach(function(){JSCodeHints=null,ParameterHintProvider=null}),it("should see code hint lists in quick editor",async function(){var start={line:13,ch:11},testPos={line:5,ch:29},testEditor,openQuickEditor=SpecRunnerUtils.toggleQuickEditAtOffset(EditorManager.getCurrentFullEditor(),start);await awaitsForDone(openQuickEditor,"Open quick editor"),(testEditor=EditorManager.getActiveEditor()).setCursorPos(testPos),await awaits(1e3),await expectParameterHint([{name:"mo",type:"Number"}],0)}),it("should see jump to definition on variable working in quick editor",async function(){var start={line:13,ch:10},testPos={line:6,ch:7},testJumpPos={line:6,ch:5},jumpPos={line:3,ch:6},testEditor,openQuickEditor=SpecRunnerUtils.toggleQuickEditAtOffset(EditorManager.getCurrentFullEditor(),start);await awaitsForDone(openQuickEditor,"Open quick editor"),(testEditor=EditorManager.getActiveEditor()).setCursorPos(testPos);var hintObj=expectHints(JSCodeHints.jsHintProvider);await hintsPresentExact(hintObj,["propA"]),(testEditor=EditorManager.getActiveEditor()).setCursorPos(testJumpPos),await editorJumped(JSCodeHints,testEditor,jumpPos)})})})}),describe("performance:JS Quick Edit Extension",function(){var testPath=extensionPath+"/js-quickedit-unittest-files/jquery-ui";beforeEach(async function(){testWindow=await SpecRunnerUtils.createTestWindowAndRun(),CommandManager=testWindow.brackets.test.CommandManager,Commands=testWindow.brackets.test.Commands,EditorManager=testWindow.brackets.test.EditorManager,PerfUtils=testWindow.brackets.test.PerfUtils},3e4),afterEach(async function(){testWindow=null,CommandManager=null,EditorManager=null,PerfUtils=null,await SpecRunnerUtils.closeTestWindow()},3e4),it("should open inline editors",async function(){var i,perfMeasurements;await SpecRunnerUtils.loadProjectInTestWindow(testPath),perfMeasurements=[{measure:PerfUtils.JAVASCRIPT_INLINE_CREATE,children:[{measure:PerfUtils.JAVASCRIPT_FIND_FUNCTION,children:[{measure:PerfUtils.JSUTILS_GET_ALL_FUNCTIONS,children:[{measure:PerfUtils.DOCUMENT_MANAGER_GET_DOCUMENT_FOR_PATH,name:"Document creation during this search",operation:"sum"},{measure:PerfUtils.JSUTILS_REGEXP,operation:"sum"}]},{measure:PerfUtils.JSUTILS_END_OFFSET,operation:"sum"}]}]}],await awaitsForDone(SpecRunnerUtils.openProjectFiles(["ui/jquery.effects.core.js"]),"openProjectFiles");var runCreateInlineEditor=async function(){var editor;EditorManager.getCurrentFullEditor().setCursorPos(271,20),await awaitsForDone(CommandManager.execute(Commands.TOGGLE_QUICK_EDIT),"createInlineEditor",5e3)};function logPerf(){var reporter=UnitTestReporter.getActiveReporter();reporter.logTestWindow(perfMeasurements),reporter.clearTestWindow()}for(await awaits(5e3),i=0;i<5;i++)await runCreateInlineEditor(),logPerf()},3e4)})});
//# sourceMappingURL=unittests.js.map