<template>
  <div>
    <div>local video</div>
    <video
      ref="localvideo"
      autoplay
      muted
    />
  </div>

  <div>
    <div>remote video</div>
    <video
      ref="remotevideo"
      autoplay
      muted
    />
  </div>
</template>

<script setup>
// import CallsApp from '../app/instance'

const appId = 'ad836a8241aec874626b3054f2200d6b'
const appSecret = 'beb113cacedfd22ef6a4959810b17baea15e96bc95c02bbd50f0911982dbcdbf'

const localvideo = ref()
const remotevideo = ref()

const localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
})

watchEffect(() => {
  if (localvideo.value)
    localvideo.value.srcObject = localStream
})

class CallsApp {
  constructor(appId, basePath = 'https://rtc.live.cloudflare.com/v1') {
    this.prefixPath = `${basePath}/apps/${appId}`
  }

  async sendRequest(url, body, method = 'POST') {
    const request = {
      method: method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${appSecret}`,
      },
      body: JSON.stringify(body),
    }
    const response = await fetch(url, request)
    const result = await response.json()
    return result
  }

  checkErrors(result, tracksCount = 0) {
    if (result.errorCode) {
      throw new Error(result.errorDescription)
    }
    for (let i = 0; i < tracksCount; i++) {
      if (result.tracks[i].errorCode) {
        throw new Error(
                  `tracks[${i}]: ${result.tracks[i].errorDescription}`,
        )
      }
    }
  }

  // newSession sends the initial offer and creates a session
  async newSession(offerSDP) {
    const url = `${this.prefixPath}/sessions/new`
    const body = {
      sessionDescription: {
        type: 'offer',
        sdp: offerSDP,
      },
    }
    const result = await this.sendRequest(url, body)
    this.checkErrors(result)
    this.sessionId = result.sessionId
    return result
  }

  // newTracks shares local tracks or gets tracks
  async newTracks(trackObjects, offerSDP = null) {
    const url = `${this.prefixPath}/sessions/${this.sessionId}/tracks/new`
    const body = {

      sessionDescription: {
        type: 'offer',
        sdp: offerSDP,
      },
      tracks: trackObjects,
    }
    if (!offerSDP) {
      delete body.sessionDescription
    }
    const result = await this.sendRequest(url, body)
    this.checkErrors(result, trackObjects.length)
    return result
  }

  // sendAnswerSDP sends an answer SDP if a renegotiation is required
  async sendAnswerSDP(answer) {
    const url = `${this.prefixPath}/sessions/${this.sessionId}/renegotiate`
    const body = {
      sessionDescription: {
        type: 'answer',
        sdp: answer,
      },
    }
    const result = await this.sendRequest(url, body, 'PUT')
    this.checkErrors(result)
  }
}

const app = new CallsApp(appId)
console.log('🚀 ~ app:', app)

// Use Cloudflare's STUN server
const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: 'stun:stun.cloudflare.com:3478',
    },
  ],
  bundlePolicy: 'max-bundle',
})
console.log(pc)

// Add sendonly trancievers to the PeerConnection
const transceivers = localStream.getTracks().map(track =>
  pc.addTransceiver(track, {
    direction: 'sendonly',
  }),
)

// Send the first offer and create a session. The returned sessionId is required to retrieve any track published by this peer
await pc.setLocalDescription(await pc.createOffer())
const newSessionResult = await app.newSession(
  pc.localDescription.sdp,
)
await pc.setRemoteDescription(
  new RTCSessionDescription(newSessionResult.sessionDescription),
)

// Make the peer connection was established
await new Promise((resolve, reject) => {
  pc.addEventListener('iceconnectionstatechange', (ev) => {
    if (ev.target.iceConnectionState === 'connected') {
      resolve()
    }
    setTimeout(reject, 5000, 'connect timeout')
  })
})
// We associate a trackName to a transceiver identified by a mid (media ID). This way the track
// is remotely reachable by the tuple (sessionId, trackName)
let trackObjects = transceivers.map((transceiver) => {
  return {
    location: 'local',
    mid: transceiver.mid,
    trackName: transceiver.sender.track.id,
  }
})

// Get local description, create a new track, set remote description with the response
await pc.setLocalDescription(await pc.createOffer())
const newLocalTracksResult = await app.newTracks(
  trackObjects,
  pc.localDescription.sdp,
)
await pc.setRemoteDescription(
  new RTCSessionDescription(newLocalTracksResult.sessionDescription),
)
// At this point in code, we are successfully sending local stream to Cloudflare Calls.
// Now, we will pull the same stream from Cloudflare Calls.

// Update trackObjects to reference the tracks as "remote"
trackObjects = trackObjects.map((trackObject) => {
  return {
    location: 'remote',
    sessionId: app.sessionId,
    trackName: trackObject.trackName,
  }
})

// Prepare to receive the tracks before asking for them
const remoteTracksPromise = new Promise((resolve) => {
  const tracks = []
  pc.ontrack = (event) => {
    tracks.push(event.track)
    console.debug(`Got track mid=${event.track.mid}`)
    if (tracks.length >= 2) {
      // remote video & audio are ready
      resolve(tracks)
    }
  }
})

// // Calls API request to ask for the tracks
// const newRemoteTracksResult = await app.newTracks(trackObjects)
// if (newRemoteTracksResult.requiresImmediateRenegotiation) {
//   switch (newRemoteTracksResult.sessionDescription.type) {
//     case 'offer':
//       // We let Cloudflare know we're ready to receive the tracks
//       await pc.setRemoteDescription(
//         new RTCSessionDescription(
//           newRemoteTracksResult.sessionDescription,
//         ),
//       )

//       await pc.setLocalDescription(await pc.createAnswer())
//       await app.sendAnswerSDP(pc.localDescription.sdp)
//       break
//     case 'answer':
//       throw new Error('An offer SDP was expected')
//   }
// }

const newRemoteTracksResult = await app.newTracks(trackObjects)

// Check if newRemoteTracksResult is null
if (newRemoteTracksResult) {
  if (newRemoteTracksResult.requiresImmediateRenegotiation) {
    // Existing logic for renegotiation
    switch (newRemoteTracksResult.sessionDescription.type) {
      case 'offer':
        // We let Cloudflare know we're ready to receive the tracks
        await pc.setRemoteDescription(
          new RTCSessionDescription(newRemoteTracksResult.sessionDescription),
        )

        await pc.setLocalDescription(await pc.createAnswer())
        await app.sendAnswerSDP(pc.localDescription.sdp)
        break
      case 'answer':
        throw new Error('An offer SDP was expected')
    }
  }
  else {
    // Handle case where renegotiation is not required
    console.log('Renegotiation not required. Proceeding with received tracks.')
  }
}
else {
  console.error('Error: newRemoteTracksResult is null')
  // Handle the null response (e.g., display an error message)
  // You can add logic to retry the request or inform the user about the issue.
}
console.log('🚀 ~ app:', app)
const remoteTracks = await remoteTracksPromise
const remoteStream = new MediaStream()
remoteStream.addTrack(remoteTracks[0])
remoteStream.addTrack(remoteTracks[1])

watchEffect(() => {
  if (remotevideo.value)
    remotevideo.value.srcObject = remoteStream
})
</script>

<style></style>
