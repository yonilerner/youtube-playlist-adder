// This has been restricted to this chrome extension and the Youtube Data v3 API
const API_KEY = 'AIzaSyC0fXQoMTBMclUyfhi3YBJERCHYUC2nHZs'

// Get the oauth token from the browser identity
let oauthToken
chrome.identity.getAuthToken({interactive: true}, async token => {
    oauthToken = token
})

const getHeaders = token => {
    return {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
    }
}

const getPlaylistsPage = async (nextPageToken) => {
    const params = {
        part: 'id,snippet',
        mine: true,
        key: API_KEY
    }
    if (nextPageToken) {
        params.pageToken = nextPageToken
    }
    const url = 'https://www.googleapis.com/youtube/v3/playlists?' + new URLSearchParams(params)
    const response = await fetch(url, {
        headers: getHeaders(oauthToken)
    })
    const json = await response.json()
    if (json.error) {
        throw new Error(json.error.message)
    }
    console.log(json)
    return json
}

const getPlaylists = async () => {
    let items = [], nextPageToken

    while(true) {
        const playlistsPage = await getPlaylistsPage(nextPageToken)
        items = items.concat(playlistsPage.items)

        if (playlistsPage.nextPageToken) {
            nextPageToken = playlistsPage.nextPageToken
        } else {
            break
        }
    }

    return items
        .map(item => {
            return {
                id: item.id,
                name: item.snippet.title
            }
        })
}

const addToPlaylist = async (playlist, video) => {
    const url = 'https://www.googleapis.com/youtube/v3/playlistItems?' + new URLSearchParams({
        part: 'snippet',
        key: API_KEY
    })
    const response = await fetch(url, {
        headers: getHeaders(oauthToken),
        method: 'POST',
        body: JSON.stringify({
            snippet: {
                playlistId: playlist,
                resourceId: {
                    kind: 'youtube#video',
                    videoId: video
                }
            }
        })
    })
    const json = await response.json()
    if (json.error) {
        throw new Error(json.error.message)
    }
    return json
}

// Add these to the window so other scripts can call chrome.runtime.getBackgroundScript()...getPlaylists, etc.
window.getPlaylists = getPlaylists
window.addToPlaylist = addToPlaylist

// Listen for messages from the content script asking to add videos to a playlist
chrome.runtime.onMessage.addListener(async (msg, from) => {
    if (msg.playlist && msg.video) {
        await addToPlaylist(msg.playlist, msg.video)
    }
})