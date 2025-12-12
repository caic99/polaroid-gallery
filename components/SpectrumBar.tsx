import React from 'react';

const SpectrumBar: React.FC = () => {
  return (
    <div className="h-1.5 w-full flex">
      <div className="h-full w-full bg-polaroid-red"></div>
      <div className="h-full w-full bg-polaroid-orange"></div>
      <div className="h-full w-full bg-polaroid-yellow"></div>
      <div className="h-full w-full bg-polaroid-green"></div>
      <div className="h-full w-full bg-polaroid-blue"></div>
    </div>
  );
};

export default SpectrumBar;
