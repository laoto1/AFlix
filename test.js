const fs = require('fs');
const html = fs.readFileSync('chapterpage.html', 'utf8');

// Find the obfuscated JS script block
const scriptMatch = html.match(/<script>\s*(\(function\(\)\{var _0x.*?)\s*<\/script>/);
if (scriptMatch) {
    let scriptCode = scriptMatch[1];

    // The script evaluates itself and assigns something to document.cookie or similar.
    // Let's create a proxy window object.
    const myWindow = {
        String: String,
        XMLHttpRequest: { prototype: {} },
        document: { cookie: '' }
    };
    myWindow.window = myWindow;

    // We'll just run it with window mapped.
    try {
        const fn = new Function('window', 'document', scriptCode);
        fn(myWindow, myWindow.document);
        console.log("Cookie generated:", myWindow.document.cookie);
    } catch (e) {
        console.error("Execution error:", e.message);

        // Fallback: try capturing just the resulting string assignment!
        console.log("String building loops approach:");

        // Look for string building pattern _0x1d170c+=...
        const extractedLoops = scriptCode.match(/var (_0x[a-f0-9]+)=_0x[a-f0-9]+\(0xaa\);(.*?)_0x[a-f0-9]+\[_0x[a-f0-9]+\[.*?\]\]/);
        if (extractedLoops) {
            console.log("Found loops pattern");
        } else {
            // Just cheat: replace the IIFE execution at the end "window, _0x... 'prototype'"
            // with something that returns the generated string
            const replacedCode = scriptCode.replace(/}\(window,(.*?)\)/, `
          return arguments.callee;
        }(window,$1).toString()
        `);
            console.log("Try regex or AST if this fails");
        }
    }
} else {
    console.log("No script matched.");
}
