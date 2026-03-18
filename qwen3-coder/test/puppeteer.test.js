/**
 * Puppeteer Tests for Glassmorphism Synthesizer Piano
 *
 * Test coverage:
 * - Keyboard interaction
 * - Octave visibility
 * - Note playback
 * - Octave navigation
 * - Desktop, tablet, and mobile viewports
 */

const puppeteer = require('puppeteer');
const path = require('path');

// Test server
const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

// Test configurations for different viewports
const VIEWPORTS = {
    desktop: {
        name: 'Desktop',
        width: 1920,
        height: 1080,
        isLandscape: true
    },
    tablet: {
        name: 'Tablet',
        width: 768,
        height: 1024,
        isLandscape: false
    },
    mobile: {
        name: 'Mobile Portrait',
        width: 375,
        height: 667,
        isLandscape: false
    },
    mobileLandscape: {
        name: 'Mobile Landscape',
        width: 667,
        height: 375,
        isLandscape: true
    }
};

const INSTRUMENTS = ['rhodes', 'wurlitzer', 'cp70', 'juno', 'dx7', 'nord'];

async function startTestServer() {
    const express = require('express');
    const app = express();
    app.use(express.static(path.join(__dirname, '..')));
    return new Promise((resolve) => {
        const server = app.listen(PORT, () => {
            console.log(`Test server running on ${BASE_URL}`);
            resolve(server);
        });
    });
}

async function runTests() {
    console.log('Starting Puppeteer tests...\n');

    const server = await startTestServer();

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        // Run tests for each viewport
        for (const viewport of Object.values(VIEWPORTS)) {
            console.log(`\n=== Testing ${viewport.name} ===\n`);
            await runViewportTests(browser, viewport);
        }

        console.log('\n=== All tests passed! ===\n');
    } catch (error) {
        console.error('\n=== Tests failed ===\n');
        console.error(error.message);
        throw error;
    } finally {
        await browser.close();
        server.close();
    }
}

async function runViewportTests(browser, viewport) {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.name === 'Mobile' || viewport.name === 'Mobile Landscape' ? 2 : 1
    });

    // Navigate to the page
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    // Wait for Tone.js to load
    await page.waitForSelector('.container');

    // Initialize audio
    await page.evaluate(() => {
        document.body.click();
    });
    await page.waitForFunction(() => window.isAudioStarted === true, { timeout: 5000 });

    console.log(`  ✓ Page loaded (${viewport.width}x${viewport.height})`);

    // Test 1: Verify keyboard can be played on
    await testKeyboardInteraction(page, viewport);
    console.log(`  ✓ Keyboard interaction works`);

    // Test 2: Verify octave visibility
    await testOctaveVisibility(page, viewport);
    console.log(`  ✓ Octave visibility correct (${viewport.name})`);

    // Test 3: Verify note playback
    await testNotePlayback(page);
    console.log(`  ✓ Note playback works`);

    // Test 4: Verify octave navigation
    await testOctaveNavigation(page);
    console.log(`  ✓ Octave navigation works`);

    // Test 5: Verify instrument switching
    await testInstrumentSwitching(page);
    console.log(`  ✓ Instrument switching works`);

    // Test 6: Verify volume controls
    await testVolumeControls(page);
    console.log(`  ✓ Volume controls work`);

    await page.close();
}

async function testKeyboardInteraction(page, viewport) {
    // Get the keyboard container
    const keyboardSelector = '.keyboard';

    // Get number of keys visible
    const keyCount = await page.evaluate(() => {
        const keys = document.querySelectorAll('.piano-key');
        return keys.length;
    });

    // Verify we have keys visible
    if (keyCount === 0) {
        throw new Error('No piano keys found');
    }

    // Verify key count is correct for visible octaves
    // Each octave has 12 keys (7 white, 5 black)
    const expectedKeys = viewport.isLandscape ? 24 : 12;
    if (keyCount !== expectedKeys) {
        throw new Error(`Expected ${expectedKeys} keys, found ${keyCount}`);
    }

    // Click on a white key
    await page.click('.piano-key.white:first-child');
    await page.waitForFunction(() => {
        const active = document.querySelectorAll('.piano-key.white.active');
        return active.length > 0;
    }, { timeout: 1000 });

    // Release
    await page.mouse.up();
}

async function testOctaveVisibility(page, viewport) {
    // Check current octave display
    const octaveDisplay = await page.$eval('.octave-display', el => el.textContent);

    // Verify display format
    if (!octaveDisplay.match(/^Current: C\d - B\d$/)) {
        throw new Error(`Invalid octave display format: ${octaveDisplay}`);
    }

    // Extract octave numbers
    const matches = octaveDisplay.match(/C(\d) - B(\d)/);
    if (!matches) {
        throw new Error(`Could not parse octave numbers from: ${octaveDisplay}`);
    }

    const startOctave = parseInt(matches[1]);
    const endOctave = parseInt(matches[2]);
    const visibleOctaves = endOctave - startOctave + 1;

    // Verify correct number of visible octaves
    if (viewport.isLandscape) {
        if (visibleOctaves !== 2) {
            throw new Error(`Expected 2 visible octaves in landscape, found ${visibleOctaves}`);
        }
    } else {
        if (visibleOctaves !== 1) {
            throw new Error(`Expected 1 visible octave in portrait, found ${visibleOctaves}`);
        }
    }
}

async function testNotePlayback(page) {
    // Play a few notes using keyboard simulation
    const testKeys = ['z', 'x', 'c', 's', 'd'];

    for (const key of testKeys) {
        await page.keyboard.down(key);
        await page.waitForFunction(() => {
            const active = document.querySelectorAll('.piano-key.active');
            return active.length > 0;
        }, { timeout: 500 });

        await page.keyboard.up(key);

        // Wait for note to release
        await new Promise(r => setTimeout(r, 100));
    }
}

async function testOctaveNavigation(page) {
    // Get current octave display
    let octaveDisplay = await page.$eval('.octave-display', el => el.textContent);
    const startOctave = parseInt(octaveDisplay.match(/C(\d)/)[1]);

    // Test right arrow
    await page.click('.right-arrow');
    await new Promise(r => setTimeout(r, 200));

    octaveDisplay = await page.$eval('.octave-display', el => el.textContent);
    const newStartOctave = parseInt(octaveDisplay.match(/C(\d)/)[1]);

    if (newStartOctave !== startOctave + 1) {
        throw new Error(`Expected octave to increase from ${startOctave} to ${startOctave + 1}, got ${newStartOctave}`);
    }

    // Test left arrow
    await page.click('.left-arrow');
    await new Promise(r => setTimeout(r, 200));

    octaveDisplay = await page.$eval('.octave-display', el => el.textContent);
    const finalStartOctave = parseInt(octaveDisplay.match(/C(\d)/)[1]);

    if (finalStartOctave !== startOctave) {
        throw new Error(`Expected octave to return to ${startOctave}, got ${finalStartOctave}`);
    }

    // Test swipe navigation (desktop)
    if (page.viewport().width >= 768) {
        await page.dragSelect('.ribbon-container', { x: 100, y: 0 }, { x: -100, y: 0 });
        await new Promise(r => setTimeout(r, 200));
    }
}

async function testInstrumentSwitching(page) {
    const select = '.glass-dropdown';

    for (const instrument of INSTRUMENTS) {
        await page.select(select, instrument);
        await new Promise(r => setTimeout(r, 100));

        const selected = await page.$eval(select, el => el.value);
        if (selected !== instrument) {
            throw new Error(`Failed to select instrument: ${instrument}`);
        }
    }

    // Reset to first instrument
    await page.select(select, 'rhodes');
}

async function testVolumeControls(page) {
    // Test master volume
    const volumeSlider = '#master-volume';
    await page.evaluate(() => {
        document.getElementById('master-volume').value = 50;
        document.getElementById('master-volume').dispatchEvent(new Event('input'));
    });
    await new Promise(r => setTimeout(r, 100));

    const volumeValue = await page.$eval(volumeSlider, el => el.value);
    if (volumeValue !== '50') {
        throw new Error(`Volume slider not updated correctly: ${volumeValue}`);
    }

    // Test reverb
    const reverbSlider = '#reverb-wet';
    await page.evaluate(() => {
        document.getElementById('reverb-wet').value = 50;
        document.getElementById('reverb-wet').dispatchEvent(new Event('input'));
    });
    await new Promise(r => setTimeout(r, 100));

    // Test delay
    const delaySlider = '#delay-wet';
    await page.evaluate(() => {
        document.getElementById('delay-wet').value = 50;
        document.getElementById('delay-wet').dispatchEvent(new Event('input'));
    });
    await new Promise(r => setTimeout(r, 100));
}

// Run the tests
runTests().catch(error => {
    console.error('Test run failed:', error);
    process.exit(1);
});
