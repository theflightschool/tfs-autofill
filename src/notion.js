import { fetchWithRetry } from "./utils";
import { sendPhotoToZapier } from "./utils";

export const notion = {
    headers: {
        'Authorization': 'Bearer secret_10UKjfchxCFb6Q1usZ449iJHmWI5VV71ja6zNbftcYc',
        'Content-Type': 'application/json',
        'Notion-Version': '2025-09-03'
    },
    baseUrl: 'https://api.notion.com/v1',
    dataSourceIds: {
        people: '307d0540-d541-485f-b311-4a999638d4fc',
        organizations: '6db10c08-92c0-46a7-a8bb-74fea0f4308e',
        cities: 'ee9d04b8-4f40-4673-827a-7cbc5e4dc379',
        states: '1ff78b16-2e75-4ffb-a318-c631f62604e3',
        countries: '8d2d487f-bebc-44a1-8427-646f69761c6b'
    },
    usPageId: 'd00b101ca5344f11b2b00883b901088e',
    getCountryPageId: getCountryPageId,
    getStatePage: getStatePage,
    getCityPageId: getCityPageId,
    createCity: createCity,
    getOrgPageId: getOrgPageId,
    createOrg: createOrg,
    updatePerson: updatePerson,
    updateOrg: updateOrg
}

async function getCountryPageId(countryCode, slackLog) {

    slackLog.message = "Country Code: " + countryCode;

    const url = `${notion.baseUrl}/data_sources/${notion.dataSourceIds.countries}/query`;
    const options = {
        method: 'POST',
        headers: notion.headers,
        body: JSON.stringify({
            filter: {
                and: [{
                    property: "rWAG",
                    rich_text: {
                        contains: countryCode
                    }
                }]
            }
        })
    }

    const body = await fetchWithRetry(url, options);

    if(!body.results.length) {
        throw new Error("Country unfound!");
    }

    return body.results[0].id;

}

async function getStatePage(stateCodeOrName) {

    // Preset for State Code
    let propertyId = "nXG%5E";
    let propertyType = "rich_text";
    
    if(stateCodeOrName.length > 2) {
        propertyId = "title";
        propertyType = "title";
    }

    const url = `${notion.baseUrl}/data_sources/${notion.dataSourceIds.states}/query`;
    const options = {
        method: 'POST',
        headers: notion.headers,
        body: JSON.stringify({
            filter: {
                and: [{
                    property: propertyId,
                    [propertyType]: {
                        contains: stateCodeOrName
                    }
                }]
            }
        })
    }

    const body = await fetchWithRetry(url, options);

    if(!body.results.length) {
        return null;
    }

    return body;

}

async function getCityPageId(cityName, stateCode, countryCode) {

    // Create filter
    let filter = {
        and: [
            {
                property: "VwL%3E",
                rich_text: {
                    contains: cityName
                }
            }
        ]
    }

    // Add state code to filter if present
    if(stateCode) {
        filter.and.push({
            property: "LRfA",
            formula: {
                string: {
                    equals: stateCode
                }
            }
        })
    }
    
    // Add country code to filter if present
    if(countryCode){
        filter.and.push({
            property: "LG%60Y",
            formula: {
                string: {
                    equals: countryCode
                }
            }
        })
    }

    const url = `${notion.baseUrl}/data_sources/${notion.dataSourceIds.cities}/query`;

    const options = {
        method: 'POST',
        headers: notion.headers,
        body: JSON.stringify({
            filter: filter
        })
    }

    const body = await fetchWithRetry(url, options);

    return body.results[0]?.id;

}

async function createCity(cityName, statePageId, countryPageId) {

    const url = `${notion.baseUrl}/pages`;
    let options = {
        method: 'POST',
        headers: notion.headers,
        body: {
            parent: {
                type: "data_source_id",
                data_source_id: notion.dataSourceIds.cities
            },
            properties: {
                "VwL%3E": {
                    rich_text: [{
                        text: {
                            content: cityName
                        }
                    }]
                }
            }
        }
    }

    // If state exists, add it (and U.S.) to options
    if(statePageId) {

        options.body.properties["DPGg"] = {
            relation: [{
                id: statePageId
            }]
        };

        options.body.properties["HxQ%5B"] = {
            relation: [{
                id: notion.usPageId
            }]
        }

    } else if(countryPageId) {
        options.body.properties["HxQ%5B"] = {
            relation: [{
                id: countryPageId
            }]
        }
    }

    options.body = JSON.stringify(options.body);

    const body = await fetchWithRetry(url, options);

    return body.id;

}

async function getOrgPageId(orgName) {

    const url = `${notion.baseUrl}/data_sources/${notion.dataSourceIds.organizations}/query`;

    const options = {
        method: 'POST',
        headers: notion.headers,
        body: JSON.stringify({
            filter: {
                and: [{
                    property: "title",
                    "title": {
                        equals: orgName
                    }
                }]
            }
        })
    }

    const body = await fetchWithRetry(url, options);

    return body.results[0]?.id;

}

async function createOrg(name, linkedInProfileUrl) {

    const url = `${notion.baseUrl}/pages`;
    const options = {
        method: 'POST',
        headers: notion.headers,
        body: {
            parent: {
                type: "data_source_id",
                data_source_id: `${notion.dataSourceIds.organizations}`
            },
            properties: {
                title: {
                    title: [{
                        text: {
                            content: name
                        }
                    }]
                },
                "%3ExP%3A": {
                    url: linkedInProfileUrl
                }
            }
        }
    }

    // Trigger only if LinkedIn URL is present
    if(linkedInProfileUrl) {
        options.body.properties["fNpp"] = {
            select: {
                name: "Triggered"
            }
        }
    }

    options.body = JSON.stringify(options.body);

    let body = await fetchWithRetry(url, options);

    return body.id;

}

async function updatePerson(pageId, personData) {

    const url = `${notion.baseUrl}/pages/${pageId}`;

    let options = {
        method: 'PATCH',
        headers: notion.headers,
        body: {
            properties: {
                title: {
                    title: [{
                        text: {
                            content: personData.full_name
                        }
                    }]
                },
                "C%5Bfq": {
                    select: {
                        name: "Complete"
                    }
                }
            }
        }
    }

    // Add headline if present
    if(personData.headline) {
        options.body.properties["vjjL"] = {
            rich_text: [{
                text: {
                    content: personData.headline
                }
            }]
        }
    }
    
    // Add summary if present
    if(personData.summary) {
        options.body.properties["BWxY"] = {
            rich_text: [{
                text: {
                    content: personData.summary.slice(0, 1950)
                }
            }]
        }
    }

    // Add school if present
    if(personData.schoolPageId) {
        options.body.properties["CA%5BZ"] = {
            relation: [{
                id: personData.schoolPageId
            }]
        }
    }

    // Add company if present
    if(personData.companyPageId) {
        options.body.properties["lw%5CX"] = {
            relation: [{
                id: personData.companyPageId
            }]
        }
    }

    // Add "Position" if present
    if(personData.experiences[0]?.title) {
        options.body.properties["PEpr"] = {
            rich_text: [{
                text: {
                    content: personData.experiences[0].title
                }
            }]
        }
    }

    // Add state if present
    if( personData.statePageId ) {
        options.body.properties["cudV"] = {
            relation: [{
                id: personData.statePageId
            }]
        }
    }

    // Add country if present
    if( personData.countryPageId ) {
        options.body.properties["noZK"] = {
            relation: [{
                id: personData.countryPageId
            }]
        }
    }

    // Add city if present
    if( personData.cityPageId ) {
        options.body.properties["wI_Q"] = {
            relation: [{
                id: personData.cityPageId
            }]
        }
    }

    // Add birthday if present
    if( personData.birth_date ) {

        const birthday = new Date(`${personData.birth_date.month}/${personData.birth_date.day}/${personData.birth_date.year}`);
        const isoBirthday = birthday.toISOString();

        options.body.properties["oCuU"] = {
            rich_text: [{
                text: {
                    content: isoBirthday
                }
            }]
        }

    }

    //Add X profile if present
    if(personData.extra?.twitter_profile_id) {
        options.body.properties["XGt%60"] = {
            "url": `https://x.com/${personData.extra.twitter_profile_id}`
        }

    }

    // Add Facebook profile if present
    if( personData.extra?.facebook_profile_id ) {
        options.body.properties["%60vRy"] = {
            url: `https://facebook.com/${personData.extra.facebook_profile_id}`
        }
    }
    
    options.body = JSON.stringify(options.body);

    if(personData.profile_pic_url) {
        await sendPhotoToZapier(pageId, personData.profile_pic_url)
    }

    return await fetchWithRetry(url, options);

}

async function updateOrg(pageId, orgData){

    let url = `${notion.baseUrl}/pages/${pageId}`;
    let options = {
        method: 'PATCH',
        headers: notion.headers,
        body: {
            properties: {
                "title": {
                    title: [{
                        text: {
                            content: orgData.name
                        }
                    }]
                },
                "sbc%7C": {
                    rich_text: [{
                        text: {
                            content: orgData.description
                        }
                    }]
                },
                "E%3Ek%5C": {
                    url: orgData.website
                },
                "fNpp": {
                    select: {
                        name: "Complete"
                    }
                }
            }
        }
    }

    // Add city to options if present
    if(orgData.locations[0]?.cityPageId) {
        options.body.properties["ZDgc"] = {
            relation: [{
                id: orgData.locations[0].cityPageId
            }]
        }
    }

    // Add state to options if present
    if(orgData.locations[0]?.statePageId) {
        options.body.properties["s%3AND"] = {
            relation: [{
                id: orgData.locations[0].statePageId
            }]
        }
    }

    // Add country to options if present
    if(orgData.locations[0]?.countryPageId) {
        options.body.properties["VuKW"] = {
            relation: [{
                id: orgData.locations[0].countryPageId
            }]
        }
    }

    options.body = JSON.stringify(options.body);

    if(orgData.profile_pic_url) {
        await sendPhotoToZapier(pageId, orgData.profile_pic_url)
    }

    return await fetchWithRetry(url, options);

}