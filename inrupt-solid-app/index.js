import {
    getSolidDataset,
    getThing,
    setThing,
    getStringNoLocale,
    setStringNoLocale,
    getFile,
    isRawData,
    getContentType,
    getSourceUrl,
    getSourceIri,
    getSolidDatasetWithAcl,
    getPublicAccess,
    saveSolidDatasetAt,
    createSolidDataset,
    buildThing,
    createThing,
    createAcl,
    setAgentDefaultAccess,
    setAgentResourceAccess,
    saveAclFor
} from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";
import { SCHEMA_INRUPT, VCARD, RDF } from "@inrupt/vocab-common-rdf";
//import fetch from 'unfetch';

// If your Pod is *not* on `solidcommunity.net`, change this to your identity provider.
const SOLID_IDENTITY_PROVIDER = "https://solidcommunity.net";
document.getElementById(
    "solid_identity_provider"
).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

const NOT_ENTERED_WEBID =
    "...not logged in yet - but enter any WebID to read from its profile...";

const session = new Session();

const buttonLogin = document.getElementById("btnLogin");
const writeForm = document.getElementById("writeForm");
const readForm = document.getElementById("readForm");

// 1a. Start Login Process. Call session.login() function.
async function login() {
    if (!session.info.isLoggedIn) {
        await session.login({
            oidcIssuer: SOLID_IDENTITY_PROVIDER,
            clientName: "Inrupt tutorial client app",
            redirectUrl: window.location.href
        });
    }
}

// 1b. Login Redirect. Call session.handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {
    await session.handleIncomingRedirect(window.location.href);
    if (session.info.isLoggedIn) {
        // Update the page with the status.
        document.getElementById(
            "labelStatus"
        ).innerHTML = `Your session is logged in with the WebID [<a target="_blank" href="${session.info.webId}">${session.info.webId}</a>].`;
        document.getElementById("labelStatus").setAttribute("role", "alert");
        document.getElementById("webID").value = session.info.webId;
    }
}

// The example has the login redirect back to the index.html.
// This calls the function to process login information.
// If the function is called when not part of the login redirect, the function is a no-op.
handleRedirectAfterLogin();

// 2. Write to profile
async function writeProfile() {
    // const name = document.getElementById("input_name").value;

    if (!session.info.isLoggedIn) {
        // You must be authenticated to write.
        document.getElementById(
            "labelWriteStatus"
        ).textContent = `...you can't write [${name}] until you first login!`;
        document.getElementById("labelWriteStatus").setAttribute("role", "alert");
        return;
    }
    const webID = session.info.webId;
    // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
    // in the profile dataset. If we strip the hash, we get the URL of the full
    // dataset.
    const profileDocumentUrl = new URL(webID);
    profileDocumentUrl.hash = "";

    // To write to a profile, you must be authenticated. That is the role of the fetch
    // parameter in the following call.

    let publicInformationDataset = createSolidDataset();
    const publicInfoDocument = buildThing(createThing({name: "some_public_file.txt"}))
    .addStringNoLocale(SCHEMA_INRUPT.name, "Some text that should be publicly available")
    .addUrl(RDF.type, "https://testuser1.solidcommunity.net/somePublicFile.txt")
    .build();

    publicInformationDataset = setThing(publicInformationDataset, publicInfoDocument);  //Insert new doc into new dataset
    //publicInformationDataset = createAcl("https://testuser1.solidcommunity.net/publicInfoDataset");
    

    const savedPublicInfoDataset = await saveSolidDatasetAt(
        "https://testuser1.solidcommunity.net/publicInfoDataset",
        publicInformationDataset,
        { fetch: session.fetch}
    )

    const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/publicInfoDataset", { fetch: session.fetch })
    const resourceAcl = createAcl(myDatasetWithAcl)
    let updatedAcl = setAgentResourceAccess(
        resourceAcl,
        "https://testuser1.solidcommunity.net/card#me",
        { read: true, append: true, write: true, control: true }
      )

      updatedAcl = setAgentDefaultAccess(
        updatedAcl,
        "https://testuser1.solidcommunity.net/card#me",
        { read: true, append: true, write: true, control: true }
      )

    await saveAclFor(myDatasetWithAcl, updatedAcl, { fetch: session.fetch })
    const myUpdateDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/publicInfoDataset", { fetch: session.fetch })
    const agentAccess = getAgentAccess(myUpdateDatasetWithAcl, "https://testuser1.solidcommunity.net/card#me")


    let myProfileDataset = await getSolidDataset("https://testuser1.solidcommunity.net/publicInfoDataset", {
        fetch: session.fetch
    });

    //myProfileDataset.createAcl("https://testuser1.solidcommunity.net/publicInfoDataset/aclPolicy")

    // The profile data is a "Thing" in the profile dataset.
    //let profile = getThing(myProfileDataset, webID);

    // Using the name provided in text field, update the name in your profile.
    // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
    // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.
    //profile = setStringNoLocale(profile, VCARD.fn, name);

    // Write back the profile to the dataset.
    //myProfileDataset = setThing(myProfileDataset, profile);

    // Write back the dataset to your Pod.
    await saveSolidDatasetAt("https://testuser1.solidcommunity.net/publicInfoDataset", myProfileDataset, {
        fetch: session.fetch
    });

    // Update the page with the retrieved values.
    document.getElementById(
        "labelWriteStatus"
    ).textContent = `Wrote [${name}] as name successfully!`;
    document.getElementById("labelWriteStatus").setAttribute("role", "alert");
    document.getElementById(
        "labelFN"
    ).textContent = `...click the 'Read Profile' button to to see what the name might be now...?!`;
}

// 3. Read profile
async function readProfile() {
    const webID = document.getElementById("webID").value;
    console.log(webID);

    if (webID === NOT_ENTERED_WEBID) {
        document.getElementById(
            "labelFN"
        ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
        return false;
    }

    try {
        new URL(webID);
    } catch (_) {
        document.getElementById(
            "labelFN"
        ).textContent = `Provided WebID [${webID}] is not a valid URL - please try again`;
        return false;
    }

    const profileDocumentUrl = new URL(webID);
    console.log(profileDocumentUrl);
    profileDocumentUrl.hash = "";

    // Profile is public data; i.e., you do not need to be logged in to read the data.
    // For illustrative purposes, shows both an authenticated and non-authenticated reads.

    let myDataset;
    try {
        if (session.info.isLoggedIn) {
            myDataset = await getSolidDataset(profileDocumentUrl.href, { fetch: session.fetch });
        } else {
            myDataset = await getSolidDataset(profileDocumentUrl.href);
        }
    } catch (error) {
        document.getElementById(
            "labelFN"
        ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
        return false;
    }

    const profile = getThing(myDataset, webID);

    const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/publicInfoDataset", {fetch: session.fetch});
    const publicAccess = JSON.stringify(getPublicAccess(myDatasetWithAcl));
    

    // Get the formatted name (fn) using the property identifier "http://www.w3.org/2006/vcard/ns#fn".
    // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
    // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.

    const formattedName = getStringNoLocale(profile, VCARD.fn) + " " + publicAccess;

    // Update the page with the retrieved values.
    document.getElementById("labelFN").textContent = `[${formattedName}]`;
}

async function readDummyFile() {
    const webID = document.getElementById("webID").value;
    console.log(webID)

    if (webID === NOT_ENTERED_WEBID) {
        document.getElementById(
            "labelFN"
        ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
        return false;
    }

    const profileDocumentUrl = new URL(webID);
    console.log(profileDocumentUrl);
    profileDocumentUrl.hash = "";

    // Profile is public data; i.e., you do not need to be logged in to read the data.
    // For illustrative purposes, shows both an authenticated and non-authenticated reads.

    let myDataset;
    try {
        if (session.info.isLoggedIn) {
            myDataset = await getSolidDataset(profileDocumentUrl.href, { fetch: session.fetch });
            //myDataset = await getSolidDataset()
        } else {
            myDataset = await getSolidDataset(profileDocumentUrl.href);
        }
    } catch (error) {
        document.getElementById(
            "labelFN"
        ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
        return false;
    }
    console.log(myDataset);

    //const testDataUrl = new URL('https://storeydy.solidcommunity.net/public/testData.ttl');
    const testDataUrl = new URL('https://storeydy.solidcommunity.net/public/testData.ttl')
    console.log(testDataUrl);
    
    const testDataFile = await getFile('https://storeydy.solidcommunity.net/public/testData.ttl', { fetch: session.fetch });
    console.log(testDataFile)
    console.log(getContentType(testDataFile));

    //npm install rdflib.js
    //const $rdf = require('rdflib');
    //const store = $rdf.graph();
    //var file = $rdf.sym('https://storeydy.solidcommunity.net/public/testData.ttl');
    //var obj = store.any(file, rel('enemyOf'));
    var fileReader = new FileReader();
    fileReader.onload = function(){
        console.log(fileReader.result);
    }
    fileReader.readAsText(testDataFile);
}


async function readPrivateFile() {
    const webID = document.getElementById("webID").value;
    console.log(webID)

    if (webID === NOT_ENTERED_WEBID) {
        document.getElementById(
            "labelFN"
        ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
        return false;
    }

    const profileDocumentUrl = new URL(webID);
    console.log(profileDocumentUrl);
    profileDocumentUrl.hash = "";

    // Profile is public data; i.e., you do not need to be logged in to read the data.
    // For illustrative purposes, shows both an authenticated and non-authenticated reads.

    let myDataset;
    try {
        if (session.info.isLoggedIn) {
            myDataset = await getSolidDataset(profileDocumentUrl.href, { fetch: session.fetch });
            //myDataset = await getSolidDataset()
        } else {
            myDataset = await getSolidDataset(profileDocumentUrl.href);
        }
    } catch (error) {
        document.getElementById(
            "labelFN"
        ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
        return false;
    }
    console.log(myDataset);

    //const testDataUrl = new URL('https://storeydy.solidcommunity.net/public/testData.ttl');
    const testDataUrl = new URL('https://testuser1.solidcommunity.net/private/testUser1HealthRecords.txt')
    console.log(testDataUrl);
    

    //const fetch = window.fetch.bind(window);

    const testDataFile = await getFile('https://testuser1.solidcommunity.net/private/testUser1HealthRecords.txt', { fetch: session.fetch });
    console.log(testDataFile)
    console.log(getContentType(testDataFile));

    //npm install rdflib.js
    //const $rdf = require('rdflib');
    //const store = $rdf.graph();
    //var file = $rdf.sym('https://storeydy.solidcommunity.net/public/testData.ttl');
    //var obj = store.any(file, rel('enemyOf'));
    var fileReader = new FileReader();
    fileReader.onload = function(){
        console.log(fileReader.result);
    }
    fileReader.readAsText(testDataFile);

}



buttonLogin.onclick = function () {
    login();
};

writeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    writeProfile();
});

readForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readProfile();
});

readDummyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readDummyFile();
});

readPrivateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readPrivateFile();
});