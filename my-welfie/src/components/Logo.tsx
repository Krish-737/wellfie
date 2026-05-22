import React from 'react';
import styled from 'styled-components';
import logo from '../assets/mywellfie-header-logo.png';
import media from '../style/media';

const Img = styled.img`
  height: 58px;
  width: clamp(190px, 55vw, 420px);
  object-fit: contain;
  object-position: left center;
  pointer-events: none;
  ${media.tablet`
    height: 66px;
    width: clamp(230px, 40vw, 500px);
  `}
`;

const Logo = () => {
  return <Img src={logo} />;
};

export default Logo;
