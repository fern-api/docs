import React from 'react'
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components'
import type { DefaultTheme } from 'styled-components/dist/types.js'
import LogoDark from './assets/LogoDark.js'
import LogoLight from './assets/LogoLight.js'

const FooterContainer = styled.section`
  font-family: 'Roobert-Regular', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  gap: 1rem;
  color: var(--grayscale-a10);
  font-weight: 400;
  width: 100%;
  max-width: calc(var(--spacing-page-width) + var(--spacing-page-padding) * 2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 1rem;
  font-size: 0.875rem;
  justify-self: center;
  @media screen and (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
`

const LinksContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  max-width: 800px;
  font-size: 0.875rem;
  gap: 3rem;
  @media screen and (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
`

const FooterItems = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
`

const FooterLink = styled.a`
  text-decoration: none;
  font-size: 0.625rem;

  &:hover {
    text-decoration: underline;
    color: var(--accent-a11);
  }
`

const FooterCopyright = styled.p`
  font-size: 0.625rem;
`

const currentYear = new Date().getFullYear();

export const CustomFooter: React.FC = () => {
  const [isDark, setIsDark] = React.useState(
    document.documentElement.classList.contains('dark'),
  )

  React.useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.target === document.documentElement &&
          mutation.attributeName === 'class'
        ) {
          setIsDark(document.documentElement.classList.contains('dark'))
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  const theme: DefaultTheme = {
    mode: isDark ? 'dark' : 'light',
  }

  return (
    <StyledThemeProvider theme={theme}>
      <FooterContainer className="max-w-page-width">
        <LinksContainer>
          {isDark ? <LogoDark /> : <LogoLight />}
          <FooterItems>
            <FooterCopyright>© {currentYear} Adobe Inc. All rights reserved.</FooterCopyright>
            <FooterLink href="https://frame.io/terms">Terms</FooterLink>
            <FooterLink href="https://frame.io/privacy">Privacy</FooterLink>
            <FooterLink href="https://frame.io/privacy#my-personal-information">Do not sell or share my personal information</FooterLink>
          </FooterItems>
        </LinksContainer>
      </FooterContainer>
    </StyledThemeProvider>
  )
}
