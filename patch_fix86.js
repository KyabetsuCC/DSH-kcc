// empty-send: an empty draft must not start a turn. The keyboard's Send key and the
// voice hook both reached send() directly, so a blank message went out and rendered nothing.
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

// 1) Composer: the IME Send key only fires when there is something to send.
edit(A + '/feature/conversation/Composer.kt', (src) => {
  if (src.includes('empty-send')) return null;
  const a = '            keyboardActions = KeyboardActions(onSend = { if (enterToSend) onSend() }),';
  if (!need(src, a, 'composer-ime')) return null;
  return src.replace(a,
    '            // empty-send: the Send key on a blank draft used to start an empty turn.\n' +
    '            keyboardActions = KeyboardActions(onSend = { if (enterToSend && (!state.isEmpty || canSendEmpty)) onSend() }),');
});

// 2) ComposerSlot: send() is shared by the button, the voice hook and the quick panel.
edit(A + '/feature/conversation/HomeScreen.kt', (src) => {
  if (src.includes('empty-send')) return null;
  const a = '    val send = {\n        val text = prepare(composer.outgoingText(context))\n';
  if (!need(src, a, 'slot-send')) return null;
  return src.replace(a,
    '    val send = send@{\n' +
    '        val text = prepare(composer.outgoingText(context))\n' +
    '        // empty-send: nothing to say and nothing attached — do not clear the draft or start a turn.\n' +
    '        if (text.isBlank() && composer.images.isEmpty() && composer.files.isEmpty() && !canSendEmpty) return@send\n');
});

// 3) The store is the last line: a blank prompt never reaches the engine.
edit(A + '/core/session/SessionStore.kt', (src) => {
  if (src.includes('empty-send')) return null;
  const a = '        val live = flowOf(sessionId).value\n        if (live.running && !now && images.isEmpty()) {\n';
  if (!need(src, a, 'store-send')) return null;
  return src.replace(a,
    '        val live = flowOf(sessionId).value\n' +
    '        // empty-send: a blank message with no attachment would start a turn that shows nothing.\n' +
    '        if (text.isBlank() && images.isEmpty()) return\n' +
    '        if (live.running && !now && images.isEmpty()) {\n');
});
