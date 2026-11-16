// Reads the driver's result.json on stdin and fails on any broken expectation.
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const r = JSON.parse(raw.slice(raw.indexOf('{')));
const checks = [
  ['GhostShot is enabled', r.ghostState === 1],
  ['selection is hidden when the UI opens', r.image?.openOpacity === 0],
  ['release takes the shot and saves the file', r.image?.exists === true],
  ['the image is on the clipboard', r.image?.types?.includes('image/png')],
  ['no screenshot toast', r.image?.toasts === 0],
  ['the UI closes after the shot', r.image?.visibleAfter === false],
  ['a second shot works in the same session', !!r.second?.file],
  ['hold R copies the text', r.text?.clip === 'Hello from GhostShot'],
  ['hold F copies the file path', r.path?.clip === r.path?.file && !!r.path?.file],
  ['a click without a drag takes no shot', r.click?.file === null && r.click?.visibleAfter === true],
  ['other notifications still show', r.otherToast === 1],
  ['recording mode: a drag starts no recording', !r.castReactive || (r.cast?.file === null && r.cast?.recording === false)],
  ['off: GNOME shows the selection again', r.off?.openOpacity === 255],
  ['off: a drag no longer captures', r.off?.file === null],
  ['off: GNOME shows its own toast again', r.off?.stockToasts === 1],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
if (r.fatal) { console.log('FATAL', r.fatal); failed++; }
console.log(`\n${checks.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
