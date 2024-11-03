// ==UserScript==
// @name         [BETA]FirstResponderReloaded
// @namespace    FirstRespond
// @version      3.1.0
// @description  Wählt das nächstgelegene FirstResponder-Fahrzeug aus (Original von JuMaHo und DrTraxx)
// @author       SaibotH
// @license      MIT
// @homepage     https://github.com/SaibotH-LSS/LSSFirstResponderReloaded
// @homepageURL  https://github.com/SaibotH-LSS/LSSFirstResponderReloaded
// @supportURL   https://github.com/SaibotH-LSS/LSSFirstResponderReloaded/issues
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        *.missionchief.com
// @match        *.missionchief.com/missions/*
// @match        *.missionchief.com/aaos*
// @match        *.missionchief.com/buildings/*/edit
// @match        *.missionchief.co.uk
// @match        *.missionchief.co.uk/missions/*
// @match        *.missionchief.co.uk/aaos*
// @match        *.missionchief.co.uk/buildings/*/edit
// @match        *.leitstellenspiel.de
// @match        *.leitstellenspiel.de/missions/*
// @match        *.leitstellenspiel.de/aaos*
// @match        *.leitstellenspiel.de/buildings/*/edit
// @run-at       document-idle
// @grant        GM_info
//
//
// ==/UserScript==

// Definition von globalen Variablen um Fehlermeldungen zu unterdrücken
/* global $,I18n */

(async function() {
    'use strict';

    const testTime = new Date().getTime();
    // ######################
    // Funktionsdeklarationen
    // ######################

    function versioning(version) {
        // Versionssprung von TBD auf 2.0.0 (FRR war noch nicht installiert)
        if (frrSettings.scriptVersion === "TBD") {
            // Alte Daten in neuen Speicher laden
            // firstResponder aus den alten Daten holen und anschließend löschen
            if (localStorage.getItem("firstResponder")) {
                const oldData = JSON.parse(localStorage.getItem('firstResponder'));
                if (frrSettings[sLangRegion].vehicleTypes.settings.length === 0 && oldData.vehicleTypes[sLangRegion]) {
                    frrSettings[sLangRegion].vehicleTypes.settings = oldData.vehicleTypes[sLangRegion];
                }
                if (frrSettings[sLangRegion].aaoId === "00000000" && oldData.aaoId[sLangRegion]) {
                    frrSettings[sLangRegion].aaoId = oldData.aaoId[sLangRegion];
                    frrSettings[sLangRegion].general.fWoAao = false; //AAO ist vorhanden daher Nutzung mit AAO
                }
                // alte Daten nach der Übernahme löschen.
                localStorage.removeItem('firstResponder');
            }
            // fr_dispatchSetup aus den alten Daten holen und anschließend löschen
            if (localStorage.getItem("fr_dispatchSetup")) {
                const oldData = JSON.parse(localStorage.getItem('fr_dispatchSetup'));
                // Dispatch IDs holen
                if (frrSettings[sLangRegion].allowedBuildingIds.length === 0) {
                    frrSettings[sLangRegion].allowedBuildingIds = oldData.dispatchId;
                }
                // Additional buildings holen
                if (frrSettings[sLangRegion].addBuildingIds.length === 0) {
                    frrSettings[sLangRegion].addBuildingIds = oldData.additionalBuildings;
                }
                // UseIt holen
                if (frrSettings[sLangRegion].general.fUseDispatch !== oldData.useIt) {
                    frrSettings[sLangRegion].general.fUseDispatch = oldData.useIt;
                }
                // alte Daten nach der Übernahme löschen.
                localStorage.removeItem('fr_dispatchSetup');
            }
            if (localStorage.getItem("aVehicleTypesNew")) {
                localStorage.removeItem('aVehicleTypesNew');
            }
            frrSettings.scriptVersion = version;
        }
        // Versionssprung von 2.0.0 auf 2.1.0
        if (["2.0.0", "2.0.1", "2.0.2"].includes(frrSettings.scriptVersion)) {
            frrSettings[sLangRegion].customVehicleTypes = {captionList: [],
                                                           settings: [],
                                                           lastUpdate: " "};
            frrSettings.scriptVersion = "2.1.0";
        }
        // Versionssprung von 2.1.0 auf 2.2.0
        if (["2.1.0", "2.1.1", "2.1.2"].includes(frrSettings.scriptVersion)) {
            frrSettings.scriptVersion = "2.2.0";
            frrSettings[sLangRegion].general.counter = 0;
            frrSettings[sLangRegion].general.fAllowReload = false;
            frrSettings[sLangRegion].general.loggingLevel = "error";
            frrSettings[sLangRegion].general.intReloadCount = 0;
            delete frrSettings[sLangRegion].general.fLoggingOn;
        }
        // Versionssprung auf 3.0.0
        if (["2.2.0"].includes(frrSettings.scriptVersion)) {
            frrSettings[sLangRegion].general.fAaoIdModified = false;
            frrSettings.scriptVersion = "3.0.0";
        }

        if (['3.0.0', '3.0.1'].includes(frrSettings.scriptVersion)) {
            frrSettings.scriptVersion = version;
        }

        // Speichern des Versioning
        saveStorage("Versioning");
    }

    function getFirstResponder() { // ##################################################################################################################Funktion ggf. anders aufrufen (Muss bei alert nicht nochmal ausgeführt werden)#############
        var retVal = {};
        var fFirstResponderFound = false;

        // Alle Checkboxen durchgehen
        const checkboxes = document.querySelectorAll(".vehicle_checkbox");
        for (var i = 0; i < checkboxes.length; i++) {
            var checkbox = checkboxes[i];
            retVal.vType = +checkbox.getAttribute("vehicle_type_id"); // Fahrzeugtyp ID
            retVal.vId = checkbox.getAttribute("value"); // Fahrzeug ID
            retVal.lstId = +checkbox.getAttribute("building_id").split("_")[1]; // Leitstellen ID
            retVal.buId = +checkbox.getAttribute("building_id").split("_")[0]; // Gebäude ID
            retVal.vehicleType = document.querySelector("#vehicle_element_content_" + retVal.vId).getAttribute("vehicle_type");
            retVal.timeAttr = undefined;
            const timeElement = document.getElementById("vehicle_sort_" + retVal.vId);
            const timeValue = timeElement.getAttribute("timevalue");
            const sortValue = timeElement.getAttribute("sortvalue");
            const calcButton = timeElement.querySelector('a.calculateTime');

            if (((frrSettings[sLangRegion].vehicleTypes.settings.includes(retVal.vType) && !frrSettings[sLangRegion].customVehicleTypes.captionList.includes(retVal.vehicleType)) || // Fahrzeugtyp wurde ausgewählt und hat keine eigene Kategorie ODER
                 frrSettings[sLangRegion].customVehicleTypes.settings.includes(retVal.vehicleType)) && // Eigener Fahrzeugtyp wurde ausgewählt UND
                !checkbox.checked && // Checkbox ist NICHT angewählt UND
                !checkbox.disabled && // Checkbox ist NICHT deaktiviert UND
                (frrSettings[sLangRegion].general.fUseDispatch === false || frrSettings[sLangRegion].allowedBuildingIds.includes(retVal.lstId) || frrSettings[sLangRegion].addBuildingIds.includes(retVal.buId))) { // Gebäudesettings werden erfüllt.

                if (calcButton) {
                    calcButton.click();
                } else if (timeValue) {
                    retVal.timeAttr = timeValue;
                } else if (sortValue && sortValue < 31536000) {
                    retVal.timeAttr = sortValue;
                }

                fFirstResponderFound = true;
                break; // Beendet die Schleife
            }
        }

        // Fahrzeug zurückgeben wenn eines gefunden wurde
        if (fFirstResponderFound) {
            return retVal;
        } else {
            console.error(errorText + "get FirstResponder hat kein passendes Fahrzeug gefunden");
            return undefined;
        }
    }

    // Funktion für die Auswahl des First Responders, der Alarmierung und des Teilens des Einsatzes
    function frrAlert() {
        fStopBadgeSetting = true;
        if (fAlrdyThere) {
            if (fDebuggingOn) console.log(errorText + "Es ist schon ein Fahrzeug vom User da. fAlrdyThere|NextMisBut: ", fAlrdyThere, document.getElementById("mission_next_mission_btn"));
            document.getElementById("mission_next_mission_btn").click();
        } else if (!fFrrDone) {
            //const firstResponder = getFirstResponder()
            if (objFirstResponder) {
                let shareButton = $( ".alert_next_alliance" )[0];
                $("#vehicle_checkbox_" + objFirstResponder.vId).click();
                fFrrDone = true;
                frrSettings[sLangRegion].general.counter++;
                saveStorage("frrAlert");
                if (shareButton && frrSettings[sLangRegion].general.fAutoShare) {
                    setTimeout(function() {
                        $( ".alert_next_alliance" )[0].click();
                    },frrSettings[sLangRegion].general.alarmDelay * 1000);
                } else if (frrSettings[sLangRegion].general.fAutoAlert) {
                    setTimeout(function() {
                        $( ".alert_next" )[0].click();
                    },frrSettings[sLangRegion].general.alarmDelay * 1000);
                }
            } else {
                console.error(errorText + "frrAlert(): Es konnte kein First Responder alarmiert werden!")
                document.getElementById("mission_next_mission_btn").click();
            }
        }
    }

    // Findet die Zeit bis FR da ist
    function getFrTime() { // #################################################################################################################################Ist eigentlich nur eine Formatierung der Zeit für den Badge. Aufruf ändern?
        //const firstResponder = getFirstResponder();
        // Prüfen ob es einen First Responder gibt und das Zeitattribut vorhanden ist
        if (!objFirstResponder) {
            return t('noFr');
        }
        if (!objFirstResponder.timeAttr) {
            return "N/A";
        }

        // Zeit in Sekunden wird in Stunden, Minuten und Sekunden umgerechnet
        var seconds = parseInt(objFirstResponder.timeAttr);
        var hours = Math.floor(seconds / 3600); // Berechnung der Stunden
        var minutes = Math.floor((seconds % 3600) / 60); // Berechnung der Minuten
        var remainingSeconds = seconds % 60; // Berechnung der verbleibenden Sekunden

        // Formatierung auf zweistellige Werte
        var formattedMinutes = (minutes < 10) ? "0" + minutes : minutes;
        var formattedSeconds = (remainingSeconds < 10) ? "0" + remainingSeconds : remainingSeconds;

        // Zusammenstellen des Zeitformats
        var frrTimeRetVal;
        if (hours > 0) {
            var formattedHours = (hours < 10) ? "0" + hours : hours;
            frrTimeRetVal = formattedHours + ":" + formattedMinutes + ":" + formattedSeconds; // HH:MM:SS
        } else {
            frrTimeRetVal = formattedMinutes + ":" + formattedSeconds; // MM:SS
        }

        return frrTimeRetVal;
    }

    // Funktion zum Hinzufügen von Prefixen zum Fahrzeugnamen. Priorität dient dazu gewisse Fahrzeuge z.B. dem Rettungsdienst zuzuweisen anstatt der Feuerwehr da das entsprechende Fahrzeug in beiden Wachen stationiert sein kann.
    function updateCaptionPrefix(vehicle) {
        const possibleBuildings = vehicle.possibleBuildings;
        let sPrefix = '';
        // Sortiere objBuildingMap nach Priorität
        const sortedBuildingMap = objBuildingMap[sRegion].sort((a, b) => a.priority - b.priority);

        for (const entry of sortedBuildingMap) {
            if (possibleBuildings.some(building => entry.buildings.includes(building))) {
                sPrefix = sPrefix ? sPrefix + '/' + entry.prefix : entry.prefix;
            };
        };
        // Update Vehicle Caption (Wenn kein Prefix gefunden wurde wird entsprechender Text eingefügt)
        vehicle.caption = sPrefix ? sPrefix + ' - ' + vehicle.caption : t('noPrefix') + vehicle.caption;
    };

    // Holt die Fahrzeugdaten aus der LSSM API ab, verarbeitet diese (Präfix und Fahrzeugnamenliste) und legt diese im local Storage ab.
    async function fetchVehicles() {
        // Daten werden abgerufen und bearbeitet wenn noch keine vorhanden sind oder die Daten zu alt sind
        if (Object.keys(frrSettings[sLangRegion].vehicleTypes.data).length === 0 || frrSettings[sLangRegion].vehicleTypes.lastUpdate < (now - 5 * 60 * 1000)) {

            // Daten werden abgerufen und über try ... catch Fehler abgefangen.
            try {
                console.log ("https://api.lss-manager.de/" + sLangRegion + "/vehicles")
                frrSettings[sLangRegion].vehicleTypes.data = await $.getJSON("https://api.lss-manager.de/" + sLangRegion + "/vehicles"); // Ruft die Daten ab. Wenn ein Error kommt wird der folgende Code nicht mehr bearbeitet.
                frrSettings[sLangRegion].vehicleTypes.lastUpdate = now; // Setzt den Update Zeitstempel wenn die Daten erfolgreich abgerufen wurden.

                // Prefix hinzufügen
                if (objBuildingMap[sRegion]) {
                    Object.keys(frrSettings[sLangRegion].vehicleTypes.data).forEach(function(key) {
                        const vehicle = frrSettings[sLangRegion].vehicleTypes.data[key];
                        updateCaptionPrefix(vehicle);
                    });
                };

                // Speichert die Fahrzeugnamen in ein Array und Sortiert es
                frrSettings[sLangRegion].vehicleTypes.captionList = [];
                for (const [vehicleId, vehicleData] of Object.entries(frrSettings[sLangRegion].vehicleTypes.data)) {
                    frrSettings[sLangRegion].vehicleTypes.captionList.push(vehicleData.caption);
                }
                frrSettings[sLangRegion].vehicleTypes.captionList.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);
                saveStorage("Fahrzeugdaten");
            } catch(error) {
                if (error.readyState === 0 && error.statusText === "error") {
                    console.error(errorText + "Fehler beim Abrufen der LSSM API: Netzwerkfehler oder CORS-Problem");
                } else {
                    console.error(errorText, "Sonstiger Fehler beim Abrufen der LSSM API: ", error);
                }
            }
            await fetchCustomVehicles();
        }
    }

    // Holt die Custom Vehicles aus der LSS API und schreibt diese in den local Storage
    async function fetchCustomVehicles() {
        try {
            const userVehicles = await $.getJSON('/api/vehicles');
            const vehicleTypeSet = new Set();
            userVehicles.forEach(vehicle => {
                if (vehicle.vehicle_type_caption) {
                    vehicleTypeSet.add(vehicle.vehicle_type_caption);
                }
            });
            frrSettings[sLangRegion].customVehicleTypes.captionList = Array.from(vehicleTypeSet);
            frrSettings[sLangRegion].customVehicleTypes.captionList.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);
            frrSettings[sLangRegion].customVehicleTypes.lastUpdate = now;
            saveStorage("Eigene Fahrzeugdaten");
        } catch(error) {
            if (error.readyState === 0 && error.statusText === "error") {
                console.error(errorText + "Fehler beim Abrufen der LSS API: Netzwerkfehler oder CORS-Problem");
            } else {
                console.error(errorText, "Sonstiger Fehler beim Abrufen der LSS API: ", error);
            }
        }
    }

    // Je nach Trigger werden die Namen oder die IDs eines Arrays oder eines Objekts (dataSet) die zu einem anderen Array passen (mapArray) als neues Array (retVal) ausgegeben
    function mapping(dataSet, mapArray, trigger) {
        if (trigger !== "caption" && trigger !== "id") {
            console.error(errorText + "Mapping: Ungültiger Trigger!");
            return [];
        }

        const retVal = [];

        // Überprüfen, ob dataSet ein Array oder ein Objekt ist
        if (Array.isArray(dataSet)) {
            dataSet.forEach(obj => {
                if (trigger === "caption" && mapArray.includes(obj.id)) {
                    retVal.push(obj.caption);
                } else if (trigger === "id" && mapArray.includes(obj.caption)) {
                    retVal.push(obj.id);
                }
            });
        } else if (typeof dataSet === 'object') {
            for (const id in dataSet) {
                const obj = dataSet[id];
                if (trigger === "caption" && mapArray.includes(parseInt(id))) {
                    retVal.push(obj.caption);
                } else if (trigger === "id" && mapArray.includes(obj.caption)) {
                    retVal.push(parseInt(id));
                }
            }
        } else {
            console.error(errorText + "Mapping: Ungültiger DataSet-Typ!");
        }

        return retVal;
    }

    // Funktion zum Erstellen des frrSettings Objekt
    function createSettingsObject() {
        return {
            scriptVersion: "TBD",
            [sLangRegion]:{
                aaoId: "00000000", // Hier wird die eingestellte AAO Id gespeichert
                general: { // Hier werden allgemeine Parameter gespeichert
                    fAutoAlert: false, // Automatisch alarmieren wenn FRR ausgeführt wird
                    fAutoShare: false, // Automatisch alarmieren und teilen wenn FRR ausgeführt wird
                    jsKeyCode: 86, // Javascript Code für den HotKey. Wird mit v-Taste vorbelegt. 65=a 86=v - nicht unbeding ASCII! Siehe hier: https://www.toptal.com/developers/keycode
                    fUseDispatch: false, // nur Fahrzeuge bestimmter Leitstellen nutzen
                    alarmDelay: 1, // Standardmäßiges Delay beim automatischen alarmieren
                    fWoAao: true, // Alarmierung mit/ohne AAO
                    counter: 0, // Zähler wie oft FRR genutzt wurde
                    fAllowReload: false, // Erlaubt einen Reload wenn sich etwas am Einsatz geändert hat.
                    loggingLevel: "error",
                    intReloadCount: 0,
                    fAaoIdModified: false
                },
                vehicleTypes: {
                    lastUpdate: 0, // Hier kommt das Datum zum letzten Update rein.
                    data: { }, // Hier die Daten aus der API
                    captionList: [], // Hier die sortierte Liste mit den Namen der Fahrzeuge
                    settings: []// Hier die erlaubten Fahrzeuge
                },
                customVehicleTypes: {
                    lastUpdate: " ", // Hier kommt das Datum zum letzten Update rein.
                    captionList: [], // Hier kommen die Namen aller eigenen Fahrzeugtypen als Array rein
                    settings: [] // hier kommen die Namen der ausgewählten eigenen Fahrzeugtypen als Array rein
                },
                allowedBuildingIds: [], // Hier können die Einstellungen für Leitstellen/Zusätzlichen Gebäuden hinzugefügt werden
                addBuildingIds: [] // Hier können die Einstellungen für Wachen hinzugefügt werden
            }
        };
    }

    // Funktion zum öffnen des Modals (Settings)
    function openFrrModal() {
        getStorage();
        $("#frModalBody").html(
            `<label for="frrSelectGeneralSettings" style="margin-bottom: 0.2em;">${ t('generalSettings') }</label>
                                <div style="display: flex; flex-direction: column;margin-top: 0;">
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrWoAao" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[sLangRegion].general.fWoAao ? "checked" : ""}>
                                        <label for="frrWoAao" style="margin-top: 0.; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('useAao') }</label>
                                    </div>
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrAutoAlert" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[sLangRegion].general.fAutoAlert ? "checked" : ""}>
                                        <label for="frrAutoAlert" style="margin-top: 0.; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('alertAndNext') }</label>
                                    </div>
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrAutoShare" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[sLangRegion].general.fAutoShare ? "checked" : "" }>
                                        <label for="frrAutoShare" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('alertShareNext') }</label>
                                    </div>
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrAllowReload" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[sLangRegion].general.fAllowReload ? "checked" : "" }>
                                        <label for="frrAllowReload" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('reloadOnChange') }</label>
                                    </div>
                                    <div style="margin-bottom: 0.3em;">
                                        <select id="frrDebugging" name="Debugging">
                                            <option value="error">Error</option>
                                            <option value="debug">Debug</option>
                                            <option value="complete">Complete</option>
                                        </select>
                                        <label for="frrDebugging" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('debugging') }</label>
                                    </div>
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="number" id="frrAlarmDelay" min="0" max="10" style="width: 50px;" value="${frrSettings[sLangRegion].general.alarmDelay.toString() || ''}">
                                        <label for="frrAlarmDelay" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('delay') }</label>
                                    </div>
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="text" id="frrKeyCodeInput" placeholder="Enter KeyCode" maxlength="1" style="width: 50px;" value="${String.fromCharCode(frrSettings[sLangRegion].general.jsKeyCode) || ''}">
                                        <label for="frrKeyCodeInput" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('setHotkey') }</label>
                                    </div>
                                </div>
                                <label for="frSelectVehicles">${ t('vehicleTypes') }</label>
                                <select multiple class="form-control" id="frSelectVehicles" style="height:20em;width:35em;margin-bottom: 0.5em;"></select>
                                <label for="frSelectCustomVehicles" style="margin-bottom: 0.2em;margin-top= 0;">${ t('ownVehicleTypes') }</label>
                                <div style="display: flex; flex-direction: column;margin-top: ;">
                                </div>
                                <select multiple class="form-control" id="frSelectCustomVehicles" style="height:10em;width:35em;margin-bottom: 0.5em;"></select>
                                <label for="frSelectDispatch" style="margin-bottom: 0.2em;margin-top= 0;">${ t('dispatchCenters') }</label>
                                <div style="display: flex; flex-direction: column;margin-top: ;">
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="checkbox" id="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[sLangRegion].general.fUseDispatch ? "checked" : "" }>
                                        <label for="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ t('useDispatch') }</label>
                                    </div>
                                </div>
                                <select multiple class="form-control" id="frSelectDispatch" style="height:10em;width:35em;margin-bottom: 0.5em;"></select>`
                              );

        $("#frModalFooter").html(`<button type="button" class="btn btn-danger frrclose" data-dismiss="modal">${ t('close') }</button>
                                  <button type="button" class="btn btn-success" id="frSavePreferences">${ t('save') }</button>
                                  <div class="pull-left" style="padding-top: 7px; padding-bottom: 7px;">Version: ${scriptVersion} | ${ t('counter') }: ${frrSettings[sLangRegion].general.counter}</div>`);

        // Auswahl des Logginglevels aus Speicher setzen
        document.getElementById("frrDebugging").value = frrSettings[sLangRegion].general.loggingLevel

        // Liste der Leitstellennamen aus allen Gebäuden des Users extrahieren
        var aDispatchCaptions = aUserBuildings
        .filter(entry => entry.building_type === internationalType('dispatchType'))
        .map(entry => entry.caption);

        // Namen der zusätzlich ausgewählten Gebäude hinzufügen
        aDispatchCaptions = aDispatchCaptions.concat(mapping(aUserBuildings, frrSettings[sLangRegion].addBuildingIds, "caption"));

        // Sortieren
        aDispatchCaptions.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);

        // Fügt Optionen in der Fahrzeugauswahl hinzu (Aus Array mit Fahrzeugnamen)
        for (const i in frrSettings[sLangRegion].vehicleTypes.captionList) {
            $("#frSelectVehicles").append(`<option>${ frrSettings[sLangRegion].vehicleTypes.captionList[i] }</option>`);
        }
        // Fügt Optionen in der leitstellenauswahl hinzu (Aus Array mit Gebäudenamen)
        for (const i in aDispatchCaptions) {
            $("#frSelectDispatch").append(`<option>${ aDispatchCaptions[i] }</option>`);
        }
        // Fügt Optionen in der "Custom Vehicle Types" Liste hinzu (Aus Array der Fahrzeugtypen)
        for (const i in frrSettings[sLangRegion].customVehicleTypes.captionList) {
            $("#frSelectCustomVehicles").append(`<option>${ frrSettings[sLangRegion].customVehicleTypes.captionList[i] }</option>`);
        }

        // Wählt die Fahrzeuge und Leitstellen an die zuvor gespeichert wurden
        $("#frSelectVehicles").val(mapping(frrSettings[sLangRegion].vehicleTypes.data, frrSettings[sLangRegion].vehicleTypes.settings, "caption"));
        $("#frSelectDispatch").val(mapping(aUserBuildings, frrSettings[sLangRegion].allowedBuildingIds, "caption"));
        $("#frSelectCustomVehicles").val(frrSettings[sLangRegion].customVehicleTypes.settings);
    }

    // Funktion zum parsen eines Zeitstrings (string to seconds)
    function parseTimeString(timeStr) {
        let seconds = 0;
        let hours = 0;
        let minutes = 0;

        // Überprüfen, ob der Zeitstring im Format hh:mm:ss oder mm:ss vorliegt
        if (timeStr.includes(":")) {
            const parts = timeStr.split(':');

            if (parts.length === 2) {
                // Format mm:ss
                seconds += parseInt(parts[0], 10) * 60; // Minuten in Sekunden umrechnen
                seconds += parseInt(parts[1], 10); // Sekunden hinzufügen
            } else if (parts.length === 3) {
                // Format hh:mm:ss
                seconds += parseInt(parts[0], 10) * 3600; // Stunden in Sekunden umrechnen
                seconds += parseInt(parts[1], 10) * 60; // Minuten in Sekunden umrechnen
                seconds += parseInt(parts[2], 10); // Sekunden hinzufügen
            }
        } else {
            return undefined; // Unbekanntes Format
        }
        return seconds;
    }

    // Funktion zum Einfärben des Badges (Zeitfelt im FR Button)
    function badgeSetting(badgeElement) {
        intCycleCount++;
        if (fDebuggingOn && intCycleCount <= 10) console.log(errorText + "badgeSetting wird ausgeführt (maximal 10x mit Logging). Ausführung Nr.: ", intCycleCount);
        if (!fStopBadgeSetting && !fAlrdyThere) {
            const frTime = getFrTime();
            const frTimeSeconds = parseTimeString(frTime);
            const missionNum = window.location.pathname.replace(/\D+/g, "");
            const missionTimerElement = document.getElementById('mission_countdown_' + missionNum);
            const intMissionProgrBar = parseInt(document.getElementById("mission_bar_" + missionNum).style.width, 10);
            var missionTimerSeconds = missionTimerElement ? parseTimeString(missionTimerElement.innerText) : false;
            const missionStartTimer = missionTimerElement ? missionTimerElement.parentElement.id === "col_left" : false;
            const pumpingTimerSeconds = document.querySelector('.pumping-countdown') ? parseTimeString(document.querySelector('.pumping-countdown').innerText) : false;

            badgeElement.innerText = frTime; // FR Zeit in Badge schreiben
            if (fDebuggingOn && intCycleCount <= 10) console.log(errorText + "Mission Timer in Sekunden: ", missionTimerSeconds);
            if (missionStartTimer && objMissionInfo.additional.duration) {
                missionTimerSeconds += objMissionInfo.additional.duration;
                if (fDebuggingOn && intCycleCount <= 10) console.log(errorText + "Mission Timer in Sekunden (Startzeit + geplante Dauer): ", missionTimerSeconds);
            }

            if (frTime === t('noFr')) {
                badgeElement.style.backgroundColor = "red";
                badgeElement.style.color = "black";
            } else if (frTimeSeconds && (missionTimerSeconds || pumpingTimerSeconds)) {
                if (frTimeSeconds < missionTimerSeconds || // AAO Zeit kleiner als Restzeit (und keine Startzeit bei geplanten Einsätzen)
                    frTimeSeconds < pumpingTimerSeconds) { // ODER AAO Zeit kleiner als Pumpzeit DANN grün
                    if (fDebuggingOn && intCycleCount <= 10) console.log(errorText + "Zeit ist ausreichend. Zeiten (frr|mission|pumping): ", frTimeSeconds, missionTimerSeconds, pumpingTimerSeconds);
                    badgeElement.style.backgroundColor = "lightgreen";
                    badgeElement.style.color = "black";
                } else if ((objMissionInfo.additional.possible_patient_min > 0 && objMissionInfo.additional.patient_at_end_of_mission) ||
                           objMissionInfo.additional.min_possible_prisoners > 0 ||
                           document.querySelector('.mission_patient') ||
                           document.getElementById('h2_prisoners') ||
                           (!missionTimerElement && intMissionProgrBar > 0) ||
                           !objMissionInfo) {
                    if (fDebuggingOn && intCycleCount <= 10) {
                        console.log(errorText + "Keine Ahnung obs reicht. Bedingungen (objMisInfo|minPat|patAtEnd|minPris|actPat|actPris|missBar): ",
                                    objMissionInfo,
                                    objMissionInfo.additional.possible_patient_min,
                                    objMissionInfo.additional.patient_at_end_of_mission,
                                    objMissionInfo.additional.min_possible_prisoners,
                                    document.querySelector('.mission_patient'),
                                    document.getElementById('h2_prisoners'),
                                    intMissionProgrBar);
                    }
                    badgeElement.style.backgroundColor = "";
                    badgeElement.style.color = "";
                } else if ((objMissionInfo.additional.possible_patient > 0 && objMissionInfo.additional.patient_at_end_of_mission) ||
                           objMissionInfo.additional.max_possible_prisoners > 0) {
                    if (fDebuggingOn && intCycleCount <= 10) {
                        console.log(errorText + "Es könnten noch Pateinten oder Gefangene kommen (aber nicht sicher). Bedingungen (posiblePat|patAtEnd|maxPosiblePris): ",
                                    objMissionInfo.additional.possible_patient,
                                    objMissionInfo.additional.patient_at_end_of_mission,
                                    objMissionInfo.additional.max_possible_prisoners);
                    }
                    badgeElement.style.backgroundColor = "darkorange";
                    badgeElement.style.color = "black";
                } else {
                    if (fDebuggingOn && intCycleCount <= 10) console.log(errorText + "Fahrzeug kommt zu spät!");
                    badgeElement.style.backgroundColor = "red";
                    badgeElement.style.color = "black";
                }
            } else {
                if (fDebuggingOn && intCycleCount <= 10) console.log(errorText + "Es wurden keine Timer gefunden!")
                badgeElement.style.backgroundColor = "";
                badgeElement.style.color = "";
            }

            // Reload wenn aktiviert und notwendig
            if (frrSettings[sLangRegion].general.intReloadCount > 10) {
                console.error(errorText, "Maximale Anzahl an Reloads in dieser Sitzung überschritten. Hauptfenster muss neu geladen werden!");
            } else if (document.getElementById('mission_reload_request_' + missionNum).style.display !== "none" && frrSettings[sLangRegion].general.fAllowReload && !fReloadActive) {
                if (fLoggingOn) console.log(errorText + "Reload wurde angefordert. T-10s. Anzahl bisheriger Reloads (max. 10): ", frrSettings[sLangRegion].general.intReloadCount);
                fReloadActive = true;
                frrSettings[sLangRegion].general.intReloadCount++;
                saveStorage("badgeSetting");
                setTimeout(function() {
                    window.location.reload();
                }, 10000);
            }
        }

        // Schon ein Fahrzeug vohanden? Wenn nicht wiederholung nach 100ms
        if (fAlrdyThere) {
            badgeElement.style.backgroundColor = "black";
            badgeElement.style.color = "white";
            badgeElement.style.width = "auto";
            badgeElement.innerText = sLangRegion === "de_DE" ? "Du bist schon dort!" : "You are already there!";
            if (fLoggingOn) console.log(errorText + "Es ist schon ein Fahrzeug vom User da! fAlrdyThere: ", fAlrdyThere);
        }
        // Wiederholung alle 100 ms
        setTimeout(function() {
            badgeSetting(badgeElement);
        }, 100);
    }

    // Abholen der Missionsinformationen aus der JSON Datei und suchen des übergebenen Einsatzes
    async function getMissionInfo(missionId) {
        if (!missionId) {
            if (fDebuggingOn) console.log(errorText + "Keine MissionsID übergeben!");
            return undefined;
        }

        // Missionsdaten abholen falls notwenidg.
        if(!aMissions || aMissions.lastUpdate < (now - 5 * 60 * 1000)) {
            try {
                aMissions = {
                    value: await $.getJSON('/einsaetze.json'),
                    lastUpdate: now
                };
                if (fDebuggingOn) console.log(errorText + "Missionsinformationen wurden abgerufen. aMissions: ", aMissions);
                localStorage.setItem('aMissions', JSON.stringify(aMissions));
            } catch(error) {
                console.error(errorText, "Missionsinfos konnten nicht abgerufen werden. Error: ", error);
            }
        }

        if (!aMissions) {
            console.error(errorText, "Keine Missionsinformationen vorhanden!");
            return undefined;
        }

        // Suchen der Missionsinfos
        const strMissionId = String(missionId); // Sicherstellen, dass Id ein String ist
        for (const mission of aMissions.value) {
            if (mission.id === strMissionId) {
                if (fLoggingOn) console.log(errorText + "Missionsinfo Objekt wurde gefunden: ", mission);
                return mission;
            }
        }

        console.error(errorText + "MissionsID wurde nicht in den Missionsinfos gefunden!");
        return undefined;
    }

    // Missions ID auslesen und zurückgeben
    function getMissionId() {
        // Find the mission help button
        var missionHelpBtn = document.querySelector('#mission_help');
        if (!missionHelpBtn) return undefined;

        // Extract mission type from the URL
        var missionType = new URL(
            missionHelpBtn.getAttribute('href') || '',
            window.location.origin
        ).pathname.split('/')[2];

        // Check for overlay index and append if it exists
        var missionGeneralInfo = document.querySelector('#mission_general_info');
        var overlayIndex = missionGeneralInfo ? missionGeneralInfo.getAttribute('data-overlay-index') : 'null';
        if (overlayIndex && overlayIndex !== 'null') {
            missionType += '-' + overlayIndex;
        }

        // Check for additional overlays and append if they exist
        var additionalOverlay = missionGeneralInfo ? missionGeneralInfo.getAttribute('data-additive-overlays') : 'null';
        if (additionalOverlay && additionalOverlay !== 'null') {
            missionType += '/' + additionalOverlay;
        }

        return missionType;
    }

    // Daten aus local Storage holen
    function getStorage(strLocation) {
        frrSettings = JSON.parse(localStorage.getItem('frrSettings'))
        if (fLoggingOn) console.log(errorText + "Daten wurden aus local Storage geholt (Aufruf|Daten): ", strLocation, frrSettings);
    }

    // Daten in local Storage speichern
    function saveStorage(strLocation) {
        localStorage.setItem('frrSettings', JSON.stringify(frrSettings));
        if (fLoggingOn) console.log(errorText + "Daten wurden in local Storage gespeichert (Aufruf|Daten): ", strLocation, frrSettings);
    }

    // Übersetzungs Funktion
    function t(key) {
        //const sLang = 'en'; // Zum Testen kann Sprache auf Englisch gestellt werden. ################################################################################################LÖSCHEN VOR RELEASE####################################
        return objTranslations[sLang]?.[key] || objTranslations.en[key] || 'No translation found!';
    }

    function internationalType(key) {
        return objInternationalIds[sRegion]?.[key]
    }

    // ###############
    // Initialisierung
    // ###############

    // Definiion Variablen ohne Abhängigkeit
    var fFrrDone = false; // Flag ob First Responder schon ausgeführt wurde
    var fReloadActive = false; // Flag ob ein Reload angestoßen wurde
    var fStopBadgeSetting = false; // Flag ob FRR ausgelöst wurde
    var pointless = "Warning: pointless!";
    var fMenuButtonAdded = false;
    var aUserBuildings;
    var scriptVersion = GM_info.script.version;
    var objMissionInfo;
    var intCycleCount = 0;
    var fAlrdyThere;
    var aMissions = JSON.parse(localStorage.getItem('aMissions'));
    var timerKeyDown = null;
    var iKeyDownTime = 0;
    var objFirstResponder;
    let observer; // Observer für Änderungserkennung der Fahrzeugliste
    let targetNode; // Fahrzeugliste (Zum Stoppen des Eventlisteners global angelegt)
    const sLangRegion = I18n.locale; // Sprache und Region
    const sLang = (sLangRegion).split('_')[0]; // Nur Sprache
    const sRegion = (sLangRegion).split('_')[1]; // Nur Region
    const sPathname = window.location.pathname;
    const now = new Date().getTime();
    const errorText = "## FRR ##  ";

    // Definition des Sprachobjekts
    const objTranslations = {
        en : {
            settings : 'Settings',
            generalSettings : 'General settings',
            useAao : 'Use without ARR (change causes reload)',
            alertAndNext : 'Alert and next after selection (alliance mission)',
            alertShareNext : 'Alert, share and next after selection (own mission)',
            reloadOnChange : 'Reload upon mission changes',
            debugging : 'Level of debugging informations',
            delay : 'Enter alarm delay (0-10s)',
            setHotkey : 'Enter hot key (letters only, no A,D,E,N,S,W or X)',
            vehicleTypes : 'vehicle-types (multiple-choice with Strg + click)',
            ownVehicleTypes : 'Custom Vehicletypes (multiple-choice with Strg + click)',
            dispatchCenters : 'dispatchcenter (multiple-choice with Strg + click)',
            useDispatch : 'only use vehicles of specific dispatchcenter',
            counter : 'Counter',
            save : 'Save',
            close : 'Close',
            useStation : 'Use this building ID for First Responder',
            useThisAao : 'Use this ID for FirstResponder.',
            attention : 'Attention',
            useThisWarn : 'Selection causes reload! All vehicle selections will be deleted! The FRR ARR cannot be used as First Responder 2Go!',
            loadFr2Go : 'Load FR 2Go Config',
            really2Go : 'Do you really want to load the First Responder 2Go config? All ARR settings will be lost!',
            dontForget : 'Don\'t forget!',
            descr2Go : 'The First Responder 2Go configuration only consists of the standard vehicle types. It is not possible to transfer your custom vehicle categories! After the configuration has been inserted, the ARR needs to be saved!',
            wait : 'wait',
            settingsSaved : 'Settings successfully saved.',
            noFr : 'no FR found',
            noPrefix : 'Z/no Prefix found - ',
            loadData : 'Loading Data. Please wait!'
        },
        de : {
            settings : 'Einstellungen',
            generalSettings : 'Allgemeine Einstellungen',
            useAao : 'Nutzung ohne AAO (ACHTUNG: Änderung verursacht Reload der Seite!)',
            alertAndNext : 'Nach Auswahl alarmieren und nächter Einsatz (Verbandseinsatz)',
            alertShareNext : 'Nach Auswahl alarmieren, teilen und nächster Einsatz (Eigener Einsatz)',
            reloadOnChange : 'Reload bei Änderungen im Einsatz',
            debugging : 'Level der debugging Informationen',
            delay : 'Eingabe Verzögerungszeit (0-10s)',
            setHotkey : 'Eingabe HotKey (nur Buchstaben, kein A,D,E,N,S,W oder X)',
            vehicleTypes : 'Fahrzeugtypen (Mehrfachauswahl mit Strg + Klick)',
            ownVehicleTypes : 'Eigene Fahrzeugtypen (Mehrfachauswahl mit Strg + Klick)',
            dispatchCenters : 'Leitstellen (Mehrfachauswahl mit Strg + Klick)',
            useDispatch : 'nur Fahrzeuge bestimmter Leitstellen wählen',
            counter : 'Zähler',
            save : 'Speichern',
            close : 'Schließen',
            useStation : 'Wachen-ID im First Responder berücksichtigen',
            useThisAao : 'Diese ID für den First Responder nutzen.',
            attention : 'Achtung',
            useThisWarn : 'Auswahl verursacht Reload! Alle Fahrzeugauswahlen werden gelöscht! Die FRR AAO kann nicht als First Responder 2Go genutzt werden!',
            loadFr2Go : 'Lade FR 2Go Konfig',
            really2Go : 'Möchten sie wirklich die First Responder 2Go Konfig laden? Alle AAO Einstellungen gehen verloren!',
            dontForget : 'Nicht vergessen!',
            descr2Go : 'Die First Responder 2Go Konfiguration besteht nur aus den Standard-Fahrzeugtypen. Die Übernahme der eigenen Fahrzeugkategorien ist nicht möglich! Nachdem die Konfiguration eingefügt wurde, muss die AAO noch gespeichert werden!',
            wait : 'warte',
            settingsSaved : 'Die Einstellungen wurden erfolgreich gespeichert.',
            noFr : 'kein FR gefunden',
            noPrefix : 'Z/kein Prefix gefunden -',
            loadData : 'Daten werden geladen. Bitte Warten!'
        }
    }

    // Definition internationale IDs
    const objInternationalIds = {
        US : {
            dispatchType : 1
        },
        DE : {
            dispatchType : 7
        },
        GB : {
            dispatchType : 7
        }
    }

    // Definition internationale Prefix
    const objBuildingMap = {
        DE : [
            { prefix: "Feuer", buildings: [0, 18], priority: 6 }, // Feuerwache
            { prefix: "Rettung", buildings: [2, 5, 20], priority: 1 }, // Rettungsdienstwache
            { prefix: "Polizei", buildings: [6, 11, 13, 17, 19, 24], priority: 5 }, // Polizei
            { prefix: "THW", buildings: [9], priority: 4 }, // THW
            { prefix: "SEG", buildings: [12, 21], priority: 3 }, // SEG
            { prefix: "Wasser", buildings: [15], priority: 2 }, // Wasserrettung
            { prefix: "Berg", buildings: [25], priority: 7 }, // Bergrettung
            { prefix: "Seenot", buildings: [26, 28], priority: 8 } // Seenotrettung
        ],
        US : [
            { prefix: "Fire", buildings: [0, 11, 13, 17, 22], priority: 3 },
            { prefix: "Ambulance", buildings: [3, 6, 12, 14, 16], priority: 1 },
            { prefix: "Police", buildings: [4, 8, 15], priority: 5 },
            { prefix: "Fed. Police", buildings: [18], priority: 4 },
            { prefix: "Coast/Water", buildings: [23, 25, 26], priority: 2 },
            { prefix: "Tow", buildings: [27], priority: 6 }
        ],
        GB : [
            { prefix: "Fire", buildings: [0, 18], priority: 2 },
            { prefix: "Ambulance", buildings: [2, 5, 20, 21, 32], priority: 1 },
            { prefix: "Police", buildings: [6, 13, 19, 26], priority:3 },
            { prefix: "HRL", buildings: [22], priority: 6 },
            { prefix: "HART", buildings: [25], priority: 5 },
            { prefix: "Water", buildings: [27, 28, 30, 31], priority: 4 }
        ]
    };

    // Definition und Abruf der Variable aus dem local Storage
    var frrSettings;
    getStorage();
    if (!frrSettings) {
        frrSettings = createSettingsObject()
        saveStorage();
        console.log(errorText, "Neues Settings Objekt angelegt");
    } else if (!frrSettings[sLangRegion]) {
        frrSettings[sLangRegion] = createSettingsObject()[sLangRegion];
        saveStorage();
        console.log(errorText, "Neue Sprache im Settings Objekt angelegt");
    }

    // Definition Variablen mit Abhängigkeit zum local Storage
    var fLoggingOn = frrSettings[sLangRegion].general.loggingLevel === "complete" || false; // Sollte die Loggingfunktion im Menü nicht eingeschaltet werden können kann hier der generelle Loggingmodus eingeschaltet werden. Standard: false
    var fDebuggingOn = frrSettings[sLangRegion].general.loggingLevel === "debug" || fLoggingOn;

    // Beispiel für neues Logging
    if (false) {
        if (fLoggingOn) console.log(errorText + "Hier könnte ihr Log stehen", scriptVersion);
        if (fDebuggingOn) console.log(errorText + "Hier könnte ihr Debuuging stehen", scriptVersion);
        console.error(errorText + "Hier könnte ihr Error stehen", scriptVersion);
    }

    // Versionierung prüfen
    if (frrSettings.scriptVersion !== scriptVersion) versioning(scriptVersion);

    // Reload Counter zurücksetzen und AAO Check
    if (window.location.pathname === "/") {
        // Prüfen ob AAO noch existiert
        if (frrSettings[sLangRegion].aaoId !== "00000000") {
            const aaoResponse = await fetch(`/api/v1/aaos/${frrSettings[sLangRegion].aaoId}`);
            if (!aaoResponse.ok) {
                if (fLoggingOn) console.log(errorText + "AAO in Schnittstelle nicht vorhanden", aaoResponse);
                frrSettings[sLangRegion].aaoId = "00000000";
                saveStorage("AAO Check Hauptseite");
                setTimeout(function() {
                    window.parent.location.reload();
                },10);
            }
        }
        // Reload Counter zurücksetzen
        frrSettings[sLangRegion].general.intReloadCount = 0;
        saveStorage("Initialisierung auf Hauptseite");
    }

    // Missions Id und "Schon da" abrufen wenn Einsatzfenster
    if (window.location.pathname.includes("missions")) {
        const currMissionId = getMissionId();
        objMissionInfo = await getMissionInfo(currMissionId);
        fAlrdyThere = !!document.querySelector(".glyphicon-user");
    }

    // Reload wenn AAO ID geändert wurde und Check der AAO ID
    if (sPathname === "/aaos") {
        // Prüfen ob AAO noch existiert
        if (frrSettings[sLangRegion].aaoId !== "00000000") {
            const aaoResponse = await fetch(`/api/v1/aaos/${frrSettings[sLangRegion].aaoId}`);
            if (!aaoResponse.ok) {
                if (fLoggingOn) console.log(errorText + "AAO in Schnittstelle nicht vorhanden", aaoResponse);
                frrSettings[sLangRegion].aaoId = "00000000";
                frrSettings[sLangRegion].general.fAaoIdModified = true;
            }
        }
        // Reload Durchführen falls erforderlich
        if (frrSettings[sLangRegion].general.fAaoIdModified) {
            frrSettings[sLangRegion].general.fAaoIdModified = false;
            saveStorage("AAO Reload und Check");
            setTimeout(function() {
                window.parent.location.reload();
            },10);
        }
    }

    // Täglicher Abruf der eigenen Fahrzeugtypen
    if (frrSettings[sLangRegion].customVehicleTypes.lastUpdate < (now - 24 * 60 * 60 * 1000)) {
        await fetchCustomVehicles();
    }

    // HTML Code für Modal vorgeben (wird mehrfach genutzt)
    var frrModalElement = `
    <div class="modal fade" id="frModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="frModalLabel">${ t('settings') } FirstResponderReloaded</h3>
                    <button type="button" class="close frrclose" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        </button>
                </div>
                <div class="modal-body" id="frModalBody" style="max-height: 1000px; overflow-y: auto;">${ t('loadData') }</div>
                <div class="modal-footer" id="frModalFooter"></div>
             </div>
         </div>
     </div>
    `;

    // ###########################################################
    // Abfrage des First Responders wenn sich die Fahrzeuge ändern
    // ###########################################################

    if (window.location.pathname.includes("missions") && // Aufruf in einem Einsatzfenster
        !document.querySelector('.mission-success')) {
        targetNode = document.getElementById('vehicle_list_step');
        objFirstResponder = getFirstResponder();

        // Erstelle einen MutationObserver
        observer = new MutationObserver((mutationsList) => {
            // Observer abschalten um Endlosschleife zu vermeiden
            observer.disconnect();

            objFirstResponder = getFirstResponder();

            // Observer wieder aktivieren
            observer.observe(targetNode, config);
        });

        // Observer-Optionen
        const config = {
            childList: true, // Überwacht Hinzufügen/Entfernen von Kindern
            attributes: true, // Überwacht Änderungen an den Attributen
            subtree: true // Überwacht auch untergeordnete Knoten
        };

        // Starte den Observer
        observer.observe(targetNode, config);

        // Event-Listener für Checkboxen im TargetNode
        targetNode.addEventListener('change', (event) => { // ##############################################Muss eigene Funktion sein, damit der Eventlistener beim ausführen der alarmierung entfernt werden kann! Siehe ChatGPT##############################
            if (event.target.type === 'checkbox') {
                // Observer abschalten um Endlosschleife zu vermeiden
                observer.disconnect();

                objFirstResponder = getFirstResponder();

                // Observer wieder aktivieren
                observer.observe(targetNode, config);
            }
        });
    }

    // ########################################################
    // Einstellung der AAO ID und Umsetzung First Responder 2Go
    // ########################################################

    // Fügt in der AAO Bearbeitung vor der ersten Checkbox eine eigene Check Box ein. Ist die entsprechende AAO in den Settings gespeichert wird das Häckchen gesetzt.
    if (sPathname.match(/\/aaos\/\d+\/edit/)) {
        const sAaoId = sPathname.match(/\/aaos\/(\d+)\/edit/)[1];
        const elSaveButton = document.getElementById('save-button');
        var elTabContentDiv = document.querySelector('.tab-content')
        // Checkbox für FRR hinzufügen
        if (!frrSettings[sLangRegion].general.fWoAao) {
            $(".boolean.optional.checkbox")
                .first()
                .before(`<label class="form-check-label" for="frSaveAaoId">
                             <input class="form-check-input" type="checkbox" id="frSaveAaoId" ${ window.location.pathname.includes(frrSettings[sLangRegion].aaoId) ? "checked" : "" }>
                             ${ t('useThisAao') }
                         </label>
                         <p class="help-block"><b>${ t('attention') }:</b> ${ t('useThisWarn') }</p>`);

            // Auswertung, dass die Checkbox beim AAO Bearbeiten angeklickt wurde. Bei Abwahl löscht es die AAO ID. Bei Anwahl wird die aktuelle AAO ID aus der URL extrahiert und gespeichert.
            $("body").on("click", "#frSaveAaoId", function() {
                if ($("#frSaveAaoId")[0].checked) {
                    frrSettings[sLangRegion].aaoId = sAaoId;
                } else {
                    frrSettings[sLangRegion].aaoId = "00000000";
                }
                // Alle ausgewählten Fahrzeuge löschen
                elTabContentDiv.querySelectorAll('input').forEach(function(input) {
                    input.value = '0';
                    input.setAttribute('value', '0');
                });
                // Reload anstoßen wenn gespeichert wurde
                frrSettings[sLangRegion].general.fAaoIdModified = true;
                saveStorage("AAO festlegen");

                // Speicherm
                elSaveButton.click();
            });
        }
        // FR 2Go Konfiguration setzen
        if (sAaoId !== frrSettings[sLangRegion].aaoId) {
            // Hinzufügen eines Buttons
            var btnFrToGo = document.createElement('a');
            btnFrToGo.setAttribute('href', '#');
            btnFrToGo.setAttribute('aria-role', 'button');
            btnFrToGo.className = 'btn btn-primary pull-right';
            btnFrToGo.id = 'btnfrToGo';
            btnFrToGo.style.margin = '7px';
            btnFrToGo.innerHTML = `<span aria-hidden="true">${ t('loadFr2Go') }</span>`;

            elSaveButton.parentNode.insertBefore(btnFrToGo, elSaveButton.nextSibling);

            var fTempClicked = false;
            btnFrToGo.addEventListener('click', function(event) {
                event.preventDefault();
                if (!fTempClicked) {
                    const fUserConfirmed = confirm(t('really2Go'));
                    if (fUserConfirmed) {
                        fTempClicked = true;
                        // FR 2Go Tab erstellen
                        var elTabs = document.getElementById('tabs');
                        elTabs.querySelectorAll('li').forEach(function(item) {
                            item.removeAttribute('class');
                        });
                        elTabs.insertAdjacentHTML('beforeend', `
                            <li role="presentation" class="active">
                                <a href="#frgo_config" aria-controls="vehicle_type_captions" role="tab" data-toggle="tab">First Responder 2Go</a>
                            </li>
                        `);

                    // Config String erstellen
                    const sConfigIds = frrSettings[sLangRegion].vehicleTypes.settings.join(', ');

                    // Neues FR 2Go Input Element erstellen
                    var elFrGoDiv = document.createElement('div');
                    elFrGoDiv.setAttribute('role', 'tabpanel');
                    elFrGoDiv.className = 'tab-pane active';
                    elFrGoDiv.id = 'frgo_config';
                    elFrGoDiv.innerHTML = `
                            <div class="form-group fake_number optional aao_frgo">
                                <div class="col-sm-3 control-label">
                                    <label class="fake_number optional " for="aao_frgo">First Responder 2Go</label>
                                </div>
                                <div class="col-sm-9">
                                    <input class="fake_number optional form-control" id="vehicle_type_frr" name="vehicle_type_ids[[${sConfigIds}]]" type="number" value="1">
                                    <p class="help-block">${ t('descr2Go') }</p>
                                </div>
                            </div>
                        `;

                    // frr Tab Inhalt in tab-Content einfügen und alle anderen inputs auf 0 setzen
                    elTabContentDiv.querySelectorAll('input').forEach(function(input) {
                        input.value = '0';
                        input.setAttribute('value', '0');
                    });
                    elTabContentDiv.querySelectorAll('.tab-pane').forEach(function(tabPane) {
                        tabPane.classList.remove('active');
                    });
                    elTabContentDiv.appendChild(elFrGoDiv);
                    setTimeout(function() {
                        elTabContentDiv.scrollIntoView({ behavior: 'smooth' });
                        btnFrToGo.innerHTML = `<span aria-hidden="true"><-- ${ t('dontForget') }</span>`;
                    },20);
                }
            }
        });
    }
    }

    // ##############################################
    // Hinzufügen des Einstellungsbuttons im LSS Menü
    // ##############################################

    // Button im Menü wenn AAO nich genutzt wird oder keine EIngestellt ist
    if (window.location.pathname === "/" &&
        (frrSettings[sLangRegion].general.fWoAao || frrSettings[sLangRegion].aaoId === "00000000")) {
        $('#navbar-main-collapse > ul').append(`<li class="btn btn-s" style="padding: 0px; border: 0px">
                                                    <a href="#" id="frrOpenModal" data-toggle="modal" data-target="#frModal">
                                                        <span style="margin-right: 2px;" class="glyphicon glyphicon-cog"></span>
                                                        <span>First Responder</span>
                                                    </a>
                                                </li>
                                                ${frrModalElement}
                                                `);
        fMenuButtonAdded = true;
    };

    // #######################################################################################################
    // Hinzufügen des Einstellungsbuttons und Eventlistener wenn AAO verwendet wird und sie nicht 00000000 ist
    // #######################################################################################################

    if (window.location.pathname.includes("missions") && // Aufruf in einem Einsatzfenster
        !document.querySelector('.mission-success') && // Einsatz ist noch nicht beendet
        !frrSettings[sLangRegion].general.fWoAao && frrSettings[sLangRegion].aaoId !== "00000000") { // Es soll AAO verwendet werden UND die eingestellte AAO ist nicht 00000000
        $("#available_aao_" + frrSettings[sLangRegion].aaoId)
            .parent()
            .after(`<button type="button" class="btn btn-success btn-xs" data-toggle="modal" data-target="#frModal" style="height:24px" id="frrOpenModal">
                        <div class="glyphicon glyphicon-cog" style="color:LightSteelBlue"></div>
                    </button>
                    ${frrModalElement}
                    `);

        fMenuButtonAdded = true; // Eventlistener für Menübuttons können aktiviert werden

        // Badge mit Zeit befüllen und einfärben
        const badgeElementAao = document.getElementById("aao_timer_" + frrSettings[sLangRegion].aaoId);
        setTimeout(function() {
            badgeSetting(badgeElementAao);
        }, 50);

        //Eventlistener für AAO
        $("#aao_" + frrSettings[sLangRegion].aaoId).click(function() {
            frrAlert();
        });

        // Fokus auf das Alarmfenster legen (Problem bei Chrome)
        window.focus();
    }

    // ##########################################################
    // Hinzufügen des Alarmbuttons wenn keine AAO verwendet wird.
    // ##########################################################

    // Alarmbutton wenn keine AAO genutzt wird
    if (window.location.pathname.includes("missions") && // Aufruf in einem Einsatzfenster
        !document.querySelector('.mission-success') && // Einsatz ist noch nicht beendet
        (frrSettings[sLangRegion].general.fWoAao || frrSettings[sLangRegion].aaoId === "00000000")) { // Es soll kein AAO verwendet werden ODER die eingestellte AAO ist 00000000
        $('.flex-row.flex-nowrap:not(.navbar-right, .hidden-xs)')
            .last()
            .after(`<div class="flex-row flex-nowrap">
                        <a href="#" aria-role="button" class="btn btn-primary btn-sm" id="frrAlertButton" style="height: 30px;">
                            <img class="icon icons8-Phone-Filled" src="/images/icons8-phone_filled.svg" width="18" height="18" aria-hidden="true">
                            <span aria-hidden="true">First Responder</span>
                            <span class="badge" aria-hidden="true" id="frrTime">${ t('wait') }</span>
                        </a>
                        <a href="#" aria-role="button" class="btn btn-warning btn-sm" data-toggle="modal" data-target="#frModal" id="frrOpenModal" style="height: 30px;">
                            <span class="glyphicon glyphicon-cog" style="font-size: 17px;"></span>
                        </a>
                    </div>
                    ${frrModalElement}`);

        fMenuButtonAdded = true; // Eventlistener können gestartet werden

        // Badge mit Zeit befüllen und einfärben
        const badgeElementFrButton = document.getElementById("frrTime");
        setTimeout(function() {
            badgeSetting(badgeElementFrButton);
        }, 50);

        // Eventlistener für Alarmbutton
        $("body").on("click", "#frrAlertButton", function() {
            frrAlert();
        });

        // Fokus auf das Alarmfenster legen (Problem bei Chrome)
        window.focus();
    }

    // ##############################
    // Eventlistener für Menü Buttons
    // ##############################

    if (fMenuButtonAdded) {

        // Auswertung, dass der Button zum Speichern der Einstellungen gedrückt wurde. Speichert die IDs in frrSettings.
        $("body").on("click", "#frSavePreferences", function() {
            // Auswerten ob ein Reload durchgeführt und ob die AAO ID auf 0 gesetzt werden muss.
            var fReload = false;
            if (frrSettings[sLangRegion].general.fWoAao !== $("#frrWoAao")[0].checked) {
                fReload = true;
                if ($("#frrWoAao")[0].checked) {
                    frrSettings[sLangRegion].aaoId = "00000000";
                }
            }

            // Speichern der Daten aus dem Modal in die entsprechenden Variablen
            frrSettings[sLangRegion].general.fWoAao = $("#frrWoAao")[0].checked;
            frrSettings[sLangRegion].general.fAutoAlert = $("#frrAutoAlert")[0].checked;
            frrSettings[sLangRegion].general.fAutoShare = $("#frrAutoShare")[0].checked;
            frrSettings[sLangRegion].general.fAllowReload = $("#frrAllowReload")[0].checked;
            frrSettings[sLangRegion].general.loggingLevel = document.getElementById("frrDebugging").value
            frrSettings[sLangRegion].general.alarmDelay = parseInt($("#frrAlarmDelay").val());
            frrSettings[sLangRegion].general.jsKeyCode = $("#frrKeyCodeInput").val().toUpperCase().charCodeAt(0);
            frrSettings[sLangRegion].vehicleTypes.settings = $("#frSelectVehicles").val() ? mapping(frrSettings[sLangRegion].vehicleTypes.data, $("#frSelectVehicles").val(), "id") : [];
            frrSettings[sLangRegion].customVehicleTypes.settings = $("#frSelectCustomVehicles").val() ? $("#frSelectCustomVehicles").val() : [];
            frrSettings[sLangRegion].general.fUseDispatch = $("#frCbxUseLst")[0].checked;
            frrSettings[sLangRegion].allowedBuildingIds = $("#frSelectDispatch").val() ? mapping(aUserBuildings, $("#frSelectDispatch").val(), "id") : [];

            // Aktualisieren des local Storage nach übernahme der Daten
            saveStorage("Save Button");

            // Reload wenn die Verwendung der AAO nicht genutzt wird.
            if (fReload) window.parent.location.reload();

            // Verändern des Modals nach Speichern (Speichern erfolgreich)
            $("#frSavePreferences").addClass("hidden");
            $("#frModalBody").html(`
                <h3><center>${ t('settingsSaved') }</center></h5>
            `);

        });

        // öffnen des Menüs bei Button click
        $("body").on("click","#frrOpenModal", async function() {
            fStopBadgeSetting = true;
            //Ausführen der Funktion zum holen der Fahrzeugdaten in der entsprechenden Sprache
            await fetchVehicles();
            // Abholen der User Gebäude
            aUserBuildings = await $.getJSON('/api/buildings');
            if (fLoggingOn) console.log(errorText + "Inhalt von aUserBuildings: ", aUserBuildings);
            openFrrModal();
            var modalHeight = $(window).height() - 200;
            $('#frModalBody').css('max-height', modalHeight + 'px');
        });

        // Erfassen ob die Einstellungen geschlossen wurde
        $("body").on("click",".frrclose", function() {
            fStopBadgeSetting = false;
        });
    }

    // ######################################################
    // Wacheneinstellungen für zusätzlich freigegebene Wachen
    // ######################################################

    // Fügt eine Checkbox im Gebäude bearbeiten Fenster ein mit der ausgewählt werden kann, dass alle Fahrzeuge des Gebäudes verwendet werden dürfen
    if (window.location.pathname.includes("buildings") && window.location.pathname.includes("edit")) {
        $(".building_leitstelle_building_id")
            .after(`<div class="form-check">
                      <input type="checkbox" class="form-check-input" id="frCbxBuildingId" ${ $.inArray(+window.location.pathname.replace(/\D+/g, ""), frrSettings[sLangRegion].addBuildingIds) > -1 ? "checked" : "" }>
                      <label class="form-check-label" for="frCbxBuildingId">${ t('useStation') }</label>
                    </div>
                    `);

        // Auswertung, dass die Checkbox beim Gebäude Bearbeiten angeklickt wurde. Bei Abwahl löscht es die abgewählte ID aus dem Array. Bei Anwahl wird sie hinzugefügt (wenn noch nicht vorhanden).
        $("body").on("click", "#frCbxBuildingId", function() {
            var buildingId = +window.location.pathname.replace(/\D+/g, "")
            if ($("#frCbxBuildingId")[0].checked) {
                frrSettings[sLangRegion].addBuildingIds.push(buildingId);
            } else {
                frrSettings[sLangRegion].addBuildingIds.splice(frrSettings[sLangRegion].addBuildingIds.indexOf(buildingId), 1);
                if (frrSettings[sLangRegion].allowedBuildingIds.includes(buildingId)) {
                    frrSettings[sLangRegion].allowedBuildingIds.splice(frrSettings[sLangRegion].allowedBuildingIds.indexof(buildingId), 1);
                }
            }
            saveStorage("Gebäudebearbeitung");
        });
    }

    // ##########################
    // Eventlistener Tastaturkeys
    // ##########################

    // Event keyup zur Auswertung von Eingaben und zwecks HotKey überwachen
    $(document).keyup(function(evt) {
        if (!$("input:text").is(":focus") && // kein Textfeld angewählt
            evt.keyCode === frrSettings[sLangRegion].general.jsKeyCode && // Die richtige Taste wurde gedrückt
            window.location.pathname.includes("missions") && // Aufruf in einem Einsatzfenster
            !document.querySelector('.mission-success')) { // Einsatz ist noch nicht beendet
            // HotKey wurde <5s gedrückt
            const iKeyDownDuration = Date.now() - iKeyDownTime;
            if (iKeyDownDuration < (5 * 1000)) {
                clearTimeout(timerKeyDown);
                observer.disconnect();
                frrAlert();
            }
            iKeyDownTime = 0;
        } else if (evt.target.id === "frrAlarmDelay") { // Prüft ob die Alarmverzögerung eingegeben wurde
            if (parseInt(evt.target.value) > 10) {
                evt.preventDefault();
                evt.target.value = "10"
            } else if (parseInt(evt.target.value) < 0) {
                evt.preventDefault();
                evt.target.value = "0"
            }
        }
    });

    // Event keydown zur Auswertung von Eingaben und erneut alarmieren
    $(document).keydown(function(evt) {
        // Starten des Keydown Timers um nochmal alarmieren zu können wenn schon ein Fahrzeug "alarmiert" wurde (z.B. durch Personalfehler)
        if (!$("input:text").is(":focus") && // kein Textfeld angewählt
            evt.keyCode === frrSettings[sLangRegion].general.jsKeyCode && // Die richtige Taste wurde gedrückt
            window.location.pathname.includes("missions") && // Aufruf in einem Einsatzfenster
            !document.querySelector('.mission-success')) { // Einsatz ist noch nicht beendet
            if (iKeyDownTime === 0) {
                iKeyDownTime = Date.now()
                timerKeyDown = setTimeout(function() {
                    fAlrdyThere = false;
                }, 5 * 1000);
            }
        }

        // Eingabe HotKey
        if (evt.target.id === "frrKeyCodeInput" && // Überprüft, ob das Ereignisziel das Eingabefeld ist
            evt.keyCode !== 8 && // Überprüft, ob die Taste nicht Backspace ist
            (!(evt.keyCode >= 65 && evt.keyCode <= 90) || // Überprüft, ob die Taste kein Buchstabe (A-Z) ist
             [65, 68, 69, 78, 83, 87, 88].includes(evt.keyCode))) {
            evt.preventDefault(); // Verhindert das Standardverhalten der Taste wenn die Taste nicht erlaubt ist
            console.error(errorText + "Taste ist als HotKey nicht erlaubt! CharCode: " + evt.keyCode); // Protokolliert, dass die Taste nicht erlaubt ist.
        }
    });
    const testTimeEnd = new Date().getTime();
    console.log('Ausführungszeit in ms: ', testTimeEnd - testTime);
})();
