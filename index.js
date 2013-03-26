var express = require('express');
var app = express.createServer(), requestHandlers = require("./requestHandlers");

//app.configure(function() {
//  app.use(express.methodOverride());
//	app.use(express.bodyParser({uploadDir:'./resources/files'}));
//	app.use(app.router);
//});

app.configure(function() {
	app.use(express.methodOverride());
	app.use(express.bodyParser({
		uploadDir : __dirname + '/static/resources/files'
	}));
	app.use(express.static(__dirname + '/static'));
	app.use(express.errorHandler({
		dumpExceptions : true,
		showStack : true
	}));
	app.use(app.router);
});

app.get("/backMaxType", function(req, res) {
	requestHandlers.backMaxType(req, res);
});
app.get("/loadProjectsListView", function(req, res) {
	requestHandlers.loadProjectsListView(req, res);
});
//app.get('/html/index.html', function(req, res) {
//	requestHandlers.staticContents(req, res);
//});
//
app.get('/', function(req, res) {
	res.redirect("/html/index.html");
}); 

//app.get('/html/*', function(req, res) {
//	requestHandlers.staticContents(req, res);
//});
//
//app.get('/resources/*', function(req, res) {
//	requestHandlers.staticContents(req, res);
//});

app.get("/loadImages", function(req, res) {
	requestHandlers.loadImages(req, res);
});

app.get("/loadAnnotation", function(req, res) {
	requestHandlers.loadAnnotation(req, res);
});

app.get("/saveAnnotation", function(req, res) {
	requestHandlers.saveAnnotation(req, res);
});

app.post("/upload", function(req, res) {
	requestHandlers.upload(req, res);
});
app.get("/loadProjectsList", function(req, res) {
	requestHandlers.loadProjectsList(req, res);
});
app.get("/loadVedioFile", function(req, res) {
	requestHandlers.loadVedioFile(req, res);
});
app.get("/loadProject", function(req, res) {
	requestHandlers.loadProject(req, res);
});

app.get("/saveProject", function(req, res) {
	requestHandlers.saveProject(req, res);
});
app.get("/loadReportsList", function(req, res) {
	requestHandlers.loadReportsList(req, res);
});


app.post("/uploadPluginVedio", function(req, res) {
	requestHandlers.uploadPluginVedio(req, res);
});

app.get("/loadNotificationMsg", function(req, res) {
	requestHandlers.loadNotificationMsg(req, res);
});



app.get("/deleteProject", function(req, res) {
	requestHandlers.deleteProject(req, res);
});

app.get("/deleteAnnotation", function(req, res) {
	requestHandlers.deleteAnnotation(req, res);
});

app.get("/loadPBAnnotation", function(req, res) {
	requestHandlers.loadPBAnnotation(req, res);
});


app.get("/loadTBAnnotation", function(req, res) {
	requestHandlers.loadTBAnnotation(req, res);
});


app.get("/savePTAnnotation", function(req, res) {
	requestHandlers.savePTAnnotation(req, res);
});

app.get("/saveVideoLength", function(req, res) {
	requestHandlers.saveVideoLength(req, res);
});

app.get("/bindAnnot", function(req, res){
	requestHandlers.bindAnnot(req, res);
});

app.get("/fetchfile", function(req, res) {
	requestHandlers.fetchfile(req, res);
});

app.get("/sendProject", function(req, res) {
	requestHandlers.sendProject(req, res);
});

app.get("/loadThumImages", function(req, res) {
	requestHandlers.loadThumImages(req, res);
});

app.get("/videoAnnotId", function(req, res) {
	requestHandlers.videoAnnotId(req, res);
});
app.get("/getAnnotCountForTB", function(req, res) {
	requestHandlers.getAnnotCountForTB(req, res);
});
app.get("/getProjectName", function(req, res) {
	requestHandlers.getProjectName(req, res);
});

app.get("/initTbAnnotation", function(req, res) {
	requestHandlers.initTbAnnotation(req, res);
});

app.get("/loadTBImages", function(req, res) {
	requestHandlers.loadTBImages(req, res);
});
app.listen(process.env.VCAP_APP_PORT || 8888);

var io = require('socket.io').listen(app);
//io.disable('heartbeats');
io.sockets.on('connection', function(socket) {
  	socket.on('play', function(data) {
	     socket.broadcast.emit('sendPlay');
	});
  	
  	socket.on('pause', function(data) {
	     socket.broadcast.emit('sendPause');
	});
  	
  	socket.on('reStart', function(data) {
	     socket.broadcast.emit('sendRestart');
	});
  	
  	socket.on('ended', function(data) {
	     socket.broadcast.emit('sendEnded');
	});
	
   socket.on('MouseDown', function(data) {
		 console.log("Socket on MouseDown") ;
     socket.broadcast.emit('subMouseDown', {
   	  clientX: data.x,
   	  clientY: data.y
     });
   });

   socket.on('MouseMove', function(data) {
       socket.broadcast.emit('subMouseMove', {
       	clientX: data.x,
       	clientY: data.y
       });
     });
   
   socket.on('MouseUp', function(data) {
       socket.broadcast.emit('subMouseUp', {
       	clientX: data.x,
       	clientY: data.y
       });
     });
   
   socket.on('ConfirmOk', function(data) {
       socket.broadcast.emit('subConfirmOk', {
    	   isConn:data.isConn,
    	   pageSelect:data.pageSelect
       });
     });
   socket.on('OkScroll', function(data) {
       socket.broadcast.emit('subOkScroll');
     });
   socket.on('CancelScroll', function(data) {
       socket.broadcast.emit('subCancelScroll');
     });
   socket.on('ScrollTop', function(data) {
       socket.broadcast.emit('subScrollTop', {
    	   type:data.type
       });
     });
   socket.on('ConfirmCancel', function(data) {
       socket.broadcast.emit('subConfirmCancel', {
    	   type:data.type
       });
     });
   
   socket.on('SessionOk', function(data) {
       socket.broadcast.emit('subSessionOk',{
    	   type:data.type
       });
     });
   
   socket.on('syncPage', function(data) {   
       socket.broadcast.emit('subSyncPage',{
    	   pageNo:data.pageNo
       });
     });

   socket.on('samePage', function(data) {   
       socket.broadcast.emit('subSamePage',{
    	   type:data.type
       });
     }); 
   
   socket.on('isSessionNull', function(data) {   
       socket.broadcast.emit('subIsSessionNull');

     }); 
   
   socket.on('Clear', function(data) {
       socket.broadcast.emit('subClear');
     });
   
   socket.on('EndSession', function(data) {
       socket.broadcast.emit('subEndSession');
     });
   
   socket.on('TapThumbNail', function(data) {
       socket.broadcast.emit('subTapThumbNail',{
    	   pageIndex : data.pageIndex
       });
     });
   
   socket.on('TapPageChange', function(data) {
       socket.broadcast.emit('subTapPageChange',{
    	   pageIndex : data.pageIndex
       });
     });
   
   socket.on('SendMsg', function(data) {
       socket.broadcast.emit('subSendMsg',{
    	    sendTime:data.sendTime,
			content: data.content,
			sendUser:data.sendUser
       });
     });
   
   socket.on('SendNotify', function(data) {
       socket.broadcast.emit('subSendNotify',{
    	    projectId:data.projectId,
    	    projectType:data.projectType,
    	    sendTime:data.sendTime,
			description: data.description,
			projectName:data.projectName,
			sendUser:data.sendUser
       });
     });
   
   
      
});
