import { fetchWithRetry } from "./utils";

export const proxycurl = {
    headers: {
        'Authorization': 'Bearer lZAryi04eG085JLB9RexKA'
    },
    getPersonData: getPersonData,
    getOrgData: getOrgData
}

async function getPersonData(linkedInUrl) {

    const encodedUrl = encodeURIComponent(linkedInUrl);

    const url = `https://enrichlayer.com/api/v2/profile?linkedin_profile_url=${encodedUrl}&extra=include&facebook_profile_id=include&twitter_profile_id=include&use_cache=if-recent`;
    const options = {
        headers: proxycurl.headers
    }

    return await fetchWithRetry(url, options);

}

async function getOrgData(linkedInUrl, linkedInUrlType){

    const encodedUrl = encodeURIComponent(linkedInUrl);

    const url = `https://enrichlayer.com/api/v2/${linkedInUrlType}?use_cache=if-recent&url=${encodedUrl}`;
    const options = { headers: proxycurl.headers };

    return await fetchWithRetry(url, options);

}