#define MyAppName "Hi5Tech Agent Provisioned Installer"
#define MyAppPublisher "Hi5Tech"

#ifndef PayloadDir
  #define PayloadDir ".build\wrapper\payload"
#endif

#ifndef OutputDir
  #define OutputDir ".build\out"
#endif

#ifndef OutputBaseName
  #define OutputBaseName "Hi5TechAgentSetup"
#endif

[Setup]
AppId={{95F4586A-81AF-4193-9C75-8F7AF4484A10}
AppName={#MyAppName}
AppVersion=1.0.0
AppPublisher={#MyAppPublisher}
CreateAppDir=no
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupLogging=yes
CloseApplications=yes
RestartApplications=no
Uninstallable=no

[Files]
Source: "{#PayloadDir}\Hi5TechAgentSetup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "{#PayloadDir}\provisioning.ini"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Code]
function Quote(Value: String): String;
begin
  Result := '"' + Value + '"';
end;

function IniValue(Key: String): String;
begin
  Result := GetIniString('agent', Key, '', ExpandConstant('{tmp}\provisioning.ini'));
end;

function Arg(Name: String; Value: String): String;
begin
  if Value = '' then
    Result := ''
  else
    Result := ' /' + Name + '=' + Quote(Value);
end;

procedure RunProvisionedInstaller;
var
  ResultCode: Integer;
  InstallerPath: String;
  Params: String;
begin
  InstallerPath := ExpandConstant('{tmp}\Hi5TechAgentSetup.exe');

  Params :=
    '/VERYSILENT /NORESTART /SUPPRESSMSGBOXES' +
    Arg('API_BASE_URL', IniValue('api_base_url')) +
    Arg('AGENT_WS_BASE_URL', IniValue('agent_ws_base_url')) +
    Arg('ENROLLMENT_TOKEN', IniValue('enrollment_token')) +
    Arg('TENANT_ID', IniValue('tenant_id')) +
    Arg('GROUP_ID', IniValue('group_id')) +
    Arg('PACKAGE_ID', IniValue('package_id')) +
    Arg('INSTALL_SOURCE', IniValue('install_source'));

  if not Exec(InstallerPath, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    MsgBox('Failed to launch the Hi5Tech Agent installer.', mbError, MB_OK);
  end
  else if ResultCode <> 0 then
  begin
    MsgBox('Hi5Tech Agent installer failed with exit code: ' + IntToStr(ResultCode), mbError, MB_OK);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    RunProvisionedInstaller;
  end;
end;
