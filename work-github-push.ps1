Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class CredMan3 {
  [DllImport("advapi32.dll", SetLastError=true, EntryPoint="CredReadW", CharSet=CharSet.Unicode)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll", EntryPoint="CredFree")]
  public static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential)]
  public struct CREDENTIAL {
    public int Flags;
    public int Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public long LastWritten;
    public int CredentialBlobSize;
    public IntPtr CredentialBlob;
    public int Persist;
    public int AttributeCount;
    public IntPtr Attributes;
    public IntPtr TargetAlias;
    public IntPtr UserName;
  }
}
"@
$ptr = [IntPtr]::Zero
if (-not [CredMan3]::CredRead('git:https://github.com', 1, 0, [ref]$ptr)) {
  throw '未找到 GitHub 凭据'
}
$c = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan3+CREDENTIAL])
$bytes = New-Object byte[] $c.CredentialBlobSize
[Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $c.CredentialBlobSize)
$token = [Text.Encoding]::Unicode.GetString($bytes)
[CredMan3]::CredFree($ptr)
$headers = @{ Authorization = "Bearer $token"; 'User-Agent' = 'Codex-Deploy'; Accept = 'application/vnd.github+json' }
$user = Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers -TimeoutSec 20
Write-Output ("GitHub 用户: " + $user.login)
$env:GITHUB_TOKEN = $token
node work-github-api-push.js