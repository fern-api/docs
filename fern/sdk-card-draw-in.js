// Plays the landing page SDK card's draw-in, the counterpart to the Rive canvases' intro.
// The animation itself lives in styles.css and is gated on [data-drawing-in]: left to CSS alone it
// starts against the browser's first frame of the document, which on a reload can be composited
// before the page is presented and while the card is still scrolled out of view, so the reveal is
// over by the time anyone sees the card. This waits for the page to load and the card to be on
// screen, which is also what makes the Rive intros visible on every refresh.
(function () {
    const DRAWING_ATTRIBUTE = 'data-drawing-in';
    const observed = new WeakSet();

    function play(card) {
        card.setAttribute(DRAWING_ATTRIBUTE, '');
        const intro = card.querySelector('.sdk-card-intro');
        if (!intro) {
            return;
        }
        // Drop the attribute once the curtain has cleared, so the overlay leaves the layer tree and
        // the animation can be played again if the card is re-created by a client-side navigation.
        intro.addEventListener(
            'animationend',
            () => card.removeAttribute(DRAWING_ATTRIBUTE),
            { once: true }
        );
    }

    function playWhenOnScreen(card) {
        if (observed.has(card)) {
            return;
        }
        observed.add(card);

        if (typeof IntersectionObserver === 'undefined') {
            play(card);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        observer.disconnect();
                        play(card);
                    }
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(card);
    }

    function initializeCards() {
        document.querySelectorAll('.sdk-card').forEach(playWhenOnScreen);
    }

    function whenLoaded(callback) {
        if (document.readyState === 'complete') {
            callback();
        } else {
            window.addEventListener('load', callback, { once: true });
        }
    }

    whenLoaded(() => {
        initializeCards();

        // Catch cards rendered later, either by hydration or by a client-side navigation. Mutations
        // arrive in bursts, so collapse each burst into one pass.
        let scheduled = false;
        new MutationObserver(() => {
            if (scheduled) {
                return;
            }
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                initializeCards();
            });
        }).observe(document.body, { subtree: true, childList: true });
    });
})();
