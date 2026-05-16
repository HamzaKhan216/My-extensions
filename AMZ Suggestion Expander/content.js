// Graph SVG Icon
const graphIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="gray" xmlns="http://www.w3.org/2000/svg"><path d="M4 20H22V22H2V2H4V20ZM8 18H6V10H8V18ZM14 18H12V4H14V18ZM20 18H18V8H20V18Z"></path></svg><span style="font-size:10px; color:gray; margin-left:2px;">?</span>`;

let searchBox = null;
let aseContainer = null;
let typingTimer;
const doneTypingInterval = 500; 

// --- UPDATED --- Keyword Expansion Arrays
const suffixes = ['for kids', 'for adults', 'set', 'kit', 'bulk', 'for beginners', 'accessories', 'gift'];
const prefixes = ['best', 'cheap', 'with', 'new', 'top', 'professional', 'large'];
const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

function init() {
    searchBox = document.getElementById('twotabsearchtextbox');
    if (!searchBox) return;

    searchBox.setAttribute('autocomplete', 'off');
    buildUI();

    searchBox.addEventListener('input', () => {
        clearTimeout(typingTimer);
        const query = searchBox.value.trim();
        if (query.length > 1) {
            setLoadingState(true);
            typingTimer = setTimeout(() => fetchAndPopulate(query), doneTypingInterval);
        } else {
            aseContainer.style.display = 'none';
        }
    });

    searchBox.addEventListener('focus', () => {
        if (aseContainer.innerHTML.includes('ase-item')) {
            updatePosition();
            aseContainer.style.display = 'block';
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target) && !aseContainer.contains(e.target)) {
            aseContainer.style.display = 'none';
        }
    });

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
}

function buildUI() {
    aseContainer = document.createElement('div');
    aseContainer.id = 'ase-custom-container';

    // --- UPDATED --- Middle Column now shows Suffixes then Prefixes
    aseContainer.innerHTML = `
        <div id="ase-loader" style="display:none; padding: 40px; text-align:center; font-size: 16px;">Mining massive keyword data...</div>
        <div class="ase-columns" id="ase-columns-container">
            <div class="ase-col" id="ase-base-col">
                 <div class="ase-group-header gray">Base Suggestions</div>
                 <div id="ase-main-list" class="ase-list-group"></div>
            </div>
            <div class="ase-col" id="ase-middle-col">
                 <div class="ase-group-header green">Suffix Expansions</div>
                 <div id="ase-suffix-list" class="ase-list-group"></div>
                 
                 <div class="ase-group-header blue">Prefix Expansions</div>
                 <div id="ase-prefix-list" class="ase-list-group"></div>
            </div>
            <div class="ase-col" id="ase-alpha-col">
                <div class="ase-group-header green">Alphabetical Suffixes</div>
                <div id="ase-alpha-list" class="ase-list-group"></div>
            </div>
        </div>
        <div class="ase-footer">
            <div class="ase-footer-left">
                <span>Version 1.2.2</span>
                <span style="margin: 0 10px;">⚙️</span>
                <button id="ase-download-btn">📥 Download All Keywords!</button>
            </div>
            <div class="ase-footer-right">
                <span id="ase-keyword-count" style="font-weight:bold; margin-right: 15px;"></span>
                <span>💡Tip: Try pressing the up and down arrow keys to get other suggestions!</span>
            </div>
        </div>
    `;
    document.body.appendChild(aseContainer);
    document.getElementById('ase-download-btn').addEventListener('click', downloadCSV);
}

function setLoadingState(isLoading) {
    if (!aseContainer) return;
    const loader = document.getElementById('ase-loader');
    const columns = document.getElementById('ase-columns-container');
    const footer = document.querySelector('.ase-footer');
    
    if (isLoading) {
        updatePosition();
        aseContainer.style.display = 'block';
        loader.style.display = 'block';
        columns.style.display = 'none';
        footer.style.display = 'none';
    } else {
        loader.style.display = 'none';
        columns.style.display = 'grid';
        footer.style.display = 'flex';
    }
}

function updatePosition() {
    if (!searchBox || aseContainer.style.display === 'none') return;
    const searchForm = document.getElementById('nav-search-bar-form') || searchBox.parentElement;
    const rect = searchForm.getBoundingClientRect();
    aseContainer.style.top = `${rect.bottom + window.scrollY}px`;
    aseContainer.style.left = `${rect.left + window.scrollX}px`;
    const formWidth = rect.width;
    if (formWidth > 1000) {
        aseContainer.style.width = `${formWidth}px`;
    }
}

async function fetchAndPopulate(query) {
    const promises = [];
    
    // 1. Base query
    promises.push(chrome.runtime.sendMessage({ action: 'fetchSuggestions', query: query }));
    
    // 2. Suffix queries (Now included)
    suffixes.forEach(s => {
        promises.push(chrome.runtime.sendMessage({ action: 'fetchSuggestions', query: `${query} ${s}` }));
    });

    // 3. Prefix queries
    prefixes.forEach(p => {
        promises.push(chrome.runtime.sendMessage({ action: 'fetchSuggestions', query: `${p} ${query}` }));
    });

    // 4. Alphabetical suffix queries
    alphabet.forEach(char => {
        promises.push(chrome.runtime.sendMessage({ action: 'fetchSuggestions', query: `${query} ${char}` }));
    });

    const results = await Promise.allSettled(promises);
    processAndRender(query, results);
}

function processAndRender(query, results) {
    const mainList = document.getElementById('ase-main-list');
    const suffixList = document.getElementById('ase-suffix-list');
    const prefixList = document.getElementById('ase-prefix-list');
    const alphaList = document.getElementById('ase-alpha-list');
    
    mainList.innerHTML = '';
    suffixList.innerHTML = '';
    prefixList.innerHTML = '';
    alphaList.innerHTML = '';

    const masterSet = new Set(); 

    const render = (container, items) => {
        items.forEach(item => {
            if (item && !masterSet.has(item.value)) {
                masterSet.add(item.value);
                container.appendChild(createItemElement(item.value));
            }
        });
    };
    
    // 1. Base results
    const baseResult = results.shift();
    if (baseResult.status === 'fulfilled' && baseResult.value.success) {
        render(mainList, baseResult.value.data);
    }
    
    // 2. Suffix results
    const suffixResults = results.splice(0, suffixes.length);
    suffixResults.forEach(res => {
        if (res.status === 'fulfilled' && res.value.success) {
            render(suffixList, res.value.data);
        }
    });

    // 3. Prefix results
    const prefixResults = results.splice(0, prefixes.length);
    prefixResults.forEach(res => {
        if (res.status === 'fulfilled' && res.value.success) {
            render(prefixList, res.value.data);
        }
    });

    // 4. Alphabetical results
    const alphaResults = results;
    alphaResults.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data.length > 0) {
            const letter = alphabet[index].toUpperCase();
            const groupHeader = document.createElement('div');
            groupHeader.className = 'ase-group-header gray';
            groupHeader.textContent = `Suffix: "${letter}"`;
            alphaList.appendChild(groupHeader);
            render(alphaList, res.value.data);
        }
    });

    setLoadingState(false);
    updatePosition();
    document.getElementById('ase-keyword-count').textContent = `${masterSet.size} Keywords Found`;
}

function createItemElement(text) {
    const div = document.createElement('div');
    div.className = 'ase-item';
    const magGlass = '<svg style="width:14px; margin-right:8px; fill:#555;" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>';
    div.innerHTML = `<span class="ase-item-text">${magGlass}<b>${text}</b></span> <span class="ase-item-icon">${graphIcon}</span>`;
    div.addEventListener('click', () => {
        searchBox.value = text;
        aseContainer.style.display = 'none';
        document.getElementById('nav-search-bar-form').submit();
    });
    return div;
}

function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Keyword\n";
    const items = document.querySelectorAll('#ase-custom-container .ase-item-text b');
    items.forEach(item => {
        csvContent += `"${item.innerText}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `amazon_keywords_${searchBox.value.trim()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.addEventListener('load', init);