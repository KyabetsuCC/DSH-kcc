// patch_fix89: avatar-beside — back to the right of the bubble, nudged up, and never clipped:
// the row now reserves the avatar's width instead of overflowing the right margin.
const fs = require('fs');
const root = process.argv[2] || '.';
const MARK = 'avatar-beside';

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
  if (!need(src, '        // chat-avatar-up: the avatar sits above the bubble so both right edges share one line.\n        if (showAvatar) UserAvatar(ownPic ?: avatar)\n        Row(verticalAlignment = Alignment.Top) {', 'avatar above')) return src;
  src = src.replace(
    '        // chat-avatar-up: the avatar sits above the bubble so both right edges share one line.\n        if (showAvatar) UserAvatar(ownPic ?: avatar)\n        Row(verticalAlignment = Alignment.Top) {\n            Column(horizontalAlignment = Alignment.End) {',
    '        // avatar-beside: beside the bubble, nudged up. The row fills the width and the bubble\n        // takes what is left, so the avatar can never hang off the right edge.\n        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {\n            Column(Modifier.weight(1f, fill = false), horizontalAlignment = Alignment.End) {');
  src = src.replace(
    '            }\n        }\n        if (!compact && (showStamp || showCopy))',
    '            }\n            if (showAvatar) UserAvatar(ownPic ?: avatar)\n        }\n        if (!compact && (showStamp || showCopy))');
  src = src.replace(
    '    Box(Modifier.padding(top = 2.dp, bottom = 5.dp).size(24.dp).clip(CircleShape).background(c.bgLayer2), contentAlignment = Alignment.Center) {',
    '    Box(Modifier.offset(y = (-4).dp).size(24.dp).clip(CircleShape).background(c.bgLayer2), contentAlignment = Alignment.Center) {');
  return src;
});
console.log('done');
