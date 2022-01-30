import { createContainerAt, createContainerInContainer, createSolidDataset, getSolidDataset, saveSolidDatasetAt, saveSolidDatasetInContainer, setThing } from "@inrupt/solid-client"
import { checkIfDatasetExists } from "./podReader"
export async function writeAppointment(session, appointmentDetails) {
    console.log("test")
    console.log(session)
    console.log(appointmentDetails)
    let departmentDatasetUrl = appointmentDetails.podOwnerBaseUrl + "/" + appointmentDetails.appointmentDepartment
    let datasetExists = await checkIfDatasetExists(session, departmentDatasetUrl)
    if (datasetExists == false) {
        console.log("should be here")
        await createDepartmentDataset(session, departmentDatasetUrl, appointmentDetails.podOwnerBaseUrl, appointmentDetails.appointmentDepartment)
    }


    if (await(!checkIfPersonHasAccess(session, departmentDatasetUrl))) {
            await grantPersonAccess()
    }
    logNewAppointment()
}

export async function createDepartmentDataset(session, datasetUrl, podOwnerBaseUrl, departmentName){
    console.log("here")
    let healthDataDataset = await getSolidDataset(podOwnerBaseUrl + "/healthData1", {fetch: session.fetch})
    console.log(healthDataDataset)
    let newDepartmentOverallDataset = await createContainerAt(podOwnerBaseUrl + "/healthData1/" + departmentName, {fetch:session.fetch})
    let newDepartmentAppointmentsDataset = createSolidDataset();
    let newDepartmentRecordsDataset = createSolidDataset();
    let newDepartmentDiagnosesDataset = createSolidDataset();
    let newDepartmentPrescriptionsDataset = createSolidDataset();
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Appointments", newDepartmentAppointmentsDataset, {fetch:session.fetch})
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Records", newDepartmentRecordsDataset, {fetch:session.fetch})
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Diagnoses", newDepartmentDiagnosesDataset, {fetch:session.fetch})
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Prescriptions", newDepartmentPrescriptionsDataset, {fetch:session.fetch})
  
    console.log(newDepartmentDataset)
}