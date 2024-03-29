let playlist

// Any click should be captured and prevented; instead, a video should be added
const clickListener = e => {
    let foundVideo = false
    const linkFromAncestor = searchAncestorsForVideoLink(e.target)
    if (linkFromAncestor) {
        const videoId = getVideoIdFromHref(linkFromAncestor)
        if (videoId) {
            foundVideo = true
            // Tell the background script to hit the Youtube API
            chrome.runtime.sendMessage({func: 'addToPlaylist', video: videoId, playlist})
        }
    }
    // TODO be smarter about clicks that arent supposed to be for videos and dont navigate; eg. the page background
    if (!foundVideo) {
        if (e.target.tagName.toLowerCase() !== 'a') {
            return
        }
        alert('Was not a valid video link!')
    }
    e.preventDefault()
    e.stopPropagation()
    return false
}

const getVideoIdFromHref = href => {
    if (href.includes('watch')) {
        return new URLSearchParams(
            new URL(href, location.origin).search
        ).get('v')
    } else {
        return href.split('/').slice(-1)[0]
    }
}

// Recursively search up the DOM for a parent with an href
const searchAncestorsForVideoLink = elem => {
    if (!elem) {
        return null
    }
    const pathname = elem.href ? new URL(elem.href).pathname : ''
    if (pathname.startsWith('/watch') || pathname.startsWith('/shorts')) {
        return elem.href
    }
    return searchAncestorsForVideoLink(elem.parentElement)
}

const activate = () => {
    document.addEventListener('click', clickListener, true)
}
const deactivate = () => {
    document.removeEventListener('click', clickListener, true)
}

const messageListener = (msg, from) => {
    if (msg.activate) {
        activate()
    } else if (msg.deactivate) {
        deactivate()
        playlist = null
    }
    if (msg.playlist) {
        playlist = msg.playlist
    }
    if (msg.error) {
        alert('Error: ' + msg.error)
    }
}
chrome.runtime.onMessage.removeListener(messageListener)
chrome.runtime.onMessage.addListener(messageListener)

// If we've stored a playlist, then activate the script even without receiving a message
chrome.storage.local.get('playlist', data => {
    if (data.playlist) {
        playlist = data.playlist
        activate()
    }
})
