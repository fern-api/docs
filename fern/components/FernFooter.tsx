import React from 'react';
import { FernStatusWidget } from './FernStatus';

import { BuiltWithFernLight } from './images/builtwithfern-light';
import { BuiltWithFernDark } from './images/builtwithfern-dark';
import { BuiltWithFernFrameLight } from './images/builtwithfern-frame-light';
import { BuiltWithFernFrameDark } from './images/builtwithfern-frame-dark';
import { Soc2Logo } from './images/soc2';

export const FernFooter = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* Left Column - Logo and Status */}
        <a className="footer-logo" href="https://buildwithfern.com">
          <BuiltWithFernLight className="footer-logo-img dark:hidden" />
          <BuiltWithFernDark className="footer-logo-img hidden dark:block" />

          <BuiltWithFernFrameLight className="footer-logo-frame dark:hidden" />
          <BuiltWithFernFrameDark className="footer-logo-frame hidden dark:block" /> 
        </a>
        
        <div className="footer-status">
          {/* <a className="status-badge" href="https://status.buildwithfern.com">
            <div className="status-indicator"></div>
            <span className="status-text">All systems operational</span>
          </a> */}
          <FernStatusWidget />
          
          <a className="soc2-badge" href="https://security.buildwithfern.com/">
            <Soc2Logo className="soc2-badge-img" />
            <span className="status-text">Soc 2 Type II</span>
          </a>
        </div>
      </div>

      {/* Footer Links */}
      <div className="footer-links">
        <div className="footer-bottom-text"> © 2025 Fern • Located in Brooklyn, NY </div>
        {/* Newsletter Signup */}
        {/* <div className="newsletter-container">
          <div className="newsletter-label">Subscribe to our updates</div>
          <div className="newsletter-form">
            <div className="newsletter-input">
              <span>marty.mcfly@hillvalley.edu</span>
            </div>
            <button className="newsletter-button">
            </button>
          </div>
        </div> */}
        <div className="footer-columns">
          <div className="footer-column">
            <h4 className="footer-column-title">Documentation</h4>
            <div className="footer-column-links">
              <a href="/openapi/getting-started/overview" className="footer-link">OpenAPI Compatibility</a>
              <a href="/sdks/overview/introduction" className="footer-link">SDKs</a>
              <a href="docs/getting-started/overview" className="footer-link">Docs</a>
            </div>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Resources</h4>
            <div className="footer-column-links">
              <a href="https://buildwithfern.com/blog" className="footer-link">Blog</a>
              <a href="#support" className="footer-link">Support</a>
              <a href="https://buildwithfern.com/pricing" className="footer-link">Pricing</a>
              <a href="https://buildwithfern.com/slack" className="footer-link">Slack</a>
            </div>
          </div>

          <div className="footer-column">
            <h4 className="footer-column-title">Company</h4>
            <div className="footer-column-links">
              <a href="https://brandfetch.com/buildwithfern.com" className="footer-link">Brand Kit</a>
              <a href="https://github.com/fern-api/fern" className="footer-link">Github</a>
              <a href="https://buildwithfern.com/privacy-policy" className="footer-link">Privacy Policy</a>
              <a href="https://buildwithfern.com/terms-of-service" className="footer-link">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};