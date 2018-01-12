(function() {
    const sleep = async ms => new Promise(res => setTimeout(res, ms))

    /*
    This makes `chances` attemps to run `elemQueryFunc`, sleeping for `ms` after each attempt,
    and returns the element only once `chances` are out, or:
    - If `all`, then when elem is a non-zero-length array
    - If not `all`, then when elem is a non-null value
     */
    const waitForElem = async (elemQueryFunc, chances = 3, ms = 1000, all = false) => {
        let result
        for (let i = 0; i < chances; i++) {
            result = elemQueryFunc()
            if ((!all && result) || (all && result.length !== 0)) {
                break
            }
            await sleep(ms)
        }
        return result
    }

    // This turns a querySelector input string `query` into a function that returns the result of that query
    const getQuerySelector = (query, fromElem = document, all = false) => {
        const method = all ? fromElem.querySelectorAll : fromElem.querySelector
        return method.bind(fromElem, query)
    }

    // Attempts to find an element matching `query`, waiting `ms` * `chances` for the elem to render before giving up
    const findElem = async (query, fromElem = document, all = false, chances = 3, ms = 1000) => {
        const selector = getQuerySelector(query, fromElem, all)
        const result = waitForElem(selector, chances, ms, all)
        if (!result) {
            throw new Error(`Couldnt find '${query}' in page!`)
        }
        return result
    }

    const run = async () => {
        // This represents the row of icons above the Subscribe button for up/down thumbs, sharing, adding to playlist, etc.
        const menuRenderer = await findElem('ytd-menu-renderer.style-scope.ytd-video-primary-info-renderer')
        // This represents the button for opening the playlist box to add/remove video to/from playlists
        const addToButton = await findElem('.yt-icon-button[aria-label="Add to"] .ytd-button-renderer', menuRenderer)
        // Only click the Add to button if the menu is inactive
        if (!menuRenderer.hasAttribute('menu-active')) {
            addToButton.click()
        }
        // Always wait a second for the #playlists box to sho wup
        await sleep(1000)

        // Get the playlists box
        const playlistsElem = await findElem('#playlists')
        // Find the playlist that we want to add the video to
        const desiredPlaylist = Array.from(playlistsElem.children)
            .map((elem, i) => ({name: elem.textContent.trim(), i}))
            .filter(playlistData => playlistData.name === 'WatchFirst')[0]
        if (!desiredPlaylist) {
            throw new Error('Couldnt find desired playlist')
        }
        // Find the checkbox that needs clicking to add the video to the desired playlist
        const playlistCheckbox = await findElem('.style-scope.paper-checkbox#checkbox', playlistsElem.children[desiredPlaylist.i])
        /*
        If its not already checked, then check it, effectively adding the video to the playlist
        Otherwise, click the addToButton to hide the playlists box. This reason for this is that if we are adding
            a video to a playlist, we want the box to stay up as a visual confirmation that the video was added,
            but if the video was already in the playlist, then we just close it to indicate that no changes were made
         */
        if (!playlistCheckbox.classList.contains('checked')) {
            playlistCheckbox.click()
        } else {
            addToButton.click()
        }
    }

    const successFunc = () => {
        console.log('Success')
        chrome.runtime.sendMessage({})
    }
    const errorFunc = e => {
        console.log('Error', e)
        chrome.runtime.sendMessage({error: e.stack})
    }

    if (document.readyState === 'complete') {
        run().then(successFunc, errorFunc)
    } else {
        const loadFunc = () => {
            run()
                .then(successFunc, errorFunc)
                .then(() => {
                    window.removeEventListener('load', loadFunc)
                })
        }
        window.addEventListener('load', loadFunc)
    }
})()