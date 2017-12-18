class TextScrambler {
    constructor() {
        this.chars = ['!', '<', '>', '-', '_', '\\', '/', '[', ']', '=', '+', '*', '^', '?', '#'];
        this.offset = 0;
        this.iterations = 2;
        this.charCount = 5;
    }

    randomCharacters() {
        let chars = "";
        for (let i = 0; i < this.charCount; i++) {
            let index = Math.floor(Math.random() * (this.chars.length - 2));
            chars += this.chars[index];
        }
        return "<span class=\"dtw-muted\">" + chars + "</span>";
    }

    animate(element, text, callback) {
        let offset = this.offset;
        let iterations = this.iterations;
        let partialString = text.substring(0, offset);
        let partialSubstring = partialString.substring(0, partialString.length - 1);

        const loop = (now) => {
            if (iterations <= 0) {
                // If we've performed all the iterations for this offset,
                // increase the offset, recalculate the strings, reset the iteration counter
                // and continue.
                iterations = this.iterations;
                offset++;

                partialString = text.substring(0, offset);
                partialSubstring = partialString.substring(0, partialString.length - 1);
            } else if (offset >= text.length) {
                // If we've reached the end of the string, end.
                callback();
                return;
            }

            // Replaces the last characters of partialString with a random character.
            element.innerHTML = partialSubstring + this.randomCharacters();
            iterations--;

            // Call this function again when ready.
            window.requestAnimationFrame(loop);
        };

        loop(null);
    }

    run(element) {
        // Since we get the content to animate from the element, we can inspect
        // the height to fix it during the animation. This avoids jank.
        const originalHeight = element.clientHeight;
        const originalStyle = element.getAttribute('style');
        element.setAttribute('style', 'height: ' + originalHeight + 'px; ' + originalStyle);

        // Keep the original content with links and other HTML to restore later.
        const originalContent = element.innerHTML;
        // Keep the original text that we're going to animate to.
        const originalText = element.innerText;
        // Clear the element so that the animation looks correct.
        element.innerHTML = "";

        this.animate(element, originalText, () => {
            // Restore content to element.
            element.innerHTML = originalContent;
            // Restore styles, removing fixed height.
            element.setAttribute('style', originalStyle === null ? '' : originalStyle);
        });
    }
}

const headerElements = Array.prototype.slice.call(document.querySelectorAll('.dtw-item-header > .dtw-animated'))
const contentElements = Array.prototype.slice.call(document.querySelectorAll('.dtw-animated > p'))
const allElements = headerElements.concat(contentElements);

const scrambler = new TextScrambler();
allElements.forEach(el => scrambler.run(el));
