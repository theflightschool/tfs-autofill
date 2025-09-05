import { autofills } from './autofills';
import { notion } from './notion';

export default {
	async fetch(request, env) {

		if(request.method == 'GET') {
			return new Response("Progress!");
		}

		// Declared outside of try for availability to catch()
		let trigger = {
			databaseName: request.headers.get('database')
		};

		// Declared here, and as an object (thus referenced), for use by imported functions.
		let slackLog = {
			message: ''
		};

		try {

			let responseBody;
			
			const requestBody = await request.json();

			trigger.pageId = requestBody.data.id;
			trigger.linkedInUrl = requestBody.data.properties["LinkedIn Profile"].url;	

			switch( trigger.databaseName ) {
				case 'People':
					responseBody = await autofills.autofillPerson(trigger.pageId, trigger.linkedInUrl, slackLog);
					break;
				case 'Organizations':
					responseBody = await autofills.autofillOrg(trigger.pageId, trigger.linkedInUrl, slackLog);
					break;
				default:
			}

			return new Response(JSON.stringify(responseBody, null, 2), {
				headers: {
					'Content-Type': 'application/json'
				}
			});

		} catch(error) {

			console.trace("Trace log");

			// Update Slack Log
			slackLog.pageId = trigger.pageId.replaceAll("-", "");
			slackLog.stack = error.stack;

			// Post to Slack
			await fetch('https://hooks.slack.com/triggers/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', {
				method: 'POST',
				body: JSON.stringify(slackLog)
			});

			// Update Autofill Property
			await fetch(`${notion.baseUrl}/pages/${trigger.pageId}`, {
				method: 'PATCH',
				headers: notion.headers,
				body: JSON.stringify({
					properties: {
						"Autofill": {
							select: {
								name: "Hiccup—William's on it!"
							}
						}
					}
				})
			});

			return new Response("Hiccup—William's on it!", {
				headers: {
					'Content-Type': 'text/plain'
				}
			});

		}
		 
	}
};