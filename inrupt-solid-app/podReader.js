import { getSolidDataset } from "@inrupt/solid-client";

export async function checkIfDatasetExists (session, datasetUrl) { 
    try{
    console.log(session)
    console.log(datasetUrl)
    const dataset = await getSolidDataset(datasetUrl, {fetch: session.fetch});
    //const dataset = await getSolidDataset("https://testuser2.solidcommunity.net/healthData40404", {fetch: session.fetch})
    return true
    }
    catch(ex){
        console.log(ex)
        if(ex.message.includes("Fetching the Resource at [" + datasetUrl + "] failed: [404]"))  //Dataset does not exist
        {
           return false
        }
        else if(ex.message.includes("Fetching the Resource at [" + datasetUrl + "] failed: [403]"))  //Dataset may exist but user not authorized
        {
            return false //Not sure to return false here or not
        }
    }
}

export async function checkIfHealthDataExists(session, healthDataUrl)
{
    try {
        const healthDataDataset = await getSolidDataset(healthDataUrl, { fetch: session.fetch });
        console.log(healthDataDataset);
        //document.getElementById("accessingPod").style.height = '150px';
        const institutionDetails = await getThing(healthDataDataset, healthDataDatasetUrl + "1#medicalInstitutionDetails")
        console.log(institutionDetails)
        let literalName = await getStringNoLocale(institutionDetails, "http://schema.org/name")
        let literalAddress = await getStringNoLocale(institutionDetails, "http://schema.org/address")
        console.log(literalName, literalAddress);
        document.getElementById("ownerOfPod").innerHTML = "Currently accessing the pod belonging to: " + webID;
        document.getElementById("nameOfInstitution").innerHTML = "Who receives care at: " + literalName;
        document.getElementById("addressOfInstitution").innerHTML = "Which is located at: " + literalAddress;
        document.getElementById("accessingPod").style.display = "none"
        document.getElementById("institutionInformation").style.display = 'block'
        checkIfAdministrator(healthDataDatasetUrl);
        saveNewAppointment()
    }
    catch (ex) {
        console.log("here", ex)
        if (ex instanceof TypeError) {
            console.log(ex.message)
            if (ex.message == "Failed to fetch") {
                alert("Invalid URL entered, make sure URL is a valid WebID for a user's Solid pod.")
            }
            else if (ex.message == "Failed to construct 'URL': Invalid URL") {
                alert("No URL entered, enter a URL.")
            }
        }
        if (ex instanceof Error) {
            if (ex.response.status == 404) //Health data dataset does not exist
            {
                alert("You have not created a dataset in your Solid pod to hold medical record information. Please create one by following the steps below.")
                medicalInstitutionRegistered = false;
                console.log(medicalInstitutionRegistered)
                document.getElementById("accessingPod").style.display = "none"
                document.getElementById("registerNewMedicalInstitution").style.display = 'block'
            }
            else if (ex.response.status == 403) //Not authorized
            {
                alert("You have not been authorized to view medical records in the specified individual's pod. Contact them to request access.")
            }
        }
        document.getElementById("podOwner").value = "";
    }
}

export async function checkIfAdministrator(session, urlOfHealthRecordDataset) {
    let signedInUsersWebID = session.info.webId
    console.log(signedInUsersWebID)
    console.log(urlOfHealthRecordDataset + "1")
    //const healthDataDatasetWithAcl = await getSolidDatasetWithAcl(urlOfHealthRecordDataset + "1", {fetch: session.fetch})

    // const myAccess = await access.getAgentAccess(urlOfHealthRecordDataset + "1", signedInUsersWebID, {fetch: session.fetch}).then(access => {
    //     logAccessInfo(signedInUsersWebID, access, urlOfHealthRecordDataset + "1")
    // })
    const myDatasetWithAcl = await getSolidDatasetWithAcl(urlOfHealthRecordDataset, { fetch: session.fetch });

    console.log(myDatasetWithAcl.internal_resourceInfo.permissions.user)

    // const myAccess = await getAgentAccess(myDatasetWithAcl, signedInUsersWebID, {fetch: session.fetch})
    // .then(access => {
    //     logAccessInfo(signedInUsersWebID, access, urlOfHealthRecordDataset + "1")
    // })

    //console.log(myAccess)
}