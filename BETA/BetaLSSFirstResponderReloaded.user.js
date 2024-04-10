// ==UserScript==
// @name         [BETA]FirstResponderReloaded
// @namespace    FirstRespond-BETA
// @version      1.0.1-BETA
// @description  Wählt das nächstgelegene FirstResponder-Fahrzeug aus (Original von JuMaHo und DrTraxx)
// @author       SaibotH
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        *.leitstellenspiel.de
// @match        *.leitstellenspiel.de/missions/*
// @match        *.leitstellenspiel.de/aaos/*/edit
// @match        *.leitstellenspiel.de/buildings/*/edit
// @run-at       document-idle
// @grant        GM_info
// ==/UserScript==


// Definition von globalen Variablen um Fehlermeldungen zu unterdrücken
/* global $,I18n */

(async function() {
    'use strict';

    // ######################
    // Funktionsdeklarationen
    // ######################

    // Fügt die Zeit zum AAO Button hinzu
    function setAaoTime() {
        $(".vehicle_checkbox").each(function() {
            var vType = +$(this).attr("vehicle_type_id"); // Fahrzeug Typ ID
            var vId = $(this).attr("value"); //Fahrzeug ID
            var lstId = +$(this).attr("building_id").split("_")[1]; //Leitstellen ID
            var buId = +$(this).attr("building_id").split("_")[0]; // Gebäude ID
            var timeAttr = $("#vehicle_sort_" + vId).attr("timevalue");

            if (timeAttr == undefined) {
                logging("Zeitattribut ist nicht vorhanden!");
                return false;
            }

            var time = parseInt(timeAttr);

            if (frrSettings[lang].vehicleTypes.settings.includes(vType) && //Fahrzeugtyp wurde ausgewählt UND
                !$("#vehicle_checkbox_" + vId)[0].checked && // Checkbox ist NICHT angewählt UND
                !$("#vehicle_checkbox_" + vId)[0].disabled && // Checkbox ist NICHT deaktiviert UND
                (dispatchSetup.useIt === false || dispatchSetup.dispatchId.includes(lstId) || dispatchSetup.additionalBuildings.includes(buId))) { //Gebäudeauswertung wird nicht genutzt ODER Leitstelle wurde ausgewählt ODER Gebäude wurde ausgewählt

                document.getElementById("aao_timer_" + frrSettings[lang].aaoId).innerText = formatTime(time);
                logging("Zeit hinzugefügt");
                return false; // Beendet die Suche nach dem First Responder
            }
        });
    }

    // Loggingfunktion die nur ausgeführt wird wenn bLoggingOn true ist
    function logging() {
        // Info Funktion
        logging.info = function(message) {
            if (fLoggingOn || frrSettings[lang].general.fLoggingOn) console.info("FirstResponderReloaded Info: ",message);
        }
        // Normales Logging
        logging.log = function(message) {
            if (fLoggingOn || frrSettings[lang].general.fLoggingOn) console.log("FirstResponderReloaded Logging: ",message);
        }
        // Logging von Daten
        logging.data = function(data, message) {
            if (fLoggingOn || frrSettings[lang].general.fLoggingOn) console.log("FirstResponderReloaded Objektlogging: ", message, data);
        }
        // Warnung
        logging.warn = function(message) {
            if (fLoggingOn || frrSettings[lang].general.fLoggingOn) console.warn("FirstResponderReloaded Warnung: ",message);
        }
        // Error (WIRD IMMER GESCHRIEBEN)
        logging.error = function(message) {
            console.error("FirstResponderReloaded Error: ", message);
        }

    }

    // Funktion zum Hinzufügen von Prefixen zum Fahrzeugnamen. Priorität dient dazu gewisse Fahrzeuge z.B. dem Rettungsdienst zuzuweisen anstatt der Feuerwehr da das entsprechende Fahrzeug in beiden Wachen stationiert sein kann.
    function updateCaptionPrefix(vehicle) {
        const buildingMap = [
            { prefix: "Feuer - ", buildings: [0, 18], priority: 6 }, // Feuerwache
            { prefix: "Rettung - ", buildings: [2, 5, 20], priority: 1 }, // Rettungsdienstwache
            { prefix: "Polizei - ", buildings: [6, 11, 13, 17, 19, 24], priority: 5 }, // Polizei
            { prefix: "THW - ", buildings: [9], priority: 4 }, // THW
            { prefix: "SEG - ", buildings: [12, 20], priority: 3 }, // SEG
            { prefix: "Wasser - ", buildings: [15], priority: 2 } // Wasserrettung
        ];

        const possibleBuildings = vehicle.possibleBuildings;
        const caption = vehicle.caption;

        // Sortiere buildingMap nach Priorität
        const sortedBuildingMap = buildingMap.sort((a, b) => a.priority - b.priority);
        let prefixFound = false; // Flag, um zu überprüfen, ob ein Präfix gefunden wurde

        for (const entry of sortedBuildingMap) {
            if (possibleBuildings.some(building => entry.buildings.includes(building))) {
                // Wenn mindestens ein Gebäude dem aktuellen Präfix entspricht,
                // füge den Präfix zur Caption hinzu
                vehicle.caption = entry.prefix + caption;
                prefixFound = true;
                break; // Da nur ein Präfix hinzugefügt werden soll, brechen wir die Schleife ab.
            };
        };

        // Wenn kein Prefix gefunden wurde wird ZZZ als Prefix genutzt.
        if (!prefixFound) {
            logging.warn(`Kein Prefix für Fahrzeug gefunden! Fahrzeugname: ${caption}`);
            vehicle.caption = "ZZZ - " + caption;
        }

    };

    // Funktion um die Fahrzeugdaten aus lss-manager zu laden und diese so zu bearbeiten, dass der Code von DrTraxx weiterhin funktioniert
    async function getVehicleTypes(lang) {
        // Wenn der Speicher leer ist oder das Datum der letzten aktualisierung älter als 5 Minuten ist, werden die Fahrzeugtypen abgerufen.
        if (!localStorage.aVehicleTypesNew || JSON.parse(localStorage.aVehicleTypesNew).lastUpdate < (new Date().getTime() - 5 * 1000 * 60)) {
            // Fahrzeugtypen werden in aVehivleTypesNew geschrieben.
            await $.getJSON("https://api.lss-manager.de/" + lang + "/vehicles").done(data => localStorage.setItem('aVehicleTypesNew', JSON.stringify({ lastUpdate: new Date().getTime(), value: data })));
        }
        // Gibt die Fahrzeugtypen aus. Wandelt das JSON Objekt in ein JS Objekt mit id = parseInt(key) um den Code von DrTraxx verwenden zu können
        let jsonObject = JSON.parse(localStorage.aVehicleTypesNew).value;
        let jsObject = Object.keys(jsonObject).map(key => {
            let newObj = { id: parseInt(key) };
            let objData = jsonObject[key];

            // Iteriere über die Schlüssel-Wert-Paare im Objekt und füge sie dem neuen Objekt hinzu
            for (let prop in objData) {
                newObj[prop] = objData[prop];
            }
            return newObj;
        });
        logging.data(jsObject, "Altes Objekt für Prefixing: ")
        // Prefix für Fahrzeugbezeichnung hinzufügen
        jsObject.forEach(function(vehicle) {
            updateCaptionPrefix(vehicle);
        });

        return jsObject;

    }

    // Holt die Fahrzeugdaten aus der LSSM API ab, verarbeitet diese (Präfix und Fahrzeugnamenliste) und legt diese im local Storage ab.
    async function fetchVehicles(lang) {
        logging.data(Object.keys(frrSettings[lang].vehicleTypes.data).length, "Länge der Daten: ");
        logging.data(frrSettings[lang].vehicleTypes.lastUpdate, "Zeitstempel der alten Daten: ")
        logging.data(new Date().getTime(), "Aktueller Zeitstempel: ");

        // Daten werden abgerufen und bearbeitet wenn noch keine vorhanden sind oder die Daten zu alt sind
        if (Object.keys(frrSettings[lang].vehicleTypes.data).length === 0 || frrSettings[lang].vehicleTypes.lastUpdate < (new Date().getTime() - 5 * 100 * 60)) {
            logging.log("Daten werden abgefragt");

            // Daten werden abgerufen und über try ... catch Fehler abgefangen.
            try {
                frrSettings[lang].vehicleTypes.data = await $.getJSON("https://api.lss-manager.de/" + lang + "/vehicles"); // Ruft die Daten ab. Wenn ein Error kommt wird der folgende Code nicht mehr bearbeitet.
                frrSettings[lang].vehicleTypes.lastUpdate = new Date().getTime(); // Setzt den Update Zeitstempel wenn die Daten erfolgreich abgerufen wurden.

                logging.data(frrSettings[lang].vehicleTypes.data, "Neue Daten für Prefixing: ");

                // Prefix hinzufügen
                Object.keys(frrSettings[lang].vehicleTypes.data).forEach(function(key) {
                    const vehicle = frrSettings[lang].vehicleTypes.data[key];
                    updateCaptionPrefix(vehicle);
                });

                logging.log("Päfix hinzugefügt!");

                // Speichert die Fahrzeugnamen in ein Array und Sortiert es
                frrSettings[lang].vehicleTypes.captionList = [];
                for (const [vehicleId, vehicleData] of Object.entries(frrSettings[lang].vehicleTypes.data)) {
                    frrSettings[lang].vehicleTypes.captionList.push(vehicleData.caption);
                }
                frrSettings[lang].vehicleTypes.captionList.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);

                localStorage.setItem("frrSettings", JSON.stringify(frrSettings)); // Neue Daten werden in localStorage gespeichert

                logging.data(frrSettings[lang].vehicleTypes.data, "Daten aus API erfolgreich ausgelesen. Daten: ");
            } catch(error) {
                if (error.readyState === 0 && error.statusText === "error") {
                    logging.error("Fehler beim Abrufen der API: Netzwerkfehler oder CORS-Problem");
                } else {
                    logging.error(error, "Sonstiger Fehler beim Abrufen der API: ");
                }
            }
        } else logging.info("Daten sind noch aktuell!")
    }

    // Je nach trigger werden die Namen oder die IDs der Fahrzeuge als Array ausgegeben.
    function mapVehicles(arrClasses, trigger) {
        var returnValue = [];
        if (trigger == "type") {
            returnValue = $.map(arrClasses, function(item) {
                return aVehicleTypes.filter((obj) => obj.caption == item)[0].id;
            });
        } else if (trigger == "name") {
            returnValue = $.map(arrClasses, function(item) {
                return aVehicleTypes.filter((obj) => obj.id == item)[0].caption;
            });
        }
        return returnValue;
    }

    function mappingGpt(dataSet, mapArray, trigger) {
        if (trigger !== "caption" && trigger !== "id") {
            console.error("Mapping: Ungültiger Trigger!");
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
            console.error("Mapping: Ungültiger DataSet-Typ!");
        }

        return retVal;
    }

    function mapping(dataSet, mapArray, trigger) {
        var retVal = [];
        if (Array.isArray(dataSet)) { // Gebäude sind in einem Array gespeichert.
            logging.log("Mapping hat ein Array erkannt");
            if (trigger === "caption") { // Ausgabe eines Arrays von Captions erwünscht
                logging.log("Mapping: Trigger ist Caption");
                for (const id of mapArray) {
                    for (const obj of dataSet) {
                        if (obj.id === id) {
                            retVal.push(obj.caption);
                            break
                        }
                    }
                }
                return retVal
            } else if (trigger === "id") { // Ausgabe eines Arrays von IDs erwünscht
                logging.log("Mapping: Trigger ist Id");
                for (const caption of mapArray) {
                    for (const obj of dataSet) {
                        if (obj.caption === caption) {
                            retVal.push(obj.id);
                            break
                        }
                    }
                }
                return retVal
            }
            logging.error("Mapping: Kein Trigger festgelegt!");
        } else if (typeof dataSet === 'object') { // Fahrzeuge sind in einem Object gespeichert.
            logging.log("Mapping hat ein Objekt erkannt");
            if (trigger === "caption") { // Ausgabe eines Arrays von Captions erwünscht
                logging.log("Mapping: Trigger ist Caption");
                for (const id of mapArray) {
                    if (dataSet[id]) {
                        retVal.push(dataSet[id].caption);
                        break
                    }
                }
                return retVal
            } else if (trigger === "id") { // Ausgabe eines Arrays von IDs erwünscht
                logging.log("Mapping: Trigger ist Id");
                for (const caption of mapArray) {
                    for (const [id, data] of dataSet){
                        if (data.caption === caption){
                            retVal.push(id);
                            break
                        }
                    }
                }
                return retVal
            }
            logging.error("Mapping: Kein Trigger festgelegt!");
        }
        // Mapping konnte nicht durchgeführt werden!
        logging.error("Mapping konnte nicht durchgeführt werden");
    }

    // Hier wird je nach trigger die ID ider der Name der Leitstellen als Array ausgegeben.
    function mapDispatchCenter(arrDispatchCenter, trigger) {
        var returnValue = [];
        if (trigger == "name") {
            returnValue = $.map(arrDispatchCenter, function(item) {
                return aBuildings.filter((obj) => obj.id == item)[0].caption;
            });
        } else if (trigger == "id") {
            returnValue = $.map(arrDispatchCenter, function(item) {
                return aBuildings.filter((obj) => obj.caption == item)[0].id;
            });
        }
        return returnValue;
    }

    function formatTime(seconds) {
        var minutes = Math.floor(seconds / 60);
        var remainingSeconds = seconds % 60;

        // Add leading zeros if the number of minutes or seconds is single digit
        var formattedMinutes = (minutes < 10) ? "0" + minutes : minutes;
        var formattedSeconds = (remainingSeconds < 10) ? "0" + remainingSeconds : remainingSeconds;

        return formattedMinutes + ":" + formattedSeconds;
    };

    // Funktion zum Erstellen des frrSettings Objekt
    function createSettingsObject() {
        let newObject = {
            scriptVersion: "TBD", // Zuletzt verwendete Script Version
            [lang]:{
                aaoId: "0", // Hier wird die eingestellte AAO Id gespeichert
                general: { // Hier werden allgemeine Parameter gespeichert
                    fAutoAlert: false, // Automatisch alarmieren wenn FRR ausgeführt wird
                    fAutoShare: false, // Automatisch alarmieren und teilen wenn FRR ausgeführt wird
                    jsKeyCode: 86, // Javascript Code für den HotKey. Wird mit v-Taste vorbelegt. 65=a 86=v - nicht unbeding ASCII! Siehe hier: https://www.toptal.com/developers/keycode
                    fLoggingOn: false, // Schalter für logging
                    fUseDispatch: false, // nur Fahrzeuge bestimmter Leitstellen nutzen
                    alarmDelay: 1, // Standardmäßiges Delay beim automatischen alarmieren
                    fWoAao: true // Alarmierung mit/ohne AAO
                },
                vehicleTypes: {
                    lastUpdate: { }, // Hier kommt das Datum zum letzten Update rein.
                    data: { }, // Hier die Daten aus der API
                    captionList: [], // Hier die sortierte Liste mit den Namen der Fahrzeuge
                    settings: []// Hier die erlaubten Fahrzeuge
                },
                allowedDispatchIds: [], // Hier können die Einstellungen für Leitstellen hinzugefügt werden
                addBuildingIds: [] // Hier können die Einstellungen für Wachen hinzugefügt werden
            }
        };
        return newObject;
    }

    // FUnktion zum öffnen des Modals (Settings)
    function openFrrModal() {
        $("#frModalBody").html(
            `<label for="frrSelectGeneralSettings" style="margin-bottom: 0.2em;">${ lang == "de_DE" ? "Allgemeine Einstellungen" : "General settings" }</label>
                                <div style="display: flex; flex-direction: column;margin-top: 0;">
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrWoAao" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[lang].general.fWoAao ? "checked" : ""}>
                                        <label for="frrWoAao" style="margin-top: 0.; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Nutzung ohne AAO" : "Use without DINGENS" }</label>
                                    </div>
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrAutoAlert" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[lang].general.fAutoAlert ? "checked" : ""}>
                                        <label for="frrAutoAlert" style="margin-top: 0.; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Automatisch alarmieren (Verbandseinsatz)" : "alert automatically (alliance mission)" }</label>
                                    </div>
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrAutoShare" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[lang].general.fAutoShare ? "checked" : "" }>
                                        <label for="frrAutoShare" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Automatisch teilen (Eigener Einsatz)" : "share automatically (own mission)" }</label>
                                    </div>
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="checkbox" id="frrLoggingOn" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[lang].general.fLoggingOn ? "checked" : "" }>
                                        <label for="frrLoggingOn" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Logging ein" : "Logging enabled" }</label>
                                    </div>
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="number" id="frrAlarmDelay" min="0" max="10" style="width: 50px;" value="${frrSettings[lang].general.alarmDelay.toString() || ''}">
                                        <label for="frrAlarmDelay" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Eingabe Verzögerungszeit (0-10s)" : "Enter alarm delay (0-10s)" }</label>
                                    </div>
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="text" id="frrKeyCodeInput" placeholder="Enter KeyCode" maxlength="1" style="width: 50px;" value="${String.fromCharCode(frrSettings[lang].general.jsKeyCode) || ''}">
                                        <label for="frrKeyCodeInput" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Eingabe HotKey (nur Buchstaben)" : "Enter hot key (letters only)" }</label>
                                    </div>
                                </div>
                                <label for="frSelectVehicles">${ lang == "de_DE" ? "Fahrzeugtypen (Mehrfachauswahl mit Strg + Klick)" : "vehicle-types (multiple-choice with Strg + click)" }</label>
                                <select multiple class="form-control" id="frSelectVehicles" style="height:20em;width:35em;margin-bottom: 0.5em;"></select>

                                <label for="frSelectDispatch" style="margin-bottom: 0.2em;margin-top= 0;">${ lang == "de_DE" ? "Leitstellen (Mehrfachauswahl mit Strg + Klick)" : "dispatchcenter (multiple-choice with Strg + click)" }</label>
                                <div style="display: flex; flex-direction: column;margin-top: ;">
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="checkbox" id="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;" ${ dispatchSetup.useIt ? "checked" : "" }>
                                        <label for="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "nur Fahrzeuge bestimmter Leitstellen wählen" : "only use specific dispatchcenter" }</label>
                                    </div>
                                </div>
                                <select multiple class="form-control" id="frSelectDispatch" style="height:10em;width:35em"></select>`
                              );

        $("#frModalFooter").html(`<button type="button" class="btn btn-danger" data-dismiss="modal">${ lang == "de_DE" ? "Schließen" : "close" }</button>
                                  <button type="button" class="btn btn-success" id="frSavePreferences">${ lang == "de_DE" ? "Speichern" : "save" }</button>`);

        // Fügt Optionen in der Fahrzeugauswahl hinzu (Aus Array mit Fahrzeugnamen)
        for (i in frrSettings[lang].vehicleTypes.captionList) {
            $("#frSelectVehicles").append(`<option>${ frrSettings[lang].vehicleTypes.captionList[i] }</option>`);
        }
        /*
        // Fügt Optionen in der Leitstellenauswahl hinzu (Aus Array mit Leitstellennamen)
        for (i in frrSettings[lang].dispatch.captionList) {
            $("#frSelectDispatch").append(`<option>${ frrSettings[lang].dispatch.captionList[i] }</option>`);
        }
*/
        // Wählt die Fahrzeuge und Leitstellen an die zuvor gespeichert wurden
        $("#frSelectVehicles").val(mapVehicles(frrSettings[lang].vehicleTypes.settings, "name"));
        $("#frSelectDispatch").val(mapDispatchCenter(dispatchSetup.dispatchId, "name"));
    }

    // ###############
    // Initialisierung
    // ###############

    // Initialisieren der Logging Funktionen
    logging();

    // Vorbereitung der Sprache und der Einstellungsvariablen im lokalen Speicher, wenn diese nicht vorhanden sind
    var lang = I18n.locale;
    if (!localStorage.fr_dispatchSetup) localStorage.fr_dispatchSetup = JSON.stringify({ "dispatchId": [], "useIt": false, "additionalBuildings": [] });
    if (!localStorage.frrSettings) localStorage.setItem('frrSettings', JSON.stringify(createSettingsObject()));

    // Anlegen und beschreiben diverser Variablen
    var fLoggingOn = true; // Sollte die Loggingfunktion im Menü nicht eingeschaltet werden können kann hier der generelle Loggingmodus eingeschaltet werden. Standard: false
    var fIsHotKeyPressed = false // Initialisierung Flag Variable um doppeltes HotKey Drücken zu verhindern
    var aVehicleTypes = [];
    var frrSettings = JSON.parse(localStorage.getItem('frrSettings')); // Einstellungen aus dem localStorage holen
    var dispatchSetup = JSON.parse(localStorage.fr_dispatchSetup);
    var aBuildings = await $.getJSON('/api/buildings');

    logging.data(aBuildings, "Inhalt von aBuildings: ");

    // Alte Daten in neuen Speicher laden
    if (frrSettings[lang].vehicleTypes.settings.length === 0 && localStorage.firstResponder) {
        frrSettings[lang].vehicleTypes.settings = JSON.parse(localStorage.getItem('firstResponder')).vehicleTypes[lang];
        localStorage.setItem('frrSettings', JSON.stringify(frrSettings));
    }
    if (frrSettings[lang].aaoId === "0" && localStorage.firstResponder) {
        const oldData = JSON.parse(localStorage.getItem('firstResponder')).aaoId[lang];
        if (oldData.length > 1) {
            frrSettings[lang].aaoId = oldData;
        }
    }

    // HTML Code für Modal vorgeben (wird mehrfach genutzt)
    var frrModalElement = `
    <div class="modal fade" id="frModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="frModalLabel">${ lang == "de_DE" ? "Einstellungen" : "Settings" }</h3>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        </button>
                </div>
                <div class="modal-body" id="frModalBody" style="max-height: 1000px; overflow-y: auto;"></div>
                <div class="modal-footer" id="frModalFooter"></div>
             </div>
         </div>
     </div>
    `;

    // Schreiben des Scriptstarts ins Log
    logging.info("Wird ausgeführt!");
    logging.data(JSON.parse(localStorage.frrSettings)[lang].vehicleTypes.lastUpdate, "Zeitstempel aus frrSettings nach Parsing: ");
    logging.data(JSON.parse(localStorage.frrSettings)[lang].vehicleTypes.data, "Daten aus frrSettings vehicleTypes; ");

    //Ausführen der Funktion zum holen der Fahrzeugdaten in der entsprechenden Sprache
    aVehicleTypes = await getVehicleTypes(lang);
    await fetchVehicles(lang);

    // Schreiben der Fahrzeugtypen ins Log
    logging.data(aVehicleTypes,"aVehicleTypes");
    logging.data(frrSettings[lang].vehicleTypes.data,"frrSettings.vehicleTypes.data");

    if (!dispatchSetup.additionalBuildings) dispatchSetup.additionalBuildings = []; // Wird schon bei der Initialisierung in localStorage.fr_dispatchSetup geschrieben. Sollte dies durch eine alte Version jedoch schon passiert sein, könnte der EIntrag fehlen.

    // ######################
    // Einstellung der AAO ID
    // ######################

    // Fügt in der AAO Bearbeitung vor der ersten Checkbox eine eigene Check Box ein. Ist die entsprechende AAO in den Settings gespeichert wird das Häckchen gesetzt.
    if (window.location.pathname.includes("aaos") && window.location.pathname.includes("edit")) {
        $(".boolean.optional.checkbox")
            .before(`<label class="form-check-label" for="frSaveAaoId">
                <input class="form-check-input" type="checkbox" id="frSaveAaoId" ${ window.location.pathname.includes(frrSettings[lang].aaoId) ? "checked" : "" }>
                    ${ lang == "de_DE" ? "Diese ID für den First Responder nutzen." : "Use this id for FirstResponder." }
    </label>`);
    }

    // ##########################################
    // Hinzufügen des neuen Menübuttons mit Popup
    // ##########################################

    if (window.location.pathname === "/" &&
        (frrSettings[lang].general.fWoAao || frrSettings[lang].aaoId === "0")) {
        logging.log("Menübutton wird eingefügt");
        $('#navbar-main-collapse > ul').append(`<li class="btn btn-s" style="padding: 0px; border: 0px">
                                                    <a href="#" id="frrOpenModal" data-toggle="modal" data-target="#frModal">
                                                        <span style="margin-right: 2px;" class="glyphicon glyphicon-cog"></span>
                                                        <span>FRR</span>
                                                    </a>
                                                </li>
                                                ${frrModalElement}
                                                `);

        // Buttonclick öffnen des Menüs
        $("body").on("click","#frrOpenModal", async function() {
            const aDispatchCaptionList = await $.getJSON('/api/buildings'); // GEHT SO NICHT DA NOCH SORTIERT UND AUSGEMISTET WERDEN MUSS!!!
            openFrrModal();
            var modalHeight = $(window).height() - 200; // Adjust as needed
            logging.data(modalHeight, "Maximale höhe Modal Body");
            $('#frModalBody').css('max-height', modalHeight + 'px');
        });
    };

    // ###########################################
    // Hinzufügen der Einstellungstaste und -popup
    // ###########################################

    //  Wird ausgeführt wenn es ein Einsatzfenster ist
    if (window.location.pathname.includes("missions")) {
        var arrVehicles = [];
        var dispatchCenter = mapDispatchCenter(dispatchSetup.additionalBuildings, "name");
        var i;

        // Speichert die Fahrzeugnamen in ein Array und Sortiert es
        for (i in aVehicleTypes) {
            arrVehicles.push(aVehicleTypes[i].caption);
        }
        arrVehicles.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);

        //Erzeugt ein Array mit den Leitstellennamen und sortiert es anschließend Alphabetisch
        for (let e of aBuildings) {
            if (e.leitstelle_building_id) {
                var aLeitstelle = aBuildings.find(obj => obj.id == e.leitstelle_building_id);

                if (aLeitstelle && aLeitstelle.caption !== undefined && !dispatchCenter.includes(aLeitstelle.caption)) {
                    dispatchCenter.push(aLeitstelle.caption);
                    dispatchCenter.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);
                }
            }
        }

        // Erzeugt einen Button wenn eine aaoID festgelegt wurde (Checkbox in AAO Bearbeitung). Dieses wird hinter die entsprechende AAO gesetzt. Bei Klick wird ein Einstellungsfenster geöffnet.
        if (frrSettings[lang].aaoId) {
            $("#available_aao_" + frrSettings[lang].aaoId)
                .parent()
                .after(`<button type="button" class="btn btn-success btn-xs" data-toggle="modal" data-target="#frModal" style="height:24px" id="frOpenModal">
                        <div class="glyphicon glyphicon-cog" style="color:LightSteelBlue"></div>
                        </button>
                        ${frrModalElement}
                        `);
        }
    }


    // ######################################################
    // Wacheneinstellungen für zusätzlich freigegebene Wachen
    // ######################################################

    // Fügt eine Checkbox im Gebäude bearbeiten Fenster ein mit der ausgewählt werden kann, dass alle Fahrzeuge des Gebäudes verwendet werden dürfen
    if (window.location.pathname.includes("buildings") && window.location.pathname.includes("edit")) {
        $(".building_leitstelle_building_id")
            .after(`<div class="form-check">
                      <input type="checkbox" class="form-check-input" id="frCbxBuildingId" ${ $.inArray(+window.location.pathname.replace(/\D+/g, ""), dispatchSetup.additionalBuildings) > -1 ? "checked" : "" }>
                      <label class="form-check-label" for="frCbxBuildingId">${ lang == "de_DE" ? "Wachen-ID im First Responder berücksichtigen" : "use this building id for First Responder" }</label>
                    </div>`);
    }

    // ################################
    // Eventlistener für Klick-Aktionen
    // ################################

    // Auswertung, dass die Checkbox beim AAO Bearbeiten angeklickt wurde. Bei Abwahl löscht es die AAO ID. Bei Anwahl wird die aktuelle AAO ID aus der URL extrahiert und gespeichert.
    $("body").on("click", "#frSaveAaoId", function() {
        if ($("#frSaveAaoId")[0].checked) {
            frrSettings[lang].aaoId = window.location.pathname.replace(/\D+/g, "");
            logging.log("AAO ID wurde gesetzt");
        } else {
            frrSettings[lang].aaoId = "0";
            logging.log("AAO ID wurde gelöscht");
        }
        localStorage.setItem("frrSettings", JSON.stringify(frrSettings));
    });

    // Auswertung, dass die Checkbox beim Gebäude Bearbeiten angeklickt wurde. Bei Abwahl löscht es die abgewählte ID aus dem Array. Bei Anwahl wird sie hinzugefügt (wenn noch nicht vorhanden).
    $("body").on("click", "#frCbxBuildingId", function() {
        var buildingId = +window.location.pathname.replace(/\D+/g, "")
        if ($("#frCbxBuildingId")[0].checked) {
            dispatchSetup.additionalBuildings.push(buildingId);
        } else {
            dispatchSetup.additionalBuildings.splice($.inArray(buildingId, dispatchSetup.additionalBuildings), 1);
            if (dispatchSetup.dispatchId.includes(buildingId)) {
                dispatchSetup.dispatchId.splice($.inArray(buildingId, dispatchSetup.dispatchId), 1);
            }
        }
        localStorage.fr_dispatchSetup = JSON.stringify(dispatchSetup);
    });

    // Wählt die gespeicherten Einträge der Leitstellen an wenn die entsprechende Checkbox angewählt ist. Notwendig? Auswahl kann eigentlich immer angezeigt werden?
    $("body").on("click", "#frCbxUseLst", function() {
        if ($("#frCbxUseLst")[0].checked) {
            $("#frSelectDispatch").val(mapDispatchCenter(dispatchSetup.dispatchId, "name"));
        } else {
            $("#frSelectDispatch").val([]);
        }
    });

    // Auswertung, dass der Button zum Speichern der Einstellungen gedrückt wurde. Speichert die IDs in frrSettings.
    $("body").on("click", "#frSavePreferences", function() {
        frrSettings[lang].vehicleTypes.settings = mapVehicles($("#frSelectVehicles").val(), "type");
        dispatchSetup.dispatchId = $("#frSelectDispatch").val() ? mapDispatchCenter($("#frSelectDispatch").val(), "id") : []; // ALT
        dispatchSetup.useIt = $("#frCbxUseLst")[0].checked; // ALT
        frrSettings[lang].general.fAutoAlert = $("#frrAutoAlert")[0].checked;
        frrSettings[lang].general.fAutoShare = $("#frrAutoShare")[0].checked;
        frrSettings[lang].general.fLoggingOn = $("#frrLoggingOn")[0].checked;
        frrSettings[lang].general.alarmDelay = parseInt($("#frrAlarmDelay").val());
        frrSettings[lang].general.jsKeyCode = $("#frrKeyCodeInput").val().toUpperCase().charCodeAt(0);
        localStorage.fr_dispatchSetup = JSON.stringify(dispatchSetup); // ALT
        localStorage.setItem('frrSettings', JSON.stringify(frrSettings));
        $("#frSavePreferences").addClass("hidden");

        if (lang == "de_DE") {
            $("#frModalBody").html("<h3><center>Die Einstellungen wurden gespeichert.</center></h5>");
        } else {
            $("#frModalBody").html("<h3><center>Settings successfully saved.</center></h5>");
        }
    });

    $("body").on("click","#frOpenModal", function() {
        openFrrModal();
        var modalHeight = $(window).height() - 200; // Adjust as needed
        logging.data(modalHeight, "Maximale höhe Modal Body");
        $('#frModalBody').css('max-height', modalHeight + 'px');
    });

    // Hier findet die Magie statt. Wenn der FR AAO Button gedrückt wird, wird entsprechend der erste Eintrag gesucht der den Anforderungen entspricht.
    $("#aao_" + frrSettings[lang].aaoId).click(function() {

        var foundFirstResponder = false;

        $(".vehicle_checkbox").each(function() {
            var vType = +$(this).attr("vehicle_type_id"); // Fahrzeug Typ ID
            var vId = $(this).attr("value"); //Fahrzeug ID
            var lstId = +$(this).attr("building_id").split("_")[1]; //Leitstellen ID
            var buId = +$(this).attr("building_id").split("_")[0]; // Gebäude ID

            if (frrSettings[lang].vehicleTypes.settings.includes(vType) && //Fahrzeugtyp wurde ausgewählt UND
                !$("#vehicle_checkbox_" + vId)[0].checked && // Checkbox ist NICHT angewählt UND
                !$("#vehicle_checkbox_" + vId)[0].disabled && // Checkbox ist NICHT deaktiviert UND
                (dispatchSetup.useIt === false || dispatchSetup.dispatchId.includes(lstId) || dispatchSetup.additionalBuildings.includes(buId))) { //Gebäudeauswertung wird nicht genutzt ODER Leitstelle wurde ausgewählt ODER Gebäude wurde ausgewählt
                $("#vehicle_checkbox_" + vId).click(); // Die Checkbox wird ausgewählt
                foundFirstResponder = true;
                let shareButton = $( ".alert_next_alliance" )[0];
                if (shareButton && frrSettings[lang].general.fAutoShare) {
                    logging.log("Sharebutton gefunden und draufgeklickt");
                    setTimeout(function() {
                        $( ".alert_next_alliance" )[0].click();
                    },frrSettings[lang].general.alarmDelay * 1000);
                } else if (frrSettings[lang].general.fAutoAlert) {
                    logging.warn('Sharebutton nicht gefunden oder automatisches Teilen abgeschaltet. Autoshare: ' + frrSettings[lang].general.fAutoShare)
                    setTimeout(function() {
                        $( ".alert_next" )[0].click();
                    },frrSettings[lang].general.alarmDelay * 1000);
                } else {
                    logging.warn("Sharebutton nicht gefunden oder automatisches Teilen abgeschaltet UND automatisches Alarmieren abgeschaltet. Autoshare: " + frrSettings[lang].general.fAutoShare + " AutoAlert: " + frrSettings[lang].general.fAutoAlert);
                }
                return false; // Beendet die Suche nach dem First Responder
            }
        });

        // Gibt einen Error in die Konsole wenn kein passendes Fahrzeug gefunden wurde.
        if (!foundFirstResponder) { // Wenn kein geeignetes Fahrzeug gefunden wurde
            console.error("First Responder Reloaded: Kein geeignetes Fahrzeug gefunden!");

        }
    });

    // Event keyup zur Auswertung von Eingaben und zwecks HotKey überwachen
    $(document).keyup(function(evt) {

        logging.log('Gedrückter Keycode im keyup Event: ' + evt.keyCode);

        if (!$("input:text").is(":focus") && evt.keyCode === frrSettings[lang].general.jsKeyCode && !fIsHotKeyPressed) { // Überprüft, ob kein Texteingabefeld den Fokus hat, die Taste dem Schlüsselentspricht und die Taste noch nicht gedrückt wurde
            logging.log("HotKey wurde gedrückt!");
            fIsHotKeyPressed = true;
            $('#aao_' + frrSettings[lang].aaoId + '')[0].click(); // Klickt auf die AAO
        } else if (evt.target.id === "frrAlarmDelay") { // Prüft ob die Alarmverzögerung eingegeben wurde
            logging.data(evt.target.value,"Inhalt des Eingabefeldes nach Änderung: ")
            if (parseInt(evt.target.value) > 10) {
                evt.preventDefault();
                evt.target.value = "10"
            } else if (parseInt(evt.target.value) < 0) {
                evt.preventDefault();
                evt.target.value = "0"
            }
        }
    });

    // Event keydown zur Auswertung von Eingaben überwachen
    $(document).keydown(function(evt) {
        if (evt.target.id === "frrKeyCodeInput" && // Überprüft, ob das Ereignisziel das Eingabefeld ist
            evt.keyCode !== 8 && // Überprüft, ob die Taste nicht Backspace ist
            !(evt.keyCode >= 65 && evt.keyCode <= 90)) { // Überprüft, ob die Taste kein Buchstabe (A-Z) ist
            evt.preventDefault(); // Verhindert das Standardverhalten der Taste wenn die Taste nicht erlaubt ist
            logging.warn('Taste ist als HotKey nicht erlaubt! CharCode: ' + evt.keyCode); // Protokolliert, dass die Taste nicht erlaubt ist.
        }
    });

    // Fahrzeit nach 1000 Millisekunden in AAO Button schreiben. 100ms gehen auch sind aber bei manchen Ladezeiten zu knapp.
    setTimeout(setAaoTime,1000);


})();
