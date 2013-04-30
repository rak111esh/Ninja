/////////////////////////////////////////////////////////////////
// Javascript file used to make a visio call between 2 clients //
/////////////////////////////////////////////////////////////////

//-- Global variables declarations--//
var localVideo;
var remoteVideo;
var status;  
var guest;
var message;
var url;
var localStream;
var started = false; 
var channelReady = false;
var pc;
var socket;
var room;
var type=null;
var sdpConstraints = {'mandatory': {
    'OfferToReceiveAudio':true, 
    'OfferToReceiveVideo':true }};
/**
 * The first function to be launched
 * @return {void}
 */
initialize = function() {
    console.log("Initializing in webrtc.js");
    localVideo = $("#localVideo");
    remoteVideo = $("#remoteVideo");
    status = $("#status");
    openChannel();
    getUserMedia1();
}

/**
 * Allow to reset the status in the footer
 * @return {void}
 */
resetStatus = function() {
    
    /**
     * if you aren't the guest it provides you a link to invite someone in the footer
     */
    if (!guest) {
      console.log("Waiting for someone to join: "+window.location.href+"?room="+room);
        setStatus("<div class=\"alert\">Waiting for someone to join: <a href=\""+window.location.href+"?room="+room+"\">"+window.location.href+"?room="+room+"</a></div>");
    } else {
        setStatus("Initializing...");
        console.log("Initializing...");
    }
}

/**
 * Set the footer
 * @param {string} state : string to be placed in the footer
 */
setStatus = function(state) {
    $('#footer').html(state);
}

/**
 * Declare the socket (websocket) and open it
 * declare the event attached to the socket
 * @return {void}
 */
openChannel = function() {
    socket = io.connect('http://localhost:8888/');
	
    socket
      .on('connect', onChannelOpened)
      .on('message', onChannelMessage)
      .on('error', onChannelError)
      .on('bye', onChannelBye)
      .on('close', onChannelClosed)
     
    /**
     * search the url address for the parameter room
     * if it exists it means you are a guest and you don't need to request a room number
     */ 
    if(location.search.substring(1,5) == "room") {
      room = location.search.substring(6);
      socket.emit("invite", room);
      guest =1;
    } else {
      socket.on('getRoom', function(data){
        room = data.roomId;
        console.log(room);
        resetStatus();
        guest = 0;
      });
    }
};

/**
 * get the media (audio or video) of the user
 * @return {void}
 */
getUserMedia1 = function() {
	console.log("---------getUserMedia---------");
//	 var constraints={{ media_constraints|safe }};  
    try {
    	getUserMedia({audio:true, video:true}, onUserMediaSuccess,
                                   onUserMediaError);
      console.log("Requested access to local media with new syntax.");
    } catch (e) {
      try {
    	  getUserMedia("video,audio", onUserMediaSuccess,
                                     onUserMediaError);
        console.log("Requested access to local media with old syntax.");
      } catch (e) {
        alert("webkitGetUserMedia() failed. Is the MediaStream flag enabled in about:flags?");
        console.log("webkitGetUserMedia failed with exception: " + e.message);
      }
    }
}

/**
 * Callback function for getUserMedia() on success getting the media
 * create an url for the current stream
 * @param  {stream} stream : contains the video and/or audio streams
 * @return {void}
 */
onUserMediaSuccess = function(stream) {
    console.log("User has granted access to local media.");
//    url = webkitURL.createObjectURL(stream);
    localVideo.css("opacity", "1");
    $("#locallive").removeClass('hide');
 //   localVideo.attr("src", url);
    attachMediaStream(localVideo,stream);
    localStream = stream;   
    if (guest) maybeStart();    
}

/**
 * Callback function for getUserMedia() on fail getting the media
 * @param  {error} error : informations about the error
 * @return {void}
 */
onUserMediaError = function(error) {
    console.log("Failed to get access to local media. Error code was " + error.code);
    alert("Failed to get access to local media. Error code was " + error.code + ".");    
}

/**
 * Verify all parameters and start the peer connection and add the stream to this peer connection
 * @return {void}
 */
maybeStart = function() {
    if (!started && localStream && channelReady) {      
        setStatus("Connecting..."); 
        console.log("Creating PeerConnection.");
        createPeerConnection();  
        console.log("Adding local stream.");      
        pc.addStream(localStream);
        started = true;
        
        if (guest)  
            doCall();  
    }
}

doCall= function() {
	  console.log("Sending offer to peer.");
//	  pc.createOffer(setLocalAndSendMessage, null);
	  
	    var constraints =  {'mandatory': {'MozDontOfferDataChannel':true} , 'optional': []};
	    // temporary measure to remove Moz* constraints in Chrome
	    if (webrtcDetectedBrowser === "chrome") {
	      for (prop in constraints.mandatory) {
	        if (prop.indexOf("Moz") != -1) {
	          delete constraints.mandatory[prop];
	        };
	       };
	     };   
	    constraints = mergeConstraints(constraints, sdpConstraints);
	    type='offer';
	    pc.createOffer(setLocalAndSendMessage, null, constraints);
//	  pc.createOffer(function(offer) {
//		    log("Created offer" + JSON.stringify(offer));
//		    pc.setLocalDescription(offer, function() {
//		      // Send offer to remote end.
//		      log("setLocalDescription, sending to remote");
//		      peerc = pc;
//		      sendMessage(offer);
//		    }, logError);
//		  }, logError , constraints);
	}


function mergeConstraints(cons1, cons2) {
    var merged = cons1;
    for (var name in cons2.mandatory) {
      merged.mandatory[name] = cons2.mandatory[name];
    }
    merged.optional.concat(cons2.optional);
    return merged;
  }


 setLocalAndSendMessage = function(sessionDescription) {
	  // Set Opus as the preferred codec in SDP if Opus is present.
	 console.log("---------setLocalAndSendMessage-------")
	  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
	  pc.setLocalDescription(sessionDescription);
	  sendMessage(sessionDescription);
	}
 
 
 function preferOpus(sdp) {
//	    var sdpLines = sdp.split('\r\n');
//
//	    // Search for m line.
//	    for (var i = 0; i < sdpLines.length; i++) {
//	        if (sdpLines[i].search('m=audio') !== -1) {
//	          var mLineIndex = i;
//	          break;
//	        } 
//	    }
//	    if (mLineIndex === null)
//	      return sdp;
//
//	    // If Opus is available, set it as the default in m line.
//	    for (var i = 0; i < sdpLines.length; i++) {
//	      if (sdpLines[i].search('opus/48000') !== -1) {        
//	        var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
//	        if (opusPayload)
//	          sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
//	        break;
//	      }
//	    }
//
//	    // Remove CN in m line and sdp.
//	    sdpLines = removeCN(sdpLines, mLineIndex);
//	    if (webrtcDetectedBrowser == "firefox" && type=='offer') {
//	    var pop=sdpLines.pop();
//	    sdpLines.push('a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:BAADBAADBAADBAADBAADBAADBAADBAADBAADBAAD');
//	    sdpLines.push(pop);
//	    }
//	    sdp = sdpLines.join('\r\n');
//	    
//	    return sdp;
 
	  if (webrtcDetectedBrowser !== "firefox") {    
		  return sdp;  }  
	  var sdpLinesIn = sdp.split('\r\n');  
	  var sdpLinesOut = [];  // Search for m line.  
	  for (var i = 0; i < sdpLinesIn.length; i++) {    
		  sdpLinesOut.push(sdpLinesIn[i]);    
		  if (sdpLinesIn[i].search('m=') !== -1) {      
			  sdpLinesOut.push("a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");    
			  }   
		  }  
	  sdp = sdpLinesOut.join('\r\n');  
	  return sdp;
	 
 }
 function extractSdp(sdpLine, pattern) {
	    var result = sdpLine.match(pattern);
	    return (result && result.length == 2)? result[1]: null;
	  }
 
 function removeCN(sdpLines, mLineIndex) {
	    var mLineElements = sdpLines[mLineIndex].split(' ');
	    // Scan from end for the convenience of removing an item.
	    for (var i = sdpLines.length-1; i >= 0; i--) {
	      var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
	      if (payload) {
	        var cnPos = mLineElements.indexOf(payload);
	        if (cnPos !== -1) {
	          // Remove CN payload from m line.
	          mLineElements.splice(cnPos, 1);
	        }
	        // Remove CN line in sdp
	        sdpLines.splice(i, 1);
	      }
	    }

	    sdpLines[mLineIndex] = mLineElements.join(' ');
	    return sdpLines;
	  }

	  // Set the selected codec to the first in m line.
	  function setDefaultCodec(mLine, payload) {
	    var elements = mLine.split(' ');
	    var newLine = new Array();
	    var index = 0;
	    for (var i = 0; i < elements.length; i++) {
	      if (index === 3) // Format of media starts from the fourth.
	        newLine[index++] = payload; // Put target payload to the first.
	      if (elements[i] !== payload)
	        newLine[index++] = elements[i];
	    }
	    return newLine.join(' ');
	  }
  sendMessage = function(message) {
	  var msgString = JSON.stringify(message);
	  console.log('C->S: ' + msgString);

	  socket.send(msgString);
//	  path = '/message?r=99688636' + '&u=92246248';
//	  var xhr = new XMLHttpRequest();
//	  xhr.open('POST', path, true);
//	  xhr.send(msgString);
	}
 
 
/**
 * Set parameter for creating a peer connection and add a callback function for messagin by peer connection
 * @return {void}
 */
createPeerConnection = function() {
/*  if(typeof webkitPeerConnection === 'function')
    pc = new webkitPeerConnection("NONE", onSignalingMessage);  
  else
    pc = new webkitDeprecatedPeerConnection("NONE", onSignalingMessage);
 */ 
//  var pc_config = null;
//  pc = new webkitRTCPeerConnection(pc_config);
//  pc.onicecandidate = onSignalingMessage;
  var pc_config = {"iceServers":[{"url":"stun:23.21.150.12"}]};
  var pc_constraints = { 'mandatory': [{'DtlsSrtpKeyAgreement': 'true'}]};
  // Force the use of a number IP STUN server for Firefox.
  if (webrtcDetectedBrowser == "firefox") {
    pc_config = {"iceServers":[{"url":"stun:23.21.150.12"}]};
  }    
  try {
	    // Create an RTCPeerConnection via the polyfill (adapter.js).
	    pc = new RTCPeerConnection(pc_config, pc_constraints);
	    pc.onicecandidate = onIceCandidate;
	    console.log("Created RTCPeerConnnection with config:\n" + "  \"" +
	      JSON.stringify(pc_config) + "\".");
	  } catch (e) {
	    console.log("Failed to create PeerConnection, exception: " + e.message);
	    alert("Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.");
	      return;
	  }
  
  
  pc.onconnecting = onSessionConnecting;
  pc.onopen = onSessionOpened;
  pc.onaddstream = onRemoteStreamAdded;
  pc.onremovestream = onRemoteStreamRemoved;  
}

function onIceCandidate(event) {
    if (event.candidate) {
      sendMessage({type: 'candidate',
                   label: event.candidate.sdpMLineIndex,
                   id: event.candidate.sdpMid,
                   candidate: event.candidate.candidate});
    } else {
      console.log("End of candidates.");
    }
  }

/**
 * Function called by the peerConnection method for the signaling process between clients
 * @param  {message} message : generated by the peerConnection API to send SDP message
 * @return {void}
 */
onSignalingMessage = function(event) {      
    console.log("onSignalingMessage " ,event);
//    socket.send(message);    
    if (event.candidate) {
    	sendMessage({type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate});
      } else {
        console.log("End of candidates.");
      }
}

/**
 * Call when the user click on the "Hang Up" button
 * Close the peerconnection and tells to the websocket server you're leaving
 * @return {void}
 */
onHangup = function() {
    console.log("Hanging up.");    
    localVideo.css("opacity", "0");    
    remoteVideo.css("opacity", "0");
    $("#locallive").addClass('hide');
    $("#remotelive").addClass('hide');    
    pc.close();
    pc = null;
    socket.emit("exit");
    setStatus("<div class=\"alert alert-info\">You have left the call.</div>");    
}

/**
 * Called when the channel with the server is opened
 * if you're the guest the connection is establishing by calling maybeStart()
 * @return {void}
 */
onChannelOpened = function() {    
    console.log('Channel opened.');
    channelReady = true;
    if (guest) maybeStart();
}

/**
 * Called when the client receive a message from the websocket server
 * @param  {message} message : SDP message
 * @return {void}
 */
onChannelMessage = function(message) {
    console.log('S->C: ' + message);
    if (message.indexOf("\"ERROR\"", 0) == -1) {        
        if (!guest && !started) maybeStart();
//        pc.processSignalingMessage(message);    
        processSignalingMessage(message);   
    }
}

/**
 * Called when the other client is leaving
 * @return {void}
 */
onChannelBye = function() {
    console.log('Session terminated.');    
    remoteVideo.css("opacity", "0");
    $("#remotelive").addClass('hide');
    //remoteVideo.attr("src",null);
    guest = 0;
    started = false;
    setStatus("<div class=\"alert alert-info\">Your partner have left the call.</div>");
}

/**
 * log the error
 * @return {void}
 */
onChannelError = function() {    
    console.log('Channel error.');
}

/**
 * log that the channel is closed
 * @return {[type]}
 */
onChannelClosed = function() {    
    console.log('Channel closed.');
}

/**
 * Called when the peer connection is connecting
 * @param  {message} message
 * @return {void}
 */
onSessionConnecting = function(message) {      
    console.log("Session connecting.");
}

/**
 * Called when the session between clients is established
 * @param  {message} message
 * @return {void}
 */
onSessionOpened = function(message) {      
    console.log("Session opened.");
}

/**
 * Get the remote stream and add it to the page with an url
 * @param  {event} event : event given by the browser
 * @return {void}
 */
onRemoteStreamAdded = function(event) {   
    console.log("Remote stream added.");
 //   url = webkitURL.createObjectURL(event.stream);
    remoteVideo.css("opacity", "1");
    $("#remotelive").removeClass('hide');
//    remoteVideo.attr("src",url);
    attachMediaStream(remoteVideo,event.stream);
    setStatus("<div class=\"alert alert-success\">Is currently in video conference <button id=\"hangup\" class=\"btn btn-mini btn-danger pull-right\" onclick=\"onHangup()\">Hang Up</button></div>");
}

/**
 * Called when the remote stream has been removed
 * @param  {event} event : event given by the browser
 * @return {void}
 */
onRemoteStreamRemoved = function(event) {   
    console.log("Remote stream removed.");
}

 processSignalingMessage= function(message) {
	  var msg = JSON.parse(message);

	  if (msg.type === 'offer') {
		  
	    // Callee creates PeerConnection
	    if (!guest && !started)
	      maybeStart();
var sessionRemote=new RTCSessionDescription(msg);
console.log("**remote session",sessionRemote);
	    pc.setRemoteDescription(sessionRemote);
	   type='answer'; 
	   setTimeout("doAnswer()",5000);

	//  doAnswer();
	  } else if (msg.type === 'answer' && started) {
		 
	    pc.setRemoteDescription(new RTCSessionDescription(msg));
	  } else if (msg.type === 'candidate' && started) {
	    var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label,
	                                         candidate:msg.candidate});
	    console.log("RTCIceCandidate",candidate);
	    pc.addIceCandidate(candidate);
	  } else if (msg.type === 'bye' && started) {
	    onRemoteHangup();
	  }
	}
 
 function onRemoteHangup() {
	    console.log('Session terminated.');
	  }
 
 function doAnswer() {
	  console.log("Sending answer to peer.");
	  pc.createAnswer(setLocalAndSendMessage, logError,sdpConstraints);
//	  pc.createAnswer(function(answer) {
//	        pc.setLocalDescription(answer, function() {
//	          // Send answer to remote end.
//	          log("created Answer and setLocalDescription " + JSON.stringify(answer));
//	          peerc = pc;
//	          sendMessage(answer);
//	        }, logError);
//	      }, logError,sdpConstraints);
	}
 
 function logError(error){
	 console.log("------------",error);
 }
 function log(msg){
	 console.log(msg);
 }
