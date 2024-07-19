// ==UserScript==
// @name         [LSS]FirstResponderReloaded
// @namespace    FirstRespond
// @version      2.1.0
// @description  Wählt das nächstgelegene FirstResponder-Fahrzeug aus (Original von JuMaHo und DrTraxx)
// @author       SaibotH
// @license      MIT
// @homepage     https://github.com/SaibotH-LSS/LSSFirstResponderReloaded
// @homepageURL  https://github.com/SaibotH-LSS/LSSFirstResponderReloaded
// @supportURL   https://github.com/SaibotH-LSS/LSSFirstResponderReloaded/issues
// @updateURL    https://raw.githubusercontent.com/SaibotH-LSS/LSSFirstResponderReloaded/main/LSSFirstResponderReloaded.user.js
// @downloadURL  https://raw.githubusercontent.com/SaibotH-LSS/LSSFirstResponderReloaded/main/LSSFirstResponderReloaded.user.js
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

    function versioning(version) {
        logging.data(version, "Versionsnummer an versioning() übergeben: ");
        var dataChanged = false;
        // Versionssprung von TBD auf 2.0.0
        if (frrSettings.scriptVersion === "TBD") {
            // Alte Daten in neuen Speicher laden
            // firstResponder aus den alten Daten holen und anschließend löschen
            if (localStorage.firstResponder) {
                const oldData = JSON.parse(localStorage.getItem('firstResponder'));
                if (frrSettings[lang].vehicleTypes.settings.length === 0 && oldData.vehicleTypes[lang]) {
                    frrSettings[lang].vehicleTypes.settings = oldData.vehicleTypes[lang];
                    logging.log("Alte Fahrzeugeinstellungen wurden übernommen!");
                }
                if (frrSettings[lang].aaoId === "00000000" && oldData.aaoId[lang]) {
                    frrSettings[lang].aaoId = oldData.aaoId[lang];
                    frrSettings[lang].general.fWoAao = false; //AAO ist vorhanden daher Nutzung mit AAO
                    logging.log("Alte AAO wurde übernommen!");
                }
                // alte Daten nach der Übernahme löschen.
                localStorage.removeItem('firstResponder');
                logging.log("firstResponder wurde aus localStorage gelöscht!")
            }
            // fr_dispatchSetup aus den alten Daten holen und anschließend löschen
            if (localStorage.fr_dispatchSetup) {
                const oldData = JSON.parse(localStorage.getItem('fr_dispatchSetup'));
                // Dispatch IDs holen
                if (frrSettings[lang].allowedBuildingIds.length === 0) {
                    frrSettings[lang].allowedBuildingIds = oldData.dispatchId;
                    logging.log("Alte erlaubte Gebäude (Leitstellen) wurden übernommen!");
                }
                // Additional buildings holen
                if (frrSettings[lang].addBuildingIds.length === 0) {
                    frrSettings[lang].addBuildingIds = oldData.additionalBuildings;
                    logging.log("Alte zusätzliche Wachen wurden übernommen!");
                }
                // UseIt holen
                if (frrSettings[lang].general.fUseDispatch !== oldData.useIt) {
                    frrSettings[lang].general.fUseDispatch = oldData.useIt;
                    logging.log("Alte UseIt einstellung wurde übernommen!");
                }
                // alte Daten nach der Übernahme löschen.
                localStorage.removeItem('fr_dispatchSetup');
                logging.log("fr_dispatchSetup wurde aus localStorage gelöscht!");
            }
            if (localStorage.aVehicleTypesNew) {
                localStorage.removeItem('aVehicleTypesNew');
                logging.log("aVehicleTypesNew wurde aus localStorage gelöscht");
            }
            frrSettings.scriptVersion = "2.1.0"
            dataChanged = true;
            logging.log("Versioning hat Version TBD zu 2.1.0 übersetzt")
        }

        // Versionssprung von 2.0.0 auf 2.0.2
        if (frrSettings.scriptVersion === "2.0.0" || frrSettings.scriptVersion === "2.0.1") {
            frrSettings.scriptVersion = "2.0.2";
            dataChanged = true;
        }
        if (frrSettings.scriptVersion === "2.0.2") {
            frrSettings[lang].customVehicleTypes = {};
            frrSettings[lang].customVehicleTypes.captionList = [];
            frrSettings[lang].customVehicleTypes.settings = [];
            frrSettings[lang].customVehicleTypes.lastUpdate = " ";
            frrSettings.scriptVersion = "2.1.0";
            dataChanged = true;
        }

        // !!!Letzter Schritt im Versioning!!!
        if (dataChanged) {
            localStorage.setItem('frrSettings', JSON.stringify(frrSettings));
            logging.log("Versioning hat Daten in localStorage aktualisiert");
        }
    }

    function getFirstResponder() {
        var retVal = {};
        var fFirstResponderFound = false;

        // alle Checkboxen durchgehen ob es ein Fahrzeug gibt welches als First Responde erlaubt ist.
        $(".vehicle_checkbox").each(function() {
            retVal.vType = +$(this).attr("vehicle_type_id"); // Fahrzeug Typ ID
            retVal.vId = $(this).attr("value"); //Fahrzeug ID
            retVal.lstId = +$(this).attr("building_id").split("_")[1]; //Leitstellen ID
            retVal.buId = +$(this).attr("building_id").split("_")[0]; // Gebäude ID
            retVal.timeAttr = $("#vehicle_sort_" + retVal.vId).attr("timevalue");
            retVal.vehicleType = $("#vehicle_element_content_" + retVal.vId).attr("vehicle_type");

            if (((frrSettings[lang].vehicleTypes.settings.includes(retVal.vType) && !frrSettings[lang].customVehicleTypes.captionList.includes(retVal.vehicleType)) || // Fahrzeugtyp wurde ausgewählt und hat keine eigene Kategorie ODER
                 frrSettings[lang].customVehicleTypes.settings.includes(retVal.vehicleType)) && // Eigener Fahrzeugtyp wurde ausgewählt UND
                !this.checked && // Checkbox ist NICHT angewählt UND
                !this.disabled && // Checkbox ist NICHT deaktiviert UND
                (frrSettings[lang].general.fUseDispatch === false || frrSettings[lang].allowedBuildingIds.includes(retVal.lstId) || frrSettings[lang].addBuildingIds.includes(retVal.buId))) { // Gebäudesettings werden erfüllt.
                fFirstResponderFound = true;
                logging.data(retVal, "First Responder wurde gefunden. Daten aus getFirstResponder: ");
                return false;
            }
        })

        // Fahrzeug zurückgeben wenn eines gefunden wurde.
        if (fFirstResponderFound === true) {
            return retVal;
        } else {
            logging.log("getFirstResponder hat kein passendes Fahrzeug gefunden");
            return undefined;
        }
    }

    // Funktion für die Auswahl des First Responders, der Alarmierung und des Teilens des Einsatzes
    function frrAlert() {
        if (!fFrrDone) {
            const firstResponder = getFirstResponder()
            if (firstResponder) {
                let shareButton = $( ".alert_next_alliance" )[0];
                $("#vehicle_checkbox_" + firstResponder.vId).click();
                logging.log("First Responder wurde ausgewählt");
                fFrrDone = true;
                if (shareButton && frrSettings[lang].general.fAutoShare) {
                    logging.log("Sharebutton gefunden und draufgeklickt");
                    setTimeout(function() {
                        $( ".alert_next_alliance" )[0].click();
                    },frrSettings[lang].general.alarmDelay * 1000);
                } else if (frrSettings[lang].general.fAutoAlert) {
                    logging.log('Sharebutton nicht gefunden oder automatisches Teilen abgeschaltet. Alarmieren und nächster Einsatz geklickt. Autoshare: ' + frrSettings[lang].general.fAutoShare)
                    setTimeout(function() {
                        $( ".alert_next" )[0].click();
                    },frrSettings[lang].general.alarmDelay * 1000);
                } else {
                    logging.log("Sharebutton nicht gefunden oder automatisches Teilen abgeschaltet UND automatisches Alarmieren abgeschaltet. Autoshare: " + frrSettings[lang].general.fAutoShare + " AutoAlert: " + frrSettings[lang].general.fAutoAlert);
                }
            } else {
                logging.error("frrAlert(): Es konnte kein First Responder alarmiert werden!")
            }
        } else {
            logging.log("frrAlert() wurde bereits ausgeführt!");
        }
    }

    // Fügt die Zeit zum AAO Button hinzu
    function getAaoTime() {
        const firstResponder = getFirstResponder();
        // Prüfen ob es einen First Responder gibt und das Zeitattribut vorhanden ist
        if (!firstResponder) {
            logging.log("Kein First Responder gefunden!");
            return "no FR";
        }
        if (firstResponder.timeAttr === undefined) {
            logging.log("Zeitattribut ist nicht vorhanden!");
            return "N/A";
        }

        //Zeit Formattieren und in das Textfeld schreiben
        var seconds = parseInt(firstResponder.timeAttr);
        var minutes = Math.floor(seconds / 60);
        var remainingSeconds = seconds % 60;
        var formattedMinutes = (minutes < 10) ? "0" + minutes : minutes;
        var formattedSeconds = (remainingSeconds < 10) ? "0" + remainingSeconds : remainingSeconds;
        var frrTime = formattedMinutes + ":" + formattedSeconds;
        logging.data(frrTime, "Zeit erstellt und zurückgegeben: ");
        return frrTime
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
            { prefix: "Wasser - ", buildings: [15], priority: 2 }, // Wasserrettung
            { prefix: "Berg - ", buildings: [25], priority: 7 }, //
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

    // Holt die Fahrzeugdaten aus der LSSM API ab, verarbeitet diese (Präfix und Fahrzeugnamenliste) und legt diese im local Storage ab.
    async function fetchVehicles(lang) {
        logging.data(Object.keys(frrSettings[lang].vehicleTypes.data).length, "Länge der Daten: ");
        logging.data(frrSettings[lang].vehicleTypes.lastUpdate, "Zeitstempel der alten Daten: ")
        logging.data(new Date().getTime(), "Aktueller Zeitstempel: ");

        // Daten werden abgerufen und bearbeitet wenn noch keine vorhanden sind oder die Daten zu alt sind
        if (Object.keys(frrSettings[lang].vehicleTypes.data).length === 0 || frrSettings[lang].vehicleTypes.lastUpdate < (new Date().getTime() - 5 * 1000 * 60)) {
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
                    logging.error("Fehler beim Abrufen der LSSM API: Netzwerkfehler oder CORS-Problem");
                } else {
                    logging.error(error, "Sonstiger Fehler beim Abrufen der LSSM API: ");
                }
            }
            await fetchCustomVehicles(lang);
        } else logging.info("Daten sind noch aktuell!")
    }

    // Holt die Custom Vehicles aus der LSS API und schreibt diese in den local Storage
    async function fetchCustomVehicles(lang) {
        logging.log("Eigene fahrzeugtypen werden abgerufen");
        try {
            const userVehicles = await $.getJSON('/api/vehicles');
            const vehicleTypeSet = new Set();
            userVehicles.forEach(vehicle => {
                if (vehicle.vehicle_type_caption) {
                    vehicleTypeSet.add(vehicle.vehicle_type_caption);
                }
            });
            frrSettings[lang].customVehicleTypes.captionList = Array.from(vehicleTypeSet);
            frrSettings[lang].customVehicleTypes.captionList.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);
            localStorage.setItem("frrSettings", JSON.stringify(frrSettings)); // Neue Daten werden in localStorage gespeichert

            frrSettings[lang].customVehicleTypes.lastUpdate = new Date().toDateString();
            localStorage.setItem('frrSettings', JSON.stringify(frrSettings));

            logging.data(frrSettings[lang].customVehicleTypes.captionList, "Eigene fahrzeugtypen erfolgreich abgerufen: ");

        } catch(error) {
            if (error.readyState === 0 && error.statusText === "error") {
                logging.error("Fehler beim Abrufen der LSS API: Netzwerkfehler oder CORS-Problem");
            } else {
                logging.error(error, "Sonstiger Fehler beim Abrufen der LSS API: ");
            }
        }
    }

    // Je nach Trigger werden die Namen oder die IDs eines Arrays oder eines Objekts (dataSet) die zu einem anderen Array passen (mapArray) als neues Array (retVal) ausgegeben
    function mapping(dataSet, mapArray, trigger) {
        logging.data(dataSet, "Mapping dataSet: ");
        logging.data(mapArray, "Mapping mapArray: ");
        logging.data(trigger, "Mapping trigger: ");
        if (trigger !== "caption" && trigger !== "id") {
            logging.error("Mapping: Ungültiger Trigger!");
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
            logging.error("Mapping: Ungültiger DataSet-Typ!");
        }

        return retVal;
    }

    // Funktion zum Erstellen des frrSettings Objekt
    function createSettingsObject() {
        let newObject = {
            scriptVersion: "TBD", // Zuletzt verwendete Script Version
            [lang]:{
                aaoId: "00000000", // Hier wird die eingestellte AAO Id gespeichert
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
                customVehicleTypes: {
                    lastUpdate: " ", // Hier kommt das Datum zum letzten Update rein.
                    captionList: [], // Hier kommen die Namen aller eigenen Fahrzeugtypen als Array rein
                    settings: [] // hier kommen die Namen der ausgewählten eigenen Fahrzeugtypen als Array rein
                },
                allowedBuildingIds: [], // Hier können die Einstellungen für Leitstellen/Zusätzlichen Gebäuden hinzugefügt werden
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
                                        <label for="frrWoAao" style="margin-top: 0.; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Nutzung ohne AAO (ACHTUNG: Änderung verursacht Reload der Seite!)" : "Use without DINGENS" }</label>
                                    </div>
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrAutoAlert" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[lang].general.fAutoAlert ? "checked" : ""}>
                                        <label for="frrAutoAlert" style="margin-top: 0.; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Nach Auswahl alarmieren und nächter Einsatz (Verbandseinsatz)" : "Alert and next after selection (alliance mission)" }</label>
                                    </div>
                                    <div style="margin-bottom: 0;">
                                        <input type="checkbox" id="frrAutoShare" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[lang].general.fAutoShare ? "checked" : "" }>
                                        <label for="frrAutoShare" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Nach Auswahl alarmieren, teilen und nächster Einsatz (Eigener Einsatz)" : "Alert, share and next after selection (own mission)" }</label>
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
                                        <label for="frrKeyCodeInput" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "Eingabe HotKey (nur Buchstaben, kein A,D,E,N,S,W oder X)" : "Enter hot key (letters only, no A,D,E,N,S,W or X)" }</label>
                                    </div>
                                </div>
                                <label for="frSelectVehicles">${ lang == "de_DE" ? "Fahrzeugtypen (Mehrfachauswahl mit Strg + Klick)" : "vehicle-types (multiple-choice with Strg + click)" }</label>
                                <select multiple class="form-control" id="frSelectVehicles" style="height:20em;width:35em;margin-bottom: 0.5em;"></select>
                                <label for="frSelectCustomVehicles" style="margin-bottom: 0.2em;margin-top= 0;">${ lang == "de_DE" ? "Eigene Fahrzeugtypen (Mehrfachauswahl mit Strg + Klick)" : "Custom Vehicletypes (multiple-choice with Strg + click)" }</label>
                                <div style="display: flex; flex-direction: column;margin-top: ;">
                                </div>
                                <select multiple class="form-control" id="frSelectCustomVehicles" style="height:10em;width:35em;margin-bottom: 0.5em;"></select>
                                <label for="frSelectDispatch" style="margin-bottom: 0.2em;margin-top= 0;">${ lang == "de_DE" ? "Leitstellen (Mehrfachauswahl mit Strg + Klick)" : "dispatchcenter (multiple-choice with Strg + click)" }</label>
                                <div style="display: flex; flex-direction: column;margin-top: ;">
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="checkbox" id="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;" ${ frrSettings[lang].general.fUseDispatch ? "checked" : "" }>
                                        <label for="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "nur Fahrzeuge bestimmter Leitstellen wählen" : "only use specific dispatchcenter" }</label>
                                    </div>
                                </div>
                                <select multiple class="form-control" id="frSelectDispatch" style="height:10em;width:35em;margin-bottom: 0.5em;"></select>`
                              );

        $("#frModalFooter").html(`<button type="button" class="btn btn-danger" data-dismiss="modal">${ lang == "de_DE" ? "Schließen" : "close" }</button>
                                  <button type="button" class="btn btn-success" id="frSavePreferences">${ lang == "de_DE" ? "Speichern" : "save" }</button>
                                  <div class="pull-left" style="padding-top: 7px; padding-bottom: 7px;">Version: ${scriptVersion}</div>`);

        // Liste der Leitstellennamen aus allen Gebäuden des Users extrahieren
        var aDispatchCaptions = aUserBuildings
        .filter(entry => entry.building_type === 7)
        .map(entry => entry.caption);

        // Namen der zusätzlich ausgewählten Gebäude hinzufügen
        aDispatchCaptions = aDispatchCaptions.concat(mapping(aUserBuildings, frrSettings[lang].addBuildingIds, "caption"));

        // Sortieren
        aDispatchCaptions.sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);
        logging.data(aDispatchCaptions, "Inhalt von aDisplatchCaptions: ");

        // Fügt Optionen in der Fahrzeugauswahl hinzu (Aus Array mit Fahrzeugnamen)
        for (const i in frrSettings[lang].vehicleTypes.captionList) {
            $("#frSelectVehicles").append(`<option>${ frrSettings[lang].vehicleTypes.captionList[i] }</option>`);
        }
        // Fügt Optionen in der leitstellenauswahl hinzu (Aus Array mit Gebäudenamen)
        for (const i in aDispatchCaptions) {
            $("#frSelectDispatch").append(`<option>${ aDispatchCaptions[i] }</option>`);
        }
        // Fügt Optionen in der "Custom Vehicle Types" Liste hinzu (Aus Array der Fahrzeugtypen)
        for (const i in frrSettings[lang].customVehicleTypes.captionList) {
            $("#frSelectCustomVehicles").append(`<option>${ frrSettings[lang].customVehicleTypes.captionList[i] }</option>`);
        }

        // Wählt die Fahrzeuge und Leitstellen an die zuvor gespeichert wurden
        $("#frSelectVehicles").val(mapping(frrSettings[lang].vehicleTypes.data, frrSettings[lang].vehicleTypes.settings, "caption"));
        $("#frSelectDispatch").val(mapping(aUserBuildings, frrSettings[lang].allowedBuildingIds, "caption"));
        $("#frSelectCustomVehicles").val(frrSettings[lang].customVehicleTypes.settings);
    }

    // ###############
    // Initialisierung
    // ###############

    // Initialisieren der Logging Funktionen
    logging();

    // Vorbereitung der Sprache und der Einstellungsvariablen im lokalen Speicher, wenn diese nicht vorhanden sind
    var lang = I18n.locale;
    if (!localStorage.frrSettings) localStorage.setItem('frrSettings', JSON.stringify(createSettingsObject()));

    // Anlegen und beschreiben diverser Variablen
    var fLoggingOn = false; // Sollte die Loggingfunktion im Menü nicht eingeschaltet werden können kann hier der generelle Loggingmodus eingeschaltet werden. Standard: false
    var fFrrDone = false; // Flag ob First Responder schon ausgeführt wurde
    var frrSettings = JSON.parse(localStorage.getItem('frrSettings')); // Einstellungen aus dem localStorage holen
    var pointless = "Warning: pointless!";
    var fMenuButtonAdded = false;
    var aUserBuildings = await $.getJSON('/api/buildings'); // Die Gebäude des Benutzers abholen (Evtl. bei Buttonklick auf Menü holen?)
    var scriptVersion = GM_info.script.version;

    // Versionierung prüfen
    if (frrSettings.scriptVersion !== scriptVersion) versioning(scriptVersion);

    // Täglicher Abruf der eigenen Fahrzeugtypen
    if (frrSettings[lang].customVehicleTypes.lastUpdate !== new Date().toDateString()) {
        fetchCustomVehicles(lang);
    }

    // HTML Code für Modal vorgeben (wird mehrfach genutzt)
    var frrModalElement = `
    <div class="modal fade" id="frModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title" id="frModalLabel">${ lang == "de_DE" ? "Einstellungen FirstResponderReloaded" : "Settings Einstellungen FirstResponderReloaded" }</h3>
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

    // ######################
    // Einstellung der AAO ID
    // ######################

    // Fügt in der AAO Bearbeitung vor der ersten Checkbox eine eigene Check Box ein. Ist die entsprechende AAO in den Settings gespeichert wird das Häckchen gesetzt.
    if (window.location.pathname.includes("aaos") && window.location.pathname.includes("edit") && !frrSettings[lang].general.fWoAao) {
        $(".boolean.optional.checkbox")
            .before(`<label class="form-check-label" for="frSaveAaoId">
                         <input class="form-check-input" type="checkbox" id="frSaveAaoId" ${ window.location.pathname.includes(frrSettings[lang].aaoId) ? "checked" : "" }>
                         ${ lang == "de_DE" ? "Diese ID für den First Responder nutzen. (ACHTUNG: Auswahl verursacht Reload!)" : "Use this id for FirstResponder. (CAUTION: Causes reload" }
                     </label>`);

        // Auswertung, dass die Checkbox beim AAO Bearbeiten angeklickt wurde. Bei Abwahl löscht es die AAO ID. Bei Anwahl wird die aktuelle AAO ID aus der URL extrahiert und gespeichert.
        $("body").on("click", "#frSaveAaoId", function() {
            if ($("#frSaveAaoId")[0].checked) {
                frrSettings[lang].aaoId = window.location.pathname.replace(/\D+/g, "");
                logging.log("AAO ID wurde gesetzt");
            } else {
                frrSettings[lang].aaoId = "00000000";
                logging.log("AAO ID wurde gelöscht");
            }
            localStorage.setItem("frrSettings", JSON.stringify(frrSettings));

            // Reload nach Änderung
            window.parent.location.reload();
        });
    }

    // ########################################################################################
    // Hinzufügen der Settingbuttons mit Popup je nachdem ob AAO Button benutzt wird oder nicht
    // ########################################################################################

    // Button im Menü wenn AAO nich genutzt wird oder keine EIngestellt ist
    if (window.location.pathname === "/" &&
        (frrSettings[lang].general.fWoAao || frrSettings[lang].aaoId === "00000000")) {
        logging.log("Menübutton wird eingefügt");
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

    // ############################################################################
    // Hinzufügen des Menübuttons wenn AAO verwendet wird und sie nicht 0000000 ist
    // ############################################################################

    if (window.location.pathname.includes("missions") &&
        !frrSettings[lang].general.fWoAao && frrSettings[lang].aaoId !== "00000000") {
        $("#available_aao_" + frrSettings[lang].aaoId)
            .parent()
            .after(`<button type="button" class="btn btn-success btn-xs" data-toggle="modal" data-target="#frModal" style="height:24px" id="frrOpenModal">
                        <div class="glyphicon glyphicon-cog" style="color:LightSteelBlue"></div>
                    </button>
                    ${frrModalElement}
                    `);

        fMenuButtonAdded = true;

        setTimeout(function() {
            document.getElementById("aao_timer_" + frrSettings[lang].aaoId).innerText = getAaoTime();
        }, 800);

        $("#aao_" + frrSettings[lang].aaoId).click(function() {
            logging.log("First Responder AAO wurde geklickt!");
            frrAlert();
        });
    }

    // ##########################################################
    // Hinzufügen des Alarmbuttons wenn keine AAO verwendet wird.
    // ##########################################################

    // Alarmbutton wenn keine AAO genutzt wird
    if (window.location.pathname.includes("missions") &&
        (frrSettings[lang].general.fWoAao || frrSettings[lang].aaoId === "00000000")) {
        $('.flex-row.flex-nowrap:not(.navbar-right, .hidden-xs)')
            .last()
            .after(`<div class="flex-row flex-nowrap">
                        <a href="#" aria-role="button" class="btn btn-primary btn-sm" id="frrAlertButton" style="height: 30px;">
                            <img class="icon icons8-Phone-Filled" src="/images/icons8-phone_filled.svg" width="18" height="18" aria-hidden="true">
                            <span aria-hidden="true">First Responder</span>
                            <span class="badge" aria-hidden="true" id="frrTime">${ lang == "de_DE" ? "warte" : "wait" }</span>
                        </a>
                        <a href="#" aria-role="button" class="btn btn-warning btn-sm" data-toggle="modal" data-target="#frModal" id="frrOpenModal" style="height: 30px;">
                            <span class="glyphicon glyphicon-cog" style="font-size: 17px;"></span>
                        </a>
                    </div>
                    ${frrModalElement}`);

        fMenuButtonAdded = true;

        setTimeout(function() {
            document.getElementById("frrTime").innerText = getAaoTime();
        }, 800);

        logging.data(window.location.pathname.replace(/\D+/g, ""), "Pfadname Alarmfenster: "); // Dies nutzen um die Restdauer auszulesen!

        $("body").on("click", "#frrAlertButton", function() {
            logging.log("First Responder Alarmbutton wurde geklickt!");
            frrAlert();
        });
    }

    // ##############################
    // Eventlistener für Menü Buttons
    // ##############################

    if (fMenuButtonAdded) {
        logging.log("Auswertung menübuttons wurde hinzugefügt");
        // Auswertung, dass der Button zum Speichern der Einstellungen gedrückt wurde. Speichert die IDs in frrSettings.
        $("body").on("click", "#frSavePreferences", function() {
            // Auswerten ob ein Reload durchgeführt und ob die AAO ID auf 0 gesetzt werden muss.
            var fReload = false;
            if (frrSettings[lang].general.fWoAao !== $("#frrWoAao")[0].checked) {
                fReload = true;
                if ($("#frrWoAao")[0].checked) {
                    frrSettings[lang].aaoId = "00000000";
                }
            }

            // Speichern der Daten aus dem Modal in die entsprechenden Variablen
            frrSettings[lang].general.fWoAao = $("#frrWoAao")[0].checked;
            frrSettings[lang].general.fAutoAlert = $("#frrAutoAlert")[0].checked;
            frrSettings[lang].general.fAutoShare = $("#frrAutoShare")[0].checked;
            frrSettings[lang].general.fLoggingOn = $("#frrLoggingOn")[0].checked;
            frrSettings[lang].general.alarmDelay = parseInt($("#frrAlarmDelay").val());
            frrSettings[lang].general.jsKeyCode = $("#frrKeyCodeInput").val().toUpperCase().charCodeAt(0);
            frrSettings[lang].vehicleTypes.settings = $("#frSelectVehicles").val() ? mapping(frrSettings[lang].vehicleTypes.data, $("#frSelectVehicles").val(), "id") : [];
            frrSettings[lang].customVehicleTypes.settings = $("#frSelectCustomVehicles").val() ? $("#frSelectCustomVehicles").val() : [];
            frrSettings[lang].general.fUseDispatch = $("#frCbxUseLst")[0].checked;
            frrSettings[lang].allowedBuildingIds = $("#frSelectDispatch").val() ? mapping(aUserBuildings, $("#frSelectDispatch").val(), "id") : [];

            // Aktualisieren des local Storag nach übernahme der Daten
            localStorage.setItem('frrSettings', JSON.stringify(frrSettings));

            // Reload wenn die Verwendung der AAO nicht genutzt wird.
            if (fReload) window.parent.location.reload();

            // Verändern des Modals nach Speichern (Speichern erfolgreich)
            $("#frSavePreferences").addClass("hidden");
            if (lang == "de_DE") {
                $("#frModalBody").html("<h3><center>Die Einstellungen wurden gespeichert.</center></h5>");
            } else {
                $("#frModalBody").html("<h3><center>Settings successfully saved.</center></h5>");
            }
        });

        $("body").on("click","#frrOpenModal", async function() {
            //Ausführen der Funktion zum holen der Fahrzeugdaten in der entsprechenden Sprache
            await fetchVehicles(lang);
            logging.data(frrSettings[lang].vehicleTypes.data,"frrSettings.vehicleTypes.data");
            openFrrModal();
            var modalHeight = $(window).height() - 200;
            logging.data(modalHeight, "Maximale höhe Modal Body");
            $('#frModalBody').css('max-height', modalHeight + 'px');
        });
    }

    // ######################################################
    // Wacheneinstellungen für zusätzlich freigegebene Wachen
    // ######################################################

    // Fügt eine Checkbox im Gebäude bearbeiten Fenster ein mit der ausgewählt werden kann, dass alle Fahrzeuge des Gebäudes verwendet werden dürfen
    if (window.location.pathname.includes("buildings") && window.location.pathname.includes("edit")) {
        $(".building_leitstelle_building_id")
            .after(`<div class="form-check">
                      <input type="checkbox" class="form-check-input" id="frCbxBuildingId" ${ $.inArray(+window.location.pathname.replace(/\D+/g, ""), frrSettings[lang].addBuildingIds) > -1 ? "checked" : "" }>
                      <label class="form-check-label" for="frCbxBuildingId">${ lang == "de_DE" ? "Wachen-ID im First Responder berücksichtigen" : "use this building id for First Responder" }</label>
                    </div>
                    `);

        // Auswertung, dass die Checkbox beim Gebäude Bearbeiten angeklickt wurde. Bei Abwahl löscht es die abgewählte ID aus dem Array. Bei Anwahl wird sie hinzugefügt (wenn noch nicht vorhanden).
        $("body").on("click", "#frCbxBuildingId", function() {
            var buildingId = +window.location.pathname.replace(/\D+/g, "")
            if ($("#frCbxBuildingId")[0].checked) {
                frrSettings[lang].addBuildingIds.push(buildingId);
            } else {
                frrSettings[lang].addBuildingIds.splice(frrSettings[lang].addBuildingIds.indexOf(buildingId), 1);
                if (frrSettings[lang].allowedBuildingIds.includes(buildingId)) {
                    frrSettings[lang].allowedBuildingIds.splice(frrSettings[lang].allowedBuildingIds.indexof(buildingId), 1);
                }
            }
            localStorage.setItem('frrSettings', JSON.stringify(frrSettings));
        });
    }

    // ##########################
    // Eventlistener Tastaturkeys
    // ##########################

    // Event keyup zur Auswertung von Eingaben und zwecks HotKey überwachen
    $(document).keyup(function(evt) {
        logging.log('Gedrückter Keycode im keyup Event: ' + evt.keyCode);
        if (!$("input:text").is(":focus") && evt.keyCode === frrSettings[lang].general.jsKeyCode && window.location.pathname.includes("missions")) { // Überprüft, ob kein Texteingabefeld den Fokus hat und die Taste dem Schlüsselentspricht
            logging.log("HotKey wurde gedrückt!");
            frrAlert();
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
    // Hotkeys die nicht verwendet werden dürfen da sie vom Spiel genutzt werden: A = 65; D = 68; E = 69; N = 78; S = 83; W = 87; X = 88
    $(document).keydown(function(evt) {
        if (evt.target.id === "frrKeyCodeInput" && // Überprüft, ob das Ereignisziel das Eingabefeld ist
            evt.keyCode !== 8 && // Überprüft, ob die Taste nicht Backspace ist
            (!(evt.keyCode >= 65 && evt.keyCode <= 90) || // Überprüft, ob die Taste kein Buchstabe (A-Z) ist
             (evt.keyCode === 65 || evt.keyCode === 68 || evt.keyCode === 69 || evt.keyCode === 78 ||
              evt.keyCode === 83 || evt.keyCode === 87 || evt.keyCode === 88))) {
            evt.preventDefault(); // Verhindert das Standardverhalten der Taste wenn die Taste nicht erlaubt ist
            logging.warn('Taste ist als HotKey nicht erlaubt! CharCode: ' + evt.keyCode); // Protokolliert, dass die Taste nicht erlaubt ist.
        }
    });

})();
