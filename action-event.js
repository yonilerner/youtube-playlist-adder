const message = document.getElementById('message')
message.textContent = 'Gathering tabs...'

const errors = document.getElementById('errors')
const addError = error => {
    const li = document.createElement('li')
    li.textContent = error
    errors.appendChild(li)
}

console.log('Action clicked')

chrome.tabs.query({
    currentWindow: true,
    status: 'complete',
    url: 'https://*.youtube.com/watch*'
}, tabs => {
    console.log('Found tabs:', tabs)

    if (tabs.length === 0) {
        message.textContent = 'No YouTube video tabs found!'
        return
    }

    const tabsStillWorking = new Set(tabs.map(tab => tab.id))
    const getNextTab = () => Array.from(tabsStillWorking)[0]

    const updateProgressWithTabCompletion = tabId => {
        if (tabId) {
            tabsStillWorking.delete(tabId)
        }
        message.textContent = `Progress: ${tabs.length - tabsStillWorking.size}/${tabs.length}`
    }

    const runScriptForTab = tabId => {
        chrome.tabs.executeScript(tabId, {file: 'injected-script.js'})
    }

    updateProgressWithTabCompletion()
    runScriptForTab(getNextTab())
    chrome.runtime.onMessage.addListener((msg, sender) => {
        if (sender.tab) {
            updateProgressWithTabCompletion(sender.tab.id)
            if (msg.error) {
                addError(msg.error)
            }
            if (tabsStillWorking.size === 0) {
                console.log('Done')
                message.textContent = 'Done!'
            } else {
                runScriptForTab(getNextTab())
            }
        }
    })
})
