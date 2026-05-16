chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSuggestions') {
        const query = encodeURIComponent(request.query);
        // Amazon's public autocomplete API endpoint
        const url = `https://completion.amazon.com/api/2017/suggestions?session-id=135-0000000-0000000&customer-id=&request-id=&page-type=Gateway&lop=en_US&site-variant=desktop&client-info=amazon-search-ui&mid=ATVPDKIKX0DER&alias=aps&b2b=0&fresh=0&ks=65&prefix=${query}&event=step&limit=15`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                sendResponse({ success: true, data: data.suggestions });
            })
            .catch(err => {
                sendResponse({ success: false, error: err.toString() });
            });
        
        return true; // Keep channel open for async response
    }
});