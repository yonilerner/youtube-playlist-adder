// This has been restricted to this chrome extension and the Youtube Data v3 API
const API_KEY = 'AIzaSyA3WFFsNfMYqCtI3ysjDlkzSZQh-wjjfzs'

const getStorage = async var_ => {
    return new Promise(resolve => {
        chrome.storage.local.get(var_, result => {
            resolve(result)
        })
    })
}

async function getToken() {
    const {token} = await getStorage('token')
    return token
}

const setStorage = async vars => {
    return new Promise(resolve => {
        chrome.storage.local.set(vars, () => resolve())
    })
}


// Get the oauth token from the browser identity
chrome.identity.getAuthToken({interactive: true}, async token => {
    await setStorage({token})
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
        key: API_KEY,
        maxResults: 50,
    }
    const oauthToken = await getToken()
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
    const oauthToken = await getToken()
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


// Listen for messages from the content script asking to add videos to a playlist

async function messageHandler(msg, from, sendResponse) {
    let result
    if (msg.func === 'getPlaylists') {
        result = await getPlaylists()
    }
    if (msg.func === 'addToPlaylist') {
        result = await addToPlaylist(msg.playlist, msg.video)
    }
    await sendResponse({result})
}
chrome.runtime.onMessage.addListener((msg, from, sendResponse) => {
    messageHandler(msg, from, sendResponse)
    return true
})