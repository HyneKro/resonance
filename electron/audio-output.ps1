param([switch]$Once)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class Enumerator {}
[ComImport,Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IEnum {
 int EnumAudioEndpoints(int flow,uint mask,out IntPtr devices);
 [PreserveSig] int GetDefaultAudioEndpoint(int flow,int role,out IDevice device);
}
[ComImport,Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IDevice {
 int Activate(ref Guid iid,uint context,IntPtr parameters,out IntPtr result);
 int OpenPropertyStore(uint access,out IStore store);
 int GetId([MarshalAs(UnmanagedType.LPWStr)]out string id);
 int GetState(out uint state);
}
[StructLayout(LayoutKind.Sequential)] struct Key {public Guid format; public uint id; public Key(string f,uint i){format=new Guid(f);id=i;}}
[StructLayout(LayoutKind.Explicit,Size=24)] struct Value { [FieldOffset(0)]public ushort type; [FieldOffset(8)]public IntPtr pointer; }
[ComImport,Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IStore {
 int GetCount(out uint count); int GetAt(uint index,out Key key); int GetValue(ref Key key,out Value value);
}
public class AudioOutput {
 [DllImport("ole32.dll")] static extern int PropVariantClear(ref Value value);
 static string Read(IStore store,Key key){Value v;Marshal.ThrowExceptionForHR(store.GetValue(ref key,out v));try{return v.type==31?Marshal.PtrToStringUni(v.pointer):v.type==72?Marshal.PtrToStructure<Guid>(v.pointer).ToString():"";}finally{PropVariantClear(ref v);}}
 public static string[] Current(){IEnum e=(IEnum)new Enumerator();IDevice d=null;IStore s=null;try{
  if(e.GetDefaultAudioEndpoint(0,1,out d)!=0)return new[]{"","No audio output",""};
  string id;d.GetId(out id);d.OpenPropertyStore(0,out s);
  return new[]{id,Read(s,new Key("a45c254e-df1c-4efd-8020-67d146a850e0",14)),Read(s,new Key("8c7ed206-3f8a-4827-b3ab-ae9e1faefc6c",2))};
 }finally{if(s!=null)Marshal.ReleaseComObject(s);if(d!=null)Marshal.ReleaseComObject(d);Marshal.ReleaseComObject(e);}}
}
'@
$last=''
do {
 try {
  $device=[AudioOutput]::Current()
  if($device[0] -ne $last -or $Once) {
   $last=$device[0];$transport='unknown'
   if($device[2]) {
    $transport='direct'
    foreach($bus in @('BTHENUM','BTHLEDEVICE','BTHHFENUM')) {
     $root='HKLM:\SYSTEM\CurrentControlSet\Enum\'+$bus
     if(Test-Path -LiteralPath $root) {
      foreach($group in Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue) {
       foreach($instance in Get-ChildItem -LiteralPath $group.PSPath -ErrorAction SilentlyContinue) {
        $container=(Get-ItemProperty -LiteralPath $instance.PSPath -Name ContainerID -ErrorAction SilentlyContinue).ContainerID
        if($container -and $container.Trim('{}') -eq $device[2].Trim('{}')) {$transport='bluetooth'}
       }
      }
     }
    }
   }
   @{id=$device[0];label=$device[1];transport=$transport} | ConvertTo-Json -Compress | Write-Output
  }
 } catch { @{id='';label='Audio output unavailable';transport='unknown'} | ConvertTo-Json -Compress | Write-Output }
 if(-not $Once){Start-Sleep -Seconds 2}
} while(-not $Once)
