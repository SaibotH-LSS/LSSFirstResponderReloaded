# LSSFirstResponderReloaded

Allgemein:
Dieses Skript dient als Erweiterung für die Webseiten des Leitstellenspiels. 
Die Ursprüngliche Version wurde von JuMaHo sowie DrTraxx geschrieben und in diesem Skript wieder lauffähig gemacht. 
Des Weiteren wurden Verbesserungen hinzugefügt.

Ich übernehme keinerlei Garantie, dass dieses Skript funktioniert. Die falsche Nutzung dieses Skripts oder die weitere Automatisierung dieses Skript auf Benutzer-Seite kann zur Blockierung des Benutzeraccounts führen! Ich übernehme hierfür keinerlei Haftung! 

!!! Die Nutzung ist also auf eigene Gefahr !!!

Bekannte Fehler:
  -  Aktuell nur offiziell für (polizei.)leitstellenspiel.de freigegeben (Internationale Nutzung wird nicht unterstützt)
  -  Fahrzeit wird über eine Verzögerung in die AAO geschrieben. Dies kann bei längeren Ladezeiten dazu führen, dass die Zeit wieder überschrieben wird.
  -  Löscht man die eingestellte AAO kann der Menübutton nicht mehr angezeigt werden
  -  Die Zusätzlichen Gebäude werden in der Leitstellenliste angezeigt. Dort können sie zwar an und abgewählt werden jedoch hat dies keine Auswirkungen.

Geplante Funktionserweiterungen:
  - Export/Import Funktion (zwecks Backup falls der interne Speicher des Browsers gelöscht wird)
  - Es soll eine Rückfallebene geschaffen werden falls es die API von LSSM zukünftig nicht mehr geben sollte.
  - Es soll ein Hinweis angezeigt werden ob der FR rechtzeitig ankommt.

Release V2.1.1 (19.07.2024):
  - Fokus Verlust im Chrome Browser korrigiert.

Release V2.1.0 (19.07.2024):
  - Hinzufügen der "eigenen Fahrzeugkategorien"
  - "Eventlistener" für den Hotkey wurde korrigiert (Es wurde auch auf der Startseite von LSS ausgeführt und führt zu einem Error)

Release V2.0.2 (16.06.2024):
  - Prefix für Bergrettung hinzugefügt

Release v2.0.1 (23.04.2024):
  - Das Wording "automatisches Alarmieren" wurde entfernt. Das Skript muss händisch ausgelöst werden! Automatisches Alarmieren ist verboten und wurde zu keiner Zeit mit diesem Skript ermöglicht.

Release V2.0.0 (21.04.2024):
  - Einstellmöglichkeiten wurden verbessert (mit/ohne AAO, alarmieren ein/aus, teilen ein/aus, Verzögerungszeit und HotKey ändern)
  - Teilen nach Auswahl des FR ohne weiter Bedienung
  - Eigener First Responder Button mit Fahrzeit eingefügt (Wenn AAO abgewählt ist)
  - Übernahme der Daten in eigenen Speicher sowie löschen alter Daten (Versionierungs Funktion)
  - Die LSSM API wird nur noch beim öffnen der Einstellungen abgerufen (maximal alle 5 Minuten). Außerdem werden die Daten nicht mehr bearbeitet um DrTraxx Code zu nutzen (Code wurde zu einem großen Teil neu geschrieben)

Release V1.0.0 (24.03.2024) (Verbesserungen im Vergleich zu DrTraxx Skript):
  -  Entnahme der Fahrzeugdaten aus der API des LSSM V4
  -  Hinzufügen eines Prefix (HiOrg - Kürzel) zu den Fahrzeugnamen um die Sortierung zu vereinfachen
  -  Beschreiben des AAOs mit der Fahrzeit des First Responders
  -  HotKey Funktion (derzeit auf Taste "v")
  -  Automatische Alarmierung und Sprung zum nächsten EInsatz nach Auswahl des First Responders (Durch klick auf AAO oder durch Hotkey)
  -  Hinzufügen einer Logging Funktion zur Fehlersuche
  -  Update URL hinzugefügt
