const forceClick = (el) => {
    ['mousedown', 'mouseup', 'click'].forEach(type => {
        el.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
    });
};

// --- Part A: The Website Logic (UI & Date) ---
const handleMainSite = () => {
    if (!window.location.hostname.includes('9animetv.to')) return;

    const bar = document.querySelector('.player-controls') || document.querySelector('.controls');
    if (bar && !document.getElementById('gemini-final')) {
        const gem = document.createElement('div');
        gem.id = 'gemini-final';
        gem.style.cssText = "display:inline-flex; align-items:center; gap:12px; margin-left:10px; margin-top:8px; vertical-align:middle; font-family:sans-serif; z-index:9999;";
        
        const createToggle = (id, labelText) => {
            const label = document.createElement('label');
            label.style.cssText = "display:flex; align-items:center; cursor:pointer; font-size:11px; color:#00ff00; font-weight:bold; margin:0;";
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.style.cssText = "margin-right:4px; accent-color:#00ff00; width:13px; height:13px;";
            chrome.storage.sync.get([id], (res) => { cb.checked = res[id] !== false; });
            cb.addEventListener('change', () => { chrome.storage.sync.set({ [id]: cb.checked }); });
            label.appendChild(cb); label.appendChild(document.createTextNode(labelText));
            return label;
        };

        const dateSpan = document.createElement('span');
        dateSpan.id = 'air-date';
        dateSpan.style.cssText = "font-size:10px; color:#aaa; border-left:1px solid #444; padding-left:10px; margin-left:5px;";
        dateSpan.innerText = "LOADING...";
        
        gem.appendChild(createToggle('skipIntro', 'INTRO'));
        gem.appendChild(createToggle('skipOutro', 'OUTRO'));
        gem.appendChild(createToggle('autoNext', 'AUTO NEXT'));
        gem.appendChild(dateSpan);
        bar.prepend(gem);

        // Fetch Title & Date
        try {
            let title = window.top.document.querySelector('.breadcrumb-item.active')?.innerText || window.top.document.title;
            title = title.replace(/Watching /gi, '').split(/Episode| - /i)[0].trim();
            fetch(`https://graphql.anilist.co`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query($s:String){Media(search:$s,type:ANIME){nextAiringEpisode{episode,airingAt}status}}`,
                    variables: { s: title }
                })
            }).then(r => r.json()).then(res => {
                const m = res.data.Media;
                if (m?.nextAiringEpisode) {
                    const d = new Date(m.nextAiringEpisode.airingAt * 1000);
                    dateSpan.innerText = `NEXT EP ${m.nextAiringEpisode.episode}: ${d.toLocaleDateString('en-GB')} @ ${d.toLocaleTimeString('en-GB', {hour:'numeric',minute:'2-digit'})}`;
                    dateSpan.style.color = "#00ff00";
                } else if (m) { dateSpan.innerText = `STATUS: ${m.status}`; }
            }).catch(() => { dateSpan.innerText = ""; });
        } catch (e) { dateSpan.innerText = ""; }
    }
};

// --- Part B: The Player Logic (Skips & Video Detection) ---
const handlePlayerAutomation = () => {
    chrome.storage.sync.get(['skipIntro', 'skipOutro', 'autoNext'], (settings) => {
        // 1. Recursive Skip Search
        const allElements = document.querySelectorAll('div, button, span, a');
        allElements.forEach(el => {
            const text = el.innerText?.toLowerCase() || "";
            if (el.offsetWidth > 0 && text.includes('skip')) {
                if (settings.skipIntro !== false && text.includes('intro')) forceClick(el);
                if (settings.skipOutro !== false && text.includes('outro')) forceClick(el);
                if (text === "skip") forceClick(el);
            }
        });

        // 2. Video End Detection
        const video = document.querySelector('video');
        if (settings.autoNext !== false && video && (video.ended || (video.currentTime > 10 && video.currentTime >= video.duration - 1))) {
            window.top.postMessage("EPISODE_DONE", "*");
        }
    });
};

// --- Listen for the "Next" signal from the player ---
window.addEventListener("message", (event) => {
    if (event.data === "EPISODE_DONE") {
        const nextBtn = document.querySelector('.btn-next, .pc-next, [title*="Next"], .next-episode');
        if (nextBtn) forceClick(nextBtn);
    }
});

// Run loop
setInterval(() => {
    handleMainSite();
    handlePlayerAutomation();
}, 1000);