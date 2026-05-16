// Function to check URL and redirect Shorts to the normal video player
function interceptShorts() {
    if (window.location.pathname.startsWith('/shorts/')) {
        // Extract the Video ID from the URL
        const videoId = window.location.pathname.replace('/shorts/', '').split('?')[0];
        
        if (videoId) {
            // Redirect to standard YouTube Watch interface
            window.location.replace(`https://www.youtube.com/watch?v=${videoId}`);
        } else {
            // Fallback to homepage
            window.location.replace('https://www.youtube.com/');
        }
    }
}

// Run immediately upon page load
interceptShorts();

// YouTube doesn't refresh the page when navigating (it's a Single Page Application).
// We listen to YouTube's specific navigation events to catch URL changes.
document.addEventListener('yt-navigate-start', interceptShorts);