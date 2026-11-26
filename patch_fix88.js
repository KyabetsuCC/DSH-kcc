// patch_fix88: safe-quiet — a process the system killed (low memory, an app update, a user stop) is
// not an engine crash, and when the crash breaker really does pause every plugin the app says so.
const fs = require('fs');
const root = process.argv[2] || '.';
const MARK = 'safe-quiet';

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
const BASE = 'app/src/main/java/io/github/jackwener/dsh';

edit(BASE + '/core/engine/RestartPolicy.kt', (src) => {
  if (src.includes(MARK)) return src;
  if (!need(src, '    /** The engine stayed up for [STABLE_MS] (or a user restarted it from Doctor): forget past crashes. */', 'recordHealthy')) return src;
  return src.replace(
    '    /** The engine stayed up for [STABLE_MS] (or a user restarted it from Doctor): forget past crashes. */',
    '    /**\n     * safe-quiet: drops the newest failure. An exit the system caused (low memory, the package being\n     * replaced by an install, the user stopping the app) is not an engine crash, but it arrives here\n     * looking exactly like one — three of those inside the window used to pause every plugin.\n     */\n    @Synchronized fun forgiveLast() {\n        failures.removeLastOrNull()\n        if (failures.size < MAX_FAILURES) open = false\n    }\n\n    /** The engine stayed up for [STABLE_MS] (or a user restarted it from Doctor): forget past crashes. */');
});

edit(BASE + '/core/engine/EngineDiagnostics.kt', (src) => {
  if (src.includes(MARK)) return src;
  if (!need(src, '    private fun prune(dir: File) {', 'prune')) return src;
  return src.replace(
    '    private fun prune(dir: File) {',
    '    /**\n     * safe-quiet: an exit the system chose, not one the engine caused. The summary is the first line\n     * of an `exit-<time>.txt` record, e.g. `… LOW_MEMORY (status 0) — single-cleaner`.\n     */\n    fun isExternalKill(summary: String): Boolean =\n        summary.contains("LOW_MEMORY") || summary.contains("USER_STOPPED") || summary.contains("USER_REQUESTED") ||\n            summary.contains("PERMISSION_CHANGE") || summary.contains("due to install") || summary.contains("due to update")\n\n    private fun prune(dir: File) {');
});

edit(BASE + '/core/engine/EngineManager.kt', (src) => {
  if (src.includes(MARK)) return src;
  if (!need(src, '            delay(2_000) // let the system record the exit reason\n            EngineDiagnostics.collectExitInfo(context)', 'exit tail')) return src;
  src = src.replace(
    '            delay(2_000) // let the system record the exit reason\n            EngineDiagnostics.collectExitInfo(context)',
    '            delay(2_000) // let the system record the exit reason\n            EngineDiagnostics.collectExitInfo(context)\n            // safe-quiet: if the system killed the process (low memory, an install replacing the app,\n            // the user stopping it), that is not a crash — take the failure back before it stacks up.\n            EngineDiagnostics.exitRecords(context).firstOrNull()?.let { rec ->\n                if (EngineDiagnostics.isExternalKill(rec.summary)) {\n                    Log.i(TAG, "engine exit was external (${rec.summary}); crash breaker forgiven")\n                    restarts.forgiveLast()\n                }\n            }');
  if (!need(src, '        io.github.jackwener.dsh.core.extensions.SafeModeRequest.take(context, restarts.open)?.let { putString(io.github.jackwener.dsh.core.extensions.SafeModeRequest.ENV, it) }', 'safe mode env')) return src;
  src = src.replace(
    '        io.github.jackwener.dsh.core.extensions.SafeModeRequest.take(context, restarts.open)?.let { putString(io.github.jackwener.dsh.core.extensions.SafeModeRequest.ENV, it) }',
    '        io.github.jackwener.dsh.core.extensions.SafeModeRequest.take(context, restarts.open)?.let { mode ->\n            putString(io.github.jackwener.dsh.core.extensions.SafeModeRequest.ENV, mode)\n            // safe-quiet: say it out loud. Plugins paused silently looked exactly like a bug.\n            if (mode == io.github.jackwener.dsh.core.extensions.SafeModeRequest.CRASH_LOOP) {\n                runCatching {\n                    io.github.jackwener.dsh.core.platform.Notifications.post(\n                        context,\n                        io.github.jackwener.dsh.core.platform.Notifications.CHANNEL_ATTENTION,\n                        io.github.jackwener.dsh.core.platform.Notifications.ID_SAFE_MODE,\n                        context.getString(io.github.jackwener.dsh.R.string.notif_safe_mode_title),\n                        context.getString(io.github.jackwener.dsh.R.string.notif_safe_mode_text),\n                        sessionId = null,\n                        open = io.github.jackwener.dsh.core.platform.Notifications.openSection(context, "Extensions"),\n                    )\n                }\n            }\n        }');
  return src;
});

edit(BASE + '/core/platform/Notifications.kt', (src) => {
  if (src.includes(MARK)) return src;
  if (!need(src, '    /** The group summary over several conversations\' notifications. */', 'id anchor')) return src;
  return src.replace(
    "    /** The group summary over several conversations' notifications. */",
    "    /** safe-quiet: the crash breaker paused every plugin, and the app says so once. */\n    const val ID_SAFE_MODE = 6\n    /** The group summary over several conversations' notifications. */");
});

function strings(rel, title, text) {
  edit(rel, (src) => {
    if (src.includes('notif_safe_mode_title')) return src;
    if (!need(src, '</resources>', 'strings tail ' + rel)) return src;
    return src.replace('</resources>',
      '    <string name="notif_safe_mode_title">' + title + '</string>\n' +
      '    <string name="notif_safe_mode_text">' + text + '</string>\n</resources>');
  });
}
strings('app/src/main/res/values/strings.xml', '插件已被全部暂停', '引擎连续崩溃后进入了安全模式，所有第三方插件都已暂停。点这里一键全部恢复。');
strings('app/src/main/res/values-en/strings.xml', 'All plugins were paused', 'The engine crashed repeatedly and started in safe mode, so every third-party plugin is paused. Tap to resume them all.');
console.log('done');
