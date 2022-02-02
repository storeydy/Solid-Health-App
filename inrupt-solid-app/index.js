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
    removeThing,
    getProfileAll,
    getThingAll,
    getDatetime,
    getStringNoLocaleAll,
    isContainer,
    getContainedResourceUrlAll
} from "@inrupt/solid-client";

import { Session, getDefaultSession, fetch } from "@inrupt/solid-client-authn-browser";
import { SCHEMA_INRUPT, VCARD, FOAF, RDF } from "@inrupt/vocab-common-rdf";
import { departments } from "./healthcareDepartments";
import { checkIfDatasetExists, checkIfAdministrator, getResource } from "./podReader";
import { writeAppointment, createDepartmentDataset, storeMedicalInsitutionInformation } from "./podWriter";
//import fetch from 'unfetch';

// If your Pod is *not* on `solidcommunity.net`, change this to your identity provider.
const SOLID_IDENTITY_PROVIDER = "https://solidcommunity.net";
document.getElementById(
    "solid_identity_provider"
).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

const NOT_ENTERED_WEBID =
    "...not logged in yet - but enter any WebID to read from its profile...";

var session = new Session();

const buttonLogin = document.getElementById("btnLogin");
const writeForm = document.getElementById("writeForm");
const readForm = document.getElementById("readForm");
var accessedPodOwnerUrl = ""
var accessedPodOwnerBaseUrl = ""
var medicalInstitutionRegistered = Boolean(0);

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
        document.getElementById("loginButtonDiv").style.display = "none"
        document.getElementById("accessingPod").style.display = "block"
        checkMedicalInstitutionStatus();
    }
}


handleRedirectAfterLogin();



async function checkMedicalInstitutionStatus(podOwner) {
    if (podOwner) {
        console.log(podOwner)
        var webID;
        if (podOwner == "signedInUser") webID = session.info.webId
        else if (podOwner == "specifiedUser") webID = document.getElementById("podOwner").value;
        //const webID = session.info.webId
        accessedPodOwnerUrl = webID;
        accessedPodOwnerBaseUrl = webID.substring(0, (webID.length - 16))
        var healthDataDatasetUrl = accessedPodOwnerBaseUrl + "/healthData2/Info"  // https://testuser1.solidcommunity.net/profile/card#me
        console.log(webID)
        let healthDataExists = await checkIfDatasetExists(session, healthDataDatasetUrl) // https://testuser1.solidcommunity.net/profile/card#me
        if (healthDataExists == true) {
            const healthDataDataset = await getSolidDataset(healthDataDatasetUrl, { fetch: session.fetch });
            const institutionDetails = await getThing(healthDataDataset, healthDataDatasetUrl + "#medicalInstitutionDetails")
            console.log(institutionDetails)
            let literalName = await getStringNoLocale(institutionDetails, "http://schema.org/name")
            let literalAddress = await getStringNoLocale(institutionDetails, "http://schema.org/address")
            document.getElementById("ownerOfPod").innerHTML = "Currently accessing the pod belonging to: " + webID;
            document.getElementById("nameOfInstitution").innerHTML = "Who receives care at: " + literalName;
            document.getElementById("addressOfInstitution").innerHTML = "Which is located at: " + literalAddress;
            document.getElementById("accessingPod").style.display = "none"
            document.getElementById("institutionInformation").style.display = 'block'
            checkIfAdministrator(session, accessedPodOwnerBaseUrl + "/healthData2");
            // await saveNewAppointment()
            //await storeMedicalInsitutionInformation(session, accessedPodOwnerBaseUrl + "/healthData2", {administrator: "https://testuser2.solidcommunity.net/profile/card#me"} )
        }
        else{
            if(podOwner == "signedInUser"){
            alert("You have not created a dataset in your Solid pod to hold medical record information. Please create one by following the steps below.")
            medicalInstitutionRegistered = false;
            console.log(medicalInstitutionRegistered)
            document.getElementById("accessingPod").style.display = "none"
            document.getElementById("registerNewMedicalInstitution").style.display = 'block'
            }
            else{
                alert("You have not been authorized to view medical records in the specified individual's pod. Contact them to request access.")
            }
            document.getElementById("podOwner").value = "";
        }

    }
}

function resetCurrentPodSession() {
    document.getElementById("institutionInformation").style.display = "none";
    document.getElementById("accessingPod").style.display = "block";
}

async function registerNewMedicalInstitution() {
    const institutionName = document.getElementById("institutionName").value;
    const institutionAddress = document.getElementById("institutionAddress").value;
    const administratorWebID = document.getElementById("institutionSysAdmin").value;
    console.log(administratorWebID)
    const webID = session.info.webId
    var healthDataDatasetUrl = accessedPodOwnerBaseUrl + "/healthData2"  // https://testuser1.solidcommunity.net/profile/card#me
    let institutionDetails = {
        name: institutionName,
        address: institutionAddress,
        administrator: administratorWebID
    }
    await storeMedicalInsitutionInformation(session, healthDataDatasetUrl, institutionDetails)
    
}

async function saveNewAppointment() {
    // let department = document.getElementById("selectedAppointmentDepartmentDropdown").value
    // let timeOfAppointment = document.getElementById("newAppointmentTime").value;
    // let dateOfAppointment = document.getElementById("newAppointmentDate").value;
    // let doctorWebID = document.getElementById("newAppointmentDoctor").value;
    // let notes = document.getElementById("newAppointmentNotes").value;

    let department = "Cardiology"
    let timeOfAppointment = "12:33"
    let dateOfAppointment = "22/11/22"
    let doctorWebID = "https://testuser2.solidcommunity.net/profile/card#me"
    let notes = "Some notes for appointment"

    let appointmentDateAsString = "20" + dateOfAppointment.substring(0, 2) + "-" + dateOfAppointment.substring(3, 5) + "-" + dateOfAppointment.substring(6, 8) + " " + timeOfAppointment
    console.log(appointmentDateAsString)
    let appointmentFullTime = new Date(appointmentDateAsString)
    console.log(appointmentFullTime)
    let appointmentDetails = {
        podOwnerBaseUrl: accessedPodOwnerBaseUrl,
        appointmentDepartment: department,
        appointmentTime: appointmentFullTime,
        appointmentDoctor: doctorWebID,
        appointmentNotes: notes
    }
    await writeAppointment(session, appointmentDetails)
}

async function getPatientDepartmentsAndDisplay(){
    console.log("made it to the right function in anyways")
    let healthDataContainerDatasetUrl = accessedPodOwnerBaseUrl + "/healthData2/"
    // let isAContainer = await isContainer("https://testuser1.solidcommunity.net/healthData2/", {fetch:session.fetch})
    // console.log(isAContainer)
    // let containerContents = await getContainedResourceUrlAll("https://testuser1.solidcommunity.net/healthData2/", {fetch:session.fetch})
    // console.log(containerContents)
    getResource(session, healthDataContainerDatasetUrl)
}

// 2. Create new dataset with a file in it
async function writeProfile() {

    if (!session.info.isLoggedIn) {
        document.getElementById(
            "labelWriteStatus"
        ).textContent = `...you can't write [${name}] until you first login!`;
        document.getElementById("labelWriteStatus").setAttribute("role", "alert");
        return;
    }
    const webID = session.info.webId;
    const profileDocumentUrl = new URL(webID);
    profileDocumentUrl.hash = "";


    let healthRecordDataset = createSolidDataset();
    const privateInfoDocument = buildThing(createThing({ name: "some_private_file.txt" }))
        .addStringNoLocale(SCHEMA_INRUPT.text, "Some text that should be privately available")
        .addUrl(RDF.type, "https://schema.org/TextDigitalDocument")
        .build();

    healthRecordDataset = setThing(healthRecordDataset, privateInfoDocument);  //Insert new doc into new dataset    

    const savedPrivateInfoDataset = await saveSolidDatasetAt(
        "https://testuser1.solidcommunity.net/healthDataDataset1",
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
    const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/healthDataDataset1", { fetch: session.fetch })
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
}

// 3. Read agent access
async function readAgentAccess() {
    const agentID = document.getElementById("agentID").value;
    console.log(agentID);

    const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/healthDataDataset1", { fetch: session.fetch });

    console.log(myDatasetWithAcl)

    const myDatasetsAgentAccess = await access.getAgentAccess(
        "https://testuser1.solidcommunity.net/healthDataDataset1",       // resource  
        agentID,  // agent
        { fetch: session.fetch }                      // fetch function from authenticated session
    ).then(access => {
        logAccessInfo(agentID, access, "https://testuser1.solidcommunity.net/healthDataDataset1");
    });
}


async function readDataset() {
    const webID = document.getElementById("webID").value;
    console.log(webID)

    if (webID === NOT_ENTERED_WEBID) {
        document.getElementById(
            "labelFN"
        ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
        return false;
    }

    let myDataset;
    try {
        if (session.info.isLoggedIn) {
            myDataset = await getSolidDataset("https://testuser1.solidcommunity.net/healthDataDataset1", { fetch: session.fetch });
        } else {
            myDataset = await getSolidDataset("https://testuser1.solidcommunity.net/healthDataDataset1");
        }
    } catch (error) {
        document.getElementById(
            "labelFN"
        ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
        return false;
    }
    console.log(myDataset);

    const datasetContents = getThingAll(myDataset, { fetch: session.fetch });
    console.log(datasetContents);
    for (let i = 0; i < datasetContents.length; i++) {
        let fileContents = getStringNoLocale(datasetContents[i], SCHEMA_INRUPT.text)
        let fileName = getStringNoLocale(datasetContents[i], SCHEMA_INRUPT.name);
        console.log(fileName, fileContents);
    }

}

async function grantAccess() {
    const webID = document.getElementById("granteeID").value;
    console.log(webID)

    const readAccess = document.getElementById("readAccessBox").checked;
    const writeAccess = document.getElementById("writeAccessBox").checked;
    const controlAccess = document.getElementById("controlAccessBox").checked;
    const appendAccess = document.getElementById("appendAccessBox").checked;

    // console.log("read ", readAccess);
    // console.log("write " ,writeAccess);
    // console.log("append ", appendAccess);
    // console.log("control", controlAccess);

    try {
        const myDatasetWithAcl = await getSolidDatasetWithAcl("https://testuser1.solidcommunity.net/healthDataDataset1", { fetch: session.fetch })
        const myDatasetsAcl = createAcl(myDatasetWithAcl)
        //const myDatasetsAcl = getResourceAcl("https://testuser1.solidcommunity.net/privateInfoDataset2", { fetch: session.fetch })
        console.log(myDatasetsAcl)
        let updatedAcl = setAgentResourceAccess(
            myDatasetsAcl,
            webID,
            { read: readAccess, append: appendAccess, write: writeAccess, control: controlAccess }
        )
        console.log(updatedAcl)
        await saveAclFor(myDatasetWithAcl, updatedAcl, { fetch: session.fetch })
        document.getElementById("accessStatusLabel").textContent = "Updated access successfully";
    }
    catch (err) {
        console.log("Error updating access to dataset. Exception generated: ", err)
        document.getElementById("accessStatusLabel").textContent = "Failed to update access";
    }

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

    const profileDocumentUrl = new URL(session.info.webId);
    console.log(profileDocumentUrl);
    profileDocumentUrl.hash = "";
    let myProfileDataset = await getSolidDataset(profileDocumentUrl.href, { fetch: session.fetch })
    const profile = getThing(myProfileDataset, session.info.webId)
    console.log(profile)
    const name = getStringNoLocale(profile, VCARD.fn)
    const role = getStringNoLocale(profile, VCARD.role);
    console.log(role)
    const date = new Date().toDateString()
    console.log(date)

    let myDataset = await getSolidDataset("https://testuser1.solidcommunity.net/healthDataDataset1", { fetch: session.fetch });
    const newDocument = buildThing(createThing({ name: fileName + ".txt" }))
        .addStringNoLocale(SCHEMA_INRUPT.name, fileName + ".txt")
        .addStringNoLocale(SCHEMA_INRUPT.text, fileContent)
        .addStringNoLocale(FOAF.Person, name)
        .addStringNoLocale("https://schema.org/dateCreated", date)
        .addUrl(RDF.type, "https://schema.org/TextDigitalDocument")
        .build();

    myDataset = setThing(myDataset, newDocument);  //Insert new doc into dataset    

    const savedPrivateInfoDataset = await saveSolidDatasetAt(
        "https://testuser1.solidcommunity.net/healthDataDataset1",
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
            "https://testuser1.solidcommunity.net/healthDataDataset1", { fetch: session.fetch }
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

function onDropdownClick() {
    var dropdownOptions = document.getElementById("myDropdown");
    if (dropdownOptions.children.length <= 1) {
        const departmentList = departments;
        for (var i = 0; i <= departmentList.length - 1; i++) {
            //console.log(departmentList[i].label)
            if (departmentList[i].label) {
                let newOption = document.createElement("a")
                const labelValue = departmentList[i].label
                newOption.innerHTML = labelValue
                console.log("getting set as: ", newOption.innerHTML)
                newOption.onclick = function () {
                    console.log(newOption.innerHTML)
                    document.getElementById('selectedAppointmentDepartmentDropdown').value = labelValue;
                    document.getElementById("departmentDropdownButton").innerHTML = labelValue;
                    document.getElementById('myDropdown').classList.toggle('show');
                }
                dropdownOptions.appendChild(newOption);
            }
        }
    }
    document.getElementById("myDropdown").classList.toggle("show");
}

buttonLogin.onclick = function () {
    login();
};


myPodButton.addEventListener('click', (event) => {
    event.preventDefault();
    checkMedicalInstitutionStatus("signedInUser");
});

otherUserPodButton.addEventListener('click', (event) => {
    event.preventDefault();
    checkMedicalInstitutionStatus("specifiedUser");
})

institutionInformationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    resetCurrentPodSession();
})

registerNewAppointmentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log("test wed")
    document.getElementById("uploadNewAppointmentDetails").style.display = "block"
})

selectedDepartmentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    onDropdownClick();
})

saveNewAppointmentDetailsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveNewAppointment();
})

noInstitutionInformationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    //registerNewMedicalInstitution();
    document.getElementById("registerNewMedicalInstitution").style.display = "block"
})

newMedicalInstitutionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    registerNewMedicalInstitution();
})

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

readDatasetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readDataset();
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

accessMedicalRecordsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    getPatientDepartmentsAndDisplay();
})

