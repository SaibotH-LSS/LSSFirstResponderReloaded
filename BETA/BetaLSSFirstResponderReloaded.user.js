// ==UserScript==
// @name         [BETA]FirstResponderReloaded
// @namespace    FirstRespond-BETA
// @version      1.0.1-BETA
// @description  Wählt das nächstgelegene FirstResponder-Fahrzeug aus (Original von JuMaHo und DrTraxx)
// @author       SaibotH
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        *://www.leitstellenspiel.de/missions/*
// @match        *://www.leitstellenspiel.de/aaos/*/edit
// @match        *://www.leitstellenspiel.de/buildings/*/edit
// @match        *://polizei.leitstellenspiel.de/missions/*
// @match        *://polizei.leitstellenspiel.de/aaos/*/edit
// @match        *://polizei.leitstellenspiel.de/buildings/*/edit
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

            if (frSettings.vehicleTypes[lang].includes(vType) && //Fahrzeugtyp wurde ausgewählt UND
                !$("#vehicle_checkbox_" + vId)[0].checked && // Checkbox ist NICHT angewählt UND
                !$("#vehicle_checkbox_" + vId)[0].disabled && // Checkbox ist NICHT deaktiviert UND
                (dispatchSetup.useIt === false || dispatchSetup.dispatchId.includes(lstId) || dispatchSetup.additionalBuildings.includes(buId))) { //Gebäudeauswertung wird nicht genutzt ODER Leitstelle wurde ausgewählt ODER Gebäude wurde ausgewählt

                document.getElementById("aao_timer_" + frSettings.aaoId[lang]).innerText = formatTime(time);
                logging("Zeit hinzugefügt");
                return false; // Beendet die Suche nach dem First Responder
            }
        });
    }

    // Loggingfunktion die nur ausgeführt wird wenn bLoggingOn true ist
    function logging(message,type) {
        if (fLoggingOn || frrSettings[lang].general.fLoggingOn) {
            if(type === undefined){
                console.log("FirstResponderReloaded Logging:",message);
            }
            else {
                console.log("FirstResponderReloaded Objektlogging: ",type,message);
            }
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
            logging(`Kein Prefix für Fahrzeug gefunden! Fahrzeugname: ${caption}`);
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

        // Prefix für Fahrzeugbezeichnung hinzufügen
        jsObject.forEach(function(vehicle) {
            updateCaptionPrefix(vehicle);
        });

        return jsObject;

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
                aaoId: { }, // Hier wird die eingestellte AAO Id gespeichert
                general: { // Hier werden allgemeine Parameter gespeichert
                    fAutoAlert: false, // Automatisch alarmieren wenn FRR ausgeführt wird
                    fAutoShare: false, // Automatisch alarmieren und teilen wenn FRR ausgeführt wird
                    jsKeyCode: 86, // Javascript Code für den HotKey. Wird mit v-Taste vorbelegt. 65=a 86=v - nicht unbeding ASCII! Siehe hier: https://www.toptal.com/developers/keycode
                    fLoggingOn: false, // Schalter für logging
                    fUseDispatch: false, // nur Fahrzeuge bestimmter Leitstellen nutzen
                    alarmDelay: 1
                },
                vehicleTypes: {
                    lastUpdate: { }, // Hier kommt das Datum zum letzten Update rein.
                    data: { }, // Hier die Daten aus der API
                    captionList: [], // Hier die sortierte Liste mit den Namen der Fahrzeuge
                    settings: { }// Hier die erlaubten Fahrzeuge
                },
                allowedDispatchIds: { }, // Hier können die Einstellungen für Leitstellen hinzugefügt werden
                addBuildingIds: { } // Hier können die Einstellungen für Wachen hinzugefügt werden
            }
        };
        return newObject;
    }

    // #############################
    // Initialisierung der Variablen
    // #############################

    // Vorbereitung der Sprache und der Einstellungsvariablen im lokalen Speicher, wenn diese nicht vorhanden sind
    var lang = I18n.locale;
    if (!localStorage.firstResponder) localStorage.firstResponder = JSON.stringify({ "vehicleTypes": {}, "aaoId": {} });
    if (!localStorage.fr_dispatchSetup) localStorage.fr_dispatchSetup = JSON.stringify({ "dispatchId": [], "useIt": false, "additionalBuildings": [] });
    if (!localStorage.frrSettings) localStorage.setItem('frrSettings', JSON.stringify(createSettingsObject()));

    // Anlegen und beschreiben diverser Variablen
    var fLoggingOn = true;
    var fIsHotKeyPressed = false
    var aVehicleTypes = [];
    var frSettings = JSON.parse(localStorage.firstResponder);
    var frrSettings = JSON.parse(localStorage.getItem('frrSettings'));
    var dispatchSetup = JSON.parse(localStorage.fr_dispatchSetup);
    var aBuildings = await $.getJSON('/api/buildings');
    var jsKeyCode = 86; // 65=a 86=v - nicht unbeding ASCII! Siehe hier: https://www.toptal.com/developers/keycode

    // Schreiben des Scriptstarts ins Log
    logging("Wird ausgeführt!");

    //Ausführen der Funktion zum holen der Fahrzeugdaten in der entsprechenden Sprache
    aVehicleTypes = await getVehicleTypes(lang);
    frrSettings[lang].vehicleTypes.data = await getVehicleTypes(lang);

    // Schreiben der Fahrzeugtypen ins Log
    logging(aVehicleTypes,"aVehicleTypes");
    logging(frrSettings,"frrSettings");

    if (!frSettings.vehicleTypes[lang]) frSettings.vehicleTypes[lang] = [];
    if (!dispatchSetup.additionalBuildings) dispatchSetup.additionalBuildings = []; // Wird schon bei der Initialisierung in localStorage.fr_dispatchSetup geschrieben. Sollte dies durch eine alte Version jedoch schon passiert sein, könnte der EIntrag fehlen.

    // ######################
    // Einstellung der AAO ID
    // ######################

    // Fügt in der AAO Bearbeitung vor der ersten Checkbox eine eigene Check Box ein. Ist die entsprechende AAO in den Settings gespeichert wird das Häckchen gesetzt.
    if (window.location.pathname.includes("aaos") && window.location.pathname.includes("edit")) {
        $(".boolean.optional.checkbox")
            .before(`<label class="form-check-label" for="frSaveAaoId">
                    <input class="form-check-input" type="checkbox" id="frSaveAaoId" ${ window.location.pathname.includes(frSettings.aaoId[lang]) ? "checked" : "" }>
                    ${ lang == "de_DE" ? "Diese ID für den First Responder nutzen." : "Use this id for FirstResponder." }
                    </label>`);
    }

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
        if (frSettings.aaoId[lang]) {
            $("#available_aao_" + frSettings.aaoId[lang])
                .parent()
                .after(`<button type="button" class="btn btn-success btn-xs" data-toggle="modal" data-target="#frModal" style="height:24px" id="frOpenModal">
                        <div class="glyphicon glyphicon-cog" style="color:LightSteelBlue"></div>
                        </button>
                        <div class="modal fade" id="frModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
                        <div class="modal-dialog" role="document">
                        <div class="modal-content">
                        <div class="modal-header">
                        <h3 class="modal-title" id="frModalLabel">${ lang == "de_DE" ? "Einstellungen" : "Settings" }</h3>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        </button>
                        </div>
                        <div class="modal-body" id="frModalBody">
                        </div>
                        <div class="modal-footer" id="frModalFooter">
                        </div>
                        </div>
                        </div>
                        </div>`);
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
            frSettings.aaoId[lang] = window.location.pathname.replace(/\D+/g, "");
        } else {
            delete frSettings.aaoId[lang];
        }
        localStorage.firstResponder = JSON.stringify(frSettings);
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

    // Auswertung, dass der Button zum Speichern der Einstellungen gedrückt wurde. Speichert die IDs in frSettings.
    $("body").on("click", "#frSavePreferences", function() {
        frSettings.vehicleTypes[lang] = mapVehicles($("#frSelectVehicles").val(), "type");
        dispatchSetup.dispatchId = $("#frSelectDispatch").val() ? mapDispatchCenter($("#frSelectDispatch").val(), "id") : [];
        dispatchSetup.useIt = $("#frCbxUseLst")[0].checked;
        frrSettings[lang].general.fAutoAlert = $("#frrAutoAlert")[0].checked;
        frrSettings[lang].general.fAutoShare = $("#frrAutoShare")[0].checked;
        frrSettings[lang].general.fLoggingOn = $("#frrLoggingOn")[0].checked;
        frrSettings[lang].general.alarmDelay = parseInt($("#frrAlarmDelay").val());
        frrSettings[lang].general.jsKeyCode = $("#frrKeyCodeInput").val().toUpperCase().charCodeAt(0);
        localStorage.fr_dispatchSetup = JSON.stringify(dispatchSetup);
        localStorage.firstResponder = JSON.stringify(frSettings);
        localStorage.setItem('frrSettings', JSON.stringify(frrSettings));
        $("#frSavePreferences").addClass("hidden");

        if (lang == "de_DE") {
            $("#frModalBody").html("<h3><center>Die Einstellungen wurden gespeichert.</center></h5>");
        } else {
            $("#frModalBody").html("<h3><center>Settings successfully saved.</center></h5>");
        }
    });

    $("body").on("click","#frOpenModal", function() {
        $("#frModalBody").html(
            `<label for="frrSelectGeneralSettings" style="margin-bottom: 0.2em;">${ lang == "de_DE" ? "Allgemeine Einstellungen" : "General settings" }</label>
                                <div style="display: flex; flex-direction: column;margin-top: 0;">
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
                                <select multiple class="form-control" id="frSelectVehicles" style="height:20em;width:40em;margin-bottom: 0.5em;"></select>

                                <label for="frSelectDispatch" style="margin-bottom: 0.2em;margin-top= 0;">${ lang == "de_DE" ? "Leitstellen (Mehrfachauswahl mit Strg + Klick)" : "dispatchcenter (multiple-choice with Strg + click)" }</label>
                                <div style="display: flex; flex-direction: column;margin-top: ;">
                                    <div style="margin-bottom: 0.3em;">
                                        <input type="checkbox" id="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;" ${ dispatchSetup.useIt ? "checked" : "" }>
                                        <label for="frCbxUseLst" style="margin-top: 0; margin-bottom: 0;margin-left: 0.2em;font-weight: normal;">${ lang == "de_DE" ? "nur Fahrzeuge bestimmter Leitstellen wählen" : "only use specific dispatchcenter" }</label>
                                    </div>
                                </div>
                                <select multiple class="form-control" id="frSelectDispatch" style="height:10em;width:40em"></select>`
                              );

        $("#frModalFooter").html(`<button type="button" class="btn btn-danger" data-dismiss="modal">${ lang == "de_DE" ? "Schließen" : "close" }</button>
                                  <button type="button" class="btn btn-success" id="frSavePreferences">${ lang == "de_DE" ? "Speichern" : "save" }</button>`);

        // Fügt Optionen in der Fahrzeugauswahl hinzu (Aus Array mit Fahrzeugnamen)
        for (i in arrVehicles) {
            $("#frSelectVehicles").append(`<option>${ arrVehicles[i] }</option>`);
        }

        // Fügt Optionen in der Leitstellenauswahl hinzu (Aus Array mit Leitstellennamen)
        for (i in dispatchCenter) {
            $("#frSelectDispatch").append(`<option>${ dispatchCenter[i] }</option>`);
        }

        // Wählt die Fahrzeuge und Leitstellen an die zuvor gespeichert wurden
        $("#frSelectVehicles").val(mapVehicles(frSettings.vehicleTypes[lang], "name"));
        $("#frSelectDispatch").val(mapDispatchCenter(dispatchSetup.dispatchId, "name"));
    });


    // Hier findet die Magie statt. Wenn der FR AAO Button gedrückt wird, wird entsprechend der erste Eintrag gesucht der den Anforderungen entspricht.
    $("#aao_" + frSettings.aaoId[lang]).click(function() {

        var foundFirstResponder = false;

        $(".vehicle_checkbox").each(function() {
            var vType = +$(this).attr("vehicle_type_id"); // Fahrzeug Typ ID
            var vId = $(this).attr("value"); //Fahrzeug ID
            var lstId = +$(this).attr("building_id").split("_")[1]; //Leitstellen ID
            var buId = +$(this).attr("building_id").split("_")[0]; // Gebäude ID

            if (frSettings.vehicleTypes[lang].includes(vType) && //Fahrzeugtyp wurde ausgewählt UND
                !$("#vehicle_checkbox_" + vId)[0].checked && // Checkbox ist NICHT angewählt UND
                !$("#vehicle_checkbox_" + vId)[0].disabled && // Checkbox ist NICHT deaktiviert UND
                (dispatchSetup.useIt === false || dispatchSetup.dispatchId.includes(lstId) || dispatchSetup.additionalBuildings.includes(buId))) { //Gebäudeauswertung wird nicht genutzt ODER Leitstelle wurde ausgewählt ODER Gebäude wurde ausgewählt
                $("#vehicle_checkbox_" + vId).click(); // Die Checkbox wird ausgewählt
                foundFirstResponder = true;
                let shareButton = $( ".alert_next_alliance" )[0];
                if (shareButton && frrSettings[lang].general.fAutoShare) {
                    logging("Sharebutton gefunden und draufgeklickt");
                    setTimeout(function() {
                        $( ".alert_next_alliance" )[0].click();
                    },frrSettings[lang].general.alarmDelay * 1000);
                } else if (frrSettings[lang].general.fAutoAlert) {
                    logging('Sharebutton nicht gefunden oder automatisches Teilen abgeschaltet. Autoshare: ' + frrSettings[lang].general.fAutoShare)
                    setTimeout(function() {
                        $( ".alert_next" )[0].click();
                    },frrSettings[lang].general.alarmDelay * 1000);
                } else {
                    logging("Sharebutton nicht gefunden oder automatisches Teilen abgeschaltet UND automatisches Alarmieren abgeschaltet. Autoshare: " + frrSettings[lang].general.fAutoShare + " AutoAlert: " + frrSettings[lang].general.fAutoAlert);
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

        logging('Gedrückter Keycode im keyup Event: ' + evt.keyCode);

        if (!$("input:text").is(":focus") && evt.keyCode === frrSettings[lang].general.jsKeyCode && !fIsHotKeyPressed) { // Überprüft, ob kein Texteingabefeld den Fokus hat, die Taste dem Schlüsselentspricht und die Taste noch nicht gedrückt wurde
            logging("HotKey wurde gedrückt!");
            fIsHotKeyPressed = true;
            $('#aao_' + frSettings.aaoId[lang] + '')[0].click(); // Klickt auf die AAO
        } else if (evt.target.id === "frrAlarmDelay") { // Prüft ob die Alarmverzögerung eingegeben wurde
            logging(evt.target.value,"Inhalt des Eingabefeldes nach Änderung: ")
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
            logging('Taste ist als HotKey nicht erlaubt! CharCode: ' + evt.keyCode); // Protokolliert, dass die Taste nicht erlaubt ist.
        }
    });

    // Fahrzeit nach 1000 Millisekunden in AAO Button schreiben. 100ms gehen auch sind aber bei manchen Ladezeiten zu knapp.
    setTimeout(setAaoTime,1000);


})();
