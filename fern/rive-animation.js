// Reusable Rive Animation Integration - Native Interactions + Event Handling
(function() {
    let riveRuntimeLoaded = false;
    let pendingAnimations = [];

    // Create a Rive animation with cursor detection, native interactions, and event handling
    function createRiveAnimation(config) {
        const {
            canvasSelector,          // CSS selector for canvas (e.g., '#rive-canvas')
            riveUrl,                 // CDN URL for .riv file
            aspectRatio,             // e.g., 369/93 or 16/9
            stateMachine = "State Machine 1",
            fallbackImages = [],     // Array of {src, className, alt}
            fit = 'Contain',         // Rive fit mode (Contain, Cover, FitWidth, FitHeight, None)
            eventHandlers = {}       // Custom event handlers: {'Event Name': (eventData) => {...}}
        } = config;

        const canvas = document.querySelector(canvasSelector);
        if (!canvas) {
            console.warn(`Canvas not found: ${canvasSelector}`);
            return;
        }

        // Set up container references
        const riveContainer = canvas.parentElement;
        const sdkRiveContainer = riveContainer.parentElement;

        // Load Rive runtime if not already loaded
        if (!riveRuntimeLoaded && typeof rive === 'undefined') {
            pendingAnimations.push(() => createRiveAnimation(config));
            
            if (!document.querySelector('script[src*="@rive-app/canvas"]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/@rive-app/canvas@latest';
                script.onload = function() {
                    riveRuntimeLoaded = true;
                    // Process all pending animations
                    pendingAnimations.forEach(fn => fn());
                    pendingAnimations = [];
                };
                document.head.appendChild(script);
            }
            return;
        }

        try {
            // Set container aspect ratio while respecting existing layout
            const currentWidth = riveContainer.offsetWidth || riveContainer.clientWidth;
            if (currentWidth > 0) {
                // Use existing width, set height based on aspect ratio
                riveContainer.style.height = (currentWidth / aspectRatio) + 'px';
            } else {
                // Fallback: use CSS aspect-ratio if container has no initial width
                riveContainer.style.aspectRatio = aspectRatio.toString();
                riveContainer.style.width = '100%';
            }
            
            // Let Rive handle canvas sizing internally - much simpler!
            const r = new rive.Rive({
                src: riveUrl,
                canvas: canvas,
                autoplay: true,
                stateMachines: stateMachine,
                autoBind: false, // Manual binding for theme switching
                layout: new rive.Layout({
                    fit: rive.Fit[fit], // Configurable fit mode
                    alignment: rive.Alignment.Center
                }),
                shouldDisableRiveListeners: false, // Enable native Rive interactions (hover, click, etc.)
                onLoad: () => {
                    // Let Rive handle its own interactions natively
                    canvas.style.pointerEvents = 'auto';
                    canvas.style.userSelect = 'none';
                    
                    // Critical: Resize drawing surface to canvas after load
                    r.resizeDrawingSurfaceToCanvas();
                    
                    // Set up dynamic cursor changes based on Rive's interactive areas
                    setupDynamicCursor(canvas, r, stateMachine);
                    
                    // Initialize with current site theme
                    if (r.viewModelCount > 0) {
                        const currentIsDark = detectSiteTheme();
                        setRiveTheme(r, currentIsDark, 'Palette');
                    }
                    
                    // Set up Rive event handling (primary method)
                    try {
                        if (r.on && rive.EventType && rive.EventType.RiveEvent) {
                            r.on(rive.EventType.RiveEvent, (riveEvent) => {
                                handleRiveEvent(riveEvent, eventHandlers);
                            });
                        }
                    } catch (e) {
                        console.warn('Could not set up Rive event listeners:', e);
                    }
                },
                onLoadError: (err) => {
                    console.error('Rive load error:', err);
                    
                    showFallbackImages(canvas, fallbackImages);
                }
            });
            
            // Store instance for cleanup
            canvas._riveInstance = r;
            
            // Simple resize handling (following Rive best practices)
            const windowResizeHandler = () => {
                // Let Rive handle the canvas sizing internally
                if (r && r.resizeDrawingSurfaceToCanvas) {
                    r.resizeDrawingSurfaceToCanvas();
                }
            };
            
            // Add window resize listener (as per Rive documentation)
            window.addEventListener('resize', windowResizeHandler, false);
            
            // Store cleanup function
            canvas._windowResizeHandler = windowResizeHandler;
            
        } catch (error) {
            console.error('Rive creation error:', error);
            
            showFallbackImages(canvas, fallbackImages);
        }
    }

    // Setup dynamic cursor changes based on Rive's interactive areas
    function setupDynamicCursor(canvas, riveInstance, stateMachine) {
        canvas.addEventListener('mousemove', (event) => {
            try {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                // Scale coordinates for high DPI displays
                const dpr = window.devicePixelRatio || 1;
                const scaledX = x * dpr;
                const scaledY = y * dpr;
                
                let shouldShowPointer = false;
                
                // Try different methods to detect interactive areas (in priority order)
                if (riveInstance.hitTest && typeof riveInstance.hitTest === 'function') {
                    // Best method: Use Rive's built-in hit testing
                    shouldShowPointer = riveInstance.hitTest(scaledX, scaledY);
                } else if (riveInstance.cursor) {
                    // Good method: Check Rive's cursor property
                    shouldShowPointer = riveInstance.cursor === 'pointer' || riveInstance.cursor === 'hand';
                } else if (riveInstance.renderer && riveInstance.renderer.cursor) {
                    // Fallback method: Check renderer's cursor
                    shouldShowPointer = riveInstance.renderer.cursor === 'pointer';
                } else {
                    // Last resort: Check hover states in any state machine
                    try {
                        const stateMachineNames = riveInstance.stateMachineNames || [stateMachine];
                        let foundHoverStates = [];
                        
                        for (const smName of stateMachineNames) {
                            try {
                                const inputs = riveInstance.stateMachineInputs(smName);
                                const hoverStates = inputs.filter(input => 
                                    (input.name.toLowerCase().includes('hover') || 
                                     input.name.toLowerCase().includes('over') ||
                                     input.name.toLowerCase().includes('hovered')) && 
                                    input.value
                                );
                                foundHoverStates.push(...hoverStates);
                            } catch (e) {
                                continue; // Skip failed state machines
                            }
                        }
                        
                        shouldShowPointer = foundHoverStates.length > 0;
                    } catch (e) {
                        // Ignore errors and default to no pointer
                    }
                }
                
                canvas.style.cursor = shouldShowPointer ? 'pointer' : 'default';
                
            } catch (e) {
                canvas.style.cursor = 'default';
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            canvas.style.cursor = 'default';
                });
    }


    
    // Handle any Rive event (explicit handlers only)
    function handleRiveEvent(riveEvent, eventHandlers = {}) {
        try {
            const eventData = riveEvent.data;
            const eventName = eventData.name;
            
            // Only handle events that have explicitly defined handlers
            if (eventHandlers[eventName]) {
                eventHandlers[eventName](eventData);
            }
            // If no handler is defined, the event is ignored (no fallbacks)
        } catch (e) {
            console.error('Error handling Rive event:', e);
        }
    }



    // Show fallback images when Rive fails to load
    function showFallbackImages(canvas, fallbackImages) {
        if (fallbackImages.length === 0) return;
        
        canvas.style.display = 'none';
        const fallbackContainer = document.createElement('div');
        
        fallbackContainer.innerHTML = fallbackImages.map(img => 
            `<img src="${img.src}" alt="${img.alt}" class="${img.className}" />`
        ).join('');
        
        canvas.parentNode.insertBefore(fallbackContainer, canvas);
    }

    // Initialize predefined animations
    function initializeAnimations() {
        // Only run on home product page
        if (!window.location.pathname.includes('/home')) {
            return;
        }
        
        // SDK Animation with native Rive interactions
        createRiveAnimation({
            canvasSelector: '#sdk-rive-canvas',
            riveUrl: 'https://cdn.prod.website-files.com/67880ff570cdb1a85eee946f/68802bc752aef23fab76e6fc_12235f640f9ad3339b42e8d026c6345a_sdk-rive.riv',
            aspectRatio: 369/93,
            stateMachine: "State Machine 1",
            fallbackImages: [
                {
                    src: './images/sdks-preview-light.svg',
                    className: 'sdks-preview-img dark:hidden',
                    alt: 'SDK Generation Preview'
                },
                {
                    src: './images/sdks-preview-dark.svg',
                    className: 'sdks-preview-img hidden dark:block',
                    alt: 'SDK Generation Preview'
                }
            ]
            // No eventHandlers - this animation only uses native interactions
        });

        // Docs Animation
        createRiveAnimation({
            canvasSelector: '#docs-rive-canvas',
            riveUrl: 'https://cdn.prod.website-files.com/67880ff570cdb1a85eee946f/68825994c55f0eece04ce4e2_d261956a0f627eb6b94c39aa9fcc26f0_docs_animation.riv',
            aspectRatio: 404/262,
            stateMachine: "State Machine 1",
            fallbackImages: [
                {
                    src: './images/docs-preview-light.svg',
                    className: 'docs-preview-img dark:hidden',
                    alt: 'Docs Animation Preview'
                },
                {
                    src: './images/docs-preview-dark.svg',
                    className: 'docs-preview-img hidden dark:block',
                    alt: 'Docs Animation Preview'
                }
            ]
            // No eventHandlers - this animation only uses native interactions
        });

        // AI Animation with custom event handling
        createRiveAnimation({
            canvasSelector: '#ai-rive-canvas',
            riveUrl: 'https://cdn.prod.website-files.com/67880ff570cdb1a85eee946f/68825e97fd6225e1c8a7488c_c2966309b38902c92adfe24c2dc8ba5a_ai_animation.riv',
            aspectRatio: 371/99,
            stateMachine: "State Machine 1",
            fallbackImages: [
                {
                    src: './images/ai-search-preview-light.svg',
                    className: 'ai-preview-img dark:hidden',
                    alt: 'AI Animation Preview'
                },
                {
                    src: './images/ai-search-preview-dark.svg',
                    className: 'ai-preview-img hidden dark:block',
                    alt: 'AI Animation Preview'
                }
            ],
            eventHandlers: {
                'Open URL': (eventData) => {
                    // Custom URL handling for AI animation, URL is defined in the Rive file
                    console.log('AI animation URL event:', eventData.url);
                    window.open(eventData.url, '_blank', 'noopener,noreferrer');
                }
            }
        });

        // Add additional Rive animations by calling createRiveAnimation() with your config
        
        // Enable automatic site theme synchronization
        setupRiveSiteThemeSync();
        
        // Or manually control themes:
        // switchRiveThemes(true);  // Switch to dark theme
        // switchRiveThemes(false); // Switch to light theme
    }

    // Cleanup function to dispose of Rive instances
    function cleanupRiveInstances() {
        document.querySelectorAll('canvas[id$="rive-canvas"]').forEach(canvas => {
            if (canvas._riveInstance) {
                canvas._riveInstance.cleanup();
                canvas._riveInstance = null;
            }
            if (canvas._windowResizeHandler) {
                window.removeEventListener('resize', canvas._windowResizeHandler, false);
                canvas._windowResizeHandler = null;
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAnimations);
    } else {
        initializeAnimations();
    }

    // Re-initialize on navigation changes (for SPA behavior)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            cleanupRiveInstances(); // Clean up before reinitializing
            setTimeout(initializeAnimations, 100);
        }
    }).observe(document, { subtree: true, childList: true });

    // Data Binding approach using View Model Instances (Official Rive API)
    function setRiveTheme(riveInstance, isDark, viewModelName = 'Palette') {
        try {
            // Get the view model by name
            const viewModel = riveInstance.viewModelByName(viewModelName);
            if (!viewModel) {
                console.warn(`View model '${viewModelName}' not found.`);
                return false;
            }
            
            // Check if instances exist
            if (viewModel.instanceCount === 0) {
                console.warn(`No instances found in view model '${viewModelName}'. Please create instances in the Rive editor.`);
                return false;
            }
            
            let viewModelInstance = null;
            const instanceName = isDark ? 'Dark' : 'Light';
            
            // Try 1: Get instance by name (if names are set)
            try {
                viewModelInstance = viewModel.instanceByName(instanceName);
            } catch (e) {
                // Name-based access failed, continue to index-based
            }
            
            // Try 2: Get instance by index (fallback for unnamed instances)
            if (!viewModelInstance) {
                const instanceIndex = isDark ? 1 : 0; // Assume: 0=Light, 1=Dark
                if (instanceIndex < viewModel.instanceCount) {
                    viewModelInstance = viewModel.instanceByIndex(instanceIndex);
                } else {
                    console.warn(`Instance index ${instanceIndex} not available. Only ${viewModel.instanceCount} instances found.`);
                    return false;
                }
            }
            
            if (!viewModelInstance) {
                console.warn(`Could not get ${instanceName} theme instance.`);
                return false;
            }
            
            // Bind the instance to the Rive file (this switches the theme)
            riveInstance.bindViewModelInstance(viewModelInstance);
            return true;
            
        } catch (e) {
            console.warn('Could not switch Rive theme instance:', e);
            return false;
        }
    }

    // Switch all animations to light/dark theme using Data Binding
    function switchAllRiveThemes(isDark) {
        document.querySelectorAll('canvas[id$="rive-canvas"]').forEach(canvas => {
            if (canvas._riveInstance) {
                setRiveTheme(canvas._riveInstance, isDark);
            }
        });
    }

    // Detect current site theme for Tailwind CSS class-based approach
    function detectSiteTheme() {
        // Check for 'dark' class on html element (Tailwind CSS approach)
        return document.documentElement.classList.contains('dark');
    }

    // Set up theme detection and syncing
    function setupRiveSiteThemeSync() {
        // Set initial theme based on current site state
        const initialIsDark = detectSiteTheme();
        switchAllRiveThemes(initialIsDark);
        
        // Watch for class changes on html element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isDark = detectSiteTheme();
                    switchAllRiveThemes(isDark);
                }
            });
        });
        
        // Observe html element for class changes
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return observer; // Return observer for cleanup if needed
    }

    // Expose functions globally for manual use
    window.createRiveAnimation = createRiveAnimation;
    window.switchRiveThemes = switchAllRiveThemes;
    window.setupRiveSiteThemeSync = setupRiveSiteThemeSync;
})();
