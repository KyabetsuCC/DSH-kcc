// chat-look: the name moves above your bubble, timestamp / copy button get switches,
// and the name + picture can be set locally instead of following the DSH account.
const fs = require('fs');
const root = process.argv[2] || '.';
const A = root + '/app/src/main/java/io/github/jackwener/dsh';
const RES = root + '/app/src/main/res';

function edit(file, fn) {
  if (!fs.existsSync(file)) { console.log('MISSING ' + file); process.exitCode = 1; return; }
  const src = fs.readFileSync(file, 'utf8');
  const out = fn(src);
  if (out === null || out === src) { console.log('SKIP ' + file.split('/').pop()); return; }
  fs.writeFileSync(file, out);
  console.log('OK   ' + file.split('/').pop());
}
function need(src, s, what) {
  if (!src.includes(s)) { console.log('ANCHOR0 ' + what); process.exitCode = 1; return false; }
  return true;
}

// 1) UiPrefs: the switches the stream reads, plus the local picture file.
edit(A + '/core/data/UiPrefs.kt', (src) => {
  if (src.includes('chat-look')) return null;
  if (!need(src, '    var showUserName by mutableStateOf(false)\n', 'uiprefs-look')) return null;
  return src.replace('    var showUserName by mutableStateOf(false)\n',
    '    var showUserName by mutableStateOf(false)\n' +
    '\n' +
    '    // chat-look: what each of your messages shows, and the name/picture you set yourself.\n' +
    '    var showStamp by mutableStateOf(true)\n' +
    '    var showCopy by mutableStateOf(true)\n' +
    '    var chatName by mutableStateOf("")\n') +
    '\n' +
    '/** chat-look: your own chat picture, kept at filesDir/chat-avatar.img (not the DSH account). */\n' +
    'object ChatAvatar {\n' +
    '    /** Bumped after a save or a clear, so previews and the stream recompose. */\n' +
    '    var rev by mutableIntStateOf(0)\n' +
    '        private set\n' +
    '\n' +
    '    private fun file(c: android.content.Context) = java.io.File(c.filesDir, "chat-avatar.img")\n' +
    '\n' +
    '    fun has(c: android.content.Context): Boolean = file(c).exists()\n' +
    '\n' +
    '    private var cached: android.graphics.Bitmap? = null\n' +
    '    private var cachedRev = -1\n' +
    '    fun load(c: android.content.Context): android.graphics.Bitmap? {\n' +
    '        if (cachedRev != rev) {\n' +
    '            cached = runCatching { if (file(c).exists()) android.graphics.BitmapFactory.decodeFile(file(c).path) else null }.getOrNull()\n' +
    '            cachedRev = rev\n' +
    '        }\n' +
    '        return cached\n' +
    '    }\n' +
    '\n' +
    '    fun save(c: android.content.Context, uri: android.net.Uri) {\n' +
    '        runCatching {\n' +
    '            val bytes = c.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@runCatching\n' +
    '            file(c).writeBytes(bytes)\n' +
    '        }\n' +
    '        rev += 1\n' +
    '    }\n' +
    '\n' +
    '    fun clear(c: android.content.Context) {\n' +
    '        runCatching { file(c).delete() }\n' +
    '        rev += 1\n' +
    '    }\n' +
    '}\n';
});

// 2) SettingsRepository: three new prefs (stamp / copy / your own name).
edit(A + '/core/data/SettingsRepository.kt', (src) => {
  if (src.includes('showStamp = booleanPreferencesKey')) return null;
  let s = src;
  if (!need(s, '    val showUserName: Boolean = false,\n', 'settings-fields')) return null;
  s = s.replace('    val showUserName: Boolean = false,\n',
    '    val showUserName: Boolean = false,\n' +
    '    // chat-look\n' +
    '    val showStamp: Boolean = true,\n' +
    '    val showCopy: Boolean = true,\n' +
    '    val chatName: String = "",\n');
  if (!need(s, '        val showUserName = booleanPreferencesKey("show_user_name")\n', 'settings-keys')) return null;
  s = s.replace('        val showUserName = booleanPreferencesKey("show_user_name")\n',
    '        val showUserName = booleanPreferencesKey("show_user_name")\n' +
    '        val showStamp = booleanPreferencesKey("show_stamp")\n' +
    '        val showCopy = booleanPreferencesKey("show_copy")\n' +
    '        val chatName = stringPreferencesKey("chat_name")\n');
  if (!need(s, '            UiPrefs.showUserName = it.showUserName\n', 'settings-sync')) return null;
  s = s.replace('            UiPrefs.showUserName = it.showUserName\n',
    '            UiPrefs.showUserName = it.showUserName\n' +
    '            UiPrefs.showStamp = it.showStamp\n' +
    '            UiPrefs.showCopy = it.showCopy\n' +
    '            UiPrefs.chatName = it.chatName\n');
  if (!need(s, '        showUserName = this[K.showUserName] ?: false,\n', 'settings-read')) return null;
  s = s.replace('        showUserName = this[K.showUserName] ?: false,\n',
    '        showUserName = this[K.showUserName] ?: false,\n' +
    '        showStamp = this[K.showStamp] ?: true,\n' +
    '        showCopy = this[K.showCopy] ?: true,\n' +
    '        chatName = this[K.chatName] ?: "",\n');
  if (!need(s, '    suspend fun setShowUserName(on: Boolean) = context.store.edit { it[K.showUserName] = on }\n', 'settings-setters')) return null;
  s = s.replace('    suspend fun setShowUserName(on: Boolean) = context.store.edit { it[K.showUserName] = on }\n',
    '    suspend fun setShowUserName(on: Boolean) = context.store.edit { it[K.showUserName] = on }\n' +
    '    suspend fun setShowStamp(on: Boolean) = context.store.edit { it[K.showStamp] = on }\n' +
    '    suspend fun setShowCopy(on: Boolean) = context.store.edit { it[K.showCopy] = on }\n' +
    '    suspend fun setChatName(v: String) = context.store.edit { it[K.chatName] = v }\n');
  return s;
});

// 3) SettingsViewModel: the three setters.
edit(A + '/feature/settings/SettingsViewModel.kt', (src) => {
  if (src.includes('fun setShowStamp')) return null;
  if (!need(src, '    fun setShowUserName(on: Boolean) = viewModelScope.launch { repo.setShowUserName(on) }\n', 'vm-look')) return null;
  return src.replace('    fun setShowUserName(on: Boolean) = viewModelScope.launch { repo.setShowUserName(on) }\n',
    '    fun setShowUserName(on: Boolean) = viewModelScope.launch { repo.setShowUserName(on) }\n' +
    '    fun setShowStamp(on: Boolean) = viewModelScope.launch { repo.setShowStamp(on) }\n' +
    '    fun setShowCopy(on: Boolean) = viewModelScope.launch { repo.setShowCopy(on) }\n' +
    '    fun setChatName(v: String) = viewModelScope.launch { repo.setChatName(v) }\n');
});

// 4) SettingsScreen: 显示 card gains stamp / copy, and a 我的资料 card for name + picture.
edit(A + '/feature/settings/SettingsScreen.kt', (src) => {
  if (src.includes('chat_look_name')) return null;
  const old = '    SettingsCard {\n' +
    '        SettingsRow(stringResource(R.string.show_user_avatar), stringResource(R.string.show_user_avatar_desc),\n' +
    '            trailing = { DSwitch(s.showUserAvatar, { on -> vm.setShowUserAvatar(on) }) })\n' +
    '        SettingsRow(stringResource(R.string.show_user_name), stringResource(R.string.show_user_name_desc),\n' +
    '            trailing = { DSwitch(s.showUserName, { on -> vm.setShowUserName(on) }) })\n' +
    '    }\n';
  if (!need(src, old, 'screen-display-card')) return null;
  const neu = '    // chat-look: pick the picture and the name here, independent of the signed-in account.\n' +
    '    val context = LocalContext.current\n' +
    '    val avatarRev = io.github.jackwener.dsh.core.data.ChatAvatar.rev\n' +
    '    val nameDesc = if (s.chatName.isBlank()) stringResource(R.string.chat_look_name_unset) else s.chatName\n' +
    '    val hasAvatar = remember(avatarRev) { io.github.jackwener.dsh.core.data.ChatAvatar.has(context) }\n' +
    '    var naming by remember { mutableStateOf(false) }\n' +
    '    var nameDraft by remember { mutableStateOf("") }\n' +
    '    val pickAvatar = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->\n' +
    '        if (uri != null) io.github.jackwener.dsh.core.data.ChatAvatar.save(context, uri)\n' +
    '    }\n' +
    '    SettingsCard {\n' +
    '        SettingsRow(stringResource(R.string.show_user_avatar), stringResource(R.string.show_user_avatar_desc),\n' +
    '            trailing = { DSwitch(s.showUserAvatar, { on -> vm.setShowUserAvatar(on) }) })\n' +
    '        SettingsRow(stringResource(R.string.show_user_name), stringResource(R.string.show_user_name_desc),\n' +
    '            trailing = { DSwitch(s.showUserName, { on -> vm.setShowUserName(on) }) })\n' +
    '        SettingsRow(stringResource(R.string.show_stamp), stringResource(R.string.show_stamp_desc),\n' +
    '            trailing = { DSwitch(s.showStamp, { on -> vm.setShowStamp(on) }) })\n' +
    '        SettingsRow(stringResource(R.string.show_copy), stringResource(R.string.show_copy_desc),\n' +
    '            trailing = { DSwitch(s.showCopy, { on -> vm.setShowCopy(on) }) })\n' +
    '    }\n' +
    '    SettingsGroupTitle(stringResource(R.string.chat_look_group))\n' +
    '    SettingsCard {\n' +
    '        SettingsRow(stringResource(R.string.chat_look_name), nameDesc,\n' +
    '            onClick = { nameDraft = s.chatName; naming = true })\n' +
    '        SettingsRow(stringResource(R.string.chat_look_avatar),\n' +
    '            if (hasAvatar) stringResource(R.string.chat_look_avatar_set) else stringResource(R.string.chat_look_avatar_unset),\n' +
    '            onClick = { pickAvatar.launch("image/*") },\n' +
    '            trailing = { DIcon(R.drawable.dsw_chevron_right_outline, size = 14.dp, tint = Dsh.colors.labelTertiary) })\n' +
    '        if (hasAvatar) {\n' +
    '            SettingsRow(stringResource(R.string.chat_look_avatar_clear), onClick = { io.github.jackwener.dsh.core.data.ChatAvatar.clear(context) })\n' +
    '        }\n' +
    '    }\n' +
    '    if (naming) DDialog({ naming = false }, stringResource(R.string.chat_look_name), buttons = {\n' +
    '        DButton(stringResource(R.string.cancel), { naming = false }, variant = BtnVariant.Outline)\n' +
    '        DButton(stringResource(R.string.save), { naming = false; vm.setChatName(nameDraft.trim()) })\n' +
    '    }) {\n' +
    '        DInput(nameDraft, { nameDraft = it }, placeholder = stringResource(R.string.chat_look_name_hint))\n' +
    '    }\n' +
    '    // avatarRev is read so the rows below re-read the file after a pick or a clear.\n';
  return src.replace(old, neu);
});

// 4b) SettingsScreen needs DDialog for the name dialog.
edit(A + '/feature/settings/SettingsScreen.kt', (src) => {
  if (src.includes('designsystem.DDialog')) return null;
  if (!need(src, 'import io.github.jackwener.dsh.core.designsystem.DButton\n', 'screen-dialog-import')) return null;
  return src.replace('import io.github.jackwener.dsh.core.designsystem.DButton\n',
    'import io.github.jackwener.dsh.core.designsystem.DButton\n' +
    'import io.github.jackwener.dsh.core.designsystem.DDialog\n');
});

// 5) Stream: name above the bubble; stamp / copy become switches; own picture and name win.
edit(A + '/feature/conversation/Stream.kt', (src) => {
  if (src.includes('chat-look')) return null;
  let s = src;
  if (!need(s, '    val showName = account != null && io.github.jackwener.dsh.core.data.UiPrefs.showUserName\n', 'stream-flags')) return null;
  s = s.replace('    val showName = account != null && io.github.jackwener.dsh.core.data.UiPrefs.showUserName\n', '    val showName = io.github.jackwener.dsh.core.data.UiPrefs.showUserName\n');
  s = s.replace('    val showAvatar = account != null && io.github.jackwener.dsh.core.data.UiPrefs.showUserAvatar\n',
    '    // chat-look: the name sits above your bubble, so it never squeezes into the stamp line;\n' +
    '    // the picture and the name you set in 设置 win over the account ones.\n' +
    '    val picRev = io.github.jackwener.dsh.core.data.ChatAvatar.rev\n' +
    '    val ownPic = remember(picRev) { io.github.jackwener.dsh.core.data.ChatAvatar.load(context) }\n' +
    '    val showAvatar = io.github.jackwener.dsh.core.data.UiPrefs.showUserAvatar\n' +
    '    val showStamp = io.github.jackwener.dsh.core.data.UiPrefs.showStamp\n' +
    '    val showCopy = io.github.jackwener.dsh.core.data.UiPrefs.showCopy\n');
  if (!need(s, '    val name = ui.cached?.name.orEmpty()\n', 'stream-name')) return null;
  s = s.replace('    val name = ui.cached?.name.orEmpty()\n',
    '    val name = io.github.jackwener.dsh.core.data.UiPrefs.chatName.ifBlank { ui.cached?.name.orEmpty() }\n');
  if (!need(s, '        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n', 'stream-row')) return null;
  s = s.replace('        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n',
    '        if (showName && name.isNotBlank()) {\n' +
    '            Text(name, Modifier.padding(bottom = 4.dp, end = if (showAvatar) 32.dp else 0.dp), style = DshType.xxs12, color = c.labelTertiary)\n' +
    '        }\n' +
    '        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n');
  if (!need(s, '            if (showAvatar) UserAvatar(avatar)\n', 'stream-avatar')) return null;
  s = s.replace('            if (showAvatar) UserAvatar(avatar)\n', '            if (showAvatar) UserAvatar(ownPic ?: avatar)\n');
  const oldTail = '        if (!compact) Row(Modifier.padding(top = 6.dp).height(28.dp), verticalAlignment = Alignment.CenterVertically) {\n' +
    '            if (showName && name.isNotBlank()) {\n' +
    '                Text(name, style = DshType.xs13, color = c.labelSecondary)\n' +
    '                Spacer(Modifier.width(6.dp))\n' +
    '            }\n' +
    '            Text(Fmt.stamp(context, u.time), style = DshType.xs13, color = c.labelTertiary)\n' +
    '            IconBtn(R.drawable.dsw_copy_outline, { copyText(context, u.text) }, iconSize = 15.dp, tint = c.labelTertiary, contentDescription = stringResource(R.string.copy_message))\n' +
    '        }\n';
  if (!need(s, oldTail, 'stream-tail')) return null;
  s = s.replace(oldTail,
    '        if (!compact && (showStamp || showCopy)) Row(Modifier.padding(top = 6.dp).height(28.dp), verticalAlignment = Alignment.CenterVertically) {\n' +
    '            if (showStamp) Text(Fmt.stamp(context, u.time), style = DshType.xs13, color = c.labelTertiary)\n' +
    '            if (showCopy) IconBtn(R.drawable.dsw_copy_outline, { copyText(context, u.text) }, iconSize = 15.dp, tint = c.labelTertiary, contentDescription = stringResource(R.string.copy_message))\n' +
    '        }\n');
  return s;
});

// 6) strings (zh + en).
const zh = {
  show_stamp: '显示时间戳', show_stamp_desc: '在你的消息下方显示发送时间',
  show_copy: '显示复制按钮', show_copy_desc: '在你的消息下方显示复制按钮',
  chat_look_group: '我的资料', chat_look_name: '名称', chat_look_name_unset: '未设置，用账号名',
  chat_look_name_hint: '留空则用账号名', chat_look_avatar: '头像',
  chat_look_avatar_set: '已设置自定义头像', chat_look_avatar_unset: '用账号头像',
  chat_look_avatar_clear: '清除自定义头像',
};
const en = {
  show_stamp: 'Show time', show_stamp_desc: 'Show when each of your messages was sent',
  show_copy: 'Show copy button', show_copy_desc: 'Show a copy button under your messages',
  chat_look_group: 'My profile', chat_look_name: 'Name', chat_look_name_unset: 'Not set, uses the account',
  chat_look_name_hint: 'Blank uses the account name', chat_look_avatar: 'Picture',
  chat_look_avatar_set: 'Custom picture set', chat_look_avatar_unset: 'Uses the account avatar',
  chat_look_avatar_clear: 'Clear custom picture',
};
function addStrings(file, map) {
  edit(file, (src) => {
    if (src.includes('name="chat_look_name"')) return null;
    if (!need(src, '</resources>', 'strings-' + file.split('/').pop())) return null;
    let block = '';
    for (const k of Object.keys(map)) block += '    <string name="' + k + '">' + map[k] + '</string>\n';
    return src.replace('</resources>', block + '</resources>');
  });
}
addStrings(RES + '/values/strings.xml', zh);
addStrings(RES + '/values-en/strings.xml', en);
console.log('done');
