# LSSFirstResponderReloaded

Allgemein:
Dieses Skript dient als Erweiterung für die Webseiten des Leitstellenspiels. 
Die Ursprüngliche Version wurde von JuMaHo sowie DrTraxx geschrieben und in diesem Skript wieder lauffähig gemacht. 
Des Weiteren wurden Verbesserungen hinzugefügt.

Ich übernehme keinerlei Garantie, dass dieses Skript funktioniert. Die falsche Nutzung dieses Skripts oder die weitere Automatisierung dieses Skript auf Benutzer-Seite kann zur Blockierung des Benutzeraccounts führen! Ich übernehme hierfür keinerlei Haftung! 

!!! Die Nutzung ist also auf eigene Gefahr !!!

Release V1.0.0:

Verbesserungen (Im vergleich zum Skript von DrTraxx):

  -  Entnahme der Fahrzeugdaten aus der API des LSSM V4
  -  Hinzufügen eines Prefix (HiOrg - Kürzel) zu den Fahrzeugnamen um die Sortierung zu vereinfachen
  -  Beschreiben des AAOs mit der Fahrzeit des First Responders
  -  HotKey Funktion (derzeit auf Taste "v")
  -  Automatische Alarmierung und Sprung zum nächsten EInsatz nach Auswahl des First Responders (Durch klick auf AAO oder durch Hotkey)
  -  Hinzufügen einer Logging Funktion zur Fehlersuche
  -  Update URL hinzugefügt

Bekannte Fehler:
  -  Aktuell nur offiziell für leitstellenspiel.de freigegeben (Internationale Nutzung wird nicht unterstützt)
  -  Fahrzeit wird über eine Verzögerung in die AAO geschrieben. Dies kann bei längeren Ladezeiten dazu führen, dass die Zeit wieder überschrieben wird.
  -  Daten aus LSSM V4 API werden bei jedem Ausführen angepasst damit die Daten für das Skript nutzbar sind. (sollte wie die Datenabfrage nur alle 5 Minuten erfolgen)
  -  HotKey ist nicht frei wählbar
