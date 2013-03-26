var http = require('http');

// runtime parameters
var mongoRuntime = null;
var mysqlRuntime = null;
var convertServiceOptions = null;
if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
	mongoRuntime = env['mongodb-2.0'][0]['credentials'];
	mysqlRuntime = env['mysql-5.1'][0]['credentials'];
	convertServiceOptions = {
		host : 'irpoct.cloudfoundry.com',
		port : 80,
		path : '/pdfToImg?'
	};
} else {
	mongoRuntime = {
		"hostname" : "localhost",
		"port" : ,
		"username" : "",
		"password" : "",
		"name" : "",//blank
		"db" : ""
	};

	mysqlRuntime = {
		"name" : "",
		"hostname" : "localhost",
		"host" : "localhost",
		"port" : ,
		"user" : "",
		"username" : "",
		"password" : ""
	};

	convertServiceOptions = {
		host : 'localhost',
		port : 8080,
		path : '/IRPocT/pdfToImg?'
	};
}

/** CONFIGURE mongodb --START */
var mongo = require('mongodb');

var ObjectID = mongo.ObjectID, GridStore = mongo.GridStore;

var PROJECT_INFO = "projectInfo";
var FILE_NAME_TO_ID_MAPPING = "fileNameToIDMapping";
/** CONFIGURE mongodb --END */

/** Event handled by mongodb --START */

/**
 * @param fileName
 *            the name of file
 * @param fileType
 *            the type of file
 * @param callback
 *            the callback, will be called after all things done
 * 
 */
function fetchFile(fileName, fileType, callback) {
	// Now create the server, passing our options.
	var mongoServer = new mongo.Server(mongoRuntime.hostname, mongoRuntime.port, {
		'auto_reconnect' : false,
		'poolSize' : 5
	});

	// Create a database handler to the Mongo database
	var mongoDB = new mongo.Db(mongoRuntime.db, mongoServer, {
		native_parser : false
	});
	mongoDB.open(function(err, db) {
		db.collection(FILE_NAME_TO_ID_MAPPING, function(err, mapCollection) {
			mapCollection.findOne({
				'fileName' : fileName.replace(".", "")
			}, function(err, doc) {
				if (err) {
					console.log("Didn't find the file");
					return callback(null);
				}
				var id = new ObjectID(doc.fileID);
				var videoGridStore = new GridStore(mongoDB, id, 'r');
				videoGridStore.open(function(err, videoGridStore) {
					if (err) {
						console.log("Open video file error" + err);
					}
					GridStore.read(mongoDB, id, function(err, data) {
						mongoDB.close();

						if (err) {
							console.log(err);
						}
						return callback(data);
					});
				});
			});
		});
	});
}

/**
 * @param video
 *            request.files.video
 * @param projectName
 *            the name of project OR null
 * @param videoName
 *            the name of video, must be unique
 * @param callback
 *            the callback, will be called after all things done
 * 
 * @return the information of video OR null
 * 
 */
function saveVideo(video, projectName, videoName, callback) {
	if (null == video || null == videoName || null == callback) {
		return null;
	}

	if (videoName.length == 0) {
		return null;
	}

	var videoPath = video.path, videoType = video.type, videoID = new ObjectID();
	// Now create the server, passing our options.
	var mongoServer = new mongo.Server(mongoRuntime.hostname, mongoRuntime.port, {
		'auto_reconnect' : false,
		'poolSize' : 5
	});

	// Create a database handler to the Mongo database
	var mongoDB = new mongo.Db(mongoRuntime.db, mongoServer, {
		native_parser : false
	});
	mongoDB.open(function(err, db) {
		var videoGridStore = new GridStore(mongoDB, videoID, 'w');
		videoGridStore.open(function(err, videoGridStore) {
			if (err) {
				console.log("Open video file error" + err);
			}
			videoGridStore.writeFile(videoPath, function(err, doc) {
				if (err) {
					console.log("write video file error" + err);
				}
				db.collection(FILE_NAME_TO_ID_MAPPING, function(err, mapCollection) {
					mapCollection.insert([ {
						'fileName' : videoName.replace(".", ""),
						'fileID' : videoID.toHexString()
					} ], {
						safe : true
					}, function(err, result) {
						mongoDB.close();
						return callback(null);
					});
				});
			});
		});
	});
}

/**
 * @param pdf
 *            request.files.pdf
 * @param video
 *            request.files.video OR null
 * @param projectName
 *            the name of project, must be unique
 * @param pdfFileName
 *            the name of pdf, must be unique
 * @param videoName
 *            the name of video, must be unique
 * @param userID
 *            the ID for user, must be unique
 * @param callback
 *            the callback, will be called after all things done
 * 
 * @return the information of project OR null
 * 
 */
function createProject(pdf, video, projectName, pdfFileName, videoName, userID, callback) {
	if (null == pdf || null == projectName || null == pdfFileName || null == callback) {
		return null;
	}

	if (projectName.length == 0 || pdfFileName.length == 0) {
		return null;
	}

	if (null != video && (null == videoName || videoName.length == 0)) {
		return null;
	}

	var pdfPath = pdf.path, pdfType = pdf.type, pdfID = new ObjectID();

	// Now create the server, passing our options.
	var mongoServer = new mongo.Server(mongoRuntime.hostname, mongoRuntime.port, {
		'auto_reconnect' : false,
		'poolSize' : 5
	});

	// Create a database handler to the Mongo database
	var mongoDB = new mongo.Db(mongoRuntime.db, mongoServer, {
		native_parser : false
	});
	mongoDB.open(function(err, db) {
		var pdfGridStore = new GridStore(mongoDB, pdfID, 'w');
		pdfGridStore.open(function(err, pdfGridStore) {
			if (err) {
				console.log("Open pdf file error" + err);
			}
			pdfGridStore.writeFile(pdfPath, function(err, pdfDoc) {
				if (err) {
					console.log("write pdf file error" + err);
				}
				if (null != video) {
					var videoPath = video.path, videoType = video.type, videoID = new ObjectID();
					var videoGridStore = new GridStore(mongoDB, videoID, 'w');
					videoGridStore.open(function(err, videoGridStore) {
						if (err) {
							console.log("Open video file error" + err);
						}
						videoGridStore.writeFile(videoPath, function(err, doc) {
							if (err) {
								console.log("write video file error" + err);
							}
							db.collection(PROJECT_INFO, function(err, projectCollection) {
								projectCollection.insert([ {
									'collectionName' : PROJECT_INFO,
									'_id' : projectName,
									'projectName' : projectName,
									'pdfName' : pdfFileName,
									'pdfType' : pdfType,
									'videoName' : videoName,
									'videoType' : videoType,
									'userId' : userID
								} ], {
									safe : true
								}, function(err, result) {
									db.collection(FILE_NAME_TO_ID_MAPPING, function(err, mapCollection) {
										mapCollection.insert([ {
											'fileName' : pdfFileName.replace(".", ""),
											'fileID' : pdfID.toHexString()
										}, {
											'fileName' : videoName.replace(".", ""),
											'fileID' : videoID.toHexString()
										} ], {
											safe : true
										}, function(err, result) {
											mongoDB.close();

											var _req = http.get({
												host : convertServiceOptions.host,
												port : convertServiceOptions.port,
												path : convertServiceOptions.path + 'projectName=' + projectName
											}, function(_res) {
												var data = "";
												_res.on('data', function(chunk) {
													data += chunk;
												});
												_res.on('end', function() {
													return callback(data);
												});
											});
											_req.on('error', function(e) {
												console.log(e.message);
											});
										});
									});
								});
							});
						});
					});
				} else {
					db.collection(PROJECT_INFO, function(err, projectCollection) {
						projectCollection.insert([ {
							'collectionName' : PROJECT_INFO,
							'_id' : projectName,
							'projectName' : projectName,
							'pdfName' : pdfFileName,
							'pdfType' : pdfType,
							'userId' : userID
						} ], {
							safe : true
						}, function(err, result) {
							db.collection(FILE_NAME_TO_ID_MAPPING, function(err, mapCollection) {
								mapCollection.insert([ {
									'fileName' : pdfFileName.replace(".", ""),
									'fileID' : pdfID.toHexString()
								} ], {
									safe : true
								}, function(err, result) {
									mongoDB.close();

									var _req = http.get({
										host : convertServiceOptions.host,
										port : convertServiceOptions.port,
										path : convertServiceOptions.path + 'projectName=' + projectName
									}, function(_res) {
										var data = "";
										_res.on('data', function(chunk) {
											data += chunk;
										});
										_res.on('end', function() {
											return callback(data);
										});
									});
									_req.on('error', function(e) {
										console.log(e.message);
									});
								});
							});
						});
					});
				}
			});
		});
	});
}
/** Event handled by mongodb --END */

/** CONFIGURE MySQL --START */
var mysql = require('mysql');
var mysqlConParam = {
	database : mysqlRuntime.name,
	host : mysqlRuntime.host,
	port : mysqlRuntime.port,
	user : mysqlRuntime.username,
	password : mysqlRuntime.password
};

function createMySqlClient() {
	var client = mysql.createClient(mysqlConParam);

	return client;
}

function closeClientConn(client) {
	client.end();
}
/** CONFIGURE MySQL --END */

exports.createProject = createProject;
exports.saveVideo = saveVideo;
exports.fetchFile = fetchFile;
exports.createMySqlClient = createMySqlClient;
exports.closeClientConn = closeClientConn;
