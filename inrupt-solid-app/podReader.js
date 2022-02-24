import {
    getSolidDataset,
    getResourceInfoWithAcl,
    getAgentResourceAccess,
    getContainedResourceUrlAll,
    isContainer,
    getResourceInfo,
    getLinkedResourceUrlAll,
    getContentType,
    getThingAll
} from "@inrupt/solid-client";
import { getAccessForAll, getAgentAccess } from "@inrupt/solid-client/dist/access/universal_v1";
import { storeMedicalInsitutionInformation } from "./podWriter";
import * as _ from 'lodash'


export async function checkIfDatasetExists(session, datasetUrl) {
    try {
        const dataset = await getSolidDataset(datasetUrl, { fetch: session.fetch });
        return true
    }
    catch (ex) {
        // console.log(ex)
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

export async function getDepartments(session, resourceUrl) {
    try {
        const healthDataDataset = await getSolidDataset(resourceUrl, { fetch: session.fetch })
        const listOfDatasetsWithinHealthDataDataset = await getContainedResourceUrlAll(healthDataDataset, { fetch: session.fetch })
        for (var i = 0; i < listOfDatasetsWithinHealthDataDataset.length; i++) {
            if (!(isContainer(listOfDatasetsWithinHealthDataDataset[i], { fetch: session.fetch }))) listOfDatasetsWithinHealthDataDataset.splice(i, 1)
        }
        console.log(listOfDatasetsWithinHealthDataDataset)
        return listOfDatasetsWithinHealthDataDataset
    }
    catch (ex) {
        console.log(ex)
    }
}

export async function getFilesInDataset(session, resourceUrl) {
    try {
        const selectedDataset = await getSolidDataset(resourceUrl, { fetch: session.fetch })
        let filesInDataset = await getThingAll(selectedDataset, { fetch: session.fetch })
        return filesInDataset
    }
    catch (err) {
        if (err.response) {
            throw err.response.status
        }
        return false
    }
}

export async function getAccessToDataset(session, resourceUrl) {
    // const resourceInfo = await getResourceInfo(resourceUrl, {fetch: session.fetch})
    console.log(resourceUrl)
    try {
        const resourceInfo = await getAccessForAll(resourceUrl, "agent", { fetch: session.fetch })
        return resourceInfo
    }
    catch (err) {
        if (err.response) {
            throw err.response.status
        }
        return false
    }
}

export async function checkIfPersonHasAccess(session, departmentDatasetUrl, personWebID, permissionSet) {
    console.log(departmentDatasetUrl)
    console.log(personWebID)
    console.log(permissionSet)
    const access = await getAgentAccess(departmentDatasetUrl, personWebID, { fetch: session.fetch });
    console.log(access)

    if (_.isEqual(access, permissionSet)) return true;
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

// export async function getNumberOfFiles(session,)