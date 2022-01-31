import {
    createContainerAt,
    createContainerInContainer,
    createSolidDataset,
    getSolidDataset,
    saveSolidDatasetAt,
    saveSolidDatasetInContainer,
    setThing,
    buildThing,
    createThing,
    getSolidDatasetWithAcl,
    createAcl,
    getResourceAcl,
    getResourceInfoWithAcl,
    setAgentResourceAccess,
    setAgentDefaultAccess,
    saveAclFor

} from "@inrupt/solid-client"
import { SCHEMA_INRUPT, VCARD, FOAF, RDF } from "@inrupt/vocab-common-rdf";
import { checkIfDatasetExists, checkIfPersonHasAccess } from "./podReader"

export async function writeAppointment(session, appointmentDetails) {
    console.log(session)
    console.log(appointmentDetails)
    let departmentDatasetUrl = appointmentDetails.podOwnerBaseUrl + "/healthData2/" + appointmentDetails.appointmentDepartment
    let datasetExists = await checkIfDatasetExists(session, departmentDatasetUrl)
    if (datasetExists == false) {
        console.log("shouldn't go in here")
        await createDepartmentDataset(session, departmentDatasetUrl, appointmentDetails.podOwnerBaseUrl, appointmentDetails.appointmentDepartment)
    }

    // console.log("about to call")
    let expectedDoctorPermissionSet = { read: true, write: true, append: true, controlRead: true, controlWrite: true }
    let doctorHasAccess = await checkIfPersonHasAccess(session, departmentDatasetUrl + "/Appointments", appointmentDetails.appointmentDoctor, expectedDoctorPermissionSet)
    if (doctorHasAccess == false) {
        let doctorPermissionSet = {read: true, write: true, append: true, control: true}
        console.log("giving doctor access")
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, appointmentDetails.podOwnerBaseUrl + "/healthData2/"+ appointmentDetails.appointmentDepartment + "/Appointments" , doctorPermissionSet, false)
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, appointmentDetails.podOwnerBaseUrl + "/healthData2/"+ appointmentDetails.appointmentDepartment + "/Records" , doctorPermissionSet, false)
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, appointmentDetails.podOwnerBaseUrl + "/healthData2/"+ appointmentDetails.appointmentDepartment + "/Diagnoses" , doctorPermissionSet, false)
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, appointmentDetails.podOwnerBaseUrl + "/healthData2/"+ appointmentDetails.appointmentDepartment + "/Prescriptions" , doctorPermissionSet, false)
    }

    logNewAppointment(session, )
}

export async function createDepartmentDataset(session, datasetUrl, podOwnerBaseUrl, departmentName) {
    let newDepartmentAppointmentsDataset = createSolidDataset();
    let newDepartmentRecordsDataset = createSolidDataset();
    let newDepartmentDiagnosesDataset = createSolidDataset();
    let newDepartmentPrescriptionsDataset = createSolidDataset();
    let podOwnerWebID = podOwnerBaseUrl + "/profile/card#me"
    let permissionSetForCreator = {read: true, append: true, write: true, control: true}
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData2/" + departmentName + "/Appointments", newDepartmentAppointmentsDataset, { fetch: session.fetch })
    // await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData1/" + departmentName, permissionSetForCreator, false )
    await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Appointments", permissionSetForCreator, false )
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData2/" + departmentName + "/Records", newDepartmentRecordsDataset, { fetch: session.fetch })
    await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Records", permissionSetForCreator, false )
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData2/" + departmentName + "/Diagnoses", newDepartmentDiagnosesDataset, { fetch: session.fetch })
    await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Diagnoses", permissionSetForCreator, false )
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData2/" + departmentName + "/Prescriptions", newDepartmentPrescriptionsDataset, { fetch: session.fetch })
    await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Prescriptions", permissionSetForCreator, false )
    if(session.info.webId == podOwnerWebID){    //Make sure pod owner has access
        await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Appointments", permissionSetForCreator, true )
        await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Records", permissionSetForCreator, true )
        await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Diagnoses", permissionSetForCreator, true )
        await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName + "/Prescriptions", permissionSetForCreator, true )
    }
}

export async function grantAccessToDataset(session, personWebID, datasetUrl, permissionSet, isOwner) {
    const myDatasetWithAcl = await getResourceInfoWithAcl(datasetUrl, { fetch: session.fetch })
    const myDatasetsAcl = createAcl(myDatasetWithAcl)
    let updatedAcl = setAgentResourceAccess(
        myDatasetsAcl,
        personWebID,
        permissionSet
    )
    if (isOwner == true) {
        updatedAcl = setAgentDefaultAccess(
            updatedAcl,
            personWebID,
            permissionSet
        )
    }
    await saveAclFor(myDatasetWithAcl, updatedAcl, { fetch: session.fetch })
}

export async function storeMedicalInsitutionInformation(session, healthDataDatasetUrl, institutionDetails) {
    const date = new Date().toDateString()

    let healthDataDataset = createSolidDataset();
    let healthDataContainer = createContainerAt(healthDataDatasetUrl, { fetch: session.fetch });
    const institutionDetailsFile = buildThing(createThing({ name: "medicalInstitutionDetails" }))
        .addStringNoLocale(SCHEMA_INRUPT.name, institutionDetails.name)
        .addStringNoLocale(SCHEMA_INRUPT.address, institutionDetails.address)
        .addStringNoLocale("https://schema.org/dateCreated", date)
        .addUrl(RDF.type, "https://schema.org/TextDigitalDocument")
        .build();

    healthDataDataset = setThing(healthDataDataset, institutionDetailsFile)
    const savedPrivateInfoDataset = await saveSolidDatasetAt(
        healthDataDatasetUrl + "/Info",
        healthDataDataset,
        { fetch: session.fetch }
    )
    const myContainerWithAcl = await getResourceInfoWithAcl(healthDataDatasetUrl, { fetch: session.fetch })
    const myContainersAcl = createAcl(myContainerWithAcl)

    console.log(myContainersAcl)
    let updatedContainerAcl = setAgentResourceAccess(
        myContainersAcl,
        session.info.webId,
        { read: true, append: true, write: true, control: true }
    )
    updatedContainerAcl = setAgentResourceAccess(
        updatedContainerAcl,
        institutionDetails.administrator,
        { read: true, append: true, write: true, control: true }
    )
    updatedContainerAcl = setAgentDefaultAccess(
        updatedContainerAcl,
        session.info.webId,
        { read: true, append: true, write: true, control: true }
    )

    const myDatasetWithAcl = await getResourceInfoWithAcl(healthDataDatasetUrl + "/Info", { fetch: session.fetch })
    const myDatasetsAcl = createAcl(myDatasetWithAcl)

    console.log(myDatasetsAcl)
    let updatedAcl = setAgentResourceAccess(
        myDatasetsAcl,
        session.info.webId,
        { read: true, append: true, write: true, control: true }
    )
    updatedAcl = setAgentResourceAccess(
        updatedAcl,
        institutionDetails.administrator,
        { read: true, append: true, write: true, control: true }
    )
    updatedAcl = setAgentDefaultAccess(
        updatedAcl,
        session.info.webId,
        { read: true, append: true, write: true, control: true }
    )

    try {
        await saveAclFor(myContainerWithAcl, updatedContainerAcl, { fetch: session.fetch })
        await saveAclFor(myDatasetWithAcl, updatedAcl, { fetch: session.fetch })
    }
    catch (err) {
        console.log(err)
    }

}