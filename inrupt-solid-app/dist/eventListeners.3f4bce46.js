// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"eventListeners.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eventListeners = eventListeners;

function eventListeners() {
  // document.
  // let buttonLogin = do
  buttonLogin.onclick = function () {
    login();
  };

  btnLogout.onclick = function () {
    logout();
  };

  returnFromAccessingRecords.onclick = function () {
    resetCurrentPodSession(false);
  };

  returnFromUploadingAppointment.onclick = function () {
    resetCurrentPodSession(false);
  };

  returnFromUploadingMedicalRecord.onclick = function () {
    resetCurrentPodSession(false);
  };

  returnFromInsurance.onclick = function () {
    resetCurrentPodSession(false);
  };

  cancelRegisterNewInsitutionButton.onclick = function () {
    resetCurrentPodSession(true);
  };

  departmentSelectionForm.addEventListener("submit", event => {
    event.preventDefault();
    let selectedDepartment = document.getElementById("selectedDepartment").value;
    let selectedRecordType = document.getElementById("selectedRecordType").value;
    console.log("getting called");
    getPatientFilesAndDisplay(selectedRecordType, selectedDepartment, false);
  });
  document.getElementById("viewAccessButton").addEventListener("click", event => {
    event.preventDefault();
    let selectedDepartment = document.getElementById("selectedDepartment").value;
    let selectedRecordType = document.getElementById("selectedRecordType").value;
    getAccessAndDisplay(selectedRecordType, selectedDepartment);
  });
  document.getElementById("submitInsuranceRequestButton").addEventListener("click", event => {
    event.preventDefault();
    let insurerWebID = document.getElementById("insurerWebID").value;
    shareAccessForInsurance(insurerWebID);
  });
  myPodButton.addEventListener('click', event => {
    event.preventDefault();
    checkMedicalInstitutionStatus("signedInUser");
  });
  otherUserPodButton.addEventListener('click', event => {
    event.preventDefault();
    checkMedicalInstitutionStatus("specifiedUser");
  }); // institutionInformationForm.addEventListener("submit", (event) => {
  //     event.preventDefault();
  //     resetCurrentPodSession(true);
  // })

  cancelSessionWithPodButton.addEventListener("click", event => {
    event.preventDefault();
    resetCurrentPodSession(true);
  });
  newGeneralRecordForm.addEventListener("submit", event => {
    event.preventDefault();
    saveGeneralRecordDetailsToPod();
  });
  newPrescriptionForm.addEventListener("submit", event => {
    event.preventDefault();
    savePrescriptionDetailsToPod();
  });
  newDiagnosisForm.addEventListener("submit", event => {
    event.preventDefault();
    saveDiagnosisDetailsToPod();
  });
  selectedDepartmentForm.addEventListener("submit", event => {
    event.preventDefault();
    onDropdownClick();
  });
  saveNewAppointmentDetailsForm.addEventListener("submit", event => {
    event.preventDefault();
    saveNewAppointment();
  });
  noInstitutionInformationForm.addEventListener("submit", event => {
    event.preventDefault(); //registerNewMedicalInstitution();

    document.getElementById("registerNewMedicalInstitution").style.display = "block";
  });
  newMedicalInstitutionForm.addEventListener("submit", event => {
    event.preventDefault();
    registerNewMedicalInstitution();
  });
  registerNewAppointmentButton.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("accessMedicalRecordsButton").style.display = "none";
    document.getElementById("uploadMedicalRecordsButton").style.display = "none";
    document.getElementById("initiateInsuranceRequestButton").style.display = "none";
    document.getElementById("registerNewMedicalInstitutionButton").style.display = "none"; // document.getElementById("viewInsuranceDiagnosesButton").style.display = "none";    

    document.getElementById("registerNewAppointmentButton").classList.add("clicked-button");
    document.getElementById("uploadNewAppointmentDetails").style.display = "block";
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }, 500); //Wait half a second then scroll to bottom of page
  });
  accessMedicalRecordsButton.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("uploadMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").style.display = "none";
    document.getElementById("initiateInsuranceRequestButton").style.display = "none";
    document.getElementById("registerNewMedicalInstitutionButton").style.display = "none"; // document.getElementById("viewInsuranceDiagnosesButton").style.display = "none";    

    document.getElementById("accessMedicalRecordsButton").classList.add("clicked-button");
    getPatientDepartmentsAndDisplay("accessingRecords", "");
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }, 500); //Wait half a second then scroll to bottom of page
  });
  initiateInsuranceRequestButton.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("accessMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").style.display = "none";
    document.getElementById("uploadMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewMedicalInstitutionButton").style.display = "none"; // document.getElementById("viewInsuranceDiagnosesButton").style.display = "none";    

    document.getElementById("initiateInsuranceRequestButton").classList.add("clicked-button");
    document.getElementById("insuranceDiv").style.display = "block";
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }, 500); //Wait half a second then scroll to bottom of page
  });
  uploadMedicalRecordsButton.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("accessMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").style.display = "none";
    document.getElementById("initiateInsuranceRequestButton").style.display = "none";
    document.getElementById("registerNewMedicalInstitutionButton").style.display = "none";
    document.getElementById("uploadMedicalRecordsButton").classList.add("clicked-button");
    document.getElementById("uploadNewMedicalRecordDiv").style.display = "block";
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }, 500); //Wait half a second then scroll to bottom of page
  });
  registerNewMedicalInstitutionButton.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("accessMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewAppointmentButton").style.display = "none";
    document.getElementById("initiateInsuranceRequestButton").style.display = "none";
    document.getElementById("uploadMedicalRecordsButton").style.display = "none";
    document.getElementById("registerNewMedicalInstitutionButton").classList.add("clicked-button");
    document.getElementById("registerNewMedicalInstitution").style.display = "block";
    console.log("Getting called after clicking button");
    checkMedicalInstitutionStatus("signedInUserNew");
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }, 500); //Wait half a second then scroll to bottom of page
  });
  setNameToEditable.addEventListener("click", event => {
    event.preventDefault();
    let existingValue = document.getElementById("nameOfInstitution").innerHTML;
    existingValue = existingValue.substring(existingValue.lastIndexOf(":") + 2, existingValue.length);
    document.getElementById("nameOfInstitution").style.display = "none";
    let editableField = document.createElement("input");
    editableField.value = existingValue;
    editableField.id = "editableInstitutionName";
    editableField.style.width = "50%";
    editableField.addEventListener("keydown", event => {
      if (event.key == "Enter") {
        updateMedicalInstitutionField("http://schema.org/name", document.getElementById("editableInstitutionName").value).then(async () => {
          alert("Field updated successfully");
          document.getElementById("setNameToReadOnly").style.display = "none";
          document.getElementById("nameOfInstitution").style.display = "block";
          document.getElementById("setNameToEditable").style.display = "block";
          document.getElementById("editableInstitutionName").remove();
          await selectTypeOfHealthData(accessedHealthDataType);
        });
      }
    });
    document.getElementById("setNameToEditable").parentNode.appendChild(editableField);
    document.getElementById("setNameToEditable").style.display = "none";
    document.getElementById("setNameToReadOnly").style.display = "block";
  });
  setNameToReadOnly.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("editableInstitutionName").remove();
    document.getElementById("setNameToReadOnly").style.display = "none";
    document.getElementById("nameOfInstitution").style.display = "block";
    document.getElementById("setNameToEditable").style.display = "block";
  });
  setAddressToEditable.addEventListener("click", event => {
    event.preventDefault();
    let existingValue = document.getElementById("addressOfInstitution").innerHTML;
    existingValue = existingValue.substring(existingValue.lastIndexOf(":") + 2, existingValue.length);
    document.getElementById("addressOfInstitution").style.display = "none";
    let editableField = document.createElement("input");
    editableField.value = existingValue;
    editableField.id = "editableInstitutionAddress";
    editableField.style.width = "50%";
    editableField.addEventListener("keydown", event => {
      if (event.key == "Enter") {
        updateMedicalInstitutionField("http://schema.org/address", document.getElementById("editableInstitutionAddress").value).then(async () => {
          alert("Field updated successfully");
          document.getElementById("setAddressToReadOnly").style.display = "none";
          document.getElementById("addressOfInstitution").style.display = "block";
          document.getElementById("setAddressToEditable").style.display = "block";
          document.getElementById("editableInstitutionAddress").remove();
          await selectTypeOfHealthData(accessedHealthDataType);
        });
      }
    });
    document.getElementById("setAddressToEditable").parentNode.appendChild(editableField);
    document.getElementById("setAddressToEditable").style.display = "none";
    document.getElementById("setAddressToReadOnly").style.display = "block";
  });
  setAddressToReadOnly.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("editableInstitutionAddress").remove();
    document.getElementById("setAddressToReadOnly").style.display = "none";
    document.getElementById("addressOfInstitution").style.display = "block";
    document.getElementById("setAddressToEditable").style.display = "block";
  });
  setAdministratorToEditable.addEventListener("click", event => {
    event.preventDefault();
    let existingValue = document.getElementById("administratorOfInstitution").innerHTML;
    existingValue = existingValue.substring(existingValue.indexOf(":") + 2, existingValue.length);
    document.getElementById("administratorOfInstitution").style.display = "none";
    let editableField = document.createElement("input");
    editableField.value = existingValue;
    editableField.id = "editableInstitutionAdministrator";
    editableField.style.width = "50%";
    editableField.addEventListener("keydown", event => {
      if (event.key == "Enter") {
        try {
          //Validate the value they entered is a URL
          let UrlVersionOfString = new URL(document.getElementById("editableInstitutionAdministrator").value);
        } catch (err) {
          alert('Value entered is not a valid URL');
          return;
        }

        updateMedicalInstitutionField("https://schema.org/member", document.getElementById("editableInstitutionAdministrator").value).then(async () => {
          let noAccess = {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false
          };
          let administratorAccess = {
            read: true,
            append: true,
            write: true,
            control: true
          };
          await grantAccessToDataset(session, existingValue, accessedHealthDataContainerUrl, noAccess, false); //Revoke access

          await grantAccessToDataset(session, existingValue, accessedHealthDataContainerUrl + "Info", noAccess, false); // from previous

          await grantAccessToDataset(session, document.getElementById("editableInstitutionAdministrator").value, accessedHealthDataContainerUrl, administratorAccess, false); //Grant access 

          await grantAccessToDataset(session, document.getElementById("editableInstitutionAdministrator").value, accessedHealthDataContainerUrl + "Info", administratorAccess, false); // to new

          alert("Field updated successfully");
          document.getElementById("setAdministratorToReadOnly").style.display = "none";
          document.getElementById("administratorOfInstitution").style.display = "block";
          document.getElementById("setAdministratorToEditable").style.display = "block";
          document.getElementById("administratorTooltip").style.display = "block";
          document.getElementById("warningMessageForUpdatingAdmin").remove();
          document.getElementById("editableInstitutionAdministrator").remove();
          await selectTypeOfHealthData(accessedHealthDataType);
        });
      }
    });
    let warningMessage = document.createElement("p");
    warningMessage.id = "warningMessageForUpdatingAdmin";
    warningMessage.innerText = "WARNING: Changing the WebID of the administrator for this institution will remove all access that was assigned to the previous administrator";
    warningMessage.style.color = "red";
    document.getElementById("setAdministratorToEditable").parentNode.appendChild(warningMessage);
    document.getElementById("setAdministratorToEditable").parentNode.appendChild(editableField);
    document.getElementById("setAdministratorToEditable").style.display = "none";
    document.getElementById("administratorTooltip").style.display = "none";
    document.getElementById("setAdministratorToReadOnly").style.display = "block";
  });
  setAdministratorToReadOnly.addEventListener("click", event => {
    event.preventDefault();
    document.getElementById("warningMessageForUpdatingAdmin").remove();
    document.getElementById("editableInstitutionAdministrator").remove();
    document.getElementById("setAdministratorToReadOnly").style.display = "none";
    document.getElementById("administratorTooltip").style.display = "block";
    document.getElementById("administratorOfInstitution").style.display = "block";
    document.getElementById("setAdministratorToEditable").style.display = "block";
  });
  continueWithSelectedRecordTypeButton.addEventListener("click", event => {
    event.preventDefault();

    if (document.getElementById("diagnosisCheckbox").checked) {
      document.getElementById("medicalRecordTypeSelection").style.display = "none";
      getPatientDepartmentsAndDisplay("uploadingNewRecord", "newDiagnosisDepartmentPlaceholderDiv");
      document.getElementById("createNewDiagnosisDiv").style.display = "block";
      document.getElementById("createNewDiagnosisDiv").scrollIntoView();
      return;
    }

    if (document.getElementById("prescriptionCheckbox").checked) {
      document.getElementById("medicalRecordTypeSelection").style.display = "none";
      getPatientDepartmentsAndDisplay("uploadingNewRecord", "newPrescriptionDepartmentPlaceholderDiv");
      document.getElementById("createNewPrescriptionDiv").style.display = "block";
      return;
    }

    if (document.getElementById("recordCheckbox").checked) {
      document.getElementById("medicalRecordTypeSelection").style.display = "none";
      getPatientDepartmentsAndDisplay("uploadingNewRecord", "newRecordDepartmentPlaceholderDiv");
      document.getElementById("createNewGeneralRecordDiv").style.display = "block";
      document.getElementById("createNewGeneralRecordDiv").scrollIntoView();
      return;
    }

    alert('No record type to upload has been selected. Please select one to continue.');
  });
}
},{}],"node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "55637" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["node_modules/parcel-bundler/src/builtins/hmr-runtime.js","eventListeners.js"], null)
//# sourceMappingURL=/eventListeners.3f4bce46.js.map