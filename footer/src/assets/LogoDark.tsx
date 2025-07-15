import type { FC } from 'react'
import styled from 'styled-components'

const LogoSVG = styled.svg`
  width: 1.25rem;
  height: 1.25rem;
`

export const LogoDark: FC = () => {
  return (
    // <LogoSVG xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
    //   <path
    //     d="M61.869 0C20.659 0-.02 36.896 0 61.216v65.338h27.955c0-34.356 67.879-34.279 67.879 0h27.916v-65.28C123.75 36.902 103.085 0 61.869 0m.019 89.587C45.421 89.6 32.077 76.198 32.083 59.68c.013-16.243 13.568-29.856 29.76-29.869C78.31 29.805 91.661 43.2 91.648 59.718c-.013 16.25-13.568 29.856-29.76 29.87Z"
    //     fill="#e3e3e3"
    //   />
    // </LogoSVG>

    <LogoSVG xmlns="http://www.w3.org/2000/svg" fill="none" preserveAspectRatio="xMinYMid meet" viewBox="0 0 19 16">
      <path fill="#FCFCFC" d="M6.69 0H0v16zM11.396 0h6.681v16zM9.045 5.897 13.303 16H10.51l-1.272-3.217H6.12z" />
    </LogoSVG>
    
  )
}

export default LogoDark
