!macro customUnInstall
  ; Remove auto-start entries and saved registration so the device can be cleanly re-enrolled
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "AssetManager Security Client"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "electron.app.AssetManager Security Client"
  RMDir /r "$PROFILE\.assetmanager-client"
!macroend
