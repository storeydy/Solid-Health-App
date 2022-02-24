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

const emergencyWorkerWebID = "https://emergencyworker.solidcommunity.net/profile/card#me"

const expectedOverallPermissionSet = { read: true, write: false, append: false, controlRead: false, controlWrite: false }   //For reading, different to granting
const expectedDoctorInfoPermissionSet = { read: true, write: false, append: false, controlRead: false, controlWrite: false }
const expectedDoctorPermissionSetForAppointments = { read: true, write: false, append: false, controlRead: false, controlWrite: false }

const doctorPermissionSetForRecordsDiagnoses = { read: true, write: true, append: true, control: false }
const doctorPermissionSetForAppointments = { read: true, write: false, append: false, control: false }
const doctorPermissionSetForPrescriptions = { read: true, write: true, append: true, control: true }

const expectedAdministratorAppointmentsPermissionSet = {read: true, write: true, append: true, controlRead: false, controlWrite: false}       //Institution administrator should be able to upload details of a new appointment to any department
const administratorPermissionSetForAppointments = { read: true, write: true, append: true, control: true }         //Administrator will need to be able to upload records to the appointments dataset, and grant view access to doctors when uploading an appointment
const administratorPermissionSetForDiagnosesPrescriptionsRecords = { read: false, write: false, append: false, control: true }        //Doesn't need to view/update these records but needs to be able to grant read,write access to doctors when they are uploading details of a new appointment


const permissionSetForCreatorOfDepartment = { read: true, append: true, write: true, control: true }  //This works and not controlRead, controlWrite

const permissionSetForEmergencyWorkersToPrescriptions = { read: true, append: false, write: false, control: false}  //Emergency worker user needs to be able to view all prescriptions

export async function writeAppointment(session, healthDataContainerUrl, appointmentDetails) {
    console.log(session)
    console.log(appointmentDetails)
    let departmentDatasetUrl = healthDataContainerUrl + appointmentDetails.appointmentDepartment    // for example: "https://testuser1.solidcommunity.net/publicHealthData/" + "Cardiology"
    let departmentExists = await checkIfDatasetExists(session, departmentDatasetUrl + "/Appointments") //If the appointment dataset exists then the other datasets will - means don't need to grant access to administrator to overall department container
    if (departmentExists == false) {
        // console.log("creating department for the appointment")
        await createDepartmentDataset(session, healthDataContainerUrl, departmentDatasetUrl, appointmentDetails.podOwnerUrl, appointmentDetails.institutionAdministrator)
    }

    //TO CHECK IF SOMEONE HAS ACCESS THEY NEED CONTROL ACCESS. MAKES THEM AN OWNER.
    let doctorHasAccessToOverall = await checkIfPersonHasAccess(session, healthDataContainerUrl, appointmentDetails.appointmentDoctor, expectedOverallPermissionSet)
    if (doctorHasAccessToOverall == false) await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, healthDataContainerUrl, expectedOverallPermissionSet, false)       //Doctor atleast needs read access to overall HealthData container to access Patient's pod 

    let infoDatasetUrl = healthDataContainerUrl + "Info"
    console.log(infoDatasetUrl)
    let doctorHasAccessToInfo = await checkIfPersonHasAccess(session, infoDatasetUrl, appointmentDetails.appointmentDoctor, expectedDoctorInfoPermissionSet)
    if (doctorHasAccessToInfo == false) await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, infoDatasetUrl, expectedDoctorInfoPermissionSet, false)         //Doctor also needs read access to info dataset HealthData container to display homepage in Patient's pod

    let doctorHasAccessToDepartment = await checkIfPersonHasAccess(session, departmentDatasetUrl + "/Appointments", appointmentDetails.appointmentDoctor, expectedDoctorPermissionSetForAppointments)  //Same permission set for multiple datasets, only one check needed
    if (doctorHasAccessToDepartment == false) {
        console.log("giving doctor access")
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Appointments", doctorPermissionSetForAppointments, false)
        console.log("granted to appointments");
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Records", doctorPermissionSetForRecordsDiagnoses, false)
        console.log("granted to records");
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Diagnoses", doctorPermissionSetForRecordsDiagnoses, false)
        console.log("granted to diagnoses");
        await grantAccessToDataset(session, appointmentDetails.appointmentDoctor, departmentDatasetUrl + "/Prescriptions", doctorPermissionSetForPrescriptions, false)
        console.log("granted to prescriptions");
    }


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

export async function createDepartmentDataset(session, healthDataContainerUrl, departmentDatasetUrl, podOwnerUrl, institutionAdministrator) {
    let newDepartmentAppointmentsDataset = createSolidDataset();
    let newDepartmentRecordsDataset = createSolidDataset();
    let newDepartmentDiagnosesDataset = createSolidDataset();
    let newDepartmentPrescriptionsDataset = createSolidDataset();

    await createContainerAt(departmentDatasetUrl + "/", {fetch: session.fetch})
    await saveSolidDatasetAt(departmentDatasetUrl + "/Appointments", newDepartmentAppointmentsDataset, { fetch: session.fetch })
    await saveSolidDatasetAt(departmentDatasetUrl + "/Records", newDepartmentRecordsDataset, { fetch: session.fetch })
    await saveSolidDatasetAt(departmentDatasetUrl + "/Diagnoses", newDepartmentDiagnosesDataset, { fetch: session.fetch })
    await saveSolidDatasetAt(departmentDatasetUrl + "/Prescriptions", newDepartmentPrescriptionsDataset, { fetch: session.fetch })

    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/", permissionSetForCreatorOfDepartment, true )
    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Appointments", permissionSetForCreatorOfDepartment, true)
    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Records", permissionSetForCreatorOfDepartment, true)
    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Diagnoses", permissionSetForCreatorOfDepartment, true)
    await grantAccessToDataset(session, session.info.webId, departmentDatasetUrl + "/Prescriptions", permissionSetForCreatorOfDepartment, true)

    if (session.info.webId != podOwnerUrl) {
        await grantAccessToDataset(session, podOwnerUrl, departmentDatasetUrl + "/", permissionSetForCreatorOfDepartment, true )
        await grantAccessToDataset(session, podOwnerUrl, departmentDatasetUrl + "/Appointments", permissionSetForCreatorOfDepartment, true)
        await grantAccessToDataset(session, podOwnerUrl, departmentDatasetUrl + "/Records", permissionSetForCreatorOfDepartment, true)
        await grantAccessToDataset(session, podOwnerUrl, departmentDatasetUrl + "/Diagnoses", permissionSetForCreatorOfDepartment, true)
        await grantAccessToDataset(session, podOwnerUrl, departmentDatasetUrl + "/Prescriptions", permissionSetForCreatorOfDepartment, true)
    }
   
    await grantAccessToDataset(session, emergencyWorkerWebID, healthDataContainerUrl, permissionSetForEmergencyWorkersToPrescriptions, false)    //Grant read access of health data container to emergency worker
    await grantAccessToDataset(session, emergencyWorkerWebID, healthDataContainerUrl + "Info", permissionSetForEmergencyWorkersToPrescriptions, false)    //Grant read access of prescriptions to emergency worker
    await grantAccessToDataset(session, emergencyWorkerWebID, departmentDatasetUrl + "/Prescriptions", permissionSetForEmergencyWorkersToPrescriptions, false)    //Grant read access of prescriptions to emergency worker
    
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

    if(await checkIfDatasetExists(session, healthDataDatasetUrl)) {     //If there is already a health data container of the selected type
        await deleteExistingHealthData(session, healthDataDatasetUrl)
    }

    let healthDataDataset = await createSolidDataset();
    await createContainerAt(healthDataDatasetUrl, { fetch: session.fetch });
    const institutionDetailsFile = buildThing(createThing({ name: "medicalInstitutionDetails" }))
        .addStringNoLocale(SCHEMA_INRUPT.name, institutionDetails.name)
        .addStringNoLocale(SCHEMA_INRUPT.address, institutionDetails.address)
        .addStringNoLocale("https://schema.org/dateCreated", date)
        .addUrl(RDF.type, "https://schema.org/MedicalOrganization")
        .addUrl("https://schema.org/member", institutionDetails.administrator)
        .build();
        
    healthDataDataset = setThing(healthDataDataset, institutionDetailsFile)
    await saveSolidDatasetAt(
        healthDataDatasetUrl + "/Info",
        healthDataDataset,
        { fetch: session.fetch }
    )
    const myContainerWithAcl = await getResourceInfoWithAcl(healthDataDatasetUrl, { fetch: session.fetch })
    const myContainersAcl = createAcl(myContainerWithAcl)

    let updatedContainerAcl = setAgentResourceAccess(
        myContainersAcl,
        session.info.webId,
        { read: true, append: true, write: true, control: true }
    )
    updatedContainerAcl = setAgentDefaultAccess(
        updatedContainerAcl,
        session.info.webId,
        { read: true, append: true, write: true, control: true }
    )

    if (institutionDetails.administrator) {
        updatedContainerAcl = setAgentResourceAccess(
            updatedContainerAcl,
            institutionDetails.administrator,
            { read: true, append: true, write: true, control: true }
        )
        updatedContainerAcl = setAgentDefaultAccess(
            updatedContainerAcl,
            institutionDetails.administrator,
            { read: true, append: true, write: true, control: true }
        )
    }

    const myDatasetWithAcl = await getResourceInfoWithAcl(healthDataDatasetUrl + "/Info", { fetch: session.fetch })
    const myDatasetsAcl = createAcl(myDatasetWithAcl)

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
