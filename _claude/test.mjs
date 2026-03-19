import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_URL = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

const VIEWPORTS = [
    { name: 'Desktop  (1280x800)',  width: 1280, height: 800,  isMobile: false },
    { name: 'Tablet   (768x1024)',  width: 768,  height: 1024, isMobile: true  },
    { name: 'Mobile   (375x667)',   width: 375,  height: 667,  isMobile: true  },
];

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) { passed++; console.log(`  ✓ ${msg}`); }
    else           { failed++; console.error(`  ✗ ${msg}`); }
}

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

    for (const vp of VIEWPORTS) {
        console.log(`\n=== ${vp.name} ===`);
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
        await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

        // Wait for keys to render
        await page.waitForSelector('.white-key', { timeout: 5000 });

        // --- Test 1: Correct number of visible octaves ---
        const expectedOctaves = vp.width <= 768 ? 1 : 2;
        const visibleWhiteKeys = await page.evaluate(() => {
            const viewport = document.getElementById('keys-viewport');
            const vpRect = viewport.getBoundingClientRect();
            const whites = document.querySelectorAll('.white-key');
            let count = 0;
            for (const k of whites) {
                const r = k.getBoundingClientRect();
                // Key is visible if its right edge is within viewport + tolerance
                if (r.left >= vpRect.left - 2 && r.right <= vpRect.right + 2) count++;
            }
            return count;
        });
        assert(
            visibleWhiteKeys === expectedOctaves * 7,
            `Shows ${expectedOctaves} octave(s): expected ${expectedOctaves * 7} white keys, got ${visibleWhiteKeys}`
        );

        // --- Test 2: Can click a key and it becomes active ---
        const firstWhiteKey = await page.$('.white-key');
        const keyNote = await firstWhiteKey.evaluate(el => el.dataset.note);

        // Click (pointerdown) the key
        const box = await firstWhiteKey.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        // Small delay to let event fire
        await new Promise(r => setTimeout(r, 100));

        const isActive = await firstWhiteKey.evaluate(el => el.classList.contains('active'));
        assert(isActive, `Key ${keyNote} becomes active on pointer down`);

        await page.mouse.up();
        await new Promise(r => setTimeout(r, 100));
        const isInactive = await firstWhiteKey.evaluate(el => !el.classList.contains('active'));
        assert(isInactive, `Key ${keyNote} deactivates on pointer up`);

        // --- Test 3: Octave navigation via arrow buttons ---
        const labelBefore = await page.$eval('#ribbon-label', el => el.textContent);
        const rightArrow = await page.$('#arrow-right');
        const rightDisabled = await rightArrow.evaluate(el => el.disabled);

        if (!rightDisabled) {
            await rightArrow.click();
            await new Promise(r => setTimeout(r, 400)); // transition time
            const labelAfter = await page.$eval('#ribbon-label', el => el.textContent);
            assert(labelBefore !== labelAfter, `Octave navigation works: "${labelBefore}" → "${labelAfter}"`);

            // Navigate back
            const leftArrow = await page.$('#arrow-left');
            await leftArrow.click();
            await new Promise(r => setTimeout(r, 400));
            const labelReset = await page.$eval('#ribbon-label', el => el.textContent);
            assert(labelReset === labelBefore, `Navigate back works: "${labelReset}"`);
        } else {
            console.log('  (right arrow disabled — skipping nav test)');
        }

        // --- Test 4: Instrument selector exists and has options ---
        const optionCount = await page.$$eval('#instrument-select option', opts => opts.length);
        assert(optionCount === 10, `Instrument selector has ${optionCount} presets (expected 10)`);

        // --- Test 5: Volume slider exists ---
        const volSlider = await page.$('#volume-slider');
        assert(volSlider !== null, 'Volume slider exists');

        // --- Test 6: Take screenshot ---
        const ssName = `screenshot-${vp.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        await page.screenshot({ path: path.join(__dirname, ssName), fullPage: false });
        console.log(`  📸 ${ssName}`);

        await page.close();
    }

    await browser.close();

    console.log(`\n=============================`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`=============================\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
