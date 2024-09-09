define(function(require,exports,module){const DropdownButton=require("widgets/DropdownButton").DropdownButton,Strings=require("strings"),PreferencesManager=require("preferences/PreferencesManager"),ProjectManager=require("project/ProjectManager"),WorkspaceManager=require("view/WorkspaceManager"),FindUtils=require("search/FindUtils"),PREFS_CURRENT_FILTER_STRING="FIND_IN_FILES_CURRENT_FILTER_STRING",FILTER_TYPE_EXCLUDE="excludeFilter",FILTER_TYPE_INCLUDE="includeFilter",FILTER_TYPE_NO_FILTER="noFilter";let currentFilter=null,currentFilterType=FILTER_TYPE_NO_FILTER,_picker=null,$filterContainer=null;function _filterStringToPatternArray(str){const randomDigits=Math.floor(1e9+9e9*Math.random()).toString();let patterns=(str=str.replaceAll("\\,",randomDigits)).split(","),finalPatterns=[];for(let i=0;i<patterns.length;i++)patterns[i]=patterns[i].replaceAll(randomDigits,","),patterns[i]=patterns[i].toLowerCase(),patterns[i]&&finalPatterns.push(patterns[i]);return finalPatterns}function getActiveFilter(){if(currentFilter)return currentFilter;if(currentFilterType===FILTER_TYPE_NO_FILTER)return{isActive:()=>!1,pattern:"",ignores:()=>!1};const pattern=PreferencesManager.getViewState(PREFS_CURRENT_FILTER_STRING)||"";return currentFilter=compile(pattern)}function setActiveFilter(filter,filterType){"string"==typeof filter&&(filter=compile(filter)),currentFilter=filter,PreferencesManager.setViewState(PREFS_CURRENT_FILTER_STRING,filter.pattern),filterType&&(currentFilterType=filterType,_updatePicker()),FindUtils.notifyFileFiltersChanged()}function compile(userFilterString){const userFilter=_filterStringToPatternArray(userFilterString),subStringFilter=[],wrappedGlobs=[];for(let glob of userFilter)glob.startsWith("./")?wrappedGlobs.push(glob.slice(2)):glob.startsWith("*.")||glob.startsWith("?.")?wrappedGlobs.push(`**/${glob}`):glob.includes("?")||glob.includes("*")||glob.includes("[")||glob.includes("]")||glob.includes("\\")||glob.includes("!")?(glob.startsWith("**/")||(glob=`**/${glob}`),wrappedGlobs.push(glob)):subStringFilter.push(glob);const isMatch=window.fs.utils.picomatch(wrappedGlobs,{dot:!0});function ignores(relativeOrFullPath){if(relativeOrFullPath=relativeOrFullPath.toLowerCase(),!userFilter.length)return!1;for(let subStr of subStringFilter)if(relativeOrFullPath.includes(subStr))return!0;return isMatch(relativeOrFullPath)}return{pattern:userFilterString,isActive:function(){return!!userFilter.length},ignores:ignores}}function filterPath(compiledFilter,fullPath){if(!compiledFilter)return!0;if(!ProjectManager.isWithinProject(fullPath))return!1;const relativePath=ProjectManager.makeProjectRelativeIfPossible(fullPath);switch(currentFilterType){case FILTER_TYPE_INCLUDE:return!compiledFilter.isActive()||compiledFilter.ignores(relativePath);case FILTER_TYPE_EXCLUDE:return!compiledFilter.isActive()||!compiledFilter.ignores(relativePath);default:return!0}}function filterFileList(compiledFilter,files){return compiledFilter?files.filter(function(f){if(!ProjectManager.isWithinProject(f.fullPath))return!1;const relativePath=ProjectManager.makeProjectRelativeIfPossible(f.fullPath);switch(currentFilterType){case FILTER_TYPE_INCLUDE:return!compiledFilter.isActive()||compiledFilter.ignores(relativePath);case FILTER_TYPE_EXCLUDE:return!compiledFilter.isActive()||!compiledFilter.ignores(relativePath);default:return!0}}):files}function getPathsMatchingFilter(compiledFilter,filePaths){return compiledFilter?filePaths.filter(function(fullPath){if(!ProjectManager.isWithinProject(fullPath))return!1;const relativePath=ProjectManager.makeProjectRelativeIfPossible(fullPath);switch(currentFilterType){case FILTER_TYPE_INCLUDE:return!compiledFilter.isActive()||compiledFilter.ignores(relativePath);case FILTER_TYPE_EXCLUDE:return!compiledFilter.isActive()||!compiledFilter.ignores(relativePath);default:return!0}}):filePaths}function _updatePicker(){if(_picker){switch(currentFilterType){case FILTER_TYPE_NO_FILTER:_picker.setButtonLabel(Strings.NO_FILE_FILTER),$filterContainer&&$filterContainer.addClass("forced-hidden");break;case FILTER_TYPE_INCLUDE:_picker.setButtonLabel(Strings.INCLUDE_FILE_FILTER),$filterContainer&&$filterContainer.removeClass("forced-hidden");break;case FILTER_TYPE_EXCLUDE:_picker.setButtonLabel(Strings.EXCLUDE_FILE_FILTER),$filterContainer&&$filterContainer.removeClass("forced-hidden")}$filterContainer&&($filterContainer.find(".error-filter").hide(),WorkspaceManager.recomputeLayout())}else console.error("No file filter picker ui to update")}function createFilterPicker(){_picker=new DropdownButton("",[Strings.CLEAR_FILE_FILTER,Strings.INCLUDE_FILE_FILTER,Strings.EXCLUDE_FILE_FILTER],void 0,{cssClasses:"file-filter-picker no-focus"});const $inputElem=($filterContainer=$(`<div class="filter-container">\n        <input autocomplete="off" spellcheck="false" type="text" id="fif-filter-input"\n         placeholder="${Strings.FILTER_PLACEHOLDER}"/>\n        <div class="filter-dropdown-icon"\n         title="${"mac"===brackets.platform?Strings.FILTER_HISTORY_TOOLTIP_MAC:Strings.FILTER_HISTORY_TOOLTIP}">\n            </div><div class="error-filter"></div><span id="filter-counter"></span>\n        </div>`)).find("#fif-filter-input");return currentFilter&&$inputElem.val(currentFilter.pattern),$filterContainer.find("#fif-filter-input").on("input",function(){setActiveFilter($inputElem.val())}),_updatePicker(),_picker.on("select",function(event,item,itemIndex){item===Strings.CLEAR_FILE_FILTER?(currentFilterType=FILTER_TYPE_NO_FILTER,setActiveFilter($inputElem.val()),_updatePicker(),$("#find-what").focus()):item===Strings.INCLUDE_FILE_FILTER?(currentFilterType=FILTER_TYPE_INCLUDE,setActiveFilter($inputElem.val()),_updatePicker(),$filterContainer.find("#fif-filter-input").focus()):item===Strings.EXCLUDE_FILE_FILTER&&(currentFilterType=FILTER_TYPE_EXCLUDE,setActiveFilter($inputElem.val()),_updatePicker(),$filterContainer.find("#fif-filter-input").focus())}),[_picker.$button,$filterContainer]}function showDropdown(){_picker&&_picker.showDropdown()}function closeDropdown(){_picker&&_picker.closeDropdown()}exports.showDropdown=showDropdown,exports.closeDropdown=closeDropdown,exports.createFilterPicker=createFilterPicker,exports.getActiveFilter=getActiveFilter,exports.setActiveFilter=setActiveFilter,exports.compile=compile,exports.filterPath=filterPath,exports.filterFileList=filterFileList,exports.getPathsMatchingFilter=getPathsMatchingFilter,exports.FILTER_TYPE_EXCLUDE=FILTER_TYPE_EXCLUDE,exports.FILTER_TYPE_INCLUDE=FILTER_TYPE_INCLUDE,exports.FILTER_TYPE_NO_FILTER=FILTER_TYPE_NO_FILTER});
//# sourceMappingURL=FileFilters.js.map