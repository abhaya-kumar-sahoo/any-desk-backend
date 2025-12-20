const { desktopCapturer } = require('electron');

async function getScreenSources() {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources;
}

async function captureScreen(sourceId) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId,
                    minWidth: 1280,
                    maxWidth: 1920,
                    minHeight: 720,
                    maxHeight: 1080,
                    minFrameRate: 15,
                    maxFrameRate: 30
                }
            }
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.onloadedmetadata = (e) => video.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        return {
            getNextFrame: () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    // Compress to JPEG for performance
                    return canvas.toDataURL('image/jpeg', 0.5);
                }
                return null;
            },
            stop: () => {
                stream.getTracks().forEach(track => track.stop());
                video.remove();
                canvas.remove();
            }
        };
    } catch (e) {
        console.error('Failed to capture screen:', e);
        throw e;
    }
}

module.exports = { getScreenSources, captureScreen };
