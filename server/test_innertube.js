import { Innertube } from 'youtubei.js';

(async () => {
    try {
        console.log('Initializing Innertube...');
        const youtube = await Innertube.create();
        console.log('Innertube initialized!');

        console.log('\nTesting Search...');
        const search = await youtube.search('Blinding Lights');
        console.log(`Found ${search.videos.length} videos.`);

        if (search.videos.length > 0) {
            const videoId = search.videos[0].id;
            console.log(`Testing Stream Info for: ${videoId}`);

            // Try getInfo
            const info = await youtube.getInfo(videoId);
            console.log('Video Title:', info.basic_info.title);

            const format = info.chooseFormat({ type: 'audio', quality: 'best' });

            if (format) {
                console.log('Format found:', format.mime_type, format.bitrate);
                try {
                    const url = format.decipher(youtube.session.player);
                    console.log('Stream URL generated:', url ? 'Yes' : 'No');
                    if (url) console.log('URL:', url.substring(0, 50) + '...');
                } catch (e) {
                    console.error('Decipher error:', e.message);
                }
            } else {
                console.log('No matching format found');
            }
        }

        console.log('\n✅ Innertube test passed!');
    } catch (error) {
        console.error('\n❌ Innertube test failed:', error);
    }
})();
