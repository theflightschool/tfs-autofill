import { proxycurl } from './proxycurl';
import { notion } from './notion';

export const autofills = {
    autofillPerson: autofillPerson,
    autofillOrg: autofillOrg
}

async function autofillPerson(pageId, linkedInUrl, slackLog) {

    let personData = await proxycurl.getPersonData(linkedInUrl);

    if(personData.state) {
        const statePage = await notion.getStatePage(personData.state);
        if(statePage) {
            personData.statePageId = statePage.results[0].id;
            personData.stateCode = statePage.results[0].properties["State Code"].rich_text[0].text.content;
            personData.countryPageId = notion.usPageId;
        }
    }
    
    if(!personData.countryPageId && personData.country) {
        personData.countryPageId = await notion.getCountryPageId(personData.country, slackLog);
    }

    if(personData.city) {
        personData.cityPageId = await notion.getCityPageId(personData.city, personData.stateCode, personData.country) || await notion.createCity(personData.city, personData.statePageId, personData.countryPageId);
    }

    if(personData.experiences[0]?.company) {
        personData.companyPageId = await notion.getOrgPageId(personData.experiences[0]?.company) || await notion.createOrg(personData.experiences[0]?.company, personData.experiences[0]?.company_linkedin_profile_url);
    }

    if(personData.education[0]?.school) {
        personData.schoolPageId = await notion.getOrgPageId(personData.education[0]?.school) || await notion.createOrg(personData.education[0]?.school, personData.education[0]?.school_linkedin_profile_url);
    }

    return await notion.updatePerson(pageId, personData);

}

async function autofillOrg(pageId, linkedInUrl, slackLog){

        const linkedInUrlType = getLinkedInUrlType(linkedInUrl);

        const orgData = await proxycurl.getOrgData(linkedInUrl, linkedInUrlType);

        if(!orgData.description) {
            orgData.description = ''
        }

        if(orgData.locations.length) {

            if(orgData.locations[0].state) {
                const statePage = await notion.getStatePage(orgData.locations[0].state);
                if(statePage) {
                    orgData.locations[0].statePageId = statePage.results[0].id;
                    orgData.locations[0].countryPageId = notion.usPageId;
                }
            } else if(orgData.locations[0].country) {
                orgData.locations[0].countryPageId = await notion.getCountryPageId(orgData.locations[0].country, slackLog);
            }
            
            if(orgData.locations[0].city) {
                orgData.locations[0].cityPageId = await notion.getCityPageId(orgData.locations[0].city, orgData.locations[0].state, orgData.locations[0].country) || await notion.createCity(orgData.locations[0].city, orgData.locations[0].statePageId, orgData.locations[0].countryPageId);
            }

        }

        return await notion.updateOrg(pageId, orgData);

}

function getLinkedInUrlType(linkedInUrl) {

    let match = linkedInUrl.match(/(?<=linkedin\.com\/)(company|school)(?=\/)/);
    
    if(match) {
        return match[0]
    } else {
        throw new Error("Invalid LinkedIn URL format")
    }

}