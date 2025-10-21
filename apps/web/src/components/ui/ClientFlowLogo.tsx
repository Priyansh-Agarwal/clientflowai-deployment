import React from 'react';

interface ClientFlowLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

const ClientFlowLogo: React.FC<ClientFlowLogoProps> = ({ 
  className = '', 
  width = 200, 
  height = 60 
}) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 200 60" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Chat Bubble */}
      <path 
        d="M15 15 C15 10, 20 5, 25 5 L45 5 C50 5, 55 10, 55 15 L55 25 C55 30, 50 35, 45 35 L35 35 L30 40 L30 35 L25 35 C20 35, 15 30, 15 25 Z" 
        fill="none" 
        stroke="#1e40af" 
        strokeWidth="2"
      />
      
      {/* Typing dots */}
      <circle cx="30" cy="20" r="2" fill="#1e40af"/>
      <circle cx="35" cy="20" r="2" fill="#1e40af"/>
      <circle cx="40" cy="20" r="2" fill="#1e40af"/>
      
      {/* Network nodes */}
      <circle cx="70" cy="15" r="6" fill="#06b6d4"/>
      <circle cx="80" cy="35" r="6" fill="#10b981"/>
      <circle cx="75" cy="25" r="4" fill="#1e40af"/>
      
      {/* Connecting lines */}
      <path d="M55 20 Q62 18, 70 15" stroke="#1e40af" strokeWidth="2" fill="none"/>
      <path d="M70 15 Q72 20, 75 25" stroke="#1e40af" strokeWidth="2" fill="none"/>
      <path d="M75 25 Q77 30, 80 35" stroke="#1e40af" strokeWidth="2" fill="none"/>
      <path d="M70 15 Q75 30, 80 35" stroke="#1e40af" strokeWidth="2" fill="none"/>
      
      {/* Text */}
      <text x="95" y="25" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="normal" fill="#1e40af">
        ClientFlow
      </text>
      <text x="95" y="40" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#1e40af">
        AI
      </text>
    </svg>
  );
};

export default ClientFlowLogo;
