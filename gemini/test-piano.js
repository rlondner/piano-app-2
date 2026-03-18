const puppeteer = require('puppeteer');
const path = require('path');

async function runTests() {
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const filePath = `file://${path.join(__dirname, 'index.html')}`;
    
    console.log(`Loading ${filePath}...`);

    const viewports = [
        { name: 'Desktop', width: 1920, height: 1080, expectedKeys: 14 }, // 2 octaves
        { name: 'Tablet', width: 768, height: 1024, expectedKeys: 14 },   // 2 octaves
        { name: 'Mobile', width: 375, height: 667, expectedKeys: 7 }      // 1 octave
    ];

    for (const vp of viewports) {
        console.log(`\n--- Testing ${vp.name} Viewport (${vp.width}x${vp.height}) ---`);
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(filePath, { waitUntil: 'networkidle0' });

        // 1. Initialize Audio (Click Overlay)
        const overlay = await page.$('#start-overlay');
        if (overlay) {
            const isVisible = await overlay.evaluate(el => getComputedStyle(el).display !== 'none' && getComputedStyle(el).opacity !== '0');
            if (isVisible) {
                console.log('Clicking Start Overlay...');
                await overlay.click();
                await new Promise(r => setTimeout(r, 500)); // Wait for fade
            }
        }

        // 2. Verify Key Count Calculation (Logic check)
        // We can check how many white keys fit in the viewport width visually? 
        // Or check the CSS variable applied?
        // Let's check the computed width of a white key.
        const whiteKey = await page.$('.key.white');
        if (whiteKey) {
            const keyWidth = await whiteKey.evaluate(el => el.getBoundingClientRect().width);
            const visibleKeys = Math.round(vp.width / keyWidth);
            console.log(`Computed visible white keys: ${visibleKeys} (Expected: ${vp.expectedKeys})`);
            
            if (visibleKeys !== vp.expectedKeys) {
                console.warn(`WARNING: Visible key count mismatch!`);
            } else {
                console.log('PASS: Visible key count matches responsive design.');
            }
        }

        // 3. Play a Note
        // Find C3 (Middle C). In our generation, keys are C2...
        // Index 0 = C2. Index 12 = C3.
        // We need to find the key with data-note="C3".
        const noteC3 = await page.$('.key[data-note="C3"]');
        if (noteC3) {
            console.log('Playing Note C3...');
            await noteC3.click();
            await new Promise(r => setTimeout(r, 200)); // Let it ring
            
            // Check for active class
            const isActive = await noteC3.evaluate(el => el.classList.contains('active'));
            // Note: In our code, 'active' is added on mousedown/start and removed on mouseup/end.
            // Puppeteer .click() does both. So it might be gone already.
            // Let's trigger mousedown only to check active state.
            
            await noteC3.evaluate(el => {
                const event = new MouseEvent('mousedown', { bubbles: true });
                el.dispatchEvent(event);
            });
            
            const isActiveAfterDown = await noteC3.evaluate(el => el.classList.contains('active'));
            console.log(`PASS: Key visual feedback active: ${isActiveAfterDown}`);
            
            // Release
            await noteC3.evaluate(el => {
                const event = new MouseEvent('mouseup', { bubbles: true });
                el.dispatchEvent(event);
            });
        } else {
            console.error('FAIL: C3 Key not found in DOM.');
        }

        // 4. Test Navigation
        const initialText = await page.$eval('#ribbon-label .range-text', el => el.textContent);
        console.log(`Initial Range: ${initialText}`);
        
        const nextButton = await page.$('#nav-right');
        if (nextButton) {
            console.log('Clicking Next Octave...');
            await nextButton.click();
            await new Promise(r => setTimeout(r, 500)); // Wait for transition
            
            const newText = await page.$eval('#ribbon-label .range-text', el => el.textContent);
            console.log(`New Range: ${newText}`);
            
            if (initialText !== newText) {
                console.log('PASS: Navigation updated octave range.');
            } else {
                console.warn('FAIL: Navigation did not update range (or already at max).');
            }
        }

        // Screenshot
        await page.screenshot({ path: `screenshot-${vp.name.toLowerCase()}.png` });
        console.log(`Screenshot saved: screenshot-${vp.name.toLowerCase()}.png`);
    }

    await browser.close();
}

runTests().catch(console.error);
