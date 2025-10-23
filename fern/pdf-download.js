(function() {
    function addPdfDownloadButton() {
        if (!window.location.pathname.includes('/home')) {
            return;
        }

        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) {
            return;
        }

        const existingButton = document.getElementById('pdf-download-btn');
        if (existingButton) {
            return;
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 20px; text-align: center;';
        
        const downloadButton = document.createElement('button');
        downloadButton.id = 'pdf-download-btn';
        downloadButton.className = 'fern-button filled normal primary gap-1';
        downloadButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download PDF
        `;
        downloadButton.style.cssText = 'cursor: pointer; display: inline-flex; align-items: center;';
        
        downloadButton.addEventListener('click', function() {
            downloadButton.disabled = true;
            downloadButton.innerHTML = 'Generating PDF...';
            
            setTimeout(function() {
                window.print();
                
                setTimeout(function() {
                    downloadButton.disabled = false;
                    downloadButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download PDF
                    `;
                }, 1000);
            }, 100);
        });
        
        buttonContainer.appendChild(downloadButton);
        
        const heroTitleContainer = heroSection.querySelector('.hero-title-container');
        if (heroTitleContainer) {
            heroTitleContainer.appendChild(buttonContainer);
        }
    }

    function addPrintStyles() {
        const existingStyle = document.getElementById('pdf-print-styles');
        if (existingStyle) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'pdf-print-styles';
        style.textContent = `
            @media print {
                @page {
                    size: A4;
                    margin: 1cm;
                }
                
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                #pdf-download-btn {
                    display: none !important;
                }
                
                .dashed-pattern {
                    display: none !important;
                }
                
                nav, header, footer, .navbar, .sidebar {
                    display: none !important;
                }
                
                .hero-section {
                    page-break-after: avoid;
                }
                
                .panel-card {
                    page-break-inside: avoid;
                    margin-bottom: 20px;
                }
                
                .feature-grid {
                    display: block !important;
                }
                
                .rive-container, canvas {
                    display: none !important;
                }
                
                a {
                    text-decoration: none;
                    color: inherit;
                }
                
                a[href]:after {
                    content: " (" attr(href) ")";
                    font-size: 0.8em;
                    color: #666;
                }
                
                a[href^="#"]:after,
                a[href^="javascript:"]:after {
                    content: "";
                }
            }
        `;
        document.head.appendChild(style);
    }

    function initialize() {
        addPrintStyles();
        addPdfDownloadButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(initialize, 100);
        }
    }).observe(document, { subtree: true, childList: true });
})();
