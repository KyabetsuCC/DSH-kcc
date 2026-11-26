// patch_fix90: avatar-right — the pair (bubble + avatar) hugs the right edge again.
// patch_fix89 gave the bubble column weight(1f, fill = false), which made the row start at
// the left margin, so every user message jumped to the left. A leading weighted spacer keeps
// the bubble at its own width and pushes the whole group to the right.
const fs = require('fs');
const root = process.argv[2] || '.';
const MARK = 'avatar-right';

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
  const old = [
    '        // avatar-beside: beside the bubble, nudged up. The row fills the width and the bubble',
    '        // takes what is left, so the avatar can never hang off the right edge.',
    '        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {',
    '            Column(Modifier.weight(1f, fill = false), horizontalAlignment = Alignment.End) {',
  ].join('\n');
  if (!need(src, old, 'avatar row')) return src;
  src = src.replace(old, [
    '        // avatar-right: a weighted spacer leads, so the bubble keeps its own width and the',
    '        // bubble + avatar pair sits against the right edge instead of the left margin.',
    '        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {',
    '            Spacer(Modifier.weight(1f))',
    '            Column(horizontalAlignment = Alignment.End) {',
  ].join('\n'));
  const oldTail = [
    '            }',
    '            if (showAvatar) UserAvatar(ownPic ?: avatar)',
    '        }',
  ].join('\n');
  if (!need(src, oldTail, 'avatar tail')) return src;
  src = src.replace(oldTail, [
    '            }',
    '            if (showAvatar) {',
    '                Spacer(Modifier.width(8.dp))',
    '                UserAvatar(ownPic ?: avatar)',
    '            }',
    '        }',
  ].join('\n'));
  src = src.replace(
    '    Box(Modifier.offset(y = (-4).dp).size(24.dp).clip(CircleShape).background(c.bgLayer2), contentAlignment = Alignment.Center) {',
    '    Box(Modifier.padding(top = 2.dp).size(24.dp).clip(CircleShape).background(c.bgLayer2), contentAlignment = Alignment.Center) {');
  return src;
});
console.log('done');
