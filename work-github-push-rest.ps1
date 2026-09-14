param()
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class CredManPush {
 [DllImport("advapi32.dll",SetLastError=true,EntryPoint="CredReadW",CharSet=CharSet.Unicode)] public static extern bool CredRead(string t,int ty,int f,out IntPtr p);
 [DllImport("advapi32.dll",EntryPoint="CredFree")] public static extern void CredFree(IntPtr p);
 [StructLayout(LayoutKind.Sequential)] public struct CREDENTIAL { public int Flags,Type; public IntPtr TargetName,Comment; public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist,AttributeCount; public IntPtr Attributes,TargetAlias,UserName; }
}
"@
function Get-GitHubToken {
  $p=[IntPtr]::Zero; if(-not [CredManPush]::CredRead('git:https://github.com',1,0,[ref]$p)){ throw '未找到 GitHub 凭据' }
  $c=[Runtime.InteropServices.Marshal]::PtrToStructure($p,[type][CredManPush+CREDENTIAL]); $b=New-Object byte[] $c.CredentialBlobSize
  [Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob,$b,0,$c.CredentialBlobSize); [CredManPush]::CredFree($p); return [Text.Encoding]::Unicode.GetString($b).Trim()
}
function Invoke-Gh {`r`n  param($Uri,$Method='Get',$Body=$null)
  $h=@{Authorization="Bearer $script:token";'User-Agent'='Codex-Deploy';Accept='application/vnd.github+json'}
  for($i=1;$i -le 5;$i++){
    try {
      if($null -ne $Body){ return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $h -Body ($Body|ConvertTo-Json -Depth 20 -Compress) -ContentType 'application/json' -TimeoutSec 120 }
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $h -TimeoutSec 120
    } catch {
      $status=$_.Exception.Response.StatusCode.value__
      if($i -eq 5){ throw }
      Start-Sleep -Seconds ([math]::Min(3*$i,10))
      Write-Host "retry $i status=$status $Uri"
    }
  }
}
$script:token=Get-GitHubToken
$owner='liil42'; $repo='liil42'; $branch='main'; $api="https://api.github.com/repos/$owner/$repo"
$user=Invoke-Gh 'https://api.github.com/user'; Write-Host "GitHub 用户: $($user.login)"
$files=@(git ls-files); if($files.Count -eq 0){ throw '没有可推送的已跟踪文件' }
Write-Host "tracked_files=$($files.Count)"
$map=@{}
$n=0
foreach($rel in $files){
  $n++; $full=Join-Path (Get-Location) $rel
  if(-not (Test-Path -LiteralPath $full -PathType Leaf)){ throw "文件不存在: $rel" }
  $base=[Convert]::ToBase64String([IO.File]::ReadAllBytes($full))
  $blob=Invoke-Gh "$api/git/blobs" 'Post' @{content=$base;encoding='base64'}
  $map[$rel]=$blob.sha
  if($n % 25 -eq 0 -or $n -eq $files.Count){ Write-Host "blob $n/$($files.Count)" }
}
function Build-OneTree($items){
  $child=@()
  $dirs=@{}
  foreach($entry in $items){
    $parts=$entry.rel -split '/'
    if($parts.Count -eq 1){ $child += @{path=$parts[0];mode='100644';type='blob';sha=$entry.sha}; continue }
    $head=$parts[0]; $tail=($parts[1..($parts.Count-1)] -join '/')
    if(-not $dirs.ContainsKey($head)){ $dirs[$head]=@() }
    $dirs[$head] += @{rel=$tail;sha=$entry.sha}
  }
  foreach($k in $dirs.Keys){
    $sha=Build-OneTree $dirs[$k]
    $child += @{path=$k;mode='040000';type='tree';sha=$sha}
  }
  $tree=Invoke-Gh "$api/git/trees" 'Post' @{tree=$child}
  return $tree.sha
}
$items=@(); foreach($k in $map.Keys){ $items += @{rel=$k;sha=$map[$k]} }
$rootSha=Build-OneTree $items
$ref=$null
try { $ref=Invoke-Gh "$api/git/ref/heads/$branch" } catch { if($_.Exception.Response.StatusCode.value__ -notin 404,409){ throw } }
$parents=@(); if($ref){ $parents=@($ref.object.sha) }
$msg=(git log -1 --pretty=%B).Trim(); if(-not $msg){$msg='deploy'}
$name=(git log -1 --pretty=%an).Trim(); $email=(git log -1 --pretty=%ae).Trim(); $now=(Get-Date).ToUniversalTime().ToString('o')
$commit=Invoke-Gh "$api/git/commits" 'Post' @{message=$msg;tree=$rootSha;parents=$parents;author=@{name=$name;email=$email;date=$now};committer=@{name=$name;email=$email;date=$now}}
if($ref){ Invoke-Gh "$api/git/refs/heads/$branch" 'Patch' @{sha=$commit.sha;force=$false} | Out-Null } else { Invoke-Gh "$api/git/refs" 'Post' @{ref="refs/heads/$branch";sha=$commit.sha} | Out-Null }
[pscustomobject]@{repository="https://github.com/$owner/$repo";pages="https://$owner.github.io/$repo/";commit=$commit.sha;tree=$rootSha} | ConvertTo-Json