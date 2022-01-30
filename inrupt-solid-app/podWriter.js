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
import { checkIfDatasetExists } from "./podReader"

export async function writeAppointment(session, appointmentDetails) {
    console.log(session)
    console.log(appointmentDetails)
    let departmentDatasetUrl = appointmentDetails.podOwnerBaseUrl + "/" + appointmentDetails.appointmentDepartment
    let datasetExists = await checkIfDatasetExists(session, departmentDatasetUrl)
    if (datasetExists == false) {
        await createDepartmentDataset(session, departmentDatasetUrl, appointmentDetails.podOwnerBaseUrl, appointmentDetails.appointmentDepartment)
    }

    if (await (!checkIfPersonHasAccess(session, departmentDatasetUrl))) {
        await grantPersonAccess()
    }
    logNewAppointment()
}

export async function createDepartmentDataset(session, datasetUrl, podOwnerBaseUrl, departmentName) {
    let newDepartmentAppointmentsDataset = createSolidDataset();
    let newDepartmentRecordsDataset = createSolidDataset();
    let newDepartmentDiagnosesDataset = createSolidDataset();
    let newDepartmentPrescriptionsDataset = createSolidDataset();
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Appointments", newDepartmentAppointmentsDataset, { fetch: session.fetch })
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Records", newDepartmentRecordsDataset, { fetch: session.fetch })
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Diagnoses", newDepartmentDiagnosesDataset, { fetch: session.fetch })
    await saveSolidDatasetAt(podOwnerBaseUrl + "/healthData1/" + departmentName + "/Prescriptions", newDepartmentPrescriptionsDataset, { fetch: session.fetch })
}

export async function storeMedicalInsitutionInformation(session, healthDataDatasetUrl, institutionDetails) {
    const date = new Date().toDateString()

    let healthDataDataset = createSolidDataset();
    let healthDataContainer = createContainerAt(healthDataDatasetUrl, {fetch: session.fetch});
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
    const myDatasetWithAcl = await getResourceInfoWithAcl(healthDataDatasetUrl, { fetch: session.fetch })
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
        await saveAclFor(myDatasetWithAcl, updatedAcl, { fetch: session.fetch })
    }
    catch (err) {
        console.log(err)
    }

}