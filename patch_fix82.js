const fs = require('fs'), path = require('path');
const root = process.argv[2] || '.';
let bad = 0, changed = 0;
function edit(file, fn) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { console.log('MISSING  ' + file); bad++; return; }
  const src = fs.readFileSync(p, 'utf8'); const out = fn(src);
  if (out === null) { console.log('SKIP     ' + file); return; }
  if (out === src) { console.log('NOCHANGE ' + file); bad++; return; }
  fs.writeFileSync(p, out); console.log('OK       ' + file); changed++;
}
function need(src, s, what) { if (!src.includes(s)) { console.log('ANCHOR0 ' + what); bad++; return false; } return true; }
const D = 'app/src/main/java/io/github/jackwener/dsh';

// ---- 1. stop must really stop ------------------------------------------------
edit(D + '/core/engine/EngineManager.kt', (src) => {
  if (src.includes('stop-hard')) return null;
  let s = src;
  const a = '    suspend fun stop() { mutex.withLock { shutdownLocked() }; keepAlive() }';
  if (!need(s, a, 'stop')) return null;
  s = s.replace(a, '    // stop-hard: a deliberate stop must stay stopped. keepAlive() here restarted the engine\n' +
    '    // right away, and the turn the user just aborted kept running in the new process.\n' +
    '    suspend fun stop() { mutex.withLock { shutdownLocked() } }');
  const b = '        runCatching { withTimeout(3_000) { sdk?.request("shutdown") } }\n        teardown(generation)\n' +
    '        if (dying != null && withTimeoutOrNull(5_000) { dying.await() } == null) killEngineProcess()';
  if (!need(s, b, 'shutdownLocked')) return null;
  s = s.replace(b, '        runCatching { withTimeout(1_500) { sdk?.request("shutdown") } }\n        teardown(generation)\n' +
    '        // stop-hard: Node does not answer shutdown while a turn runs, so the process is always\n' +
    '        // killed here — a live engine would keep finishing the turn the user stopped.\n' +
    '        if (dying != null) withTimeoutOrNull(2_500) { dying.await() }\n        killEngineProcess()');
  return s;
});

// ---- 2. a torn-down engine generation must not write into the log -----------
edit(D + '/core/session/SessionStore.kt', (src) => {
  if (src.includes('stop-hard')) return null;
  let s = src;
  const a = '            "session.event" -> {\n                val event = params.o("event") ?: return';
  if (!need(s, a, 'session.event')) return null;
  s = s.replace(a, '            "session.event" -> {\n' +
    '                // stop-hard: a stopped engine can still flush what it was doing; do not log it.\n' +
    '                if (gen <= engine.retiredGeneration) return\n' +
    '                val event = params.o("event") ?: return');
  return s;
});

// ---- 3. resume-all for safe mode --------------------------------------------
edit(D + '/feature/extensions/ExtensionsViewModel.kt', (src) => {
  if (src.includes('resume-all')) return null;
  let s = src;
  const a = '    fun resume(name: String) = act(name) { resume(name) }';
  if (!need(s, a, 'resume')) return null;
  s = s.replace(a, a + '\n\n' +
    '    /** resume-all: safe mode pauses every third-party plugin, so putting them back one by one is painful. */\n' +
    '    val resumeAllCount = MutableStateFlow(0)\n' +
    '    fun resumeAll() = viewModelScope.launch {\n' +
    '        val paused = store.list.value?.plugins.orEmpty().filter { it.suspended != null }\n' +
    '        resumeAllCount.value = -1\n' +
    '        var done = 0\n' +
    '        paused.forEach { p -> runCatching { store.change(p.name) { resume(p.name) } }.onSuccess { done++ } }\n' +
    '        store.refresh()\n' +
    '        resumeAllCount.value = done\n' +
    '    }');
  return s;
});

edit(D + '/feature/extensions/ExtensionsScreen.kt', (src) => {
  if (src.includes('resume-all')) return null;
  let s = src;
  const a = '        Notice(stringResource(res, l.safeModePaused), Tone.Warn)';
  if (!need(s, a, 'safe banner')) return null;
  s = s.replace(a, '        // resume-all: one tap instead of resuming every paused plugin by hand.\n' +
    '        Notice(stringResource(res, l.safeModePaused), Tone.Warn) {\n' +
    '            DButton(stringResource(R.string.ext_resume_all), { vm.resumeAll() }, size = BtnSize.Sm, variant = BtnVariant.Outline)\n' +
    '        }');
  return s;
});

// ---- 4. usage: cost joins the number row ------------------------------------
edit(D + '/feature/settings/UsageSection.kt', (src) => {
  if (src.includes('usage-cost-cell')) return null;
  let s = src;
  const st = 'private fun Stats(input: Long, cached: Long, output: Long) {\n' +
    '    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp)) {\n' +
    '        StatCell(stringResource(R.string.usage_input), fmt(input), Modifier.weight(1f))\n' +
    '        StatCell(stringResource(R.string.usage_cached), fmt(cached), Modifier.weight(1f))\n' +
    '        StatCell(stringResource(R.string.usage_output), fmt(output), Modifier.weight(1f))\n' +
    '    }\n}';
  if (!need(s, st, 'Stats')) return null;
  s = s.replace(st, 'private fun Stats(input: Long, cached: Long, output: Long, cost: String? = null) {\n' +
    '    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {\n' +
    '        StatCell(stringResource(R.string.usage_input), fmt(input), Modifier.weight(1f))\n' +
    '        StatCell(stringResource(R.string.usage_cached), fmt(cached), Modifier.weight(1f))\n' +
    '        StatCell(stringResource(R.string.usage_output), fmt(output), Modifier.weight(1f))\n' +
    '        // usage-cost-cell: the spend belongs with the token counts, not on a second line.\n' +
    '        StatCell(stringResource(R.string.usage_cost), cost ?: "-", Modifier.weight(1f))\n' +
    '    }\n}');
  const t1 = '            Stats(today?.inputTokens ?: 0L, today?.cachedTokens ?: 0L, today?.outputTokens ?: 0L)';
  if (!need(s, t1, 'today stats')) return null;
  s = s.replace(t1, '            Stats(today?.inputTokens ?: 0L, today?.cachedTokens ?: 0L, today?.outputTokens ?: 0L, today?.let { u -> (Pricing.dayCosts[u.day] ?: Pricing.cost(usageOf(u)))?.let { v -> Pricing.format(v) } })');
  const t2 = '                    fmt(total[0] + total[2]) + " tok · " + monthCost(days) + " · " + stringResource(R.string.usage_days, days.size),';
  if (!need(s, t2, 'total subtitle')) return null;
  s = s.replace(t2, '                    stringResource(R.string.usage_days, days.size),');
  const t3 = '            Stats(total[0], total[1], total[2])';
  if (!need(s, t3, 'total stats')) return null;
  s = s.replace(t3, '            Stats(total[0], total[1], total[2], monthCost(days))');
  const t4 = '            stringResource(R.string.usage_cache_hit) + " " + hitRate(sumIn, sumCached) + " · " +\n' +
    '                Pricing.format(agg.sumOf { it.cost }) + " · " + fmt(sumIn + sumOut) + " tok",';
  if (!need(s, t4, 'models subtitle')) return null;
  s = s.replace(t4, '            stringResource(R.string.usage_cache_hit) + " " + hitRate(sumIn, sumCached),');
  const t5 = '        Stats(sumIn, sumCached, sumOut)';
  if (!need(s, t5, 'models stats')) return null;
  s = s.replace(t5, '        Stats(sumIn, sumCached, sumOut, Pricing.format(agg.sumOf { it.cost }))');
  return s;
});

// ---- strings ----------------------------------------------------------------
const KEYS = [
  ['usage_cost', '花费', 'Cost'],
  ['ext_resume_all', '全部恢复', 'Resume all'],
];
for (const [file, idx] of [['app/src/main/res/values/strings.xml', 1], ['app/src/main/res/values-en/strings.xml', 2]]) {
  edit(file, (src) => {
    if (src.includes('name="' + KEYS[0][0] + '"')) return null;
    let add = '';
    for (const k of KEYS) add += '    <string name="' + k[0] + '">' + k[idx] + '</string>\n';
    if (!need(src, '</resources>', file)) return null;
    return src.replace('</resources>', add + '</resources>');
  });
}

console.log(bad === 0 ? 'patch_fix82: all done (' + changed + ' files)' : 'patch_fix82: ' + bad + ' problem(s)');
process.exit(bad === 0 ? 0 : 1);
