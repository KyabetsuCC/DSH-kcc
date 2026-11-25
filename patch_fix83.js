// ball-look: size + opacity for the floating ball and its bubble, in a sub-page of 设置.
const fs = require('fs');
const root = process.argv[2] || '.';
const A = root + '/app/src/main/java/io/github/jackwener/dsh';

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

// 1) Settings: four new values.
edit(A + '/core/data/SettingsRepository.kt', (src) => {
  if (src.includes('ball-look')) return null;
  if (!need(src, '    val ballStatus: Boolean = true,\n', 'settings field')) return null;
  let s = src.replace('    val ballStatus: Boolean = true,\n',
    '    val ballStatus: Boolean = true,\n' +
    '    // ball-look: percent of the default ball / bubble size, and opacity in percent.\n' +
    '    val ballSize: Int = 100,\n' +
    '    val ballAlpha: Int = 100,\n' +
    '    val bubbleSize: Int = 100,\n' +
    '    val bubbleAlpha: Int = 100,\n');
  if (!need(s, '        val ball = booleanPreferencesKey("floating_ball")\n', 'key')) return null;
  s = s.replace('        val ball = booleanPreferencesKey("floating_ball")\n',
    '        val ball = booleanPreferencesKey("floating_ball")\n' +
    '        val ballSize = intPreferencesKey("ball_size")\n' +
    '        val ballAlpha = intPreferencesKey("ball_alpha")\n' +
    '        val bubbleSize = intPreferencesKey("bubble_size")\n' +
    '        val bubbleAlpha = intPreferencesKey("bubble_alpha")\n');
  if (!need(s, '        ballStatus = this[K.ballStatus] ?: true,\n', 'read')) return null;
  s = s.replace('        ballStatus = this[K.ballStatus] ?: true,\n',
    '        ballStatus = this[K.ballStatus] ?: true,\n' +
    '        ballSize = this[K.ballSize] ?: 100,\n' +
    '        ballAlpha = this[K.ballAlpha] ?: 100,\n' +
    '        bubbleSize = this[K.bubbleSize] ?: 100,\n' +
    '        bubbleAlpha = this[K.bubbleAlpha] ?: 100,\n');
  if (!need(s, '    suspend fun setBallStatus(on: Boolean) = context.store.edit { it[K.ballStatus] = on }\n', 'setter')) return null;
  s = s.replace('    suspend fun setBallStatus(on: Boolean) = context.store.edit { it[K.ballStatus] = on }\n',
    '    suspend fun setBallStatus(on: Boolean) = context.store.edit { it[K.ballStatus] = on }\n' +
    '    // ball-look: the floating ball reads these on every change, so the page previews live.\n' +
    '    suspend fun setBallLook(size: Int = -1, alpha: Int = -1, bubbleSize: Int = -1, bubbleAlpha: Int = -1) = context.store.edit {\n' +
    '        if (size >= 0) it[K.ballSize] = size\n' +
    '        if (alpha >= 0) it[K.ballAlpha] = alpha\n' +
    '        if (bubbleSize >= 0) it[K.bubbleSize] = bubbleSize\n' +
    '        if (bubbleAlpha >= 0) it[K.bubbleAlpha] = bubbleAlpha\n' +
    '    }\n');
  return s;
});

// 2) ViewModel.
edit(A + '/feature/settings/SettingsViewModel.kt', (src) => {
  if (src.includes('ball-look')) return null;
  if (!need(src, '    fun setBallStatus(on: Boolean) = viewModelScope.launch { repo.setBallStatus(on) }\n', 'vm setter')) return null;
  return src.replace('    fun setBallStatus(on: Boolean) = viewModelScope.launch { repo.setBallStatus(on) }\n',
    '    fun setBallStatus(on: Boolean) = viewModelScope.launch { repo.setBallStatus(on) }\n' +
    '    /** ball-look: -1 keeps a value, so one page can change one column at a time. */\n' +
    '    fun setBallLook(ballSize: Int = -1, ballAlpha: Int = -1, bubbleSize: Int = -1, bubbleAlpha: Int = -1) =\n' +
    '        viewModelScope.launch { repo.setBallLook(ballSize, ballAlpha, bubbleSize, bubbleAlpha) }\n');
});

// 3) The service applies the look to the live views.
edit(A + '/service/FloatingBallService.kt', (src) => {
  if (src.includes('ball-look')) return null;
  if (!need(src, '    private var view: ImageView? = null\n', 'field')) return null;
  let s = src.replace('    private var view: ImageView? = null\n',
    '    private var view: ImageView? = null\n' +
    '    // ball-look: the ball window and the user-chosen opacity; the view alpha still marks idle/awake.\n' +
    '    private var ballLp: WindowManager.LayoutParams? = null\n' +
    '    private var ballAlphaPct = 100\n');
  if (!need(s, '        wm.addView(v, lp)\n', 'addView')) return null;
  s = s.replace('        wm.addView(v, lp)\n', '        wm.addView(v, lp)\n        ballLp = lp\n');
  if (!need(s, '        scope.launch { settings.settings.map { it.ballStatus }.distinctUntilChanged().collect { statusOn = it; render() } }\n', 'collector')) return null;
  s = s.replace('        scope.launch { settings.settings.map { it.ballStatus }.distinctUntilChanged().collect { statusOn = it; render() } }\n',
    '        scope.launch { settings.settings.map { it.ballStatus }.distinctUntilChanged().collect { statusOn = it; render() } }\n' +
    '        scope.launch {\n' +
    '            settings.settings.map { listOf(it.ballSize, it.ballAlpha, it.bubbleSize, it.bubbleAlpha) }\n' +
    '                .distinctUntilChanged().collect { applyLook(settings.current()) }\n' +
    '        }\n');
  if (!need(s, '    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()\n', 'dp')) return null;
  s = s.replace('    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()\n',
    '    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()\n' +
    '\n' +
    '    /** ball-look: the image alpha fades the artwork only, so idle/awake keeps its own alpha. */\n' +
    '    private fun applyLook(s: io.github.jackwener.dsh.core.data.Settings) {\n' +
    '        ballAlphaPct = s.ballAlpha\n' +
    '        val px = (43 * resources.displayMetrics.density * s.ballSize / 100f).toInt().coerceIn(dp(20), dp(120))\n' +
    '        view?.let { v ->\n' +
    '            v.imageAlpha = 255 * s.ballAlpha / 100\n' +
    '            ballLp?.let { lp ->\n' +
    '                if (lp.width != px) {\n' +
    '                    lp.width = px\n' +
    '                    lp.height = px\n' +
    '                    runCatching { wm.updateViewLayout(v, lp) }\n' +
    '                }\n' +
    '            }\n' +
    '        }\n' +
    '        capsule?.let { c ->\n' +
    '            c.alpha = s.bubbleAlpha / 100f\n' +
    '            c.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f * s.bubbleSize / 100f)\n' +
    '        }\n' +
    '    }\n');
  return s;
});

// 4) Settings screen: one row under the switch, one page behind the chevron.
edit(A + '/feature/settings/SettingsScreen.kt', (src) => {
  if (src.includes('ball-look-ui')) return null;
  if (!need(src, '    var wantBall by rememberSaveable { mutableStateOf(false) }\n', 'state')) return null;
  let s = src.replace('    var wantBall by rememberSaveable { mutableStateOf(false) }\n',
    '    var wantBall by rememberSaveable { mutableStateOf(false) }\n' +
    '    var ballLook by rememberSaveable { mutableStateOf(false) } // ball-look-ui\n');
  if (!need(s, '        if (s.floatingBall && canOverlay) SettingsRow(stringResource(R.string.ball_status_setting), stringResource(R.string.ball_status_setting_desc),\n            trailing = { DSwitch(s.ballStatus, { vm.setBallStatus(it) }) })\n', 'row')) return null;
  s = s.replace('        if (s.floatingBall && canOverlay) SettingsRow(stringResource(R.string.ball_status_setting), stringResource(R.string.ball_status_setting_desc),\n            trailing = { DSwitch(s.ballStatus, { vm.setBallStatus(it) }) })\n',
    '        if (s.floatingBall && canOverlay) SettingsRow(stringResource(R.string.ball_status_setting), stringResource(R.string.ball_status_setting_desc),\n            trailing = { DSwitch(s.ballStatus, { vm.setBallStatus(it) }) })\n' +
    '        // ball-look-ui: size and opacity live one level deeper, the switch stays on this page.\n' +
    '        if (s.floatingBall && canOverlay) SettingsRow(stringResource(R.string.ball_look_setting), stringResource(R.string.ball_look_setting_desc),\n' +
    '            onClick = { ballLook = true },\n' +
    '            trailing = { DIcon(R.drawable.dsw_chevron_right_outline, size = 14.dp, tint = Dsh.colors.labelTertiary) })\n');
  if (!need(s, '    SettingsGroupTitle(stringResource(R.string.set_entry_points))\n', 'tail')) return null;
  s = s.replace('    SettingsGroupTitle(stringResource(R.string.set_entry_points))\n',
    '    if (ballLook) BallLookPage(vm, { ballLook = false })\n' +
    '    SettingsGroupTitle(stringResource(R.string.set_entry_points))\n');
  return s;
});

// 5) Strings (zh + en).
const KEYS = [
  ['ball_look_setting', '悬浮窗外观', 'Ball appearance'],
  ['ball_look_setting_desc', '调整悬浮窗和气泡的大小与透明度', 'Size and opacity of the ball and its bubble'],
  ['ball_size_setting', '悬浮窗大小', 'Ball size'],
  ['ball_alpha_setting', '悬浮窗不透明度', 'Ball opacity'],
  ['bubble_size_setting', '气泡大小', 'Bubble size'],
  ['bubble_alpha_setting', '气泡不透明度', 'Bubble opacity'],
  ['ball_look_hint', '改完立刻生效，悬浮窗不用重开。', 'Changes apply to the ball right away.'],
];
for (const [file, i] of [['/app/src/main/res/values/strings.xml', 1], ['/app/src/main/res/values-en/strings.xml', 2]]) {
  edit(root + file, (src) => {
    if (src.includes('ball_look_setting')) return null;
    const lines = KEYS.map((k) => '    <string name="' + k[0] + '">' + k[i] + '</string>\n').join('');
    return src.replace('</resources>', lines + '</resources>');
  });
}
