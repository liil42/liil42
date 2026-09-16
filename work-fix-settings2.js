const fs=require('fs');const p='client/src/components/SettingsPanel.jsx';let lines=fs.readFileSync(p,'utf8').split(/\r?\n/);
const replacement=[
'  function saveLearningMode(nextMode) {',
'    setLearningMode(nextMode);',
'    localStorage.setItem(LEARNING_MODE_KEY, nextMode);',
"    setMessage(nextMode === 'novice' ? '已切换到新手模式' : '已切换到进阶模式');",
'  }',
'',
'  async function deleteAccount() {'
];
lines.splice(38,9,...replacement);fs.writeFileSync(p,lines.join('\n'),'utf8');console.log('fixed');
