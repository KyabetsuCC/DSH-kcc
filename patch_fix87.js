// patch_fix87: chat-avatar-up — the avatar sits above your bubble with both right edges on one
// line, and the name option is gone: no arrangement of a name ever looked right.
const fs = require('fs');
const root = process.argv[2] || '.';
const MARK = 'chat-avatar-up';

function edit(rel, fn) {
  const p = root + '/' + rel;
  let src = fs.readFileSync(p, 'utf8');
  const out = fn(src);
  if (out === src) { console.log('SKIP ' + rel); return; }
  fs.writeFileSync(p, out);
  console.log('OK ' + rel);
}
function need(src, s, what) {
  if (!src.includes(s)) { console.log('ANCHOR0 ' + what); return false; }
  return true;
}

const STREAM = 'app/src/main/java/io/github/jackwener/dsh/feature/conversation/Stream.kt';
edit(STREAM, (src) => {
  if (src.includes(MARK)) return src;
  if (!need(src, '        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {', 'bubble row')) return src;
  src = src.replace('    val showName = io.github.jackwener.dsh.core.data.UiPrefs.showUserName\n', '');
  src = src.replace('    val noState = remember { kotlinx.coroutines.flow.MutableStateFlow(io.github.jackwener.dsh.core.account.AccountUi()) }\n    val ui by (account?.state ?: noState).collectAsStateWithLifecycle()\n    val name = io.github.jackwener.dsh.core.data.UiPrefs.chatName.ifBlank { ui.cached?.name.orEmpty() }\n', '');
  src = src.replace('        if (showName && name.isNotBlank()) {\n            Text(name, Modifier.padding(bottom = 4.dp, end = if (showAvatar) 32.dp else 0.dp), style = DshType.xxs12, color = c.labelTertiary)\n        }\n', '');
  src = src.replace(
    '        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n            Column(horizontalAlignment = Alignment.End) {',
    '        // chat-avatar-up: the avatar sits above the bubble so both right edges share one line.\n        if (showAvatar) UserAvatar(ownPic ?: avatar)\n        Row(verticalAlignment = Alignment.Top) {\n            Column(horizontalAlignment = Alignment.End) {');
  src = src.replace('            }\n            if (showAvatar) UserAvatar(ownPic ?: avatar)\n        }\n', '            }\n        }\n');
  src = src.replace('    Box(Modifier.padding(top = 2.dp).size(24.dp).clip(CircleShape).background(c.bgLayer2), contentAlignment = Alignment.Center) {',
                    '    Box(Modifier.padding(top = 2.dp, bottom = 5.dp).size(24.dp).clip(CircleShape).background(c.bgLayer2), contentAlignment = Alignment.Center) {');
  return src;
});

const SETTINGS = 'app/src/main/java/io/github/jackwener/dsh/feature/settings/SettingsScreen.kt';
edit(SETTINGS, (src) => {
  if (src.includes(MARK)) return src;
  if (!need(src, '        SettingsRow(stringResource(R.string.show_user_name), stringResource(R.string.show_user_name_desc),', 'name toggle')) return src;
  src = src.replace('        SettingsRow(stringResource(R.string.show_user_name), stringResource(R.string.show_user_name_desc),\n            trailing = { DSwitch(s.showUserName, { on -> vm.setShowUserName(on) }) })\n', '');
  src = src.replace('    // chat-look: pick the picture and the name here, independent of the signed-in account.\n',
                    '    // chat-avatar-up: the picture is the only identity left to set; the name option is gone.\n    // chat-look: pick the picture here, independent of the signed-in account.\n');
  src = src.replace('    val nameDesc = if (s.chatName.isBlank()) stringResource(R.string.chat_look_name_unset) else s.chatName\n', '');
  src = src.replace('    var naming by remember { mutableStateOf(false) }\n    var nameDraft by remember { mutableStateOf("") }\n', '');
  src = src.replace('        SettingsRow(stringResource(R.string.chat_look_name), nameDesc,\n            onClick = { nameDraft = s.chatName; naming = true })\n', '');
  src = src.replace('    if (naming) DDialog({ naming = false }, stringResource(R.string.chat_look_name), buttons = {\n        DButton(stringResource(R.string.cancel), { naming = false }, variant = BtnVariant.Outline)\n        DButton(stringResource(R.string.save), { naming = false; vm.setChatName(nameDraft.trim()) })\n    }) {\n        DInput(nameDraft, { nameDraft = it }, placeholder = stringResource(R.string.chat_look_name_hint))\n    }\n', '');
  return src;
});
console.log('done');
