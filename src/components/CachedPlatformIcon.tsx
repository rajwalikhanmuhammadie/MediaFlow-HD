import React, { useState } from 'react';
import {
  Instagram,
  Music2,
  Facebook,
  Twitter,
  Pin,
  AtSign,
  Youtube,
  Flame,
  Camera,
  Briefcase,
  PlaySquare,
  Film,
} from 'lucide-react';
import { PlatformType } from '../types';
import { getPlatformIconUrl } from '../utils/serviceWorkerCache';

interface CachedPlatformIconProps {
  platformId: PlatformType;
  iconName?: string;
  className?: string;
  imgClassName?: string;
}

export const CachedPlatformIcon: React.FC<CachedPlatformIconProps> = ({
  platformId,
  iconName,
  className = 'w-9 h-9',
  imgClassName = 'w-full h-full object-contain rounded-xl',
}) => {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getPlatformIconUrl(platformId);

  const renderFallbackIcon = () => {
    const iconCls = 'w-4 h-4';
    switch (iconName || platformId) {
      case 'Instagram':
      case 'instagram':
        return <Instagram className={iconCls} />;
      case 'Music2':
      case 'tiktok':
        return <Music2 className={iconCls} />;
      case 'Facebook':
      case 'facebook':
        return <Facebook className={iconCls} />;
      case 'Twitter':
      case 'twitter':
        return <Twitter className={iconCls} />;
      case 'Pin':
      case 'pinterest':
        return <Pin className={iconCls} />;
      case 'AtSign':
      case 'threads':
        return <AtSign className={iconCls} />;
      case 'Flame':
      case 'reddit':
        return <Flame className={iconCls} />;
      case 'Camera':
      case 'snapchat':
        return <Camera className={iconCls} />;
      case 'Briefcase':
      case 'linkedin':
        return <Briefcase className={iconCls} />;
      case 'PlaySquare':
      case 'vimeo':
        return <PlaySquare className={iconCls} />;
      case 'Film':
      case 'dailymotion':
        return <Film className={iconCls} />;
      default:
        return <Youtube className={iconCls} />;
    }
  };

  if (!imgError && iconUrl) {
    return (
      <div className={`relative inline-flex items-center justify-center overflow-hidden ${className}`}>
        <img
          src={iconUrl}
          alt={platformId}
          loading="eager"
          decoding="async"
          onError={() => setImgError(true)}
          className={imgClassName}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {renderFallbackIcon()}
    </div>
  );
};
