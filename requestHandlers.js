var fs = require("fs"), 
  mysql = require("mysql"),
	url = require("url"),
	path = require("path"),
	querystring = require("querystring"),
	formidable = require("formidable"),
	spawn = require('child_process').spawn,
	exec= require('child_process').exec,
	sys = require('sys'),
	persistent = require('./persistent'),
	mime = require("mime");
	XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var isLog="Y", manifest;

//borrowing this function from Popcorn
// Simple function to parse a timestamp into seconds
// Acceptable formats are:
// HH:MM:SS.MMM
// HH:MM:SS;FF
// Hours and minutes are optional. They default to 0
function toSeconds( timeStr, frameRate ) {
	// Hours and minutes are optional
	// Seconds must be specified
	// Seconds can be followed by milliseconds OR by the frame information
	var validTimeFormat = /^([0-9]+:){0,2}[0-9]+([.;][0-9]+)?$/,
			errorMessage = "Invalid time format",
			digitPairs, lastIndex, lastPair, firstPair,
			frameInfo, frameTime;

	if ( typeof timeStr === "number" ) {
		return timeStr;
	}
	
	if ( typeof timeStr !== "string") {
		timeStr += '';
	}

	digitPairs = timeStr.split( ":" );
	lastIndex = digitPairs.length - 1;
	lastPair = digitPairs[ lastIndex ];

	// Fix last element:
	if ( lastPair.indexOf( ";" ) > -1 ) {

		frameInfo = lastPair.split( ";" );
		frameTime = 0;

		if ( frameRate && ( typeof frameRate === "number" ) ) {
			frameTime = parseFloat( frameInfo[ 1 ], 10 ) / frameRate;
		}

		digitPairs[ lastIndex ] = parseInt( frameInfo[ 0 ], 10 ) + frameTime;
	}

	firstPair = digitPairs[ 0 ];

	if ( digitPairs.length >= 3 ) {
		return ( parseInt( firstPair, 10 ) * 3600 ) +
			( parseInt( digitPairs[ 1 ], 10 ) * 60 ) +
			parseFloat( digitPairs[ 2 ], 10 );
	} else if ( digitPairs.length === 2 ) {
		return ( parseInt( firstPair, 10 ) * 60 ) +
				parseFloat( digitPairs[ 1 ], 10 );
	} else {
		return parseFloat( firstPair, 10 );
	}
}

function getJSON ( src, successCallback, errorCallback ) {
    /*var xmlHttp = new XMLHttpRequest();
    for (i in xmlHttp) {
		mylog("xmlHttp methods "+i+": "+xmlHttp[i]);
	}
    xmlHttp.open('GET', src, false);
    xmlHttp.send(null);
	mylog("xmlHttp status: "+xmlHttp.status);
    if ( xmlHttp.status === 200 || xmlHttp.status === 0 ) {
    	mylog("xmlHttp.responseText: "+xmlHttp.responseText);
      return JSON.parse( xmlHttp.responseText );
    }
    else {
      return
    }*/
    
    var responseText = fs.readFileSync(src, 'utf8');
    mylog("responseText: "+responseText);
    return JSON.parse(responseText);	 
  }

function start(request, response) {
	mylog("Request handler 'start' was called.");
		
	fs.readFile('./index.html', 'utf-8',function (err, data) {
	    if (err) throw err;
      response.writeHead(200, {"Content-Type": "text/html"});
      response.write(data);
      response.end();
	  }
	);
}

function padLeft(str,length){
	if(str.length >= length) 
		return str; 
	else 
		return padLeft("0" +str,length); 
} 
function upload(request, response) {
	for (i in request.body) {
		mylog("request "+i+": "+request.body[i]);
	}
	var projectType ;
	var durationSec;
	var projectName = request.body.newProjectInp;
	var date = new Date();
	var dateFormat = date.getFullYear()+padLeft(""+date.getMonth(),2)+padLeft(""+date.getDay(),2)+
				padLeft(""+date.getHours(),2)+padLeft(""+date.getMinutes(),2)+padLeft(""+date.getSeconds(),2);
	projectName = projectName.replace(/ /g,"_");
	projectName = projectName+"__"+dateFormat;
	
	var fileName = request.files.load.name;
	fileName = fileName.substr(0,fileName.length-4)+"_"+dateFormat+".PDF";	
	
	var vedio_path="",vedioName="",target_vedio_path="";
	if(request.files.vedio!=undefined && request.files.vedio.size>0){
		
		vedioName = request.files.vedio.name;
		console.log(vedioName) ;
		var extension = vedioName.substring(vedioName.lastIndexOf(".")+1 , vedioName.length).toUpperCase();
		vedioName = vedioName.substr(0,vedioName.length-5)+"_"+dateFormat+"."+extension;
	}
	
	if(vedioName!="" && vedioName.length>0){
		//console.log("create TB project") ;
		projectType = 2 ;
		persistent.createProject(request.files.load, request.files.vedio, projectName,fileName ,vedioName , 400, function(data) {
			//console.log(data) ;
			loadImagesFn(projectName,projectType, response);
		});
		
	}else{
		projectType = 1 ;
		persistent.createProject(request.files.load, null,projectName ,fileName , null, 400, function(data) {	
			//console.log(data) ;
			loadImagesFn(projectName,projectType, response);		
		}); 
	} 
}

function loadImagesFn(projectName,projectType, response) {	
	mylog("Request handler 'loadImagesFn' was called.");
    var thumImageSql = "" ;
	
	thumImageSql = "select ? as projectName, tci.PROJECT_ID as projectId, ? as projectType, tci.image_id as thumImageId, tci.image_name as thumImagePath, tci.rela_image as bigImageId, tcib.image_name as bigImagePath " 
                       + "from tb_converted_image tci, tb_converted_image tcib where tci.PROJECT_ID = ? and tci.RELA_IMAGE != -1 "
                       + "and tci.RELA_IMAGE = tcib.IMAGE_ID" ;
	
	var client = createClientConn();
	client.query("select project_id from tb_project where project_name = ?", [projectName], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			
			client.query(thumImageSql, [projectName,projectType, results[0].project_id], function selectCb(err, results, fields) {
				if (err) {
					throw err;
				}
				
				var resSize = results.length ;
				
				for(var i = 0 ; i < resSize ; i++){
					results[i].bigImagePath = "/fetchfile?fileName=" +  results[i].bigImagePath ;
					results[i].thumImagePath = "/fetchfile?fileName=" +  results[i].thumImagePath ;
				}
				jsonStr = JSON.stringify(results);
				response.send(jsonStr);
				response.end();
				mylog("response end");
				closeClientConn(client);
			}
		);}			
	);
}

function loadVedioFile(request, response){
	mylog("loadVedioFile was called");
	var postData=loadPostData(request);
	mylog("[postData.project_id]=="+[postData.project_id]);
	 
	var client = createClientConn();
	client.query("select file_id, concat(file_path,file_name) as file_path, video_length from tb_project_file where project_id=? and file_type=2 ", [postData.project_id], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			results[0].file_path = "/fetchfile?fileName=" +  results[0].file_path ;
			jsonStr = JSON.stringify(results[0]);
			//mylog("jsonStr=="+jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				
				response.end();
			
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function backMaxType(request, response){
	mylog("----backMaxType was called----");
	var postData=loadPostData(request);
	//mylog("[postData.project_id]=="+[postData.project_id]);
	 
	var client = createClientConn();
	client.query("select if(pb_count>=tb_count, 'pb', 'tb') max_proj_type from (SELECT  (select count(1) from tb_project where project_type = 1) pb_count, (select count(1) from tb_project where project_type = 2) tb_count) v1 ", function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results[0].max_proj_type);
			mylog("jsonStr=="+jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
			
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}
function loadProjectsList(request, response){
	mylog("Request handler 'loadProjectsList' was called");
	var postData=loadPostData(request);
	 
	var client = createClientConn();
	client.query("select project_id, project_name, project_type from tb_project where user_id=? and project_type=?", [postData.user_id, postData.project_type], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
	
}

function loadProjectsListView(request, response){
	mylog("Request handler 'loadProjectsListView' was called");
	var postData=loadPostData(request); 
	var client = createClientConn();
	client.query("select project_id, project_name, project_type from tb_project where user_id=? order by project_id desc", [postData.user_id], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
	
}


function loadProject(request, response) {
	mylog("Request handler 'loadProject' was called.");
	
	var postData = loadPostData(request);
	 
	var client = createClientConn();
	client.query("select rela_id as project_id, json_type, json_data from tb_json_data where rela_id = ? and json_type = ?", [postData.rela_id, postData.json_type], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results[0]);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function saveProject(request, response) {
	mylog("Request handler 'saveProject' was called.");
	
	var postData = loadPostData(request);
	 
	var client = createClientConn();
	client.query("select rela_id from tb_json_data where rela_id = ? and json_type = ? ", [postData.rela_id, postData.json_type], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			//mylog("results.length=="+results.length);
			
			if (results.length > 0 ) {		
				client.query("update tb_json_data set json_data = ? where rela_id = ? and json_type = ?",
						[postData.json_data, postData.rela_id, postData.json_type], function selectCb(err, results, fields) {
						if (err) {
							throw err;
						}
						if (postData.callback) {
							response.writeHead(200, {"Content-Type": "text/html"});
							response.write(postData.callback+"()");
							response.end();
							mylog("response end");
						}
						closeClientConn(client);
					}
				);					
			} else {
				client.query("insert into tb_json_data (rela_id, json_type, json_data) values (?, ?, ?)",
						[postData.rela_id, postData.json_type, postData.json_data], function selectCb(err, results, fields) {
						if (err) {
							throw err;
						}
						if (postData.callback) {
							response.writeHead(200, {"Content-Type": "text/html"});
							response.write(postData.callback+"()");
							response.end();
							mylog("response end");
						}
						closeClientConn(client);
					}
				);
			}
		}
	);

//	request.addListener("end", function() {});
}

function loadImages(request, response) {
	mylog("Request handler 'loadImages' was called.");
	var postData = loadPostData(request);
	 
	var client = createClientConn();
	client.query("select image_id, concat(image_path,image_name) as image_path from tb_converted_image where project_id = ? and rela_image = -1 order by image_id asc", [postData.project_id], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			var resSize = results.length ;
			
			for(var i = 0 ; i < resSize ; i++){
				results[i].image_path = "/fetchfile?fileName=" +  results[i].image_path ;
			} 
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function loadThumImages(request, response) {
	mylog("Request handler 'loadThumImages' was called.");
	var postData = loadPostData(request);
	
	var projectId = postData.projectId ;
	var projectType = postData.projectType ;
	var thumImageSql = "" ;
	
	if(projectType == 1)
		thumImageSql = "select tci.image_id as thumImageId, tci.image_name as thumImagePath, tci.rela_image as bigImageId, tcib.image_name as bigImagePath " 
                       + "from tb_converted_image tci, tb_converted_image tcib where tci.PROJECT_ID = ? and tci.RELA_IMAGE != -1 "
                       + "and tci.RELA_IMAGE = tcib.IMAGE_ID" ;
	else if(projectType == 2)
		thumImageSql = "select distinct tra.annot_id as annotId,tra.annot_id as relaAnnotId,tci.image_id as thumImageId, tci.image_name as thumImagePath, tci.rela_image as bigImageId, tcib.image_name as bigImagePath, tra.start_point as startPoint, tra.end_point as endPoint "
                       + "from tb_report_annot tra,tb_converted_image tci, tb_converted_image tcib where  tra.TYPE = 'image' and tra.PROJECT_ID = ? and "
                       + "tra.Image_ID = tci.rela_image and tra.IMAGE_ID = tcib.IMAGE_ID order by tra.start_point asc"
                       
	var client = createClientConn();
	client.query(thumImageSql, [projectId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			var resSize = results.length ;
			
			for(var i = 0 ; i < resSize ; i++){
				results[i].thumImagePath = "/fetchfile?fileName=" +  results[i].thumImagePath ;
				results[i].bigImagePath = "/fetchfile?fileName=" +  results[i].bigImagePath ;
			} 
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function loadAnnotation(request, response) {
	mylog("Request handler 'loadAnnotation' was called.");
	
	var postData = loadPostData(request); 
	var client = createClientConn();
	client.query("select rela_id as image_id, json_type, json_data from tb_json_data where rela_id = ? and json_type = ? order by rela_id asc", 
		[postData.rela_id, postData.json_type], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results[0]);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function saveAnnotation(request, response) {
	mylog("Request handler 'saveAnnotation' was called.");
	var postData = loadPostData(request);
	mylog("postData.rela_id: "+postData.rela_id);
	 
	var client = createClientConn();		
	client.query("delete from tb_json_data where rela_id = ? and json_type = ?",
			[postData.rela_id, postData.json_type], function selectCb(err, results, fields) {
			client.query("insert into tb_json_data (rela_id, json_type, json_data) values (?, ?, ?)",
					[postData.rela_id, postData.json_type, postData.json_data], function selectCb(err, results, fields) {
					if (err) {
						throw err;
					}
					if (postData.callback) {
						response.writeHead(200, {"Content-Type": "text/html"});
						response.write(postData.callback+"()");
						response.end();
						mylog("response end");
					}
					closeClientConn(client);
				}
			);
		}
	);	

//	request.addListener("end", function() {});
}


function loadPostData(request) {
	postData = querystring.parse(url.parse(request.url).query);
	return postData;
}

function staticContents(req, res) {
	var uri = url.parse(req.url).pathname.replace(/\//gi, "\\").replace("\\",
			"");
	path.exists(uri, function(exists) {
		if (!exists) {
			res.writeHead(404, {
				"Content-Type" : "text/plain"
			});
			res.write("Content not found");
			res.end();
			return;
		}

		fs.readFile(uri, "binary", function(err, file) {
			res.writeHead(200, {
				'Content-Type' : mime.lookup(uri)
			});
			res.write(file, "binary");
			res.end();
		});
	});
}

function createClientConn() {
	var client = mysql.createClient({
		host: "localhost",
	  port: 3306,
	  user: "MobilePoc",
	  password: "MobilePoc",
	  database: "ird_temp",
	});
	
	return client;
}


function closeClientConn(client) {
	/*for (i in client) {
		mylog("client methods "+i+": "+client[i]);
	}*/
	client.end();
}
function whiteBoard(req, res, server){
	mylog(ioStatus);
	if(ioStatus==0){
		mylog("start");
		var io = require('socket.io').listen(server);
		 io.sockets.on('connection', function(socket) {
			 mylog("connection");
		    socket.on('drawClick', function(data) {
		    	mylog("drawClick");
		      socket.broadcast.emit('draw', {
		        x: data.x,
		        y: data.y,
		        type: data.type
		      });
		    });
		 socket.on('Click', function(data) {
		      socket.broadcast.emit('erase', {
		      w:data.w,
		       h:data.h
		     
		    });
		   });
		
		 
		});
		 ioStatus=1;
	};
}

function uploadPluginVedio(request, response) {
	mylog("uploadPluginVedio");
	var date = new Date();
	var dateFormat = date.getFullYear()+padLeft(""+date.getMonth(),2)+padLeft(""+date.getDay(),2)+
				padLeft(""+date.getHours(),2)+padLeft(""+date.getMinutes(),2)+padLeft(""+date.getSeconds(),2);
	
	var vedio_path="",vedioName="",target_vedio_path="";
	if(request.files.vedioPluginFile!=undefined && request.files.vedioPluginFile.size>0){
		vedio_path=request.files.vedioPluginFile.path;
		mylog("vedio_path:"+vedio_path);
		vedioName = request.files.vedioPluginFile.name;
		mylog("vedioName:"+vedioName);
		var extension = vedioName.substring(vedioName.lastIndexOf(".")+1 , vedioName.length).toUpperCase();
		vedioName = vedioName.substr(0,vedioName.length-5)+"_"+dateFormat+"."+extension;
		//target_vedio_path = 'resources/files/' + vedioName;	
	}
	
	if(vedioName!="" && vedioName.length>0){
		/*fs.rename(vedio_path, target_vedio_path, function(err) {
	        if (err) throw err;
	        var jsonStr = JSON.stringify(vedioName);
			response.send(jsonStr);
			response.end();
	    }); */
		persistent.saveVideo(request.files.vedioPluginFile, null, vedioName , function(data) {
			//Print data message to console to confirm sava successfully.
			//console.log(data) ;
			request.send(data);
		});
	}
}

function loadReportsList(request, response){
	mylog("Request handler 'loadReportsList' was called");
	var postData=loadPostData(request);
	 
	var client = createClientConn();
	client.query("select project_id, project_name, project_type from tb_project", function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
	
}

function loadNotificationMsg(request, response){
	mylog("Request handler 'loadNotificationMsg' was called");
	var postData=loadPostData(request);
	var userName = postData.userName ;
	var userType = "" ;
	if(userName == 'Edward')
		userType = 2 ;
	else{
		userType = 1 ;
	}
	
	 
	var client = createClientConn();
	client.query("select A.USER_NAME userName, B.PROJECT_ID projectId, B.PROJECT_NAME projectName,B.project_type projectType, " + 
			     "C.NOTIFY_ID notifyId, C.CREATE_TIME createTime, C.DESCRIPTION description from tb_user A, tb_project B, tb_project_notify C " +
                 "where A.USER_ID = C.USER_ID and B.PROJECT_ID = C.PROJECT_ID AND A.USER_TYPE = ? order by C.CREATE_TIME desc " , [userType], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});	
} 

function deleteProject(request, response){
	mylog("Request handler 'deleteProject' was called.");
	var postData = loadPostData(request);
	mylog(postData.projectName) ; 
	var client = createClientConn();
	client.query("call sp_clear_data(?)", [postData.projectName], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			mylog("response end");
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {}); 
}

function loadPBAnnotation(request, response) {
	mylog("Request handler 'loadPBAnnotation' was called.");
	
	var postData = loadPostData(request); 
	var client = createClientConn();
	client.query("SELECT ANNOT_ID as annotId, IMAGE_ID as imageId, PROJECT_ID as projectId, TYPE as type,START_POINT as startPoint," +
			"END_POINT as endPoint, TARGET as target, TEXT_CONTENT as textContent, TEXT_LEFT as textLeft, TEXT_TOP as textTop," +
			"VIDEO_NAME as videoName, DRAW_DATA as drawData, IMAGE_LINK as imageLink FROM TB_REPORT_ANNOT where IMAGE_ID = ?", 
		[postData.imageId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function loadTBAnnotation(request, response) {
	mylog("Request handler 'loadTBAnnotation' was called.");
	
	var postData = loadPostData(request); 
	var client = createClientConn();
	client.query("SELECT ANNOT_ID as annotId, RELA_ANNOT_ID as relaAnnotId, IMAGE_ID as imageId, PROJECT_ID as projectId, TYPE as type,START_POINT as startPoint," +
			"END_POINT as endPoint, TARGET as target, TEXT_CONTENT as textContent, TEXT_LEFT as textLeft, TEXT_TOP as textTop," +
			"VIDEO_NAME as videoName, DRAW_DATA as drawData, IMAGE_LINK as imageLink FROM TB_REPORT_ANNOT where PROJECT_ID = ?", 
		[postData.projectId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			for(var i = 0 ; i < results.length ; i++){
				if(results[i].type == "image"){
					results[i].imageLink = "/fetchfile?fileName=" +  results[i].imageLink ;
					results[i].relaAnnotId = results[i].annotId ;
				}
			} 
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function savePTAnnotation(request, response) {
	mylog("Request handler 'savePTAnnotation' was called.");
	var postData = loadPostData(request);
	
	var imageId = (typeof(postData.imageId) == 'undefined') ? null : postData.imageId ;
	var projectId = (typeof(postData.projectId) == 'undefined') ? null : postData.projectId ;
	var type = (typeof(postData.type) == 'undefined') ? null : postData.type ;
	var startPoint = (typeof(postData.startPoint) == 'undefined') ? null : postData.startPoint ;
	var endPoint = (typeof(postData.endPoint) == 'undefined') ? null : postData.endPoint ;
	var target = (typeof(postData.target) == 'undefined') ? null : postData.target ;
	var textContent = (typeof(postData.textContent) == 'undefined') ? null : postData.textContent ;
	var videoName = (typeof(postData.videoName) == 'undefined') ? null : postData.videoName ;
	var drawData = (typeof(postData.drawData) == 'undefined') ? null : postData.drawData ;
	var imageLink = (typeof(postData.imageLink) == 'undefined') ? null : postData.imageLink ;
	var annotId = (typeof(postData.annotId) == 'undefined') ? null : postData.annotId ;	
	var relaAnnotId = (typeof(postData.relaAnnotId) == 'undefined') ? null : postData.relaAnnotId ;	
	
	var textLeft = (typeof(postData.textLeft) == 'undefined') ? null : postData.textLeft ;
	if(textLeft == '')
		textLeft = null ;
	var textTop = (typeof(postData.textTop) == 'undefined') ? null : postData.textTop ;
	if(textTop == '')
		textTop = null ;
	
	var client = createClientConn();

	client.query("delete from tb_report_annot where annot_id = ? ",[annotId], 
			function selectCb(err, results, fields) {
	     client.query("insert into tb_report_annot(IMAGE_ID,PROJECT_ID,TYPE,START_POINT,END_POINT,TARGET,TEXT_CONTENT,TEXT_LEFT,"
			+ "TEXT_TOP,VIDEO_NAME,DRAW_DATA,IMAGE_LINK,RELA_ANNOT_ID) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
			[imageId,projectId,type,startPoint,endPoint,target,textContent,textLeft,textTop,videoName,drawData,imageLink,relaAnnotId], 
		  function selectCb(err, results, fields) {
			//console.log("results:" + results) ;	 
			var insAnnotId = results.insertId ;
			client.query("SELECT ANNOT_ID as annotId, RELA_ANNOT_ID as relaAnnotId, IMAGE_ID as imageId, PROJECT_ID as projectId, TYPE as type,START_POINT as startPoint," +
			"END_POINT as endPoint, TARGET as target, TEXT_CONTENT as textContent, TEXT_LEFT as textLeft, TEXT_TOP as textTop," +
			"VIDEO_NAME as videoName, DRAW_DATA as drawData, IMAGE_LINK as imageLink FROM TB_REPORT_ANNOT where ANNOT_ID = ?",
					[insAnnotId], function selectCb(err, results, fields) {
					if (err) {
						throw err;
					}
					for(var i = 0 ; i < results.length ; i++){
						if(results[i].type == "image"){
							results[i].imageLink = "/fetchfile?fileName=" +  results[i].imageLink ;
							results[i].relaAnnotId = results[i].annotId ;
						}
					} 
					jsonStr = JSON.stringify(results);
					if (postData.callback) {
						response.writeHead(200, {"Content-Type": "text/html"});
						response.write(postData.callback+"("+jsonStr+")");
						response.end();
						mylog("response end");
					}
					closeClientConn(client);
				}
			 ); 
		   }
	     );
	   }
	);	

//	request.addListener("end", function() {});
}

function initTbAnnotation(request, response){
	mylog("Request handler 'initTbAnnotation' was called.");
	var postData = loadPostData(request);
	postData.param = JSON.parse(postData.param);
	var client = createClientConn();
	
	insertAnota2MySql(client,0,postData.param,postData.param.length,function(){
		if (postData.callback) {
			response.writeHead(200, {"Content-Type": "text/html"});
			response.write(postData.callback+"()");
			response.end();
			mylog("response end");
		}
		closeClientConn(client);
	});
	
	
}

function insertAnota2MySql(client, i, postData, end, callback){
	if ( i == end ){
		callback();
		return;
	}
	
	var tbAnnotSql ;
	var imageId ;
	var projectId ;
	var type ;
	var startPoint ; 
	var endPoint ;
	var target ;
	var textContent ;
	var videoName ;
	var drawData ;
	var imageLink ;	
	var textLeft ;
	var textTop ;

		imageId = (typeof(postData[i].imageId) == 'undefined') ? null : postData[i].imageId ;
		projectId = (typeof(postData[i].projectId) == 'undefined') ? null : postData[i].projectId ;
		type = (typeof(postData[i].type) == 'undefined') ? null : postData[i].type ;
		startPoint = (typeof(postData[i].startPoint) == 'undefined') ? null : postData[i].startPoint ;
		endPoint = (typeof(postData[i].endPoint) == 'undefined') ? null : postData[i].endPoint ;
		target = (typeof(postData[i].target) == 'undefined') ? null : postData[i].target ;
		textContent = (typeof(postData[i].textContent) == 'undefined') ? null : postData[i].textContent ;
		videoName = (typeof(postData[i].videoName) == 'undefined') ? null : postData[i].videoName ;
		drawData = (typeof(postData[i].drawData) == 'undefined') ? null : postData[i].drawData ;
		imageLink = (typeof(postData[i].imageLink) == 'undefined') ? null : postData[i].imageLink ;
		
		textLeft = (typeof(postData[i].textLeft) == 'undefined') ? null : postData[i].textLeft ;
		if(textLeft == '')
			textLeft = null ;
		textTop = (typeof(postData[i].textTop) == 'undefined') ? null : postData[i].textTop ;
		if(textTop == '')
			textTop = null ;
		
		tbAnnotSql = "insert into tb_report_annot(IMAGE_ID,PROJECT_ID,TYPE,START_POINT,END_POINT,TARGET,TEXT_CONTENT,TEXT_LEFT,"
		     + "TEXT_TOP,VIDEO_NAME,DRAW_DATA,IMAGE_LINK) VALUES "
		     + "(" + imageId + "," + projectId + ",'" + type + "'," + startPoint + "," + endPoint + ",'"
		     + target + "','" + textContent + "'," + textLeft + "," + textTop + "," + videoName + "," 
		     + drawData + "," + imageLink + ");" ;
		
	client.query(tbAnnotSql,function(err,results,fields){
		insertAnota2MySql(client,i+1,postData,end,callback);
	});
}

function deleteAnnotation(request, response) {
	mylog("Request handler 'deleteAnnotation' was called.");
	var postData = loadPostData(request);
	var client = createClientConn();
	
	var type = postData.type ;
	var deleteSql = "" ;
	
	if(type == 'image')
		deleteSql = "delete from tb_report_annot where annot_id in (?)" ;
	else
		deleteSql = "delete from tb_report_annot where annot_id = ?" ;
	
	client.query(deleteSql, [postData.annotId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"()");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}

function saveVideoLength(request, response){
	mylog("save video length  was called");
	var  postData = loadPostData(request);

	var client = createClientConn();
	client.query("update tb_project_file set video_length = ? where file_id =?",[postData.duration,postData.fileId],function selectCb(err, results, fields) {
		if (err) {
			throw err;
		}
		if (postData.callback) {
			response.writeHead(200, {"Content-Type": "text/html"});
			response.write(postData.callback+"()");
			response.end();
			mylog("response end");
		}
		closeClientConn(client);
	});

//	request.addListener("end",function(){});
}

function bindAnnot(request, response){
	mylog("Request handler 'bindAnnot' was called.");
	
	var  postData = loadPostData(request);
	var client = createClientConn();
	client.query("update tb_report_annot set start_point = ?, end_point = ? where annot_id =?",[postData.startPoint, postData.endPoint, postData.annotId],function selectCb(err, results, fields) {
		if (err) {
			throw err;
		}
		if (postData.callback) {
			response.writeHead(200, {"Content-Type": "text/html"});
			response.write(postData.callback+"()");
			response.end();
			mylog("response end");
		}
		closeClientConn(client);
	});
}

function mylog(message) {
  if (isLog == "Y") {
	console.log(message);
  }
}

function fetchfile(request,response){
	persistent.fetchFile(request.query.fileName, request.query.fileType, function(data) {
		// can add your code here
		
		// don't modified below code block, just include it in your code as below 
		response.setHeader("Accept-Ranges", "bytes");
		response.setHeader("Cache-Control", "public, max-age=0");
		response.setHeader('Content-Length', data.length);
		response.write(data);
		response.end();
	
	});
}

function sendProject(request, response) {
	mylog("Request handler 'sendProject' was called.");
	var postData = loadPostData(request);
	 
	var client = createClientConn();
	client.query("Select user_id from tb_user where user_name = ?" ,[postData.userName], 
		  function selectCb(err, results, fields) {
			var userId = results[0].user_id ;
			//console.log(userId) ;
			client.query("Insert into tb_project_notify(project_id,user_id,description,create_time) values(?,?,?,?)",
					[postData.projectId,userId,postData.description,postData.createTime], function selectCb(err, results, fields) {
					if (err) {
						throw err;
					}
					//jsonStr = JSON.stringify(results);
					if (postData.callback) {
						response.writeHead(200, {"Content-Type": "text/html"});
						response.write(postData.callback+"()");
						response.end();
						mylog("response end");
					}
					closeClientConn(client);
				}
			); 
		}
	);	
//	request.addListener("end", function() {});
}
function videoAnnotId(request, response) {
	mylog("get video annotation id ");
	var postData = loadPostData(request); 
	var client = createClientConn();
	client.query("SELECT ANNOT_ID as annotId from tb_report_annot where project_id =? and image_id =? and type='video'",		
		[postData.projectId,postData.imageId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
			mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}
function getAnnotCountForTB(request, response) {
//	mylog("check annot for tb begin ");
	var postData = loadPostData(request); 
	var client = createClientConn();
	client.query("SELECT count(*) as annotcount from tb_report_annot where project_id =?",		
		[postData.projectId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
	//		mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}
function getProjectName(request, response) {
	
	var postData = loadPostData(request); 
	var client = createClientConn();
	client.query("SELECT project_name as projectName from tb_project where project_id =?",		
		[postData.projectId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);

//	request.addListener("end", function() {});
}
function loadTBImages(request, response) {
	console.log('load tb images');
	var postData = loadPostData(request); 
	var client = createClientConn();
	client.query("select a.IMAGE_ID as bigImageId, a.IMAGE_NAME as bigImagePath, b.IMAGE_ID as thumImageId, a.IMAGE_NAME as bigImagePath, b.IMAGE_NAME as thumImagePath" +
			" from tb_converted_image a, tb_converted_image b where a.IMAGE_ID = b.RELA_IMAGE and a.project_id =?",		
		[postData.projectId], function selectCb(err, results, fields) {
			if (err) {
				throw err;
			}
			var resSize = results.length ;
			
			for(var i = 0 ; i < resSize ; i++){
				results[i].thumImagePath = "/fetchfile?fileName=" +  results[i].thumImagePath ;
				results[i].bigImagePath = "/fetchfile?fileName=" +  results[i].bigImagePath ;
			} 
			jsonStr = JSON.stringify(results);
			//mylog(jsonStr);
			if (postData.callback) {
				response.writeHead(200, {"Content-Type": "text/html"});
				response.write(postData.callback+"("+jsonStr+")");
				response.end();
				mylog("response end");
			}
			closeClientConn(client);
		}
	);
}


exports.sendProject = sendProject;
exports.fetchfile = fetchfile;
exports.uploadPluginVedio = uploadPluginVedio;
exports.start = start;
exports.upload = upload;
exports.backMaxType=backMaxType;
exports.loadProjectsListView = loadProjectsListView;
//exports.loadFiles = loadFiles;
exports.loadProject = loadProject;
exports.saveProject = saveProject;
exports.loadImages = loadImages;
exports.loadVedioFile = loadVedioFile;
exports.saveVideoLength = saveVideoLength;
exports.loadAnnotation = loadAnnotation;
exports.saveAnnotation = saveAnnotation;
exports.bindAnnot = bindAnnot;
exports.staticContents = staticContents;
exports.loadProjectsList=loadProjectsList;
//exports.whiteBoard = whiteBoard;
exports.loadReportsList=loadReportsList;
exports.loadNotificationMsg=loadNotificationMsg;
exports.loadPBAnnotation = loadPBAnnotation;
exports.loadTBAnnotation = loadTBAnnotation;
exports.savePTAnnotation = savePTAnnotation;
exports.deleteProject=deleteProject;
exports.deleteAnnotation=deleteAnnotation;
exports.videoAnnotId=videoAnnotId;
exports.loadThumImages = loadThumImages;
exports.getAnnotCountForTB = getAnnotCountForTB;
exports.getProjectName = getProjectName;
exports.initTbAnnotation = initTbAnnotation ;
exports.loadTBImages = loadTBImages;
