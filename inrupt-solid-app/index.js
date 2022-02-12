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
    getContainedResourceUrlAll,
    UrlString
} from "@inrupt/solid-client";

import { Session, getDefaultSession, fetch } from "@inrupt/solid-client-authn-browser";
import { SCHEMA_INRUPT, VCARD, FOAF, RDF } from "@inrupt/vocab-common-rdf";
import { departments } from "./healthcareDepartments";
import { checkIfDatasetExists, checkIfAdministrator, getDepartments, getFilesInDataset, getAccessToDataset } from "./podReader";
import { writeAppointment, createDepartmentDataset, storeMedicalInsitutionInformation, uploadMedicalRecord, grantAccessToDataset } from "./podWriter";
import * as _ from 'lodash'
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
var initialStateOfDatasetAccess = {}
var currentlyAccessedDatasetUrl = ""
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

async function logout() {
    document.getElementById("webID").value = "";
    document.getElementById("loginButtonDiv").style.display = "block"
    document.getElementById("btnLogout").style.display = "none"
    document.getElementById("labelStatus").innerHTML = ""
    resetCurrentPodSession(true)
    await session.logout();
    document.getElementById("accessingPod").style.display = "none"
    localStorage.clear()
    let authCookie = document.cookie;
    // browser.cookies.remove(*)
    // document.cookie = "authCookie=; expires = Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    const cookies = document.cookie.split(";")
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
        document.getElementById("btnLogout").style.display = "block"
        document.getElementById("loginButtonDiv").style.display = "none"
        document.getElementById("accessingPod").style.display = "block"
        checkMedicalInstitutionStatus();
    }
}


handleRedirectAfterLogin();



async function checkMedicalInstitutionStatus(podOwner) {
    if (podOwner) {
        var webID;
        if (podOwner == "signedInUser") webID = session.info.webId
        else if (podOwner == "specifiedUser") webID = document.getElementById("podOwner").value;
        accessedPodOwnerUrl = webID;
        accessedPodOwnerBaseUrl = webID.substring(0, (webID.length - 16))
        var healthDataDatasetUrl = accessedPodOwnerBaseUrl + "/healthData2/Info"  // https://testuser1.solidcommunity.net/profile/card#me
        let healthDataExists = await checkIfDatasetExists(session, healthDataDatasetUrl) // https://testuser1.solidcommunity.net/profile/card#me
        if (healthDataExists == true) {
            const healthDataDataset = await getSolidDataset(healthDataDatasetUrl, { fetch: session.fetch });
            const institutionDetails = await getThing(healthDataDataset, healthDataDatasetUrl + "#medicalInstitutionDetails")
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
        else {
            if (podOwner == "signedInUser") {
                alert("You have not created a dataset in your Solid pod to hold medical record information. Please create one by following the steps below.")
                medicalInstitutionRegistered = false;
                document.getElementById("accessingPod").style.display = "none"
                document.getElementById("registerNewMedicalInstitution").style.display = 'block'
            }
            else {
                alert("You have not been authorized to view medical records in the specified individual's pod. Contact them to request access.")
            }
            document.getElementById("podOwner").value = "";
        }

    }
}

function resetCurrentPodSession(completelyReset) {
    if (completelyReset == true) {
        document.getElementById("institutionInformation").style.display = "none";
        document.getElementById("accessingPod").style.display = "block";
    }
    let recordsContainer = document.getElementById("containerForDisplayedRecords");
    if (recordsContainer) recordsContainer.remove();
    document.getElementById("uploadNewAppointmentDetails").style.display = "none"
    document.getElementById("accessingRecordsDiv").style.display = "none";
    document.getElementById("uploadNewMedicalRecordDiv").style.display = "none";
    let buttonForAppointment = document.getElementById("registerNewAppointmentButton")
    buttonForAppointment.classList.remove("clicked-button")
    buttonForAppointment.style.display = "block"
    let buttonForReadingFiles = document.getElementById("accessMedicalRecordsButton")
    buttonForReadingFiles.classList.remove("clicked-button")
    buttonForReadingFiles.style.display = "block"
    let buttonForUploadingFiles = document.getElementById("uploadMedicalRecordsButton")
    buttonForUploadingFiles.classList.remove("clicked-button")
    buttonForUploadingFiles.style.display = "block"
    let buttonForManagingAccess = document.getElementById("modifyAccessToDataButton")
    buttonForManagingAccess.classList.remove("clicked-button")
    buttonForManagingAccess.style.display = "block"
    let departmentSelectionForm = document.getElementById("departmentSelectionForm")
    while (departmentSelectionForm.children.length > 1) {
        let nextNode = departmentSelectionForm.lastChild
        departmentSelectionForm.removeChild(nextNode);
    }
    document.getElementById("medicalRecordTypeSelection").style.display = "block"
    document.getElementById("createNewGeneralRecordDiv").style.display = "none";
    createNewPrescriptionDiv
    document.getElementById("createNewPrescriptionDiv").style.display = "none";
    document.getElementById("manageAccessToDataDiv").style.display = "none";
    document.getElementById("medicalRecordTypeSelection").style.display = "block"
    if (document.getElementById("selectedDepartment")) document.getElementById("selectedDepartment").remove()
    if (document.getElementById("containerForRecordAccess")) document.getElementById("containerForRecordAccess").remove()
}

async function registerNewMedicalInstitution() {
    const institutionName = document.getElementById("institutionName").value;
    const institutionAddress = document.getElementById("institutionAddress").value;
    const administratorWebID = document.getElementById("institutionSysAdmin").value;
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
    let department = document.getElementById("selectedAppointmentDepartmentDropdown").value
    let timeOfAppointment = document.getElementById("newAppointmentTime").value;
    let dateOfAppointment = document.getElementById("newAppointmentDate").value;
    let doctorWebID = document.getElementById("newAppointmentDoctor").value;
    let notes = document.getElementById("newAppointmentNotes").value;

    // let department = "Cardiology"
    // let timeOfAppointment = "12:33"
    // let dateOfAppointment = "22/11/22"
    // let doctorWebID = "https://testuser2.solidcommunity.net/profile/card#me"
    // let notes = "Some notes for appointment"

    let appointmentDateAsString = "20" + dateOfAppointment.substring(0, 2) + "-" + dateOfAppointment.substring(3, 5) + "-" + dateOfAppointment.substring(6, 8) + " " + timeOfAppointment
    let appointmentFullTime = new Date(appointmentDateAsString)
    let appointmentDetails = {
        podOwnerBaseUrl: accessedPodOwnerBaseUrl,
        appointmentDepartment: department,
        appointmentTime: appointmentFullTime,
        appointmentDoctor: doctorWebID,
        appointmentNotes: notes
    }
    await writeAppointment(session, appointmentDetails)
}

async function getPatientDepartmentsAndDisplay(useOfDropdown, locationForDropdown) {
    let healthDataContainerDatasetUrl = accessedPodOwnerBaseUrl + "/healthData2/"
    let departments = await getDepartments(session, healthDataContainerDatasetUrl)
    if (departments.length == 0) {
        alert("The currently accessed pod owner has no medical records stored in their pod.")
        return
    }
    else {
        let departmentListForm = ""


        if (useOfDropdown == "uploadingNewRecord") {
            departmentListForm = document.getElementById(locationForDropdown)
        }
        else if (useOfDropdown == "accessingRecords") {
            document.getElementById("accessingRecordsDiv").style.display = "block"
            departmentListForm = document.getElementById("departmentSelectionForm")
            if (departmentListForm.childNodes.length < 4) {
                let selectAbleRecordType = document.createElement("select")
                selectAbleRecordType.id = "selectedRecordType"
                selectAbleRecordType.style.margin = "2%"

                let appointmentOption = document.createElement("option")
                appointmentOption.innerHTML = "Appointments"
                selectAbleRecordType.appendChild(appointmentOption)
                let diagnosesOption = document.createElement("option")
                diagnosesOption.innerHTML = "Diagnoses"
                selectAbleRecordType.appendChild(diagnosesOption)
                let prescriptionOption = document.createElement("option")
                prescriptionOption.innerHTML = "Prescriptions"
                selectAbleRecordType.appendChild(prescriptionOption)
                let recordsOption = document.createElement("option")
                recordsOption.innerHTML = "Records"
                selectAbleRecordType.appendChild(recordsOption)
                departmentListForm.appendChild(selectAbleRecordType)
            }
        }

        if (departmentListForm.childNodes.length < 5) {
            let selectAbleDepartment = document.createElement("select")
            selectAbleDepartment.id = "selectedDepartment"
            selectAbleDepartment.style.margin = "2%"
            for (var i = 0; i <= departments.length - 1; i++) {
                let newOption = document.createElement("option")
                newOption.innerHTML = departments[i].substring(departments[i].lastIndexOf("healthData2/") + 12, departments[i].length - 1)
                selectAbleDepartment.appendChild(newOption)
            }
            departmentListForm.appendChild(selectAbleDepartment)
        }
        if (useOfDropdown == "accessingRecords") {
            if (departmentListForm.childNodes.length < 6) {
                let submitButtonToView = document.createElement("button")
                submitButtonToView.type = "submit"
                submitButtonToView.id = "viewRecordsButton"
                submitButtonToView.innerHTML = "View records in selected dataset"
                submitButtonToView.style.margin = "2%"
                departmentListForm.appendChild(submitButtonToView)

                let submitButtonToManageAccess = document.getElementById("viewAccessButton")
                if (!submitButtonToManageAccess) {
                    submitButtonToManageAccess = document.createElement("button")
                    submitButtonToManageAccess.innerHTML = "Manage access to selected dataset"
                    submitButtonToManageAccess.onclick = async function () {
                        let selectedDepartment = document.getElementById("selectedDepartment").value
                        let selectedRecordType = document.getElementById("selectedRecordType").value
                        await getAccessAndDisplay(selectedRecordType, selectedDepartment)
                    }
                }
                departmentListForm.append(submitButtonToManageAccess)

            }
           
        }

    }
}

async function updateDatasetAccess(accessPerson) {
    console.log(accessPerson)
    let indexOfAccessPerson = accessPerson.substring(accessPerson.length - 1, accessPerson.length)
    console.log(indexOfAccessPerson)
    console.log(initialStateOfDatasetAccess)
    let previousAccessKey = Object.keys(initialStateOfDatasetAccess)[indexOfAccessPerson]
    let previousAccessValue = initialStateOfDatasetAccess[previousAccessKey]
    console.log(previousAccessValue)
    let currentAccess = {
        read: document.getElementById("readAccessFor" + indexOfAccessPerson).checked,
        write: document.getElementById("writeAccessFor" + indexOfAccessPerson).checked,
        append: document.getElementById("appendAccessFor" + indexOfAccessPerson).checked,
        controlRead: document.getElementById("controlAccessFor" + indexOfAccessPerson).checked,
        controlWrite: document.getElementById("controlAccessFor" + indexOfAccessPerson).checked
    }
    console.log(currentAccess)
    if (_.isEqual(currentAccess, previousAccessValue)) {
        alert("No change detected from initial access level. Change the values of checkboxes to make updates.")
        return
    }
    else {
        console.log(previousAccessKey)
        console.log(currentlyAccessedDatasetUrl)
        try {
            let isOwner = false
            if (previousAccessKey == accessedPodOwnerUrl) isOwner = true
            let controlValue = currentAccess.controlRead
            delete currentAccess.controlRead; delete currentAccess.controlWrite //Control value is read back in 2 separate values
            currentAccess.control = controlValue    //but written in one value

            await grantAccessToDataset(session, previousAccessKey, currentlyAccessedDatasetUrl, currentAccess, isOwner)
            alert("Individual's access updated successfully.")
            let selectedDepartment = document.getElementById("selectedDepartment").value
            let selectedRecordType = document.getElementById("selectedRecordType").value

            getAccessAndDisplay(selectedRecordType, selectedDepartment)
            return
        }
        catch (err) {
            console.log(err)
        }
    }
    if (currentAccess == previousAccessValue) console.log("they are the same")
}

async function getPatientFilesAndDisplay(recordType, department) {
    let urlOfSelectedDataset = accessedPodOwnerBaseUrl + "/healthData2/" + department + "/" + recordType
    let filesInSelectedDataset = await getFilesInDataset(session, urlOfSelectedDataset)
    currentlyAccessedDatasetUrl = urlOfSelectedDataset
    if (filesInSelectedDataset.length > 0) {
        let totalFileObjs = []
        for (var i = 0; i <= filesInSelectedDataset.length - 1; i++) {
            let fileObj = {}
            fileObj.title = (filesInSelectedDataset[i].url.substring(filesInSelectedDataset[i].url.lastIndexOf("#") + 1, filesInSelectedDataset[i].url.length)).replaceAll("%20", " ")
            fileObj.url = filesInSelectedDataset[i].url
            fileObj.details = {}
            let keyValue = ""   //TODO: Trim strings from full URLs to the last portion, e.g. 'organiser'
            for (const [key, value] of Object.entries(filesInSelectedDataset[i].predicates)) {
                for (const [innerKey, innerValue] of Object.entries(value)) {
                    if (innerValue[0] && innerValue[0].length > 0) {
                        fileObj.details[key] = innerValue[0]
                    }
                    else {
                        for (const [innerKey2, innerValue2] of Object.entries(innerValue)) {
                            if (innerValue2[0] && innerValue2[0].length > 0) {
                                fileObj.details[key] = innerValue2[0]
                            }
                        }
                    }

                }
            }
            totalFileObjs.push(fileObj)
        }
        let existingDisplayedAccess = document.getElementById("containerForRecordAccess")
        if (existingDisplayedAccess) existingDisplayedAccess.remove();
        let existingDisplayedFiles = document.getElementById("containerForDisplayedRecords")
        if (existingDisplayedFiles) existingDisplayedFiles.remove();
        let containerDivForFiles = document.createElement("div")
        containerDivForFiles.id = "containerForDisplayedRecords"
        containerDivForFiles.className = "panel"

        let headerOfContainer = document.createElement("h3")
        headerOfContainer.innerHTML = "Files in current dataset"
        headerOfContainer.className = "section-header"
        containerDivForFiles.appendChild(headerOfContainer)

        for (var k = 0; k < totalFileObjs.length; k++) {
            let fileDisplayObj = document.createElement("div")
            fileDisplayObj.id = "displayedFile" + k
            fileDisplayObj.className = "panel"
            if(k % 2 == 1) {
                console.log("is odd")
                fileDisplayObj.classList.add("alt-color")
            }
            let titleOfFile = document.createElement("h3")
            titleOfFile.innerHTML = "Title: " + totalFileObjs[k].title
            titleOfFile.style.textAlign = "center"
            let urlOfFile = document.createElement("h6")
            urlOfFile.innerHTML = "URL: " + totalFileObjs[k].url
            let detailsOfFile = document.createElement("div")
            for (const [key, value] of Object.entries(totalFileObjs[k].details)) {
                let fileProperty = document.createElement("p")
                let indexOfLastDivider = key.lastIndexOf("#")
                if(indexOfLastDivider < key.lastIndexOf("/") ) indexOfLastDivider = key.lastIndexOf("/")
                fileProperty.innerHTML = "<u>" + key.substring(indexOfLastDivider + 1, key.length ) + "</u>: " + value
                fileProperty.classList.add("fileProperty")
                detailsOfFile.appendChild(fileProperty)
            }

            fileDisplayObj.append(titleOfFile, urlOfFile, detailsOfFile )

            containerDivForFiles.appendChild(fileDisplayObj)
        }
        let medicalRecordsDiv = document.getElementById("accessingRecordsDiv")
        medicalRecordsDiv.appendChild(containerDivForFiles)
    }
    else {
        alert("No files found in the chosen patient's pod of the selected record type.")
    }
}

async function getAccessAndDisplay(recordType, department) {
    let urlOfSelectedDataset = accessedPodOwnerBaseUrl + "/healthData2/" + department + "/" + recordType
    let access = await getAccessToDataset(session, urlOfSelectedDataset)
    initialStateOfDatasetAccess = { ...access }
    currentlyAccessedDatasetUrl = urlOfSelectedDataset
    if (Object.entries(access).length > 0) {
        let existingDisplayedFiles = document.getElementById("containerForDisplayedRecords")
        if (existingDisplayedFiles) existingDisplayedFiles.remove();
        let existingDisplayedAccess = document.getElementById("containerForRecordAccess")
        if (existingDisplayedAccess) existingDisplayedAccess.remove();

        let containerDivForAccess = document.createElement("div")
        containerDivForAccess.id = "containerForRecordAccess"
        containerDivForAccess.className = "panel"
        // containerDivForAccess.style.backgroundColor = "white"


        let headerOfContainer = document.createElement("h3")
        headerOfContainer.innerHTML = "Currently permitted individuals of the selected dataset"
        headerOfContainer.className = "section-header"
        containerDivForAccess.appendChild(headerOfContainer)

        let index = 0
        let readAccessCheckbox = document.createElement("input")
        let readAccessLabel = document.createElement("label")
        let writeAccessCheckbox = document.createElement("input")
        let writeAccessLabel = document.createElement("label")
        let appendAccessCheckbox = document.createElement("input")
        let appendAccessLabel = document.createElement("label")
        let controlAccessCheckbox = document.createElement("input")
        let controlAccessLabel = document.createElement("label")

        for (const [person, personsAccess] of Object.entries(access)) {
            let accessDisplayObj = document.createElement("div")
            accessDisplayObj.id = "displayedAccess" + index
            accessDisplayObj.className = "panel"
            if(index % 2 == 1) accessDisplayObj.classList.add("alt-color")
            let individualsName = document.createElement("h3")
            individualsName.innerHTML = "Individual's name: <u>" + person + "</u>"
            individualsName.style.textAlign = "center"

            readAccessCheckbox = document.createElement("input")
            readAccessCheckbox.type = "checkbox"
            readAccessCheckbox.id = "readAccessFor" + index
            readAccessCheckbox.style.marginBottom = "5%"      //To make space for button in DOM
            if (personsAccess.read) readAccessCheckbox.checked = true

            readAccessLabel = document.createElement("label")
            readAccessLabel.innerHTML = "Read"
            readAccessLabel.id = "readAccessLabelFor" + index
            readAccessLabel.style.marginRight = "2%"

            writeAccessCheckbox = document.createElement("input")
            writeAccessCheckbox.type = "checkbox"
            writeAccessCheckbox.id = "writeAccessFor" + index
            if (personsAccess.write) writeAccessCheckbox.checked = true

            writeAccessLabel = document.createElement("label")
            writeAccessLabel.innerHTML = "Write"
            writeAccessLabel.style.marginRight = "2%"

            appendAccessCheckbox = document.createElement("input")
            appendAccessCheckbox.type = "checkbox"
            appendAccessCheckbox.id = "appendAccessFor" + index
            if (personsAccess.append) appendAccessCheckbox.checked = true

            appendAccessLabel = document.createElement("label")
            appendAccessLabel.innerHTML = "Append"
            appendAccessLabel.style.marginRight = "2%"

            controlAccessCheckbox = document.createElement("input")
            controlAccessCheckbox.type = "checkbox"
            controlAccessCheckbox.id = "controlAccessFor" + index
            if (personsAccess.controlRead && personsAccess.controlWrite) controlAccessCheckbox.checked = true

            controlAccessLabel = document.createElement("label")
            controlAccessLabel.innerHTML = "Control"
            controlAccessLabel.style.marginRight = "2%"

            let updateAccessButton = document.createElement("button")
            updateAccessButton.style.float = "right"
            updateAccessButton.style.display = "none"
            updateAccessButton.style.marginTop = "5%"
            updateAccessButton.id = "updateAccessFor" + index
            updateAccessButton.innerHTML = "Make changes to access"

            accessDisplayObj.append(individualsName, readAccessCheckbox, readAccessLabel, writeAccessCheckbox, writeAccessLabel, appendAccessCheckbox, appendAccessLabel, controlAccessCheckbox, controlAccessLabel, updateAccessButton)

            containerDivForAccess.appendChild(accessDisplayObj)
            index++
        }
        let medicalRecordsDiv = document.getElementById("accessingRecordsDiv")
        medicalRecordsDiv.appendChild(containerDivForAccess)

        let renderedObj = document.getElementById("containerForRecordAccess")

        for (var i = 0; i < renderedObj.childNodes.length; i++)  //Each individual with access
        {
            for (var j = 0; j < renderedObj.childNodes[i].childNodes.length; j++) {
                if (renderedObj.childNodes[i].childNodes[j].nodeName == "LABEL") renderedObj.childNodes[i].childNodes[j].htmlFor = renderedObj.childNodes[i].childNodes[j - 1].id //label is for previous element which is the checkbox
                else if (renderedObj.childNodes[i].childNodes[j].nodeName == "INPUT") {
                    let buttonId = "updateAccessFor" + i
                    renderedObj.childNodes[i].childNodes[j].onchange = function () { 

                        document.getElementById(buttonId).style.display = "block" 
                    }
                }
                else if (renderedObj.childNodes[i].childNodes[j].nodeName == "BUTTON") {
                    let button = renderedObj.childNodes[i].childNodes[j]
                    renderedObj.childNodes[i].childNodes[j].onclick = function () { updateDatasetAccess(button.id) }
                }
            }
        }

        let buttonToAddNew = document.createElement("button")
        buttonToAddNew.innerHTML = "+"
        buttonToAddNew.className = "addNewButton"
        buttonToAddNew.id = "addNewAccessButton"
        buttonToAddNew.onclick = function () {

            let buttonJustClicked = document.getElementById("addNewAccessButton").style.display = "none"

            let addingNewAccess = document.createElement("div")
            addingNewAccess.id = "grantingNewAccessDiv"
            addingNewAccess.classList.add("panel", "addingAccess")

            let webIDDiv = document.createElement("div")
            webIDDiv.className = "row"

            let newAgentWebIDLabel = document.createElement("h3")
            newAgentWebIDLabel.innerHTML = "New individual's WebID: "
            newAgentWebIDLabel.style.float = "left"

            let newAgentWebID = document.createElement("input")
            newAgentWebID.type = "url"
            newAgentWebID.placeholder = "Enter a new user's WebID"
            newAgentWebID.id = "webIDNewAccess"
            newAgentWebID.className = "column-3"
            newAgentWebID.style.marginTop = "2.5%"
            newAgentWebID.style.float = "left"
            newAgentWebID.style.width = "50%"

            webIDDiv.append(newAgentWebIDLabel, newAgentWebID)

            let clonedReadCheckbox = readAccessCheckbox.cloneNode(false)
            clonedReadCheckbox.id = "readAccessForNew"
            clonedReadCheckbox.checked = false
            let clonedReadLabel = readAccessLabel.cloneNode(true)
            clonedReadLabel.htmlFor = clonedReadCheckbox.id
            clonedReadLabel.id = "readAccessLabelForNew"

            let clonedWriteCheckbox = writeAccessCheckbox.cloneNode(false)
            clonedWriteCheckbox.id = "writeAccessForNew"
            clonedWriteCheckbox.checked = false
            let clonedWriteLabel = writeAccessLabel.cloneNode(true)
            clonedWriteLabel.htmlFor = clonedWriteCheckbox.id
            clonedWriteLabel.id = "writeAccessLabelForNew"


            let clonedAppendCheckbox = appendAccessCheckbox.cloneNode(false)
            clonedAppendCheckbox.id = "appendAccessForNew"
            clonedAppendCheckbox.checked = false
            let clonedAppendLabel = appendAccessLabel.cloneNode(true)
            clonedAppendLabel.htmlFor = clonedAppendCheckbox.id
            clonedAppendLabel.id = "appendAccessLabelForNew"


            let clonedControlCheckbox = controlAccessCheckbox.cloneNode(false)
            clonedControlCheckbox.id = "controlAccessForNew"
            clonedControlCheckbox.checked = false
            let clonedControlLabel = controlAccessLabel.cloneNode(true)
            clonedControlLabel.htmlFor = clonedControlCheckbox.id
            clonedControlLabel.id = "controlAccessLabelForNew"

            let submitButton = document.createElement("button")
            submitButton.innerHTML = "Submit changes"
            submitButton.id = "submitAccessButtonForNew"
            submitButton.style.float = "right"
            submitButton.style.marginTop = "5%"
            submitButton.style.marginRight = "2.5%"
            submitButton.classList.add("green-button")
            submitButton.onclick = function () { grantNewAccess() }

            let cancelButton = document.createElement("button")
            cancelButton.innerHTML = "Cancel"
            cancelButton.id = "cancelAccessButtonForNew"
            cancelButton.style.float = "right"
            cancelButton.style.marginTop = "5%"
            cancelButton.classList.add("red-button")
            cancelButton.onclick = function () {
                document.getElementById("grantingNewAccessDiv").remove()
                document.getElementById("addNewAccessButton").style.display = "block"
            }
            addingNewAccess.append(webIDDiv, clonedReadCheckbox, clonedReadLabel, clonedWriteCheckbox, clonedWriteLabel, clonedAppendCheckbox, clonedAppendLabel, clonedControlCheckbox, clonedControlLabel, cancelButton, submitButton)

            document.getElementById("containerForRecordAccess").appendChild(addingNewAccess)
        }

        document.getElementById("containerForRecordAccess").appendChild(buttonToAddNew)
    } else {
        alert("Nobody has been granted access to the selected dataset.")
    }
}

async function grantNewAccess() {
    console.log("testssdas")
    let newAgentWebID = document.getElementById("webIDNewAccess").value
    let selectedReadAccess = document.getElementById("readAccessForNew").checked
    let selectedWriteAccess = document.getElementById("writeAccessForNew").checked
    let selectedAppendAccess = document.getElementById("appendAccessForNew").checked
    let selectedControlAccess = document.getElementById("controlAccessForNew").checked

    if(initialStateOfDatasetAccess.hasOwnProperty(newAgentWebID)){
        alert("Individual has already been granted access.")
        document.getElementById("webIDNewAccess").value = ""
        return
    }
    let accessObject = {read: selectedReadAccess, write: selectedWriteAccess, append: selectedAppendAccess, controlRead: selectedControlAccess, controlWrite: selectedControlAccess}
    await grantAccessToDataset(session, newAgentWebID, currentlyAccessedDatasetUrl, accessObject, false)
    alert('Access granted to new individual successfully.')
    let selectedDepartment = document.getElementById("selectedDepartment").value
    let selectedRecordType = document.getElementById("selectedRecordType").value
    getAccessAndDisplay(selectedRecordType, selectedDepartment)

}

async function saveGeneralRecordDetailsToPod() {
    let date = document.getElementById("generalRecordDate").value
    let title = document.getElementById("generalRecordTitle").value
    let description = document.getElementById("newGeneralRecordDescription").value
    let department = document.getElementById("selectedDepartment").value

    let generalRecordDetails = {
        "https://schema.org/dateCreated": new Date().toUTCString(),
        "https://schema.org/startDate": date,
        "https://schema.org/creator": session.info.webId,
        "https://schema.org/title": title,
        "https://schema.org/description": description,
        "https://schema.org/department": department,
    }
    let urlOfDatasetToUploadFileTo = accessedPodOwnerBaseUrl + "/healthData2/" + department + "/Records"
    let uploadResult = await uploadMedicalRecord(session, urlOfDatasetToUploadFileTo, generalRecordDetails)
    if (uploadResult) {
        alert("General record uploaded successfully to pod")
    }
    else {
        alert("Error uploading general record to pod")
    }
    document.getElementById("newGeneralRecordForm").reset();
}

async function savePrescriptionDetailsToPod() {
    let startDate = document.getElementById("prescriptionStartDate").value
    let endDate = document.getElementById("prescriptionEndDate").value
    let title = document.getElementById("prescriptionTitle").value
    let description = document.getElementById("newPrescriptionDescription").value
    let department = document.getElementById("selectedDepartment").value

    let prescriptionDetails = {
        "https://schema.org/dateCreated": new Date().toUTCString(),
        "https://schema.org/startDate": startDate,
        "https://schema.org/endDate": endDate,
        "https://schema.org/creator": session.info.webId,
        "https://schema.org/title": title,
        "https://schema.org/description": description,
        "https://schema.org/department": department,
    }
    let urlOfDatasetToUploadFileTo = accessedPodOwnerBaseUrl + "/healthData2/" + department + "/Prescriptions"
    let uploadResult = await uploadMedicalRecord(session, urlOfDatasetToUploadFileTo, prescriptionDetails)
    if (uploadResult) {
        alert("Prescription uploaded successfully to pod")
    }
    else {
        alert("Error uploading prescription to pod")
    }
    let pharmacistToFillPrescription = document.getElementById("prescriptionPharmacist").value
    if (pharmacistToFillPrescription != "") {
        try {
            await grantAccessToDataset(session, pharmacistToFillPrescription, urlOfDatasetToUploadFileTo, { read: true, write: false, append: false, control: false }, false)
            console.log("permission granted to ", pharmacistToFillPrescription, " successfully.")
        }
        catch (err) {
            console.log(err)
        }
    }
    document.getElementById("newPrescriptionForm").reset();
}

async function saveDiagnosisDetailsToPod() {
    let date = document.getElementById("diagnosisDate").value
    let title = document.getElementById("diagnosisTitle").value
    let description = document.getElementById("newDiagnosisDescription").value
    let department = document.getElementById("selectedDepartment").value

    let diagnosisDetails = {
        "https://schema.org/dateCreated": new Date().toUTCString(),
        "https://schema.org/startDate": date,
        "https://schema.org/creator": session.info.webId,
        "https://schema.org/title": title,
        "https://schema.org/description": description,
        "https://schema.org/department": department,
    }
    let urlOfDatasetToUploadFileTo = accessedPodOwnerBaseUrl + "/healthData2/" + department + "/Diagnoses"
    let uploadResult = await uploadMedicalRecord(session, urlOfDatasetToUploadFileTo, diagnosisDetails)
    if (uploadResult) {
        alert("Diagnosis uploaded successfully to pod")
    }
    else {
        alert("Error uploading diagnosis to pod")
    }
    document.getElementById("newDiagnosisForm").reset();
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
    const date = new Date().toUTCString()
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

btnLogout.onclick = function () {
    logout();
}

returnFromAccessingRecords.onclick = function () {
    resetCurrentPodSession(false)
}
returnFromUploadingAppointment.onclick = function () {
    resetCurrentPodSession(false)
}
returnFromUploadingMedicalRecord.onclick = function () {
    resetCurrentPodSession(false);
}

departmentSelectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    let selectedDepartment = document.getElementById("selectedDepartment").value
    let selectedRecordType = document.getElementById("selectedRecordType").value
    getPatientFilesAndDisplay(selectedRecordType, selectedDepartment);
})

document.getElementById("viewAccessButton").addEventListener("click", (event) => {
    event.preventDefault();
    let selectedDepartment = document.getElementById("selectedDepartment").value
    let selectedRecordType = document.getElementById("selectedRecordType").value
    getAccessAndDisplay(selectedRecordType, selectedDepartment)
})


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
    resetCurrentPodSession(true);
})


newGeneralRecordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveGeneralRecordDetailsToPod();
})

newPrescriptionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    savePrescriptionDetailsToPod();
})

newDiagnosisForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveDiagnosisDetailsToPod();
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
})

registerNewAppointmentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("accessMedicalRecordsButton").style.display = "none";
    document.getElementById("uploadMedicalRecordsButton").style.display = "none";
    document.getElementById("modifyAccessToDataButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").classList.add("clicked-button")
    document.getElementById("uploadNewAppointmentDetails").style.display = "block"
})


accessMedicalRecordsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("uploadMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").style.display = "none";
    document.getElementById("modifyAccessToDataButton").style.display = "none";
    document.getElementById("accessMedicalRecordsButton").classList.add("clicked-button")
    getPatientDepartmentsAndDisplay("accessingRecords", "");
})

modifyAccessToDataButton.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("accessMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").style.display = "none";
    document.getElementById("uploadMedicalRecordsButton").style.display = "none";
    document.getElementById("modifyAccessToDataButton").classList.add("clicked-button")
    document.getElementById("manageAccessToDataDiv").style.display = "block"
})

uploadMedicalRecordsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("accessMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").style.display = "none";
    document.getElementById("modifyAccessToDataButton").style.display = "none";
    document.getElementById("uploadMedicalRecordsButton").classList.add("clicked-button")
    document.getElementById("uploadNewMedicalRecordDiv").style.display = "block"
})

continueWithSelectedRecordTypeButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (document.getElementById("diagnosisCheckbox").checked) {
        document.getElementById("medicalRecordTypeSelection").style.display = "none"
        getPatientDepartmentsAndDisplay("uploadingNewRecord", "newDiagnosisDepartmentPlaceholderDiv")
        document.getElementById("createNewDiagnosisDiv").style.display = "block"
        return;
    }
    if (document.getElementById("prescriptionCheckbox").checked) {
        document.getElementById("medicalRecordTypeSelection").style.display = "none"
        getPatientDepartmentsAndDisplay("uploadingNewRecord", "newPrescriptionDepartmentPlaceholderDiv")
        document.getElementById("createNewPrescriptionDiv").style.display = "block";
        return;
    }
    if (document.getElementById("recordCheckbox").checked) {
        document.getElementById("medicalRecordTypeSelection").style.display = "none"
        getPatientDepartmentsAndDisplay("uploadingNewRecord", "newRecordDepartmentPlaceholderDiv")
        document.getElementById("createNewGeneralRecordDiv").style.display = "block"
        return;
    }
    alert('No record type to upload has been selected. Please select one to continue.')
})

