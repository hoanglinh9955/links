<template>
  <div>this new calls</div>
  <!-- <UInput ref="inputExam" /> -->
  <div>
      <h1>Calls Echo Demo</h1>
      <div>
        <h2>Local stream</h2>
        <video ref="local_video" autoplay muted>
        </video>

      </div>
      <div>
        <h2>Remote echo stream</h2>
        <video ref="remote_video" autoplay></video>
      </div>
    </div>
</template>

<script setup>
// This is a class the defines the Calls API interactions.
// It's not an SDK but a example of how Calls API can be used.
import { ref } from "vue";

const local_video = ref();
const remote_video = ref()


// This is the App Id provided by the dashboard that identifies this Calls Application.
const appId = '5a8c054d95c29fea28f3b06f3b1efc6f';
// DO NOT USE YOUR SECRET IN THE BROWSER FOR PRODUCTION. It should be kept and used server-side.
const appSecret = '5b8b74b250e6fbd28568ba8aa038335c294e5ebb726fbba696eedd933d377bed';

class CallsApp {
  constructor(appId, basePath = 'https://rtc.live.cloudflare.com/v1') {
    this.prefixPath = `${basePath}/apps/${appId}`;
  }

  async sendRequest(url, body, method = 'POST') {
    const request = {
      method: method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${appSecret}`
      },
      body: JSON.stringify(body)
    };
    const response = await fetch(url, request);
    const result = await response.json();
    return result;
  }

  checkErrors(result, tracksCount = 0) {
    if (result.errorCode) {
      throw new Error(result.errorDescription);
    }
    for (let i = 0; i < tracksCount; i++) {
      if (result.tracks[i].errorCode) {
        throw new Error(
          `tracks[${i}]: ${result.tracks[i].errorDescription}`
        );
      }
    }
  }

  // newSession sends the initial offer and creates a session
  async newSession(offerSDP) {
    const url = `${this.prefixPath}/sessions/new`;
    const body = {
      sessionDescription: {
        type: 'offer',
        sdp: offerSDP
      }
    };
    const result = await this.sendRequest(url, body);
    this.checkErrors(result);
    this.sessionId = result.sessionId;
    return result;
  }

  // newTracks shares local tracks or gets tracks
  async newTracks(trackObjects, offerSDP = null) {
    const url = `${this.prefixPath}/sessions/${this.sessionId}/tracks/new`;
    const body = {
      sessionDescription: {
        type: 'offer',
        sdp: offerSDP
      },
      tracks: trackObjects
    };
    if (!offerSDP) {
      delete body['sessionDescription'];
    }
    const result = await this.sendRequest(url, body);
    this.checkErrors(result, trackObjects.length);
    return result;
  }

  // sendAnswerSDP sends an answer SDP if a renegotiation is required
  async sendAnswerSDP(answer) {
    const url = `${this.prefixPath}/sessions/${this.sessionId}/renegotiate`;
    const body = {
      sessionDescription: {
        type: 'answer',
        sdp: answer
      }
    };
    const result = await this.sendRequest(url, body, 'PUT');
    this.checkErrors(result);
  }
}

// Use Cloudflare's STUN server
const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: 'stun:stun.cloudflare.com:3478'
    }
  ],
  bundlePolicy: 'max-bundle'
});

// In order to successfully establish a peer connection, we need at least one track to publish.
// In this case, we create two: video & audio
const localStream = await window.navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});



// Get the local video element in the HTML and set the source to show local stream

// const localVideoElement = local_video
console.log("🚀 ~ local_video:", local_video.srcObject)
// local_video.srcObject = localStream
local_video.value.srcObject = localStream.srcObject


local_video.value = 21
console.log("🚀 ~ local_video:", local_video.srcObject)
// localVideoElement.srcObject = localStream;
console.log("🚀 ~ localStream:", localStream)

// Add sendonly trancievers to the PeerConnection
const transceivers = localStream.getTracks().map(track =>
  pc.addTransceiver(track, {
    direction: 'sendonly'
  })
);

// Create a instance of CallsApp (defined below). Please note that this is not an official SDK but just a demo showing the HTML API.
const app = new CallsApp(appId);

// Send the first offer and create a session. The returned sessionId is required to retrieve any track published by this peer
await pc.setLocalDescription(await pc.createOffer());
const newSessionResult = await app.newSession(
  pc.localDescription.sdp
);
await pc.setRemoteDescription(
  new RTCSessionDescription(newSessionResult.sessionDescription)
);

// Make the peer connection was established
await new Promise((resolve, reject) => {
  pc.addEventListener('iceconnectionstatechange', ev => {
    if (ev.target.iceConnectionState === 'connected') {
      resolve();
    }
    setTimeout(reject, 5000, 'connect timeout');
  });
});

// We associate a trackName to a transceiver identified by a mid (media ID). This way the track
// is remotely reachable by the tuple (sessionId, trackName)
let trackObjects = transceivers.map(transceiver => {
  return {
    location: 'local',
    mid: transceiver.mid,
    trackName: transceiver.sender.track.id
  };
});

// Get local description, create a new track, set remote description with the response
await pc.setLocalDescription(await pc.createOffer());
const newLocalTracksResult = await app.newTracks(
  trackObjects,
  pc.localDescription.sdp
);
await pc.setRemoteDescription(
  new RTCSessionDescription(newLocalTracksResult.sessionDescription)
);

// At this point in code, we are successfully sending local stream to Cloudflare Calls.
// Now, we will pull the same stream from Cloudflare Calls.

// Update trackObjects to reference the tracks as "remote"
trackObjects = trackObjects.map(trackObject => {
  return {
    location: 'remote',
    sessionId: app.sessionId,
    trackName: trackObject.trackName
  };
});

// Prepare to receive the tracks before asking for them
const remoteTracksPromise = new Promise(resolve => {
  let tracks = [];
  pc.ontrack = event => {
    tracks.push(event.track);
    console.debug(`Got track mid=${event.track.mid}`);
    if (tracks.length >= 2) {
      // remote video & audio are ready
      resolve(tracks);
    }
  };
});

// Calls API request to ask for the tracks
const newRemoteTracksResult = await app.newTracks(trackObjects);
if (newRemoteTracksResult.requiresImmediateRenegotiation) {
  switch (newRemoteTracksResult.sessionDescription.type) {
    case 'offer':
      // We let Cloudflare know we're ready to receive the tracks
      await pc.setRemoteDescription(
        new RTCSessionDescription(
          newRemoteTracksResult.sessionDescription
        )
      );
      await pc.setLocalDescription(await pc.createAnswer());
      await app.sendAnswerSDP(pc.localDescription.sdp);
      break;
    case 'answer':
      throw new Error('An offer SDP was expected');
  }
}

// // Once started receiving the tracks (video & audio) send the data to the video tag
// const remoteTracks = await remoteTracksPromise;
// const remoteVideoElement = document.getElementById('remote-video');
// const remoteStream = new MediaStream();
// remoteStream.addTrack(remoteTracks[0]);
// remoteStream.addTrack(remoteTracks[1]);
// remoteVideoElement.srcObject = remoteStream;




</script>
