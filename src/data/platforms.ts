import { PlatformType } from '../types';

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  nameUrdu: string;
  badge: string;
  badgeUrdu: string;
  color: string;
  gradient: string;
  iconName: string;
  formats: string[];
  sampleUrl: string;
  supportsNoWatermark: boolean;
  maxResolution: string;
  description: string;
  descriptionUrdu: string;
  instructions: {
    en: string[];
    ur: string[];
  };
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    nameUrdu: 'ٹک ٹاک',
    badge: '100% No Watermark HD',
    badgeUrdu: 'بغیر واٹر مارک فل ایچ ڈی',
    color: '#000000',
    gradient: 'from-slate-900 via-cyan-900 to-teal-800',
    iconName: 'Music2',
    formats: ['1080p Full HD MP4 (No Watermark)', '720p HD MP4', 'HQ 320kbps MP3'],
    sampleUrl: 'https://vt.tiktok.com/ZSbaaHoLq/',
    supportsNoWatermark: true,
    maxResolution: '1080p Full HD (60fps)',
    description: 'Save TikTok videos without any watermark or logo in crystal-clear original HD quality.',
    descriptionUrdu: 'ٹک ٹاک ویڈیوز بغیر کسی واٹر مارک یا یوزر نیم لوگو کے فل ایچ ڈی میں ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Open TikTok and find the video you want to save.',
        'Tap the "Share" button on the right side of the screen.',
        'Choose "Copy Link" from the share sheet.',
        'Paste the link here — the watermark will be removed automatically.'
      ],
      ur: [
        'ٹک ٹاک کھولیں اور اپنی پسندیدہ ویڈیو منتخب کریں۔',
        'سکرین کے دائیں جانب موجود "Share" تیر کے نشان کو دبائیں۔',
        '"Copy Link" پر ٹیپ کریں۔',
        'یہاں لنک پیسٹ کریں، واٹر مارک خودکار طور پر الگ کر دیا جائے گا۔'
      ]
    }
  },
  {
    id: 'instagram',
    name: 'Instagram',
    nameUrdu: 'انسٹاگرام',
    badge: 'Reels & Stories No-Logo',
    badgeUrdu: 'ریلز اور کہانیاں',
    color: '#E1306C',
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    iconName: 'Instagram',
    formats: ['Reels MP4 (1080p)', 'Stories MP4', 'Carousel Photos', 'Audio MP3', 'Photo HD JPG'],
    sampleUrl: 'https://www.instagram.com/reel/C8q7Y2sM3Kp/',
    supportsNoWatermark: true,
    maxResolution: '1080p Full HD',
    description: 'Download Reels, Posts, Stories, Carousels & Audio in 1080p without quality degradation.',
    descriptionUrdu: 'انسٹاگرام ریلز، پوسٹس، کہانیاں، کیروسل تصاویر اور آڈیو بغیر کوالٹی کم ہوئے ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Open the Instagram app and open the Reel, Story, or Post you want.',
        'Tap the Share (paper airplane) icon or 3 dots at the bottom right.',
        'Tap "Copy link".',
        'Return here, tap "Paste" and click "Get Download Link".'
      ],
      ur: [
        'انسٹاگرام ایپ کھولیں اور اپنی مطلوبہ ریل یا پوسٹ تلاش کریں۔',
        'نیچے شیئر (Share) کے نشان یا 3 نقطوں پر ٹیپ کریں۔',
        '"Copy link" (لنک کاپی کریں) کو منتخب کریں۔',
        'اس ایپ میں واپس آکر "پیسٹ کریں" پر کلک کریں اور ڈاؤن لوڈ حاصل کریں۔'
      ]
    }
  },
  {
    id: 'facebook',
    name: 'Facebook',
    nameUrdu: 'فیس بک',
    badge: 'HD Watch & Reels',
    badgeUrdu: 'ایچ ڈی ویڈیوز اور ریلز',
    color: '#1877F2',
    gradient: 'from-blue-600 to-indigo-700',
    iconName: 'Facebook',
    formats: ['Full HD 1080p MP4', 'HD 720p MP4', 'SD 480p MP4', 'HQ MP3 Audio'],
    sampleUrl: 'https://www.facebook.com/watch/?v=10153231379946729',
    supportsNoWatermark: true,
    maxResolution: '1080p 60fps',
    description: 'Download Facebook Reels, Public Watch clips, and Group videos in highest available HD resolution.',
    descriptionUrdu: 'فیس بک ریلز اور ویڈیوز بہترین ہائی ڈیفینیشن (HD 1080p) کوالٹی میں ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Open Facebook and locate the video or Reel.',
        'Click the "Share" button beneath the video.',
        'Select "Copy Link" from the menu options.',
        'Paste in our downloader to extract all video resolutions.'
      ],
      ur: [
        'فیس بک کھولیں اور مطلوبہ ویڈیو یا ریل پر جائیں۔',
        'ویڈیو کے نیچے "Share" بٹن پر کلک کریں۔',
        'اختیارات میں سے "Copy Link" کو منتخب کریں۔',
        'یہاں آکر پیسٹ کریں اور مختلف کوالٹیز میں ڈاؤن لوڈ کریں۔'
      ]
    }
  },
  {
    id: 'youtube',
    name: 'YouTube & Shorts',
    nameUrdu: 'یوٹیوب اور شارٹس',
    badge: 'Videos & Shorts 4K/HD',
    badgeUrdu: 'شارٹس اور ویڈیوز',
    color: '#FF0000',
    gradient: 'from-red-600 to-rose-700',
    iconName: 'Youtube',
    formats: ['4K / 1080p 60fps MP4', '720p HD MP4', '360p SD MP4', '320kbps MP3 Audio'],
    sampleUrl: 'https://www.youtube.com/shorts/kJQP7kiw5Fk',
    supportsNoWatermark: true,
    maxResolution: '4K / 1080p 60fps',
    description: 'Extract YouTube Shorts and video clips in 1080p 60fps with clear audio separation.',
    descriptionUrdu: 'یوٹیوب شارٹس اور وائرل کلپس کو فل ایچ ڈی 60 فریمز فی سیکنڈ میں محفوظ کریں۔',
    instructions: {
      en: [
        'Open YouTube and find the Short or Clip.',
        'Tap the "Share" button and select "Copy Link".',
        'Paste it into the search box above to fetch high-res formats.'
      ],
      ur: [
        'یوٹیوب کھولیں اور مطلوبہ شارٹ یا ویڈیو تلاش کریں۔',
        'شیئر بٹن پر کلک کرکے "Copy Link" کریں۔',
        'یہاں پیسٹ کرکے ڈاؤن لوڈ کریں۔'
      ]
    }
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    nameUrdu: 'ٹوئٹر / X',
    badge: 'Fast MP4 & GIFs',
    badgeUrdu: 'تیز رفتار MP4 اور GIFs',
    color: '#0F1419',
    gradient: 'from-zinc-800 to-zinc-950',
    iconName: 'Twitter',
    formats: ['MP4 (1080p)', 'MP4 (720p)', 'Animated GIF', 'Audio MP3'],
    sampleUrl: 'https://x.com/tech_trends/status/17892349812903',
    supportsNoWatermark: true,
    maxResolution: '1080p HD',
    description: 'Save viral tweets, video clips, GIFs, and media attachments instantly.',
    descriptionUrdu: 'ٹوئٹر / X کی ویڈیوز، وائرل کلپس اور متحرک تصاویر فورا محفوظ کریں۔',
    instructions: {
      en: [
        'Find the post containing video on X/Twitter.',
        'Click the Share icon at the bottom of the tweet.',
        'Click "Copy link to Tweet".',
        'Paste here to fetch high resolution MP4.'
      ],
      ur: [
        'ایکس / ٹوئٹر پر ویڈیو والی پوسٹ پر جائیں۔',
        'پوسٹ کے نیچے شیئر آئیکون پر کلک کریں۔',
        '"Copy link" منتخب کریں۔',
        'اس ایپ میں پیسٹ کرکے ڈاؤن لوڈ کریں۔'
      ]
    }
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    nameUrdu: 'پنٹریسٹ',
    badge: 'Pins & 4K Photos',
    badgeUrdu: 'پنز اور 4K تصاویر',
    color: '#E60023',
    gradient: 'from-red-600 to-rose-800',
    iconName: 'Pin',
    formats: ['Full HD Video MP4', 'Ultra-Res Image (4K JPG)', 'Cover PNG'],
    sampleUrl: 'https://www.pinterest.com/pin/424605071146015517/',
    supportsNoWatermark: true,
    maxResolution: '4K Ultra HD',
    description: 'Save Pinterest idea videos and ultra high-resolution photos in lossless original quality.',
    descriptionUrdu: 'پنٹریسٹ سے بہترین ریزولیوشن کی ویڈیوز اور 4K تصاویر ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Open Pinterest and open the Pin you want.',
        'Tap the three dots (...) or Share icon.',
        'Tap "Copy link".',
        'Paste into the search field above.'
      ],
      ur: [
        'پنٹریسٹ ایپ میں اپنی مطلوبہ پن کھولیں۔',
        'تین نقطوں (...) یا شیئر کے نشان پر ٹیپ کریں۔',
        '"Copy link" منتخب کریں۔',
        'اوپر موجود خانے میں لنک پیسٹ کریں۔'
      ]
    }
  },
  {
    id: 'threads',
    name: 'Threads',
    nameUrdu: 'تھریڈز',
    badge: 'Meta Clean Video',
    badgeUrdu: 'میٹا ویڈیو',
    color: '#000000',
    gradient: 'from-neutral-900 to-slate-800',
    iconName: 'AtSign',
    formats: ['HD Video MP4 (1080p)', 'HD Photo JPG', 'Audio'],
    sampleUrl: 'https://www.threads.com/@mohdmobeespasha/post/DeDldlMEgP4',
    supportsNoWatermark: true,
    maxResolution: '1080p HD',
    description: 'Download videos and multimedia posts from Meta Threads seamlessly.',
    descriptionUrdu: 'تھریڈز ایپ سے ویڈیوز اور تصاویر باآسانی ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Open the Threads post.',
        'Tap the Share icon under the post.',
        'Tap "Copy Link".',
        'Paste here and download.'
      ],
      ur: [
        'تھریڈز پوسٹ پر جائیں۔',
        'شیئر کے نشان پر کلک کریں۔',
        '"Copy Link" پر ٹیپ کریں۔',
        'یہاں آکر ڈاؤن لوڈ کریں۔'
      ]
    }
  },
  {
    id: 'reddit',
    name: 'Reddit',
    nameUrdu: 'ریڈٹ',
    badge: 'Audio-Merged MP4',
    badgeUrdu: 'آڈیو کے ساتھ MP4',
    color: '#FF4500',
    gradient: 'from-orange-600 to-red-600',
    iconName: 'Flame',
    formats: ['HD 1080p MP4 (with Audio)', '720p MP4', 'GIF Animation'],
    sampleUrl: 'https://www.reddit.com/r/videos/comments/1example/amazing_clip/',
    supportsNoWatermark: true,
    maxResolution: '1080p HD',
    description: 'Download Reddit v.redd.it videos with merged high-quality audio and animations.',
    descriptionUrdu: 'ریڈٹ ویڈیوز آڈیو کے ساتھ فل ایچ ڈی میں ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Open Reddit and click Share on the post.',
        'Copy the post link and paste here.',
        'Download the merged video with audio tracks.'
      ],
      ur: [
        'ریڈٹ پوسٹ پر شیئر بٹن دبائیں۔',
        'لنک کاپی کریں اور یہاں پیسٹ کریں۔'
      ]
    }
  },
  {
    id: 'snapchat',
    name: 'Snapchat Spotlight',
    nameUrdu: 'سنیپ چیٹ',
    badge: 'Clean Spotlight',
    badgeUrdu: 'اسپاٹ لائٹ ویڈیوز',
    color: '#FFFC00',
    gradient: 'from-yellow-400 to-amber-500',
    iconName: 'Camera',
    formats: ['Spotlight Clean MP4', 'Story Video', 'MP3 Audio'],
    sampleUrl: 'https://story.snapchat.com/spotlight/192837465',
    supportsNoWatermark: true,
    maxResolution: '1080p HD',
    description: 'Download Snapchat Spotlight clips and public stories without watermarks.',
    descriptionUrdu: 'سنیپ چیٹ اسپاٹ لائٹ ویڈیوز اور کہانیاں بغیر واٹر مارک محفوظ کریں۔',
    instructions: {
      en: [
        'Open Snapchat Spotlight video.',
        'Tap the Share button and select "Copy Link".',
        'Paste here to download the video.'
      ],
      ur: [
        'سنیپ چیٹ اسپاٹ لائٹ ویڈیو پر شیئر دبائیں۔',
        '"Copy Link" منتخب کرکے یہاں پیسٹ کریں۔'
      ]
    }
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    nameUrdu: 'لنکڈ ان',
    badge: 'Pro HD Video',
    badgeUrdu: 'پروفیشنل ویڈیو',
    color: '#0A66C2',
    gradient: 'from-blue-700 to-sky-800',
    iconName: 'Briefcase',
    formats: ['1080p MP4', '720p MP4', 'Presentation Video'],
    sampleUrl: 'https://www.linkedin.com/posts/tech-leadership_video-activity-18239',
    supportsNoWatermark: true,
    maxResolution: '1080p HD',
    description: 'Save professional keynotes, LinkedIn video posts and presentations in HD.',
    descriptionUrdu: 'لنکڈ ان ویڈیوز اور پریزنٹیشنز کو ہائی ڈیفینیشن میں محفوظ کریں۔',
    instructions: {
      en: [
        'Click the 3 dots on the LinkedIn post.',
        'Choose "Copy link to post".',
        'Paste here and download.'
      ],
      ur: [
        'لنکڈ ان پوسٹ پر 3 نقطوں پر کلک کریں۔',
        'لنک کاپی کرکے یہاں پیسٹ کریں۔'
      ]
    }
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    nameUrdu: 'ویمیو',
    badge: 'Up to 4K Ultra HD',
    badgeUrdu: '4K الٹرا ایچ ڈی',
    color: '#1AB7EA',
    gradient: 'from-sky-500 to-blue-600',
    iconName: 'PlaySquare',
    formats: ['4K Ultra HD MP4', '1080p 60fps', '720p HD', 'Original Audio'],
    sampleUrl: 'https://vimeo.com/76979871',
    supportsNoWatermark: true,
    maxResolution: '4K (2160p)',
    description: 'Download cinematic Vimeo showcases in breathtaking 4K and 1080p 60fps.',
    descriptionUrdu: 'ویمیو سے سنیمیٹک ویڈیوز 4K اور 1080p میں ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Copy the Vimeo video URL.',
        'Paste it here to choose between 4K, 1080p or 720p streams.'
      ],
      ur: [
        'ویمیو ویڈیو کا لنک کاپی کریں۔',
        'یہاں پیسٹ کرکے مطلوبہ ریزولیوشن ڈاؤن لوڈ کریں۔'
      ]
    }
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    nameUrdu: 'ڈیلی موشن',
    badge: '1080p MP4',
    badgeUrdu: '1080p ویڈیوز',
    color: '#0066DC',
    gradient: 'from-blue-600 to-indigo-800',
    iconName: 'Film',
    formats: ['1080p Full HD', '720p HD', '480p SD', 'Audio MP3'],
    sampleUrl: 'https://www.dailymotion.com/video/x8abcdef',
    supportsNoWatermark: true,
    maxResolution: '1080p HD',
    description: 'Download Dailymotion shows, news, and entertainment videos in HD.',
    descriptionUrdu: 'ڈیلی موشن ویڈیوز اور ڈرامے فل ایچ ڈی میں ڈاؤن لوڈ کریں۔',
    instructions: {
      en: [
        'Copy the Dailymotion video URL from your browser or app.',
        'Paste here to extract all video quality streams.'
      ],
      ur: [
        'ڈیلی موشن کا لنک کاپی کریں۔',
        'یہاں پیسٹ کرکے تمام کوالٹیز حاصل کریں۔'
      ]
    }
  }
];

