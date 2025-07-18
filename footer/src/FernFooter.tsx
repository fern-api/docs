import React from 'react';
import { FernStatusWidget } from './FernStatus';

import { BuiltWithFernLight } from './images/builtwithfern-light';
import { BuiltWithFernDark } from './images/builtwithfern-dark';
import { BuiltWithFernFrameLight } from './images/builtwithfern-frame-light';
import { BuiltWithFernFrameDark } from './images/builtwithfern-frame-dark';
import { GitHubLight } from './images/github-light';
import { GitHubDark } from './images/github-dark';
import { XLight } from './images/x-light';
import { XDark } from './images/x-dark';
import { LinkedInLight } from './images/linkedin-light';
import { LinkedInDark } from './images/linkedin-dark';
import { Soc2Logo } from './images/soc2';

export const FernFooter: React.FC = () => {
  return (
    <>
      <style>{`
        #fern-footer {
          position: relative;
        }

        #fern-footer-wrapper {
          border-top: 1px solid var(--border);
        }

        .footer {
          padding: 3rem 2rem;
          width: 100%;
          max-width: calc(var(--page-width,88rem) + 4rem);
          margin: 0 auto;
        }

        .footer-top {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          margin-bottom: 3rem;
          position: relative;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .footer-logo svg {
          transition: filter 150ms ease;
        }

        .footer-logo:hover svg {
          filter: saturate(1) opacity(1);
        }

        .footer-logo-img {
          height: 1rem;
          margin: 0;
          filter: saturate(0) opacity(0.7);
        }

        .footer-logo-frame {
          position: absolute;
          top: 50%;
          left: 0;
          transform: translate(-32px, calc(-50% - 4px));
          filter: saturate(0) opacity(0.7);
        }

        .footer-status {
          display: flex;
          flex-direction: row;
          gap: 1rem;
        }

        .status-text {
          font-size: 0.875rem;
          color: var(--grayscale-10);
          font-weight: 400;
        }

        .soc2-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 9999px;
          padding: 0.25rem 0.75rem 0.25rem 0.25rem;
          align-self: flex-start;
          text-decoration: none;
          transition: background-color 150ms ease, color 150ms ease;
        }

        .soc2-badge:hover {
          background-color: var(--grayscale-a4);
        }

        .soc2-badge:hover .status-text {
          color: var(--grayscale-12);
        }

        .soc2-badge-img {
          width: 1.5rem;
          height: 1.5rem;
          background-color: #62636C;
          border-radius: 1000px;
        }

        .footer-links {
          display: flex;
          gap: 2rem;
          padding-top: 2rem;
          align-items: flex-end;
          justify-content: space-between;
        }

        .footer-columns {
          display: flex;
          gap: 2rem;
        }

        .footer-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 170px;
        }

        .footer-column-title {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--grayscale-9);
          letter-spacing: -0.025em;
        }

        .footer-column-links {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .footer-column-socials {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .footer-social-icon {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.25rem;

          &:hover {
            background-color: var(--grayscale-a4);

            img {
              fill: var(--grayscale-a12);
            }
          }
        }

        .footer-link {
          font-weight: 400;
          font-size: 0.875rem;
          color: var(--grayscale-11);
          text-decoration: none;
          transition: color 0.15s ease-in-out;
        }

        .footer-link:hover {
          color: var(--grayscale-12);
        }

        .footer-bottom-text {
          font-weight: 400;
          font-size: 0.875rem;
          color: var(--grayscale-10);
          text-decoration: none;
          transition: color 0.15s ease-in-out;
        }

        /* Responsive Design - Mobile */
        @media (max-width: 640px) {
          .footer {
            padding: 2rem 1.5rem;
          }

          .footer-top {
            flex-direction: column;
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .footer-logo-frame {
            transform: translate(-32px, calc(-50% - 68px));
          }

          .footer-status {
            flex-direction: column;
            gap: 0.75rem;
            padding-top: 2rem;
          }

          .footer-links {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            align-items: flex-start;
            padding-top: 1rem;
          }

          .footer-columns {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            width: 100%;
            order: 1;
          }

          .footer-column {
            width: 100%;
          }

          .footer-bottom-text {
            order: 2;
          }
        }

        /* Tablet breakpoint */
        @media (max-width: 720px) and (min-width: 481px) {
          .footer-columns {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }

          .footer-column {
            width: calc(50% - 1rem);
            min-width: 200px;
          }
        }
      `}</style>
      
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
                <a href="https://buildwithfern.com/learn/v2/api-definition/introduction/what-is-an-api-definition" className="footer-link">API Definition</a>
                <a href="https://buildwithfern.com/learn/v2/sdks/overview/introduction" className="footer-link">SDKs</a>
                <a href="https://buildwithfern.com/learn/v2/docs/getting-started/overview" className="footer-link">Docs</a>
              </div>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">Resources</h4>
              <div className="footer-column-links">
                <a href="https://buildwithfern.com/blog" className="footer-link">Blog</a>
                <a href="https://buildwithfern.com/learn/v2/home#help" className="footer-link">Support</a>
                <a href="https://buildwithfern.com/pricing" className="footer-link">Pricing</a>
                <a href="https://buildwithfern.com/slack" className="footer-link">Slack</a>
              </div>
            </div>

            <div className="footer-column">
              <h4 className="footer-column-title">Company</h4>
              <div className="footer-column-links">
                <a href="https://brandfetch.com/buildwithfern.com" className="footer-link">Brand Kit</a>
                <a href="https://buildwithfern.com/privacy-policy" className="footer-link">Privacy Policy</a>
                <a href="https://buildwithfern.com/terms-of-service" className="footer-link">Terms of Service</a>
              </div>
            </div>

            <div className="footer-column-socials">
              <a href="https://github.com/fern-api/fern" className="footer-link">
                <GitHubLight className="footer-social-icon dark:hidden" />
                <GitHubDark className="footer-social-icon hidden dark:block" />
              </a>
              <a href="https://x.com/buildwithfern" className="footer-link">
                <XLight className="footer-social-icon dark:hidden" />
                <XDark className="footer-social-icon hidden dark:block" />
              </a>
              <a href="https://www.linkedin.com/company/buildwithfern" className="footer-link">
                <LinkedInLight className="footer-social-icon dark:hidden" />
                <LinkedInDark className="footer-social-icon hidden dark:block" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};