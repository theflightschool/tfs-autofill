import { notion } from './notion';

export async function fetchWithRetry(url, options) {

    for(let i = 0; i <= 3; i++) {

        try {

            let response = await fetch(url, options);
            let body = await response.json();

            if( !response.ok ) {
                throw new Error(`Custom fetch error! \n\nRequest Options: \n\n${JSON.stringify(options)}\n\nResponse: \n\n${JSON.stringify(body)}`);
            }

            return body;

        } catch(error) {

            if(i === 3) {
                throw error;
            }

            console.warn(`Fetch failed ${i + 1} times. Retrying.`)

            await new Promise( resolve => setTimeout(resolve, 3000) );

        }

    }
}

export async function postToSlack(json) {

    await fetch('https://hooks.slack.com/triggers/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', {
        method: 'POST',
        body: json
    });

}

export async function sendPhotoToZapier(pageId, photoUrl) {

    const url = 'https://hooks.zapier.com/hooks/catch/17513021/28wurxq/';
    const options = {
        method: 'POST',
        headers: notion.headers,
        body: JSON.stringify({
            pageId: pageId,
            photoUrl: photoUrl
        })
    }

    fetchWithRetry(url, options);

}