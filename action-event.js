const closeWarningElem = document.getElementById('close-warning')
const messageElem = document.getElementById('message')

const errors = document.getElementById('errors')
const addError = error => {
    const li = document.createElement('li')
    li.textContent = error
    errors.appendChild(li)
}
const clearErrors = () => {
    Array.from(errors.children).forEach(child => {
        errors.removeChild(child)
    })
}

/*
This is a hack that lets us have a constant reference to a listener that we can add/remove
below, while giving the listener access to lexically scoped stuff in `tabsQueryCallback`
So we pass `messageListenerReference` to `chrome.runtime.onMessage.add/removeListener`, but the
actual functionality is in `messageListenerReference.listenerFunc`, which is assigned dynamically
 */
const messageListenerReference = (msg, sender) => {
    messageListenerReference.listenerFunc(msg, sender)
}

const tabsQueryCallback = (tabs, opts) => {
    console.log('Found tabs:', tabs)

    if (tabs.length === 0) {
        messageElem.textContent = 'No YouTube video tabs found!'
        return
    }

    closeWarningElem.style.display = 'block'

    const tabsStillWorking = new Set(tabs.map(tab => tab.id))

    const updateProgressWithTabCompletion = tabId => {
        if (tabId) {
            tabsStillWorking.delete(tabId)
        }
        messageElem.textContent = `Progress: ${tabs.length - tabsStillWorking.size}/${tabs.length}`
    }

    const runScriptForTab = (tabId, tabOpts) => {
        chrome.tabs.executeScript(tabId, {file: 'injected-script.js'}, () => {
            chrome.tabs.sendMessage(tabId, tabOpts)
        })
    }

    const checkIfDone = tabId => {
        updateProgressWithTabCompletion(tabId)
        if (tabsStillWorking.size === 0) {
            messageElem.textContent = 'Done!'
            closeWarningElem.style.display = 'none'
        } else {
            // For some reason doing them in parallel just doesnt work
            runScriptForTab(Array.from(tabsStillWorking)[0], opts)
        }
    }

    updateProgressWithTabCompletion()

    // First make sure the first tab works, see below
    const firstTab = tabs[0]
    runScriptForTab(firstTab.id, {...opts, firstTab: true})

    messageListenerReference.listenerFunc = (msg, sender) => {
        if (sender.tab) {
            if (msg.log) {
                console.log(`Script logged: '${msg.log}' from tab ${sender.tab.id}`)
            } else {
                console.log(`Got message from tab ${sender.tab.id}: ${JSON.stringify(msg)}`)
            }

            if (msg.error) {
                addError(msg.error)
                if (msg.opts.firstTab) {
                    messageElem.textContent = 'First tab failed, exiting'
                }
            }

            if (msg.done) {
                checkIfDone(sender.tab.id)
            }
        }
    }

    chrome.runtime.onMessage.removeListener(messageListenerReference)
    chrome.runtime.onMessage.addListener(messageListenerReference)
}

function run(opts) {
    console.log('Running with opts', opts)
    chrome.tabs.query({
        currentWindow: true,
        status: 'complete',
        url: 'https://*.youtube.com/watch*'
    }, tabs => tabsQueryCallback(tabs, opts))
}

function keyDown(e) {
    if (e.keyCode === 13) {
        clearErrors()
        run({playlist: e.target.value})
    }
}
document.getElementById('playlist').onkeydown = keyDown