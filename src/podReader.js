import {
    getSolidDataset,
    getContainedResourceUrlAll,
    getThingAll,
    access
} from "@inrupt/solid-client";
//import { getAccessForAll, getAgentAccess } from "@inrupt/solid-client/dist/access/universal_v1";
import * as _ from 'lodash'


export async function checkIfDatasetExists(session, datasetUrl) {
    try {
        const dataset = await getSolidDataset(datasetUrl, { fetch: session.fetch });
        return true
    }
    catch (ex) {
        if (ex.message.includes("Fetching the Resource at [" + datasetUrl + "] failed: [404]"))  //Dataset does not exist
        {
            return false
        }
        else if (ex.message.includes("Fetching the Resource at [" + datasetUrl + "] failed: [403]"))  //Dataset may exist but user not authorized
        {
            return false 
        }
    }
}

export async function getDepartments(session, resourceUrl) {
    try {
        const healthDataDataset = await getSolidDataset(resourceUrl, { fetch: session.fetch })
        const listOfDatasetsWithinHealthDataDataset = await getContainedResourceUrlAll(healthDataDataset, { fetch: session.fetch }) //Gets all resource URIs within container
        for (var i = 0; i < listOfDatasetsWithinHealthDataDataset.length; i++) {
            if(listOfDatasetsWithinHealthDataDataset[i].charAt(listOfDatasetsWithinHealthDataDataset[i].length - 1) != '/') {   //If doesn't end in / meaning it is not a department container
                listOfDatasetsWithinHealthDataDataset.splice(i, 1)
                i--;
            }
        }
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
    try {
        const resourceInfo = await access.getAccessForAll(resourceUrl, "agent", { fetch: session.fetch })
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
    const personsAccess = await access.getAgentAccess(departmentDatasetUrl, personWebID, { fetch: session.fetch });
    if (_.isEqual(personsAccess, permissionSet)) return true;
    else return false
}