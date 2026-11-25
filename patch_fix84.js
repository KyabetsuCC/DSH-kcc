// chat-identity: your own avatar + name in the chat, and a 偏好设置 section holding 显示 over 界面.
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

// 1) UiPrefs: the two flags the chat stream reads (settings flow keeps them in sync).
edit(A + '/core/data/UiPrefs.kt', (src) => {
  if (src.includes('chat-identity')) return null;
  if (!need(src, '    var immersive by mutableStateOf(false)\n', 'uiprefs')) return null;
  return src.replace('    var immersive by mutableStateOf(false)\n',
    '    var immersive by mutableStateOf(false)\n' +
    '\n' +
    '    // chat-identity: 显示用户头像 / 显示用户名称 in the chat stream (both off by default).\n' +
    '    var showUserAvatar by mutableStateOf(false)\n' +
    '    var showUserName by mutableStateOf(false)\n');
});

// 2) Settings: two booleans, persisted.
edit(A + '/core/data/SettingsRepository.kt', (src) => {
  if (src.includes('chat-identity')) return null;
  if (!need(src, '    val immersive: Boolean = false,\n', 'settings field')) return null;
  let s = src.replace('    val immersive: Boolean = false,\n',
    '    val immersive: Boolean = false,\n' +
    '    // chat-identity: show the signed-in avatar / account name beside your own messages.\n' +
    '    val showUserAvatar: Boolean = false,\n' +
    '    val showUserName: Boolean = false,\n');
  if (!need(s, '        val immersive = booleanPreferencesKey("immersive")\n', 'key')) return null;
  s = s.replace('        val immersive = booleanPreferencesKey("immersive")\n',
    '        val immersive = booleanPreferencesKey("immersive")\n' +
    '        val showUserAvatar = booleanPreferencesKey("show_user_avatar")\n' +
    '        val showUserName = booleanPreferencesKey("show_user_name")\n');
  if (!need(s, '        immersive = this[K.immersive] ?: false,\n', 'read')) return null;
  s = s.replace('        immersive = this[K.immersive] ?: false,\n',
    '        immersive = this[K.immersive] ?: false,\n' +
    '        showUserAvatar = this[K.showUserAvatar] ?: false,\n' +
    '        showUserName = this[K.showUserName] ?: false,\n');
  if (!need(s, '            UiPrefs.immersive = it.immersive\n', 'uiprefs sync')) return null;
  s = s.replace('            UiPrefs.immersive = it.immersive\n',
    '            UiPrefs.immersive = it.immersive\n' +
    '            UiPrefs.showUserAvatar = it.showUserAvatar\n' +
    '            UiPrefs.showUserName = it.showUserName\n');
  if (!need(s, '    suspend fun setImmersive(on: Boolean) = context.store.edit { it[K.immersive] = on }\n', 'setter')) return null;
  s = s.replace('    suspend fun setImmersive(on: Boolean) = context.store.edit { it[K.immersive] = on }\n',
    '    suspend fun setImmersive(on: Boolean) = context.store.edit { it[K.immersive] = on }\n' +
    '    // chat-identity\n' +
    '    suspend fun setShowUserAvatar(on: Boolean) = context.store.edit { it[K.showUserAvatar] = on }\n' +
    '    suspend fun setShowUserName(on: Boolean) = context.store.edit { it[K.showUserName] = on }\n');
  return s;
});

// 3) ViewModel setters.
edit(A + '/feature/settings/SettingsViewModel.kt', (src) => {
  if (src.includes('chat-identity')) return null;
  if (!need(src, '    fun setImmersive(on: Boolean) = viewModelScope.launch { repo.setImmersive(on) }\n', 'vm setter')) return null;
  return src.replace('    fun setImmersive(on: Boolean) = viewModelScope.launch { repo.setImmersive(on) }\n',
    '    fun setImmersive(on: Boolean) = viewModelScope.launch { repo.setImmersive(on) }\n' +
    '    // chat-identity: 偏好设置 → 显示\n' +
    '    fun setShowUserAvatar(on: Boolean) = viewModelScope.launch { repo.setShowUserAvatar(on) }\n' +
    '    fun setShowUserName(on: Boolean) = viewModelScope.launch { repo.setShowUserName(on) }\n');
});

// 4) Settings screen: a 偏好设置 section (显示 above 界面), enter-to-send back on 通用.
edit(A + '/feature/settings/SettingsScreen.kt', (src) => {
  if (src.includes('chat-identity')) return null;
  const oldEnum = '    Model(R.string.set_model, R.drawable.dsw_data_outline), Agent(R.string.set_agent, R.drawable.dsw_apps_add_outline),';
  if (!need(src, oldEnum, 'enum')) return null;
  let s = src.replace(oldEnum,
    '    // chat-identity: 偏好设置 sits right under 通用.\n' +
    '    Preference(R.string.set_preference, R.drawable.dsw_personalization_outline),\n' +
    oldEnum);
  const oldWhen = '            SettingsSection.Model -> ModelSection(vm) { open(ProviderRoute(it.takeUnless { id -> id == NEW_PROVIDER })) }';
  if (!need(s, oldWhen, 'when branch')) return null;
  s = s.replace(oldWhen, '            SettingsSection.Preference -> PreferenceSection(vm)\n' + oldWhen);
  const oldBusy = '        SettingsRow(stringResource(R.string.set_busy_send), stringResource(R.string.set_busy_send_desc), stacked = true) {\n' +
    '            Segmented(listOf(stringResource(R.string.busy_queue), stringResource(R.string.busy_steer)), s.busySend.ordinal, { vm.setBusySend(BusySend.entries[it]) })\n' +
    '        }\n';
  if (!need(s, oldBusy, 'busy row')) return null;
  s = s.replace(oldBusy, oldBusy +
    '        // chat-identity: 回车直接发送 stays on this page, at the end of the first card.\n' +
    '        SettingsRow(stringResource(R.string.enter_to_send), stringResource(R.string.enter_to_send_desc),\n' +
    '            trailing = { DSwitch(s.enterToSend, { on -> vm.setEnterToSend(on) }) })\n');
  const uiRe = /    SettingsGroupTitle\(stringResource\(R\.string\.set_ui_group\)\)\n    SettingsCard \{[\s\S]*?\n    \}\n    if \(ballLook\)/;
  if (!uiRe.test(s)) { console.log('ANCHOR0 ui block'); process.exitCode = 1; return null; }
  s = s.replace(uiRe, '    if (ballLook)');
  const preAnchor = '@Composable\nprivate fun ModelSection(vm: SettingsViewModel, onProvider: (String) -> Unit) {';
  if (!need(s, preAnchor, 'model section anchor')) return null;
  s = s.replace(preAnchor,
    '// chat-identity: 偏好设置 — what the chat shows (显示) over how it looks (界面).\n' +
    '@Composable\n' +
    'private fun PreferenceSection(vm: SettingsViewModel) {\n' +
    '    val s by vm.settings.collectAsStateWithLifecycle()\n' +
    '    Spacer(Modifier.height(8.dp))\n' +
    '    SettingsGroupTitle(stringResource(R.string.set_display_group))\n' +
    '    SettingsCard {\n' +
    '        SettingsRow(stringResource(R.string.show_user_avatar), stringResource(R.string.show_user_avatar_desc),\n' +
    '            trailing = { DSwitch(s.showUserAvatar, { on -> vm.setShowUserAvatar(on) }) })\n' +
    '        SettingsRow(stringResource(R.string.show_user_name), stringResource(R.string.show_user_name_desc),\n' +
    '            trailing = { DSwitch(s.showUserName, { on -> vm.setShowUserName(on) }) })\n' +
    '    }\n' +
    '    SettingsGroupTitle(stringResource(R.string.set_ui_group))\n' +
    '    SettingsCard {\n' +
    '        SettingsRow(stringResource(R.string.set_drawer_compact), stringResource(R.string.set_drawer_compact_desc), divider = true,\n' +
    '            trailing = { DSwitch(s.compactDrawer, { on -> vm.setCompactDrawer(on) }) })\n' +
    '        SettingsRow(stringResource(R.string.set_immersive), stringResource(R.string.set_immersive_desc), divider = true,\n' +
    '            trailing = { DSwitch(s.immersive, { on -> vm.setImmersive(on) }) })\n' +
    '        SettingsRow(stringResource(R.string.set_cost_currency), stringResource(R.string.set_cost_currency_desc), divider = true, stacked = true) {\n' +
    '            Segmented(listOf("$ USD", "¥ CNY"), if (s.currency == "CNY") 1 else 0, { k -> vm.setCurrency(if (k == 1) "CNY" else "USD") })\n' +
    '        }\n' +
    '        Row(\n' +
    '            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),\n' +
    '            horizontalArrangement = Arrangement.spacedBy(12.dp),\n' +
    '        ) {\n' +
    '            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {\n' +
    '                Text(stringResource(R.string.set_font_size), style = DshType.s14, color = Dsh.colors.labelPrimary)\n' +
    '                Segmented(listOf(\n' +
    '                    stringResource(R.string.set_font_small),\n' +
    '                    stringResource(R.string.set_font_normal),\n' +
    '                    stringResource(R.string.set_font_large),\n' +
    '                    stringResource(R.string.set_font_xl),\n' +
    '                ), s.fontScale, { k -> vm.setFontScale(k) }, compact = true)\n' +
    '            }\n' +
    '            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {\n' +
    '                Text(stringResource(R.string.set_chat_width), style = DshType.s14, color = Dsh.colors.labelPrimary)\n' +
    '                Segmented(listOf(\n' +
    '                    stringResource(R.string.set_width_narrow),\n' +
    '                    stringResource(R.string.set_width_normal),\n' +
    '                    stringResource(R.string.set_width_wide),\n' +
    '                ), s.chatPadding, { k -> vm.setChatPadding(k) }, compact = true)\n' +
    '            }\n' +
    '        }\n' +
    '    }\n' +
    '}\n\n' + preAnchor);
  return s;
});

// 5) Chat stream: avatar beside the bubble, name in the meta row (neither adds height above).
edit(A + '/feature/conversation/Stream.kt', (src) => {
  if (src.includes('chat-identity')) return null;
  let s = src;
  if (!need(s, 'import androidx.compose.foundation.background\n', 'import anchor')) return null;
  s = s.replace('import androidx.compose.foundation.background\n',
    'import androidx.compose.foundation.Image\nimport androidx.compose.foundation.background\n');
  if (!need(s, 'import androidx.compose.ui.draw.clip\n', 'clip anchor')) return null;
  s = s.replace('import androidx.compose.ui.draw.clip\n',
    'import androidx.compose.ui.draw.clip\nimport androidx.compose.ui.graphics.asImageBitmap\nimport androidx.compose.ui.layout.ContentScale\n');
  if (!need(s, 'import kotlinx.coroutines.delay\n', 'delay anchor')) return null;
  s = s.replace('import kotlinx.coroutines.delay\n',
    'import androidx.lifecycle.compose.collectAsStateWithLifecycle\nimport kotlinx.coroutines.delay\n');
  const start = '@Composable\nprivate fun UserMessage(u: UserMsg, compact: Boolean) {';
  const end = '\n/** A message steered into the running turn that dsh has not logged yet: the user bubble, dimmed, with its state. */';
  const i = s.indexOf(start), j = s.indexOf(end);
  if (i < 0 || j < 0 || j < i) { console.log('ANCHOR0 user message'); process.exitCode = 1; return null; }
  const fn =
    '@Composable\n' +
    'private fun UserMessage(u: UserMsg, compact: Boolean) {\n' +
    '    val c = Dsh.colors\n' +
    '    val context = LocalContext.current\n' +
    '    val maxW = (LocalConfiguration.current.screenWidthDp * 0.82f).dp\n' +
    '    // chat-identity: your avatar and name are optional. The avatar sits beside the bubble (not\n' +
    '    // above it), so switching it on never pushes the messages above up the screen.\n' +
    '    val account = io.github.jackwener.dsh.feature.account.LocalAccount.current\n' +
    '    val noAvatar = remember { kotlinx.coroutines.flow.MutableStateFlow<android.graphics.Bitmap?>(null) }\n' +
    '    val avatar by (account?.avatar ?: noAvatar).collectAsStateWithLifecycle()\n' +
    '    val showAvatar = account != null && io.github.jackwener.dsh.core.data.UiPrefs.showUserAvatar\n' +
    '    val showName = account != null && io.github.jackwener.dsh.core.data.UiPrefs.showUserName\n' +
    '    val noState = remember { kotlinx.coroutines.flow.MutableStateFlow(io.github.jackwener.dsh.core.account.AccountUi()) }\n' +
    '    val ui by (account?.state ?: noState).collectAsStateWithLifecycle()\n' +
    '    val name = ui.cached?.name.orEmpty()\n' +
    '    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.End) {\n' +
    '        if (u.images > 0 || u.files > 0) {\n' +
    '            Row(Modifier.padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {\n' +
    '                if (u.images > 0) {\n' +
    '                    var viewer by remember(u.seq) { mutableStateOf(false) }\n' +
    '                    Tag(\n' +
    '                        stringResource(R.string.images_n, u.images),\n' +
    '                        modifier = Modifier.clickable(enabled = u.imageIds.isNotEmpty()) { viewer = true },\n' +
    '                    )\n' +
    '                    if (viewer) ImageViewer(u.imageIds) { viewer = false }\n' +
    '                }\n' +
    '                if (u.files > 0) Tag(stringResource(R.string.files_n, u.files))\n' +
    '            }\n' +
    '        }\n' +
    '        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n' +
    '            Column(horizontalAlignment = Alignment.End) {\n' +
    '                if (u.text.isNotBlank()) SelectionContainer {\n' +
    '                    Text(u.text, Modifier.widthIn(max = maxW).clip(Radius.xl).background(c.bubble).padding(horizontal = 16.dp, vertical = 10.dp),\n' +
    '                        style = DshType.s14.copy(fontSize = DshType.s14.fontSize * io.github.jackwener.dsh.core.data.UiPrefs.readingScale), color = c.labelPrimary)\n' +
    '                }\n' +
    '            }\n' +
    '            if (showAvatar) UserAvatar(avatar)\n' +
    '        }\n' +
    '        if (!compact) Row(Modifier.padding(top = 6.dp).height(28.dp), verticalAlignment = Alignment.CenterVertically) {\n' +
    '            if (showName && name.isNotBlank()) {\n' +
    '                Text(name, style = DshType.xs13, color = c.labelSecondary)\n' +
    '                Spacer(Modifier.width(6.dp))\n' +
    '            }\n' +
    '            Text(Fmt.stamp(context, u.time), style = DshType.xs13, color = c.labelTertiary)\n' +
    '            IconBtn(R.drawable.dsw_copy_outline, { copyText(context, u.text) }, iconSize = 15.dp, tint = c.labelTertiary, contentDescription = stringResource(R.string.copy_message))\n' +
    '        }\n' +
    '    }\n' +
    '}\n' +
    '\n' +
    '/** chat-identity: the signed-in avatar, 24 dp beside your bubble; a glyph until one is loaded. */\n' +
    '@Composable\n' +
    'private fun UserAvatar(bmp: android.graphics.Bitmap?) {\n' +
    '    val c = Dsh.colors\n' +
    '    Box(Modifier.padding(top = 2.dp).size(24.dp).clip(CircleShape).background(c.bgLayer2), contentAlignment = Alignment.Center) {\n' +
    '        if (bmp != null) Image(bmp.asImageBitmap(), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)\n' +
    '        else Text(stringResource(R.string.chat_me), style = DshType.xxs12, color = c.labelSecondary)\n' +
    '    }\n' +
    '}\n';
  s = s.slice(0, i) + fn + s.slice(j + 1);
  return s;
});

// 6) Strings.
const ZH = [
  ['set_preference', '偏好设置'],
  ['set_display_group', '显示'],
  ['show_user_avatar', '显示用户头像'],
  ['show_user_avatar_desc', '在你的消息右侧显示账号头像'],
  ['show_user_name', '显示用户名称'],
  ['show_user_name_desc', '在你的消息下方显示账号名称'],
  ['chat_me', '我'],
];
const EN = [
  ['set_preference', 'Preferences'],
  ['set_display_group', 'Display'],
  ['show_user_avatar', 'Show my avatar'],
  ['show_user_avatar_desc', 'Show your account avatar beside your messages'],
  ['show_user_name', 'Show my name'],
  ['show_user_name_desc', 'Show your account name with your messages'],
  ['chat_me', 'Me'],
];
function addStrings(file, list) {
  edit(file, (src) => {
    if (src.includes('chat-identity')) return null;
    if (!need(src, '</resources>', 'strings tail ' + file)) return null;
    const add = '    <!-- chat-identity -->\n' + list.map(([k, v]) => '    <string name="' + k + '">' + v + '</string>').join('\n') + '\n';
    return src.replace('</resources>', add + '</resources>');
  });
}
addStrings(RES + '/values/strings.xml', ZH);
addStrings(RES + '/values-en/strings.xml', EN);
