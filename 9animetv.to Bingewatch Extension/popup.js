const ids = ['skipIntro', 'skipOutro', 'autoNext'];

// Load saved settings
chrome.storage.sync.get(ids, (result) => {
    ids.forEach(id => {
        document.getElementById(id).checked = result[id] !== false; // default to true
    });
});

// Save settings when clicked
document.addEventListener('change', (e) => {
    if (ids.includes(e.target.id)) {
        chrome.storage.sync.set({ [e.target.id]: e.target.checked });
    }
});