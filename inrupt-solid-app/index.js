// import {
//     setPublicAccess,
// } from "@inrupt/solid-client/access/universal";
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
    getPublicAccess,
    getAgentAccess,
    setAgentDefaultAccess,
    saveSolidDatasetAt,
    createSolidDataset,
    buildThing,
    createThing,
    getSolidDatasetWithAcl,
    hasResourceAcl,
    hasFallbackAcl,
    hasAccessibleAcl,
    createAcl,
    createAclFromFallbackAcl,
    getResourceAcl,
    setAgentResourceAccess,
    saveAclFor,
    access,
    deleteFile,
    deleteSolidDataset,
    overwriteFile,
    removeThing
} from "@inrupt/solid-client";


import { Session, getDefaultSession, fetch } from "@inrupt/solid-client-authn-browser";
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

// 2. Create new dataset with a file in it
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

    let healthRecordDataset = createSolidDataset();
    const privateInfoDocument = buildThing(createThing({ name: "some_private_file.txt" }))
        .addStringNoLocale(SCHEMA_INRUPT.name, "Some text that should be privately available")
        .addUrl(RDF.type, "https://schema.org/TextDigitalDocument")
        .build();

    healthRecordDataset = setThing(healthRecordDataset, privateInfoDocument);  //Insert new doc into new dataset    

    const savedPrivateInfoDataset = await saveSolidDatasetAt(
        "https://testuser1.solidcommunity.net/healthDataDataset",
        healthRecordDataset,
        { fetch: session.fetch }
    )
}

// 3. Create ACL for created Dataset
async function createAclForDataset() {
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


    // ANSWER CAME FROM : https://forum.solidproject.org/t/solved-solid-client-create-acl-for-container-makes-agent-lose-control/4029/3
    const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/healthDataDataset", { fetch: session.fetch })
    const myDatasetsAcl = createAcl(myDatasetWithAcl)
    console.log(myDatasetsAcl)
    let updatedAcl = setAgentResourceAccess(
        myDatasetsAcl,
        "https://testuser1.solidcommunity.net/profile/card#me",
        { read: true, append: true, write: true, control: true }
    )
    updatedAcl = setAgentDefaultAccess(
        updatedAcl,
        "https://testuser1.solidcommunity.net/profile/card#me",
        { read: true, append: true, write: true, control: true }
    )
    console.log(updatedAcl)
    try {
        await saveAclFor(myDatasetWithAcl, updatedAcl, { fetch: session.fetch })
    }
    catch (err) {
        console.log(err)
    }
    // const myUpdateDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/privateInfoDataset2", { fetch: session.fetch })
    // const agentAccess = getAgentAccess(myUpdateDatasetWithAcl, "https://testuser1.solidcommunity.net/profile/card#me")
    // console.log(agentAccess)
}

// 3. Read agent access
async function readAgentAccess() {
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

    const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/healthDataDataset", { fetch: session.fetch });

    console.log(myDatasetWithAcl)

    const myDatasetsAgentAccess = await access.getAgentAccess(
        "https://testuser1.solidcommunity.net/healthDataDataset",       // resource  
        "https://testuser1.solidcommunity.net/profile/card#me",  // agent
        { fetch: session.fetch }                      // fetch function from authenticated session
    ).then(access => {
        logAccessInfo("https://testuser1.solidcommunity.net/profile/card#me", access, "https://testuser1.solidcommunity.net/healthDataDataset");
    });

    // Update the page with the retrieved values.
    //document.getElementById("labelFN").textContent = `[${formattedName}]`;
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
            //myDataset = await getSolidDataset(profileDocumentUrl.href, { fetch: session.fetch });
            //myDataset = await getSolidDataset()
            myDataset = await getSolidDataset("https://testuser1.solidcommunity.net/healthDataDataset", { fetch: session.fetch });
        } else {
            myDataset = await getSolidDataset("https://testuser1.solidcommunity.net/healthDataDataset");
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
    fileReader.onload = function () {
        console.log(fileReader.result);
    }
    fileReader.readAsText(testDataFile);
}

async function grantAccess() {
    const webID = document.getElementById("granteeID").value;
    console.log(webID)

    const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/privateInfoDataset2", { fetch: session.fetch })
    const myDatasetsAcl = createAcl(myDatasetWithAcl)
    //const myDatasetsAcl = getResourceAcl("https://testuser1.solidcommunity.net/privateInfoDataset2", { fetch: session.fetch })
    console.log(myDatasetsAcl)
    let updatedAcl = setAgentResourceAccess(
        myDatasetsAcl,
        webID,
        { read: true, append: false, write: false, control: false }
    )
    await saveAclFor(myDatasetWithAcl, updatedAcl, { fetch: session.fetch })
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
    fileReader.onload = function () {
        console.log(fileReader.result);
    }
    fileReader.readAsText(testDataFile);

}

async function uploadFile() {
    const fileName = document.getElementById("fileName").value;
    //console.log(fileName);
    const fileContent = document.getElementById("fileContent").value;

    console.log("fileName: ", fileName);
    console.log("fileContent: ", fileContent);

    let myDataset = await getSolidDataset("https://testuser1.solidcommunity.net/healthDataDataset", { fetch: session.fetch });

    //let healthRecordDataset = createSolidDataset();
    const newDocument = buildThing(createThing({ name: fileName + ".txt" }))
        .addStringNoLocale(SCHEMA_INRUPT.name, fileName + ".txt")
        .addStringNoLocale(SCHEMA_INRUPT.text, fileContent)
        .addUrl(RDF.type, "https://schema.org/TextDigitalDocument")
        .build();

    myDataset = setThing(myDataset, newDocument);  //Insert new doc into dataset    

    const savedPrivateInfoDataset = await saveSolidDatasetAt(
        "https://testuser1.solidcommunity.net/healthDataDataset",
        myDataset,
        { fetch: session.fetch }
    )

    document.getElementById("uploadLabel").textContent = "Wrote file successfully";
}

async function deleteFileFromUrl() {
    const fileUrl = document.getElementById("fileUrl").value;
    console.log(fileUrl)

    let myDataset = await getSolidDataset(
        "https://testuser1.solidcommunity.net/healthDataDataset",
        { fetch: session.fetch }          // fetch from authenticated session
    );
    try {
        const thingToDelete = getThing(myDataset, fileUrl, { fetch: session.fetch })
    }
    catch (err) {
        console.log("File url did not exist in solid dataset or invalid permission to read file. Exception generated: ", err)
    }

    try {
        myDataset = removeThing(myDataset, thingToDelete);  //Insert new doc into new dataset    
    }
    catch (err) {
        console.log("Error deleting file from dataset. Exception generated: ", err)
    }

    try {
        const savedPrivateInfoDataset = await saveSolidDatasetAt(
            "https://testuser1.solidcommunity.net/healthDataDataset",
            myDataset,
            { fetch: session.fetch }
        )
    }
    catch (err) {
        console.log("Error saving changes to dataset after delete. Exception generated: ", err);
    }

}

async function deleteDataset() {
    try {
        await deleteSolidDataset(
            "https://testuser1.solidcommunity.net/privateInfoDataset", { fetch: session.fetch }
        );
        console.log("deleted dataset")
    }
    catch (err) {
        console.log(err)
    }
}

function logAccessInfo(agent, access, resource) {
    if (access === null) {
        console.log("Could not load access details for this Resource.");
    } else {
        console.log(`${agent}'s Access:: `, JSON.stringify(access));
        console.log("...", agent, (access.read ? 'CAN' : 'CANNOT'), "read the Resource", resource);
        console.log("...", agent, (access.append ? 'CAN' : 'CANNOT'), "add data to the Resource", resource);
        console.log("...", agent, (access.write ? 'CAN' : 'CANNOT'), "change data in the Resource", resource);
        console.log("...", agent, (access.controlRead ? 'CAN' : 'CANNOT'), "see access to the Resource", resource);
        console.log("...", agent, (access.controlWrite ? 'CAN' : 'CANNOT'), "change access to the Resource", resource);
    }
}



buttonLogin.onclick = function () {
    login();
};

writeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    writeProfile();
});

createAclForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createAclForDataset();
});

readAgentAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readAgentAccess();
});

readDummyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readDummyFile();
});

giveAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    grantAccess();
})

readPrivateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readPrivateFile();
});

uploadFileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    uploadFile();
});

deleteFileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    deleteFileFromUrl();
    //deleteDataset();
})