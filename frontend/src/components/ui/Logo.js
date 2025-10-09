import React from 'react';

const Logo = ({ className = "h-20 w-20", alt = "Moto Investment Logo", showCircle = true }) => {
  if (!showCircle) {
    return (
      <img 
        src="/logo2.png" 
        alt={alt} 
        className={className}
      />
    );
  }

  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      {/* Gradient border */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full p-1">
        {/* Inner transparent area for the logo */}
        <div className="w-full h-full bg-transparent rounded-full flex items-center justify-center">
          {/* Logo image */}
          <img 
            src="/logo2.png" 
            alt={alt} 
            className="w-full h-full object-contain rounded-full"
          />
        </div>
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-sm -z-10"></div>
    </div>
  );
};

export default Logo;
