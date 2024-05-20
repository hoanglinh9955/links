import { ref } from 'vue'

export default function useCallsApp(appId, basePath = 'https://rtc.live.cloudflare.com/v1') {
  const prefixPath = ref(`${basePath}/apps/${appId}`)
  const appSecret = ref(null) // Store app secret securely (explained later)
  const sessionId = ref(null)

  const sendRequest = async (url, body, method = 'POST') => {
    const request = {
      method,
      mode: 'cors',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${appSecret.value}`, // Use ref value
      },
      body: JSON.stringify(body),
    }

    const response = await fetch(url, request)
    const result = await response.json()

    checkErrors(result) // Use separate function
    return result
  }

  const checkErrors = (result, tracksCount = 0) => {
    if (result.errorCode) {
      throw new Error(result.errorDescription)
    }

    for (let i = 0; i < tracksCount; i++) {
      if (result.tracks && result.tracks[i].errorCode) {
        throw new Error(`tracks[${i}]: ${result.tracks[i].errorDescription}`)
      }
    }
  }

  const newSession = async (offerSDP) => {
    const url = `${prefixPath.value}/sessions/new`
    const body = {
      sessionDescription: {
        type: 'offer',
        sdp: offerSDP,
      },
    }

    const result = await sendRequest(url, body)
    sessionId.value = result.sessionId
    return result
  }

  const newTracks = async (trackObjects, offerSDP = null) => {
    const url = `${prefixPath.value}/sessions/${sessionId.value}/tracks/new`
    const body = {
      tracks: trackObjects,
    }

    if (offerSDP) {
      body.sessionDescription = {
        type: 'offer',
        sdp: offerSDP,
      }
    }

    const result = await sendRequest(url, body)
    checkErrors(result, trackObjects.length)
    return result
  }

  const sendAnswerSDP = async (answer) => {
    const url = `${prefixPath.value}/sessions/${sessionId.value}/renegotiate`
    const body = {
      sessionDescription: {
        type: 'answer',
        sdp: answer,
      },
    }

    const result = await sendRequest(url, body, 'PUT')
    checkErrors(result)
    return result
  }

  return {
    sendRequest,
    checkErrors,
    newSession,
    newTracks,
    sendAnswerSDP,
    sessionId,
  }
}
