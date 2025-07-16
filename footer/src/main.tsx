import './main.css'
// import '@fortawesome/fontawesome-free/css/all.min.css';

import React from 'react'
import { createRoot } from 'react-dom/client'

import { FernFooter } from './FernFooter.js'

const FERN_FOOTER_CONTAINER_ID = 'fern-footer'

const render = async () => {
  const footerId = document.getElementById('footer')

  if (!footerId) {
    // Create fern footer wrapper with a data attribute to help with hydration
    const fernFooterWrapper = document.createElement('div')
    fernFooterWrapper.setAttribute('id', 'fern-footer-wrapper')
    fernFooterWrapper.setAttribute('data-react-component', 'true')

    // Get or create fern-footer container
    let fernFooterContainer = document.getElementById(FERN_FOOTER_CONTAINER_ID)
    if (!fernFooterContainer) {
      fernFooterContainer = document.createElement('div')
      fernFooterContainer.setAttribute('id', FERN_FOOTER_CONTAINER_ID)
      document.body.appendChild(fernFooterContainer)
    }

    fernFooterContainer.insertBefore(
      fernFooterWrapper,
      fernFooterContainer.firstChild,
    )


    // Use createRoot instead of render for React 18+ compatibility
    const root = createRoot(fernFooterWrapper)
    root.render(
      <React.StrictMode>
        <FernFooter />
      </React.StrictMode>,
    )

    // Show the container after rendering
    if (fernFooterContainer) fernFooterContainer.style.display = 'block'
  }
}

// Use 'load' event instead of 'DOMContentLoaded' for App Router
window.addEventListener('load', async () => {
  await render()

  // Simplified observer that doesn't rely on hydration count
  new MutationObserver(async (mutations) => {
    const shouldRender = mutations.some(
      (mutation) =>
        mutation.type === 'childList' &&
        !document.getElementById('fern-footer-wrapper'),
    )
    if (shouldRender) {
      await render()
    }
  }).observe(document.body, { childList: true, subtree: true })
})
