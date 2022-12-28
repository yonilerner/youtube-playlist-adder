const playlistSelect = document.getElementById('playlist-select')
const loading = document.getElementById('loading')
const playlistSelectContainer = document.getElementById('playlist-select-container')
const goButton = document.getElementById('go')
const doneButton = document.getElementById('done')
const errorElem = document.getElementById('error')

const show = elem => elem.style.display = 'block'
const hide = elem => elem.style.display = 'none'

const getStorage = async var_ => {
    return new Promise(resolve => {
        chrome.storage.local.get(var_, result => {
            resolve(result)
        })
    })
}

const getActiveTabs = async () => {
    return new Promise(resolve => {
        chrome.tabs.query({
            currentWindow: true,
            active: true,
            status: 'complete',
            url: 'https://*.youtube.com/*'
        }, tabs => {
            resolve(tabs)
        })
    })
}

const sortPlaylistsAlphabetically = (a, b) => {
    a = a.name.toUpperCase()
    b = b.name.toUpperCase()
    return a < b ? -1 : a > b ? 1 : 0
}

const loadPlaylists = async() => {
    return new Promise(async resolve => {
        const result = await chrome.runtime.sendMessage({func: 'getPlaylists'})
        console.log(result)

        const playlists = result.result

        // Dynamically build the select list of playlists
        playlists.sort(sortPlaylistsAlphabetically).forEach(playlist => {
            const option = document.createElement('option')
            // This is my default playlist :/
            if (playlist.name === 'WatchFirst') {
                option.selected = 'selected'
            }
            option.textContent = playlist.name
            option.value = playlist.id
            playlistSelect.appendChild(option)
        })

        loading.style.display = 'none'
        playlistSelectContainer.style.display = 'block'
        resolve()
    })
}

goButton.onclick = async () => {
    const playlist = playlistSelect.value
    const tabs = await getActiveTabs()

    if (tabs.length === 0) {
        show(errorElem)
        errorElem.textContent = 'A YouTube page must be active'
        return
    }

    /*
    Save the tabs we activate so we can deactivate them when Done is clicked
    Save the playlist so we can access it from the content script
     */
    chrome.storage.local.set({activatedTabs: tabs.map(tab => tab.id), playlist})

    // Tell relevant tabs to activate their content scripts for this playlist
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {activate: true, playlist})
    })

    hide(playlistSelectContainer)
    hide(errorElem)
    show(doneButton)
}

doneButton.onclick = async () => {
    const storage = await getStorage('activatedTabs')
    // Deactivate content scripts for tabs that previously had their content scripts activated
    storage.activatedTabs.forEach(tabId => {
        chrome.tabs.sendMessage(tabId, {deactivate: true})
    })
    chrome.storage.local.set({activatedTabs: [], playlist: null})

    window.close()
}


(async () => {
    const storage = await getStorage('playlist')
    if (storage.playlist) {
        show(doneButton)
    } else {
        show(loading)
        await loadPlaylists()
    }
})()