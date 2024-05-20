const { appSecret } = useRuntimeConfig();

export default class CallsApp {
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
    console.log('🚀 ~ CallsApp ~ newTracks ~ sessionId:', this.sessionId)
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
