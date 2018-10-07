const closeWarningElem = document.getElementById('close-warning')
const messageElem = document.getElementById('message')
// messageElem.textContent = 'Gathering tabs...'

const errors = document.getElementById('errors')
const addError = error => {
    const li = document.createElement('li')
    li.textContent = error
    errors.appendChild(li)
}

function run(opts) {
    console.log('Running with opts', opts)
    chrome.tabs.query({
        currentWindow: true,
        status: 'complete',
        url: 'https://*.youtube.com/watch*'
    }, tabs => {
        console.log('Found tabs:', tabs)

        if (tabs.length === 0) {
            messageElem.textContent = 'No YouTube video tabs found!'
            return
        }

        closeWarningElem.style.display = 'block'

        const tabsStillWorking = new Set(tabs.map(tab => tab.id))
        const getNextTab = () => Array.from(tabsStillWorking)[0]

        const updateProgressWithTabCompletion = tabId => {
            if (tabId) {
                tabsStillWorking.delete(tabId)
            }
            messageElem.textContent = `Progress: ${tabs.length - tabsStillWorking.size}/${tabs.length}`
        }

        const runScriptForTab = tabId => {
            chrome.tabs.executeScript(tabId, {file: 'injected-script.js'}, () => {
                chrome.tabs.sendMessage(tabId, opts)
            })
        }

        updateProgressWithTabCompletion()
        runScriptForTab(getNextTab())
        chrome.runtime.onMessage.addListener((msg, sender) => {
            if (sender.tab) {
                if (msg.log) {
                    console.log(`Script logged: '${msg.log}'`)
                }

                if (msg.error) {
                    addError(msg.error)
                }

                if (msg.done) {
                    updateProgressWithTabCompletion(sender.tab.id)
                    if (tabsStillWorking.size === 0) {
                        messageElem.textContent = 'Done!'
                        closeWarningElem.style.display = 'none'
                    } else {
                        // TODO Parallelize?
                        runScriptForTab(getNextTab())
                    }
                }
            }
        })
    })
}

function keyDown(e) {
    if (e.keyCode === 13) {
        run({playlist: e.target.value})
    }
}

document.getElementById('playlist').onkeydown = keyDown