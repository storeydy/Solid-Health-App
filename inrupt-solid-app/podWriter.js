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
    saveAclFor,
    addStringNoLocale,
    addUrl,
    SolidDataset,
    hasResourceAcl,
    hasAccessibleAcl,
    hasFallbackAcl,
    createAclFromFallbackAcl,
    isContainer,
    deleteSolidDataset,

} from "@inrupt/solid-client"
import { SCHEMA_INRUPT, VCARD, FOAF, RDF } from "@inrupt/vocab-common-rdf";
import { checkIfDatasetExists, checkIfPersonHasAccess, getDepartments } from "./podReader"

export async function writeAppointment(session, healthDataContainerUrl, appointmentDetails) {
    console.log(session)
    console.log(appointmentDetails)
    let departmentDatasetUrl = healthDataContainerUrl + appointmentDetails.appointmentDepartment
    let datasetExists = await checkIfDatasetExists(session, departmentDatasetUrl + "/Appointments") //If the appointment dataset exists then the other datasets will - means don't need to grant access to administrator to overall department container
    if (datasetExists == false) {
        console.log("shouldn't go in here")
        await createDepartmentDataset(session, departmentDatasetUrl, appointmentDetails.podOwnerBaseUrl, appointmentDetails.appointmentDepartment)
    }

    //TO CHECK IF SOMEONE HAS ACCESS THEY NEED CONTROL ACCESS. MAKES THEM AN OWNER.
    let expectedOverallPermissionSet = { read: true, write: false, append: false, controlRead: false, controlWrite: false }
    let doctorHasAccessToOverall = await checkIfPersonHasAccess(session, healthDataContainerUrl, appointmentDetails.appointmentDoctor, expectedOverallPermissionSet)
    if (doctorHasAccessToOverall == false) await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, healthDataContainerUrl, expectedOverallPermissionSet, false)

    let infoDatasetUrl = healthDataContainerUrl + "Info"
    let expectedInfoPermissionSet = { read: true, write: false, append: false, controlRead: false, controlWrite: false }
    let doctorHasAccessToInfo = await checkIfPersonHasAccess(session, infoDatasetUrl, appointmentDetails.appointmentDoctor, expectedInfoPermissionSet)
    if (doctorHasAccessToInfo == false) await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, infoDatasetUrl, expectedInfoPermissionSet, false)

    let expectedDoctorPermissionSet = { read: true, write: false, append: false, controlRead: false, controlWrite: false }
    let doctorHasAccessToDepartment = await checkIfPersonHasAccess(session, departmentDatasetUrl + "/Appointments", appointmentDetails.appointmentDoctor, expectedDoctorPermissionSet)  //Same permission set for multiple datasets, only one check needed
    if (doctorHasAccessToDepartment == false) {
        let doctorPermissionSetForRecordsDiagnoses = { read: true, write: true, append: true, control: false }
        let doctorPermissionSetForAppointments = { read: true, write: false, append: false, control: false }
        let doctorPermissionSetForPrescriptions = { read: true, write: true, append: true, control: true }
        console.log("giving doctor access")
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Appointments", doctorPermissionSetForAppointments, false)
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Records", doctorPermissionSetForRecordsDiagnoses, false)
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Diagnoses", doctorPermissionSetForRecordsDiagnoses, false)
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Prescriptions", doctorPermissionSetForPrescriptions, false)
    }

    let expectedAdministratorAppointmentsPermissionSet = {read: true, write: true, append: true, controlRead: false, controlWrite: false}       //Institution administrator should be able to upload details of a new appointment to any department
    //MIGHT NEED TO CHECK THAT SIGNED IN USER IS POD OWNER BEFORE MAKING THIS CHECK
    let administratorHasAccessToAppointments = await checkIfPersonHasAccess(session, departmentDatasetUrl + "/Appointments", appointmentDetails.institutionAdministrator, expectedAdministratorAppointmentsPermissionSet)
    if (administratorHasAccessToAppointments == false){
        let administratorPermissionSetForAppointments = { read: true, write: true, append: true, control: false }
        console.log("giving administrator access")
        await grantAccessToDataset(session, appointmentDetails.institutionAdministrator, departmentDatasetUrl + "/Appointments", administratorPermissionSetForAppointments, false)
    }

    //Grant permission to emergency worker

    let departmentAppointmentDataset = await getSolidDataset(departmentDatasetUrl + "/Appointments", { fetch: session.fetch })
    let appointmentFileName = "Appointment @ " + appointmentDetails.appointmentTime.toDateString()
    const appointmentDetailsFile = buildThing(createThing({ name: appointmentFileName }))
        .addStringNoLocale("https://schema.org/dateCreated", new Date().toUTCString())
        .addStringNoLocale("https://schema.org/startDate", appointmentDetails.appointmentTime)
        .addStringNoLocale("https://schema.org/organizer", appointmentDetails.appointmentDoctor)
        .addStringNoLocale("https://schema.org/about", appointmentDetails.appointmentNotes)
        .addStringNoLocale("https://schema.org/creator", session.info.webId)
        .addUrl(RDF.type, "https://schema.org/Event")
        .build();

    departmentAppointmentDataset = setThing(departmentAppointmentDataset, appointmentDetailsFile)
    await saveSolidDatasetAt(departmentDatasetUrl + "/Appointments", departmentAppointmentDataset, { fetch: session.fetch })
    console.log("appointment details saved to pod")
}

export async function createDepartmentDataset(session, departmentDatasetUrl, podOwnerBaseUrl, departmentName) {
    let newDepartmentAppointmentsDataset = createSolidDataset();
    let newDepartmentRecordsDataset = createSolidDataset();
    let newDepartmentDiagnosesDataset = createSolidDataset();
    let newDepartmentPrescriptionsDataset = createSolidDataset();
    let podOwnerWebID = podOwnerBaseUrl + "/profile/card#me"
    let permissionSetForCreator = { read: true, append: true, write: true, control: true }  //This works and not controlRead, controlWrite

    let ownerOfPodIsAppointmentCreator = false
    if (session.info.webId == podOwnerWebID) ownerOfPodIsAppointmentCreator = true    //Make sure pod owner has access
    console.log(ownerOfPodIsAppointmentCreator)
    await createContainerAt(departmentDatasetUrl + "/", {fetch: session.fetch})
    await grantAccessToDataset(session, podOwnerWebID, departmentDatasetUrl + "/", permissionSetForCreator, true ) //MESSES UP WHOLE DATASET
    // await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/", permissionSetForCreator, false ) //MESSES UP WHOLE DATASET

    await saveSolidDatasetAt(departmentDatasetUrl + "/Appointments", newDepartmentAppointmentsDataset, { fetch: session.fetch })
    console.log("Appointments created")
    // await grantAccessToDataset(session, session.info.webId, podOwnerBaseUrl + "/healthData2/" + departmentName, permissionSetForCreator, false ) //MESSES UP WHOLE DATASET
    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Appointments", permissionSetForCreator, ownerOfPodIsAppointmentCreator)
    console.log("Appointments granted to creator")
    await saveSolidDatasetAt(departmentDatasetUrl + "/Records", newDepartmentRecordsDataset, { fetch: session.fetch })
    console.log("Records created")

    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Records", permissionSetForCreator, ownerOfPodIsAppointmentCreator)
    console.log("Records granted to creator")

    await saveSolidDatasetAt(departmentDatasetUrl + "/Diagnoses", newDepartmentDiagnosesDataset, { fetch: session.fetch })
    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Diagnoses", permissionSetForCreator, ownerOfPodIsAppointmentCreator)
    await saveSolidDatasetAt(departmentDatasetUrl + "/Prescriptions", newDepartmentPrescriptionsDataset, { fetch: session.fetch })
    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Prescriptions", permissionSetForCreator, ownerOfPodIsAppointmentCreator)
   
    await grantAccessToDataset(session, podOwnerWebID, departmentDatasetUrl + "/Appointments", permissionSetForCreator, true)
    await grantAccessToDataset(session, podOwnerWebID, departmentDatasetUrl + "/Records", permissionSetForCreator, true)
    await grantAccessToDataset(session, podOwnerWebID, departmentDatasetUrl + "/Diagnoses", permissionSetForCreator, true)
    await grantAccessToDataset(session, podOwnerWebID, departmentDatasetUrl + "/Prescriptions", permissionSetForCreator, true)
    
}

export async function grantAccessToDataset(session, personWebID, datasetUrl, permissionSet, isOwner) {
    const myDatasetWithAcl = await getResourceInfoWithAcl(datasetUrl, { fetch: session.fetch })

    let myDatasetsAcl;
    if (!hasResourceAcl(myDatasetWithAcl)) {
        if (!hasAccessibleAcl(myDatasetWithAcl)) {
            alert("The current user does not have permission to change access rights to this resource.")
        };
        if (!hasFallbackAcl(myDatasetWithAcl)) {
            alert("The current user does not have permission to see who currently has access to this resource.")
        }
        myDatasetsAcl = createAclFromFallbackAcl(myDatasetWithAcl)
    }
    else myDatasetsAcl = getResourceAcl(myDatasetWithAcl)

    // const myDatasetsAcl = createAcl(myDatasetWithAcl)
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
    const date = new Date().toUTCString()

    if(await checkIfDatasetExists(session, healthDataDatasetUrl)) {
        console.log("deleting existing")
        await deleteExistingHealthData(session, healthDataDatasetUrl)
    }

    let healthDataDataset = createSolidDataset();
    let healthDataContainer = createContainerAt(healthDataDatasetUrl, { fetch: session.fetch });
    const institutionDetailsFile = buildThing(createThing({ name: "medicalInstitutionDetails" }))
        .addStringNoLocale(SCHEMA_INRUPT.name, institutionDetails.name)
        .addStringNoLocale(SCHEMA_INRUPT.address, institutionDetails.address)
        .addStringNoLocale("https://schema.org/dateCreated", date)
        .addUrl(RDF.type, "https://schema.org/MedicalOrganization")
        .addUrl("https://schema.org/member", institutionDetails.administrator)
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
    if (institutionDetails.administrator) {
        updatedContainerAcl = setAgentResourceAccess(
            updatedContainerAcl,
            institutionDetails.administrator,
            { read: true, append: true, write: true, control: true }
        )
    }
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
    if (institutionDetails.administrator) {
        updatedAcl = setAgentResourceAccess(
            updatedAcl,
            institutionDetails.administrator,
            { read: true, append: true, write: true, control: true }
        )
    }
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

export async function uploadMedicalRecord(session, healthDataDatasetUrl, fileDetails) {
    try {
        let datasetToUploadTo = await getSolidDataset(healthDataDatasetUrl, { fetch: session.fetch })
        let thingToAdd = createThing({ name: fileDetails["https://schema.org/title"] });
        for (const [property, propertyValue] of Object.entries(fileDetails)) {
            thingToAdd = addStringNoLocale(thingToAdd, property, propertyValue)
        }
        thingToAdd = addUrl(thingToAdd, RDF.type, "https://schema.org/TextDigitalDocument")
        datasetToUploadTo = setThing(datasetToUploadTo, thingToAdd);
        await saveSolidDatasetAt(healthDataDatasetUrl, datasetToUploadTo, { fetch: session.fetch })
        return true;
    }
    catch (ex) {
        console.log(ex)
        return false;
    }
}

export async function createInsuranceDiagnosesDataset(session, insuranceDatasetUrl, podOwnerUrl) {
    let insuranceDiagnosesDataset = createSolidDataset();
    await saveSolidDatasetAt(
        insuranceDatasetUrl,
        insuranceDiagnosesDataset,
        { fetch: session.fetch }
    )
    let permissionSetForOwner = { read: true, write: true, append: true, control: true }
    await grantAccessToDataset(session, podOwnerUrl, insuranceDatasetUrl + "1", permissionSetForOwner, true)
    // const insuranceDiagnosesDatasetWithAcl = await getResourceInfoWithAcl(insuranceDatasetUrl, {fetch: session.fetch})
    // const insuranceDiagnosesDatasetAcl = createAcl(insuranceDiagnosesDatasetWithAcl)
    // let updatedInsuranceDiagnosesDatasetAcl = setAgentResourceAccess(insuranceDiagnosesDatasetAcl, podOwnerUrl, {read: true, append: true, write: true, control: true })
    // updatedInsuranceDiagnosesDatasetAcl = setAgentDefaultAccess(insuranceDiagnosesDatasetAcl, podOwnerUrl, {read: true, append: true, write: true, control: true })
    // await saveAclFor(insuranceDiagnosesDatasetWithAcl, updatedInsuranceDiagnosesDatasetAcl, {fetch: session.fetch})
}

export async function addThingToDataset(session, datasetUrl, thing) {
    let datasetToAddTo = await getSolidDataset(datasetUrl, { fetch: session.fetch })
    datasetToAddTo = setThing(datasetToAddTo, thing)
    await saveSolidDatasetAt(datasetUrl, datasetToAddTo, { fetch: session.fetch })
}

export async function deleteExistingHealthData(session, resourceUrl){
    try {
        let datasetsWithinDepartment = ['Appointments', 'Diagnoses', 'Prescriptions', 'Records']
        let departmentsWithinHealthData = await getDepartments(session, resourceUrl)
        for(var i = 0; i < departmentsWithinHealthData.length; i++){
            for(var j = 0; j < datasetsWithinDepartment.length; j++){
                console.log("deleting ", departmentsWithinHealthData[i] + datasetsWithinDepartment[j]);
                await deleteSolidDataset(departmentsWithinHealthData[i] + datasetsWithinDepartment[j], {fetch: session.fetch})  //Delete each of the 4 child datasets within a department container
            }
            await deleteSolidDataset(departmentsWithinHealthData[i], {fetch: session.fetch})    //Then delete the department container
        }
        await deleteSolidDataset(resourceUrl, { fetch: session.fetch });    //Then delete the overall dataset
        console.log("deleted dataset")
    }
    catch (err) {
        console.log(err)
    }
}
