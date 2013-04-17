var socket = new WebSocket('ws://localhost:1337/');
var sourcevid = document.getElementById('sourcevid');
var remotevid = document.getElementById('remotevid');
var localStream = null;
var peerConn = null;
var started = false;

var logg = function(s) { console.log(s); };

//All functions to follow  
function onSignal(message) {
    logg("Sending setup signal");
    socket.send(message);
}

function onRemoteStreamAdded(event) {
    logg("Added remote stream");
    remotevid.src = window.webkitURL.createObjectURL(event.stream);
}

function onRemoteStreamRemoved(event) {
    logg("Remove remote stream");
    remotevid.src = "";
  }

function createPeerConnection() {
  	    try {
		      logg("Creating peer connection");
			  peerConn = new webkitPeerConnection("TURN localhost:12345", onSignal);
		      } catch (e) {
		        console.log("Failed to create PeerConnection, exception: " + e.message);
		      }
			peerConn.onaddstream = onRemoteStreamAdded;
			peerConn.addstream = localStream;
			peerConn.removestream = onRemoteStreamRemoved;	
  }

function connect(){
	if (!started && localStream) {
	      createPeerConnection();
	      logg('Adding local stream...');
	      peerConn.addStream(localStream);
	      started = true;
	    } else {
	      alert("Local stream not running yet.");
	    }
}

function hangUp(){
	logg("Hang up.");
    peerConn.close();
    peerConn = null;
    started = false;
}

function startVideo(){		//It has getUserMedia()
	try { 
        navigator.webkitGetUserMedia({audio: true, video: true}, successCallback, errorCallback);
      } catch (e) {
        navigator.webkitGetUserMedia("video,audio", successCallback, errorCallback);
      }
      function successCallback(stream) {
          sourcevid.src = window.webkitURL.createObjectURL(stream);
          localStream = stream;
          console.log("success callback in startVideo");
      }
      function errorCallback(error) {
          console.error('An error occurred in startVideo: [CODE ' +error + ']');
      }
}

function stopVideo(){
    sourcevid.src = "";
}

//Socket communication to follow
socket.addEventListener("message", onMessage, false);
function onMessage(evt) {
  logg("RECEIVED: "+evt.data);
  if (!started) {
    createPeerConnection();
    logg('Adding local stream...');
    peerConn.addStream(localStream);
    started = true;
  }
  // Message returned from other side
  logg('Processing signaling message...');
  peerConn.processSignalingMessage(evt.data);
}


 
