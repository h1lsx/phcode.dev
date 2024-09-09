define(function(require,exports,module){const CodeInspection=brackets.getModule("language/CodeInspection"),FileSystemError=brackets.getModule("filesystem/FileSystemError"),AppInit=brackets.getModule("utils/AppInit"),PreferencesManager=brackets.getModule("preferences/PreferencesManager"),DocumentManager=brackets.getModule("document/DocumentManager"),Strings=brackets.getModule("strings"),StringUtils=brackets.getModule("utils/StringUtils"),ProjectManager=brackets.getModule("project/ProjectManager"),LanguageManager=brackets.getModule("language/LanguageManager"),NodeUtils=brackets.getModule("utils/NodeUtils"),Metrics=brackets.getModule("utils/Metrics");let prefs=PreferencesManager.getExtensionPrefs("ESLint"),useESLintFromProject=!1;const ESLINT_ERROR_MODULE_LOAD_FAILED="ESLINT_MODULE_LOAD_FAILED",ESLINT_ERROR_MODULE_NOT_FOUND="ESLINT_MODULE_NOT_FOUND",ESLINT_ERROR_LINT_FAILED="ESLINT_LINT_FAILED",ESLINT_ONLY_IN_NATIVE_APP="ESLINT_ERROR_ONLY_IN_NATIVE_APP",PREFS_ESLINT_DISABLED="disabled";let esLintServiceFailed=!1;function _getLintError(errorCode,message){let errorMessage=Strings.DESCRIPTION_ESLINT_FAILED;switch(errorCode){case ESLINT_ERROR_LINT_FAILED:errorMessage=StringUtils.format(Strings.DESCRIPTION_ESLINT_FAILED,message||"Unknown");break;case ESLINT_ONLY_IN_NATIVE_APP:errorMessage=Strings.DESCRIPTION_ESLINT_USE_NATIVE_APP;break;case ESLINT_ERROR_MODULE_NOT_FOUND:errorMessage=Strings.DESCRIPTION_ESLINT_DO_NPM_INSTALL;break;case ESLINT_ERROR_MODULE_LOAD_FAILED:errorMessage=Strings.DESCRIPTION_ESLINT_LOAD_FAILED}return[{pos:{line:-1,ch:0},htmlMessage:errorMessage,type:CodeInspection.Type.ERROR}]}function _getErrorClass(severity){switch(severity){case 1:return CodeInspection.Type.WARNING;case 2:return CodeInspection.Type.ERROR;default:return console.error("Unknown ESLint severity!!!",severity),CodeInspection.Type.META}}function _0Based(index,defaultVal){return 0===index?0:index?index-1:defaultVal}function _getErrors(resultArray){return resultArray.map(function(lintError){let fix=null;return lintError.fix&&lintError.fix.range&&"string"==typeof lintError.fix.text&&(fix={replaceText:lintError.fix.text,rangeOffset:{start:lintError.fix.range[0],end:lintError.fix.range[1]}}),{pos:{line:_0Based(lintError.line),ch:_0Based(lintError.column)},endPos:{line:_0Based(lintError.endLine,lintError.line),ch:_0Based(lintError.endColumn,lintError.column)},message:`${lintError.message} ESLint (${lintError.ruleId})`,type:_getErrorClass(lintError.severity),fix:fix}})}function _isEslintSupportsJSX(config){if(!config)return!1;let parserOptions=config.parserOptions;return!parserOptions&&config.languageOptions&&config.languageOptions.parserOptions&&(parserOptions=config.languageOptions.parserOptions),parserOptions&&parserOptions.ecmaFeatures&&parserOptions.ecmaFeatures.jsx}async function lintOneFile(text,fullPath){return new Promise(resolve=>{if(!Phoenix.isNativeApp)return void resolve({errors:_getLintError(ESLINT_ONLY_IN_NATIVE_APP)});const startTime=Date.now();NodeUtils.ESLintFile(text,fullPath,ProjectManager.getProjectRoot().fullPath).then(esLintResult=>{Metrics.logPerformanceTime("ESLint",Date.now()-startTime);const language=LanguageManager.getLanguageForPath(fullPath).getId();"jsx"!==language||_isEslintSupportsJSX(esLintResult.config)?esLintResult.result&&esLintResult.result.messages&&esLintResult.result.messages.length?(esLintServiceFailed=!1,resolve({errors:_getErrors(esLintResult.result.messages)})):esLintResult.isError?(esLintServiceFailed=!0,resolve({errors:_getLintError(esLintResult.errorCode,esLintResult.errorMessage)})):esLintResult.isPathIgnored?resolve({isIgnored:!0}):(esLintServiceFailed=!1,esLintResult.result||console.error("ESLint Unknown result",esLintResult),resolve()):resolve({isIgnored:!0})})})}prefs.definePreference("disabled","boolean",!1,{description:Strings.DESCRIPTION_ESLINT_DISABLE}).on("change",function(){CodeInspection.requestRun(Strings.ESLINT_NAME)});const PACKAGE_JSON="package.json";function _isESLintProject(){return new Promise((resolve,reject)=>{const configFilePath=path.join(ProjectManager.getProjectRoot().fullPath,PACKAGE_JSON);DocumentManager.getDocumentForPath(configFilePath).done(function(configDoc){if(!ProjectManager.isWithinProject(configFilePath))return void reject(`ESLint Project changed while scanning ${configFilePath}`);const content=configDoc.getText();try{const config=JSON.parse(content);resolve(config&&(config.devDependencies&&config.devDependencies.eslint||config.dependencies&&config.dependencies.eslint))}catch(err){console.error(`ESLint Error parsing ${PACKAGE_JSON}`,configFilePath,err),resolve(!1)}}).fail(err=>{err!==FileSystemError.NOT_FOUND&&console.error(`ESLint Error reading ${PACKAGE_JSON}`,configFilePath,err),resolve(!1)})})}function _reloadOptions(){esLintServiceFailed=!1;const scanningProjectPath=ProjectManager.getProjectRoot().fullPath;_isESLintProject().then(shouldESLintEnable=>{scanningProjectPath===ProjectManager.getProjectRoot().fullPath&&(shouldESLintEnable&&Metrics.countEvent(Metrics.EVENT_TYPE.LINT,"eslint","config"),useESLintFromProject=shouldESLintEnable,CodeInspection.requestRun(Strings.ESLINT_NAME))}).catch(err=>{console.error(`ESLint reload options error: ${err}`),scanningProjectPath===ProjectManager.getProjectRoot().fullPath&&(Metrics.countEvent(Metrics.EVENT_TYPE.LINT,"eslintConfig","error"),useESLintFromProject=!1,CodeInspection.requestRun(Strings.ESLINT_NAME))})}function _projectFileChanged(_evt,changedPath,addedSet,removedSet){let configPath=path.join(ProjectManager.getProjectRoot().fullPath,PACKAGE_JSON);(changedPath===configPath||addedSet.has(configPath)||removedSet.has(configPath))&&_reloadOptions()}AppInit.appReady(function(){ProjectManager.on(ProjectManager.EVENT_PROJECT_CHANGED_OR_RENAMED_PATH,_projectFileChanged),ProjectManager.on(ProjectManager.EVENT_PROJECT_OPEN,function(){_reloadOptions(),Phoenix.isNativeApp&&NodeUtils.ESLintFile("console.log();","a.js",ProjectManager.getProjectRoot().fullPath).catch(e=>{console.error("Error warming up ESLint service",e)})}),_reloadOptions()});const esLintProvider={name:Strings.ESLINT_NAME,scanFileAsync:lintOneFile,canInspect:function(fullPath){return!prefs.get("disabled")&&fullPath&&!fullPath.endsWith(".min.js")&&useESLintFromProject}};function isESLintActive(){return useESLintFromProject&&Phoenix.isNativeApp&&!esLintServiceFailed}CodeInspection.register("javascript",esLintProvider),CodeInspection.register("jsx",esLintProvider),exports.isESLintActive=isESLintActive});
//# sourceMappingURL=ESLint.js.map