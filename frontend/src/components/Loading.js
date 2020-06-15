import React from 'react'
import styled from 'styled-components'


const Spinner = styled.div`

  width: 40px;
  height: 40px;
  position: relative;
  animation: sk-chase 2.5s infinite linear both;


div {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0; 
  animation: sk-chase-dot 2.0s infinite ease-in-out both; 
}

div:before {
  content: '';
  display: block;
  width: 25%;
  height: 25%;
  background-color: #fff;
  border-radius: 100%;
  animation: sk-chase-dot-before 2.0s infinite ease-in-out both; 
}

div:nth-child(1) { animation-delay: -1.1s; }
div:nth-child(2) { animation-delay: -1.0s; }
div:nth-child(3) { animation-delay: -0.9s; }
div:nth-child(4) { animation-delay: -0.8s; }
div:nth-child(5) { animation-delay: -0.7s; }
div:nth-child(6) { animation-delay: -0.6s; }
div:nth-child(1):before { animation-delay: -1.1s; }
div:nth-child(2):before { animation-delay: -1.0s; }
div:nth-child(3):before { animation-delay: -0.9s; }
div:nth-child(4):before { animation-delay: -0.8s; }
div:nth-child(5):before { animation-delay: -0.7s; }
div:nth-child(6):before { animation-delay: -0.6s; }

@keyframes sk-chase {
  100% { transform: rotate(360deg); } 
}

@keyframes sk-chase-dot {
  80%, 100% { transform: rotate(360deg); } 
}

@keyframes sk-chase-dot-before {
  50% {
    transform: scale(0.4); 
  } 100%, 0% {
    transform: scale(1.0); 
  } 
}

`
const SpinnerContainer = styled.div`
    width: 100%;
    padding-top: 32px;
    ${Spinner} {
        margin: auto;
    }
`

const LoadingSpinner = () => (
    <SpinnerContainer>
        <Spinner>
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
        </Spinner>
    </SpinnerContainer>
)

export default LoadingSpinner