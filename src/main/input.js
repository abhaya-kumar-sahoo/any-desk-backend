const { mouse, keyboard, Key, Button, Point } = require("@nut-tree-fork/nut-js");

// Configure Nut-js
mouse.config.mouseSpeed = 1000;

async function handleRemoteInput(event) {
    const { type, x, y, button, key, modifiers, deltaX, deltaY } = event;

    try {
        switch (type) {
            case 'mousemove':
                await mouse.setPosition(new Point(x, y));
                break;
            case 'mousedown':
                await mouse.pressButton(button === 'right' ? Button.RIGHT : Button.LEFT);
                break;
            case 'mouseup':
                await mouse.releaseButton(button === 'right' ? Button.RIGHT : Button.LEFT);
                break;
            case 'click':
                await mouse.click(button === 'right' ? Button.RIGHT : Button.LEFT);
                break;
            case 'keydown':
                // Note: key translation might be needed if they don't match Nut-js Key enum
                await keyboard.pressKey(Key[key.toUpperCase()] || key);
                break;
            case 'keyup':
                await keyboard.releaseKey(Key[key.toUpperCase()] || key);
                break;
            case 'scroll':
                if (deltaY > 0) await mouse.scrollDown(deltaY);
                else if (deltaY < 0) await mouse.scrollUp(Math.abs(deltaY));
                break;
        }
    } catch (err) {
        console.error('Error simulating input with nut-js:', err);
    }
}

module.exports = { handleRemoteInput };
