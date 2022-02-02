import {
    getSolidDataset,
    getResourceInfoWithAcl,
    getAgentResourceAccess,
    getContainedResourceUrlAll,
    isContainer,
    getResourceInfo,
    getLinkedResourceUrlAll,
    getContentType
} from "@inrupt/solid-client";
import { getAgentAccess } from "@inrupt/solid-client/dist/access/universal_v1";
import { storeMedicalInsitutionInformation } from "./podWriter";

export async function checkIfDatasetExists(session, datasetUrl) {
    try {
        console.log(session)
        console.log(datasetUrl)
        const dataset = await getSolidDataset(datasetUrl, { fetch: session.fetch });
        //const dataset = await getSolidDataset("https://testuser2.solidcommunity.net/healthData40404", {fetch: session.fetch})
        return true
    }
    catch (ex) {
        console.log(ex)
        if (ex.message.includes("Fetching the Resource at [" + datasetUrl + "] failed: [404]"))  //Dataset does not exist
        {
            return false
        }
        else if (ex.message.includes("Fetching the Resource at [" + datasetUrl + "] failed: [403]"))  //Dataset may exist but user not authorized
        {
            return false //Not sure to return false here or not
        }
    }
}

export async function getResource(session, resourceUrl) {
    try {
        const healthDataDataset = await getSolidDataset("https://testuser1.solidcommunity.net/healthData2/", { fetch: session.fetch })
        const listOfDatasetsWithinHealthDataDataset = await getContainedResourceUrlAll(healthDataDataset, { fetch: session.fetch })
        for(var i = 0 ; i < listOfDatasetsWithinHealthDataDataset.length; i++)
        {
            if(!(isContainer(listOfDatasetsWithinHealthDataDataset[i], {fetch: session.fetch}))) listOfDatasetsWithinHealthDataDataset.splice(i, 1)
        }
        console.log(listOfDatasetsWithinHealthDataDataset)
    }
    catch (ex) {
        console.log(ex)
    }

}

// export async function checkIfHealthDataExists(session, healthDataUrl) {
//     try {
//         console.log(healthDataUrl + "/Info")
//         const healthDataDataset = await getSolidDataset(healthDataUrl + "/Info", { fetch: session.fetch });
//         console.log(healthDataDataset);
//         const institutionDetails = await getThing(healthDataDataset, healthDataDatasetUrl + "1/Info#medicalInstitutionDetails")
//         console.log(institutionDetails)
//         let literalName = await getStringNoLocale(institutionDetails, "http://schema.org/name")
//         let literalAddress = await getStringNoLocale(institutionDetails, "http://schema.org/address")
//         console.log(literalName, literalAddress);
//         document.getElementById("ownerOfPod").innerHTML = "Currently accessing the pod belonging to: " + webID;
//         document.getElementById("nameOfInstitution").innerHTML = "Who receives care at: " + literalName;
//         document.getElementById("addressOfInstitution").innerHTML = "Which is located at: " + literalAddress;
//         document.getElementById("accessingPod").style.display = "none"
//         document.getElementById("institutionInformation").style.display = 'block'
//         //checkIfAdministrator(healthDataDatasetUrl);
//     }
//     catch (ex) {
//         console.log("here", ex)
//         if (ex instanceof TypeError) {
//             console.log(ex.message)
//             if (ex.message == "Failed to fetch") {
//                 alert("Invalid URL entered, make sure URL is a valid WebID for a user's Solid pod.")
//             }
//             else if (ex.message == "Failed to construct 'URL': Invalid URL") {
//                 alert("No URL entered, enter a URL.")
//             }
//         }
//         if (ex instanceof Error) {
//             if (ex.response.status == 404) //Health data dataset does not exist
//             {
//                 alert("You have not created a dataset in your Solid pod to hold medical record information. Please create one by following the steps below.")
//                 medicalInstitutionRegistered = false;
//                 console.log(medicalInstitutionRegistered)
//                 document.getElementById("accessingPod").style.display = "none"
//                 document.getElementById("registerNewMedicalInstitution").style.display = 'block'
//             }
//             else if (ex.response.status == 403) //Not authorized
//             {
//                 alert("You have not been authorized to view medical records in the specified individual's pod. Contact them to request access.")
//             }
//         }
//         document.getElementById("podOwner").value = "";
//     }
// }

export async function checkIfPersonHasAccess(session, departmentDatasetUrl, personWebID, permissionSet) {
    console.log(departmentDatasetUrl)
    console.log(personWebID)
    console.log(permissionSet)
    const access = await getAgentAccess(departmentDatasetUrl, personWebID, { fetch: session.fetch });
    console.log(access)
    if (access == permissionSet) return true;
    else return false
}

export async function checkIfAdministrator(session, urlOfHealthRecordDataset) {
    let signedInUsersWebID = session.info.webId
    console.log(signedInUsersWebID)
    console.log(urlOfHealthRecordDataset + "1")

    const myDatasetWithAcl = await getResourceInfoWithAcl(urlOfHealthRecordDataset, { fetch: session.fetch });

    console.log(myDatasetWithAcl.internal_resourceInfo.permissions.user)

    // const myAccess = await getAgentAccess(myDatasetWithAcl, signedInUsersWebID, {fetch: session.fetch})
    // .then(access => {
    //     logAccessInfo(signedInUsersWebID, access, urlOfHealthRecordDataset + "1")
    // })
}