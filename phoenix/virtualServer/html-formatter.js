importScripts("phoenix/virtualServer/content-type.js"),importScripts("phoenix/virtualServer/icons.js"),self.HtmlFormatter||function(){const formatDate=d=>{const day=d.getDate(),month=d.toLocaleString("en-us",{month:"short"}),year=d.getFullYear(),hours=d.getHours(),mins=d.getMinutes();return`${day}-${month}-${year} ${hours}:${mins}`},formatSize=s=>{const units=["","K","M"];if(!s)return"-";const i=Math.floor(Math.log(s)/Math.log(1024));return Math.round(s/Math.pow(1024,i),2)+units[i]},formatRow=(icon,alt="[   ]",href,name,modified,size)=>`<tr><td valign='top'><img src='${icon||icons.unknown}' alt='${alt}'></td><td>\n      <a href='${href}'>${name}</a></td>\n      <td align='right'>${formatDate(new Date(modified))}</td>\n      <td align='right'>${formatSize(size)}</td><td>&nbsp;</td></tr>`,footerClose="<address>nohost (Web Browser Server)</address></body></html>";function format404(url){const body=`\n    <!DOCTYPE html>\n    <html><head>\n    <title>404 Not Found</title>\n    </head><body>\n    <h1>Not Found</h1>\n    <p>The requested URL ${url} was not found on this server.</p>\n    <hr>${footerClose}`;return{body:body,config:{status:404,statusText:"Not Found",headers:{"Content-Type":"text/html"}}}}function format500(path,err){const body=`\n    <!DOCTYPE html>\n    <html><head>\n    <title>500 Internal Server Error</title>\n    </head><body>\n    <h1>Internal Server Error</h1>\n    <p>The server encountered an internal error while attempting to access ${path}.</p>\n    <p>The error was: ${err.message}.</p>\n    <hr>${footerClose}`;return{body:body,config:{status:500,statusText:"Internal Error",headers:{"Content-Type":"text/html"}}}}function formatDir(route,dirPath,entries){const parent=self.path.dirname(dirPath)||"/",url=encodeURI(route+parent),header=`\n    <!DOCTYPE html>\n    <html><head><title>Index of ${dirPath}</title></head>\n    <body><h1>Index of ${dirPath}</h1>\n    <table><tr><th><img src='${icons.blank}' alt='[ICO]'></th>\n    <th><b>Name</b></th><th><b>Last modified</b></th>\n    <th><b>Size</b></th><th><b>Description</b></th></tr>\n    <tr><th colspan='5'><hr></th></tr>\n    <tr><td valign='top'><img src='${icons.back}' alt='[DIR]'></td>\n    <td><a href='${url}'>Parent Directory</a></td><td>&nbsp;</td>\n    <td align='right'>  - </td><td>&nbsp;</td></tr>`,footer=`<tr><th colspan='5'><hr></th></tr></table>${footerClose}`,rows=entries.map(entry=>{let entryName=entry.name||entry;const ext=self.path.extname(entryName),href=encodeURI(`${route}${self.path.join(dirPath,entryName)}`);let icon,alt;return ContentType.isImage(ext)?(icon=icons.image2,alt="[IMG]"):ContentType.isMedia(ext)?(icon=icons.movie,alt="[MOV]"):ext?(icon=icons.text,alt="[TXT]"):(icon=icons.folder,alt="[DIR]"),formatRow(icon,alt,href,entryName,entry.mtime,entry.size)}).join("\n");return{body:header+rows+footer,config:{status:200,statusText:"OK",headers:{"Content-Type":"text/html"}}}}function formatFile(path,content){return{body:content,config:{status:200,statusText:"OK",headers:{"Content-Type":ContentType.getMimeType(path)}}}}self.HtmlFormatter={format404:format404,format500:format500,formatDir:formatDir,formatFile:formatFile}}();
//# sourceMappingURL=html-formatter.js.map
