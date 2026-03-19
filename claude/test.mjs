import puppeteer from 'puppeteer';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'index.html');
const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 }
];

let browser;
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function runTestsForViewport(viewport) {
  console.log(`\n═══ ${viewport.name} (${viewport.width}×${viewport.height}) ═══`);

  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for page to be ready
  await page.waitForSelector('#overlay', { timeout: 5000 });

  // ── Structure Tests ──
  await test('Overlay is visible initially', async () => {
    const hidden = await page.$eval('#overlay', el => el.classList.contains('hidden'));
    assert.equal(hidden, false);
  });

  await test('Header elements exist', async () => {
    const exists = await page.evaluate(() => {
      return !!(
        document.querySelector('#presetSelect') &&
        document.querySelector('#feedbackBtn') &&
        document.querySelector('#inputModeBtn') &&
        document.querySelector('#recordBtn')
      );
    });
    assert.equal(exists, true);
  });

  await test('Preset select has 10 options', async () => {
    const count = await page.$$eval('#presetSelect option', opts => opts.length);
    assert.equal(count, 10);
  });

  await test('Piano has 5 octave groups', async () => {
    const count = await page.$$eval('.octave-group', groups => groups.length);
    assert.equal(count, 5);
  });

  await test('Each octave has 7 white keys', async () => {
    const counts = await page.$$eval('.octave-group', groups =>
      groups.map(g => g.querySelectorAll('.key-white').length)
    );
    counts.forEach(c => assert.equal(c, 7));
  });

  await test('Each octave has 5 black keys', async () => {
    const counts = await page.$$eval('.octave-group', groups =>
      groups.map(g => g.querySelectorAll('.key-black').length)
    );
    counts.forEach(c => assert.equal(c, 5));
  });

  await test('Total keys: 35 white + 25 black = 60', async () => {
    const total = await page.evaluate(() =>
      document.querySelectorAll('.key-white, .key-black').length
    );
    assert.equal(total, 60);
  });

  // ── Click overlay to start audio ──
  await page.click('#overlay');
  await page.waitForFunction(() =>
    document.querySelector('#overlay').classList.contains('hidden'),
    { timeout: 3000 }
  );

  await test('Overlay hides after click', async () => {
    const hidden = await page.$eval('#overlay', el => el.classList.contains('hidden'));
    assert.equal(hidden, true);
  });

  await test('Audio started after overlay click', async () => {
    const state = await page.evaluate(() => window.__pianoState);
    assert.equal(state.audioStarted, true);
  });

  // ── Test API ──
  await test('__pianoState has expected properties', async () => {
    const state = await page.evaluate(() => window.__pianoState);
    assert.equal(typeof state.audioStarted, 'boolean');
    assert.equal(typeof state.inputMode, 'string');
    assert.equal(typeof state.feedbackMode, 'string');
    assert.equal(typeof state.recording, 'boolean');
    assert.equal(typeof state.startOctaveIdx, 'number');
    assert.equal(typeof state.visibleOctaves, 'number');
    assert.equal(state.totalOctaves, 5);
    assert.equal(state.baseOctave, 2);
    assert.equal(state.currentPreset, 'Fender Rhodes');
  });

  // ── Viewport-specific tests ──
  await test(`Visible octaves correct for ${viewport.name}`, async () => {
    const state = await page.evaluate(() => window.__pianoState);
    if (viewport.width >= 768) {
      assert.equal(state.visibleOctaves, 2);
    } else {
      assert.equal(state.visibleOctaves, 1);
    }
  });

  // ── Feedback toggle ──
  await test('Feedback toggle switches mode', async () => {
    await page.click('#feedbackBtn');
    const state = await page.evaluate(() => window.__pianoState);
    assert.equal(state.feedbackMode, 'depress');
    const bodyAttr = await page.evaluate(() => document.body.dataset.feedback);
    assert.equal(bodyAttr, 'depress');
    // Toggle back
    await page.click('#feedbackBtn');
    const state2 = await page.evaluate(() => window.__pianoState);
    assert.equal(state2.feedbackMode, 'color');
  });

  // ── Input mode toggle ──
  await test('Input mode toggle switches mode', async () => {
    await page.click('#inputModeBtn');
    const state = await page.evaluate(() => window.__pianoState);
    assert.equal(state.inputMode, 'keyboard');
    // Toggle back
    await page.click('#inputModeBtn');
    const state2 = await page.evaluate(() => window.__pianoState);
    assert.equal(state2.inputMode, 'mouse');
  });

  // ── Preset change ──
  await test('Preset change updates current preset', async () => {
    await page.select('#presetSelect', '1');
    const state = await page.evaluate(() => window.__pianoState);
    assert.equal(state.currentPreset, 'Wurlitzer');
    // Reset
    await page.select('#presetSelect', '0');
  });

  // ── Octave navigation ──
  await test('Right arrow increments octave index', async () => {
    const before = await page.evaluate(() => window.__pianoState.startOctaveIdx);
    await page.click('#octRight');
    const after = await page.evaluate(() => window.__pianoState.startOctaveIdx);
    assert.equal(after, before + 1);
  });

  await test('Left arrow decrements octave index', async () => {
    const before = await page.evaluate(() => window.__pianoState.startOctaveIdx);
    await page.click('#octLeft');
    const after = await page.evaluate(() => window.__pianoState.startOctaveIdx);
    assert.equal(after, before - 1);
  });

  await test('Octave label updates on navigation', async () => {
    const label = await page.$eval('#octLabel', el => el.textContent);
    assert.ok(label.includes('C'));
    assert.ok(label.includes('–'));
  });

  // ── Glassmorphism checks ──
  await test('Glass elements have backdrop-filter', async () => {
    const hasFilter = await page.evaluate(() => {
      const el = document.querySelector('header.glass');
      const style = getComputedStyle(el);
      return style.backdropFilter !== 'none' && style.backdropFilter !== '';
    });
    assert.equal(hasFilter, true);
  });

  await test('Body has gradient background', async () => {
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    assert.ok(bg.includes('gradient'));
  });

  // ── Ribbon label format ──
  await test('Ribbon label shows correct range format', async () => {
    // Reset to start
    await page.evaluate(() => {
      // Navigate to start by clicking left multiple times
      for (let i = 0; i < 5; i++) document.getElementById('octLeft').click();
    });
    const label = await page.$eval('#octLabel', el => el.textContent);
    assert.ok(label.startsWith('C2'), `Expected label to start with C2, got: ${label}`);
  });

  // ── Screenshot ──
  const screenshotName = `screenshot-${viewport.name}_(${viewport.width}x${viewport.height}).png`;
  const screenshotPath = path.join(__dirname, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`  📸 ${screenshotName}`);

  await page.close();
}

// ── Main ──
(async () => {
  console.log('Launching browser...');
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    for (const vp of VIEWPORTS) {
      await runTestsForViewport(vp);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n═══ Results ═══`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }
  console.log('\nAll tests passed!');
})();
