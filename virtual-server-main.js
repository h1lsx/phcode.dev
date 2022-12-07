importScripts("phoenix/virtualfs.js"),importScripts("phoenix/virtualServer/mime-types.js"),importScripts("phoenix/virtualServer/config.js"),importScripts("phoenix/virtualServer/content-type.js"),importScripts("phoenix/virtualServer/webserver.js"),importScripts("phoenix/virtualServer/json-formatter.js"),importScripts("phoenix/virtualServer/html-formatter.js"),importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js");const _debugSWCacheLogs=!1,CACHE_FILE_NAME="cacheManifest.json",CACHE_FS_PATH="/cacheManifest.json";workbox.setConfig({debug:_debugSWCacheLogs});const Route=workbox.routing.Route,cacheFirst=workbox.strategies.CacheFirst,StaleWhileRevalidate=workbox.strategies.StaleWhileRevalidate,ExpirationPlugin=workbox.expiration.ExpirationPlugin,CacheExpiration=workbox.expiration.CacheExpiration,DAYS_30_IN_SEC=2592e3,CACHE_NAME_EVERYTHING="everything",CACHE_NAME_CORE_SCRIPTS="coreScripts",CACHE_NAME_EXTERNAL="external",ExpirationManager={everything:new CacheExpiration(CACHE_NAME_EVERYTHING,{maxAgeSeconds:2592e3}),coreScripts:new CacheExpiration("coreScripts",{maxAgeSeconds:2592e3}),external:new CacheExpiration("external",{maxAgeSeconds:2592e3})};function _debugCacheLog(...args){_debugSWCacheLogs&&console.log(...args)}function _removeParams(url){return url.indexOf("?")>-1&&(url=url.substring(0,url.indexOf("?"))),location.href.indexOf("#")>-1&&(url=url.substring(0,url.indexOf("#"))),url}self._debugLivePreviewLog=function(...args){self._debugSWLivePreviewLogs&&console.log(...args)};let baseURL=location.href;baseURL=_removeParams(location.href),location.href.indexOf("/")>-1&&(baseURL=baseURL.substring(0,baseURL.lastIndexOf("/"))),baseURL.endsWith("/")||(baseURL+="/"),console.log("Service worker: base URL is: ",baseURL);const CACHE_MANIFEST_URL=`${baseURL}cacheManifest.json`;console.log("Service worker: cache manifest URL is: ",CACHE_MANIFEST_URL);const virtualServerBaseURL=`${baseURL}${Config.route}`;console.log("Service worker: Virtual server base URL is: ",virtualServerBaseURL);const wwwRegex=new RegExp(`${Config.route}(/.*)`);function _isVirtualServing(url){return url.startsWith(virtualServerBaseURL)}function _shouldVirtualServe(request){return _isVirtualServing(request.url.href)}function _clearCache(){caches.open(CACHE_NAME_EVERYTHING).then(cache=>{cache.keys().then(keys=>{keys.forEach((request,index,array)=>{cache.delete(request)})})})}function _updateTTL(cacheName,urls){console.log(`Service worker: Updating expiry for ${urls.length} urls in cache: ${cacheName}`);for(let url of urls)ExpirationManager[cacheName].updateTimestamp(url)}function _getCurrentCacheManifest(){return new Promise(resolve=>{fs.readFile(CACHE_FS_PATH,"utf8",function(err,data){resolve(err?null:JSON.parse(data))})})}function _putCurrentCacheManifest(manifestObject){return new Promise(resolve=>{fs.writeFile(CACHE_FS_PATH,JSON.stringify(manifestObject,null,2),"UTF8",function(err){err&&console.error("Service worker: Failed while writing cache manifest",err),resolve(null)})})}function _getNewCacheManifest(){return new Promise(resolve=>{fetch(CACHE_MANIFEST_URL).then(response=>response.json()).then(data=>resolve(data)).catch(err=>{console.error("Service worker: could not fetch cache manifest for app updates",err),resolve(null)})})}function _fixCache(currentCacheManifest,newCacheManifest){const currentCacheKeys=Object.keys(currentCacheManifest),newCacheKeys=Object.keys(newCacheManifest);return console.log(`Service worker: Fixing Stale Cache Entries in ${CACHE_NAME_EVERYTHING}. num cache entries in manifest:\n    current: ${currentCacheKeys.length} new: ${newCacheKeys.length}`),new Promise((resolve,reject)=>{caches.open(CACHE_NAME_EVERYTHING).then(cache=>{cache.keys().then(async keys=>{console.log("Service worker: Number of cached entries in everything cache: ",keys.length);let changedContentURLs=[],deletePromises=[];keys.forEach((request,_index,_array)=>{let relativeURL=_removeParams(request.url);if(relativeURL=relativeURL.substring(baseURL.length,relativeURL.length),!newCacheManifest[relativeURL])return _debugCacheLog("Service worker: entry renewed as deleted",relativeURL),void deletePromises.push(cache.delete(request));currentCacheManifest[relativeURL]!==newCacheManifest[relativeURL]&&(_debugCacheLog("Service worker: entry renewed as changed",relativeURL),deletePromises.push(cache.delete(request)),changedContentURLs.push(request.url))}),console.log(`Service worker: deleting ${deletePromises.length} stale cache entries in ${CACHE_NAME_EVERYTHING}`),await Promise.all(deletePromises),console.log(`Service worker: updating cache for ${changedContentURLs.length} in ${CACHE_NAME_EVERYTHING}`),cache.addAll(changedContentURLs).then(()=>{console.log(`Service worker: cache refresh complete for ${changedContentURLs.length} URLS in ${CACHE_NAME_EVERYTHING}`),_updateTTL(CACHE_NAME_EVERYTHING,changedContentURLs),resolve(changedContentURLs.length)}).catch(err=>{console.error(`Service worker: cache refresh failed for ${changedContentURLs.length} URLS in ${CACHE_NAME_EVERYTHING}`,err),reject()})})}).catch(reject)})}workbox.routing.registerRoute(_shouldVirtualServe,({url:url})=>{let path=url.pathname.match(wwwRegex)[1];path=decodeURI(path);const formatter=null!==url.searchParams.get("json")?JSONFormatter:HtmlFormatter,download=!1,phoenixInstanceID=url.searchParams.get("PHOENIX_INSTANCE_ID");return Serve.serve(path,formatter,!1,phoenixInstanceID)},"GET"),workbox.routing.registerRoute(_shouldVirtualServe,({url:url})=>(url.pathname=`${Config.route}/`,Promise.resolve(Response.redirect(url,302))),"GET");let refreshInProgress=!1;async function _refreshCache(event){if(refreshInProgress)console.log("Another cache refresh is in progress, ignoring.");else{refreshInProgress=!0;try{console.log("Service worker: Refreshing browser cache for app updates.");const currentCacheManifest=await _getCurrentCacheManifest(),newCacheManifest=await _getNewCacheManifest();if(!newCacheManifest)return console.log("Service worker: could not fetch new cache manifest. Cache refresh will not be done."),void(refreshInProgress=!1);if(!currentCacheManifest&&newCacheManifest)return console.log(`Service worker: Fresh install, writing cache manifest with ${Object.keys(newCacheManifest).length} entries`),await _putCurrentCacheManifest(newCacheManifest),void(refreshInProgress=!1);const updatedFilesCount=await _fixCache(currentCacheManifest,newCacheManifest);await _putCurrentCacheManifest(newCacheManifest),event.ports[0].postMessage({updatedFilesCount:updatedFilesCount})}catch(e){console.error("Service worker: error while refreshing cache",e)}refreshInProgress=!1}}function _isCacheableExternalUrl(url){let EXTERNAL_URLS=["https://storage.googleapis.com/workbox-cdn/"];for(let start of EXTERNAL_URLS)if(url.startsWith(start))return!0;return!1}addEventListener("message",event=>{let eventType;switch(event.data&&event.data.type){case"SKIP_WAITING":self.skipWaiting();break;case"INIT_PHOENIX_CONFIG":Config.debug=event.data.debugMode,self._debugSWLivePreviewLogs=event.data.logLivePreview,self.__WB_DISABLE_DEV_LOGS=Config.debug&&_debugSWCacheLogs,event.ports[0].postMessage({baseURL:baseURL});break;case"CLEAR_CACHE":_clearCache();break;case"REFRESH_CACHE":_refreshCache(event);break;case"setInstrumentedURLs":return self.Serve.setInstrumentedURLs(event),!0;default:let msgProcessed;self.Serve&&self.Serve.processVirtualServerMessage&&self.Serve.processVirtualServerMessage(event)||console.error("Service worker cannot process, received unknown message: ",event)}});const DONT_CACHE_BASE_URLS=[`${location.origin}/src/`,`${location.origin}/test/`,`${location.origin}/dist/`,`${baseURL}src/`,`${baseURL}test/`,`${baseURL}dist/`,`${baseURL}cacheManifest.json`];function _isNotCacheableUrl(url){for(let start of DONT_CACHE_BASE_URLS)if(url.startsWith(start))return!0;return!1}const CORE_SCRIPTS_URLS=[`${location.origin}/index.html`,`${location.origin}/`,`${location.origin}/virtual-server-main.js`,`${location.origin}/phoenix/virtual-server-loader.js`,`${baseURL}index.html`,`${baseURL}`,`${baseURL}virtual-server-main.js`,`${baseURL}phoenix/virtual-server-loader.js`];function _isCoreScript(url){for(let coreScript of CORE_SCRIPTS_URLS)if(url===coreScript)return!0;return!1}function _belongsToEverythingCache(request){let href=request.url.split("#")[0];if("video"===request.destination||"audio"===request.destination)return _debugCacheLog("Not Caching audio/video URL: ",request),!1;if(_isNotCacheableUrl(href))return _debugCacheLog("Not Caching un cacheable URL in everything cache: ",request),!1;if(_isCoreScript(href))return _debugCacheLog("Not Caching core scripts in everything cache: ",request),!1;if(_isCacheableExternalUrl(href))return _debugCacheLog("Not Caching external url in everything cache: ",request),!1;let disAllowedExtensions=/.zip$|.map$/i;return!(!href.startsWith(baseURL)||disAllowedExtensions.test(href))||(_debugCacheLog("Not Caching URL: ",request),!1)}const allCachedRoutes=new Route(({request:request})=>"GET"===request.method&&_belongsToEverythingCache(request)&&!_isVirtualServing(request.url),new cacheFirst({cacheName:CACHE_NAME_EVERYTHING,plugins:[new ExpirationPlugin({maxAgeSeconds:2592e3,purgeOnQuotaError:!0})]})),freshnessPreferredRoutes=new Route(({request:request})=>"GET"===request.method&&_isCoreScript(request.url)&&!_isVirtualServing(request.url),new StaleWhileRevalidate({cacheName:"coreScripts",plugins:[new ExpirationPlugin({maxAgeSeconds:2592e3,purgeOnQuotaError:!0})]})),externalCachedRoutes=new Route(({request:request})=>"GET"===request.method&&_isCacheableExternalUrl(request.url)&&!_isVirtualServing(request.url),new StaleWhileRevalidate({cacheName:"external",plugins:[new ExpirationPlugin({maxAgeSeconds:2592e3,purgeOnQuotaError:!0})]}));workbox.routing.registerRoute(allCachedRoutes),workbox.routing.registerRoute(freshnessPreferredRoutes),workbox.routing.registerRoute(externalCachedRoutes),workbox.core.clientsClaim();
//# sourceMappingURL=virtual-server-main.js.map
