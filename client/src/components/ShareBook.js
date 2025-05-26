import React, { useState, useCallback, memo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ShareIcon, XIcon } from '@heroicons/react/outline';
import { ResponsiveModal, ResponsiveButton } from './ResponsiveLayout';
import QRCode from 'qrcode';

const ShareBook = memo(({ book }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const { currentTheme } = useTheme();

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: '📱',
      shareUrl: `https://wa.me/?text=${encodeURIComponent(
        `Check out "${book.title}" by ${book.author} on BookShelvz! 📚\n${window.location.href}`
      )}`
    },
    {
      name: 'Instagram Story',
      icon: '📸',
      shareUrl: `https://www.instagram.com/stories/create?text=${encodeURIComponent(
        `📚 Reading "${book.title}" by ${book.author} on BookShelvz!\n${window.location.href}`
      )}`
    },
    {
      name: 'Twitter',
      icon: '🐦',
      shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `📚 Reading "${book.title}" by ${book.author} on BookShelvz!\n${window.location.href}`
      )}`
    },
    {
      name: 'Facebook',
      icon: '👥',
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        window.location.href
      )}`
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        window.location.href
      )}`
    },
    {
      name: 'Email',
      icon: '📧',
      shareUrl: `mailto:?subject=${encodeURIComponent(
        `Check out "${book.title}" on BookShelvz`
      )}&body=${encodeURIComponent(
        `I'm reading "${book.title}" by ${book.author} on BookShelvz!\n\n${window.location.href}`
      )}`
    }
  ];

  const handleShare = useCallback((url) => {
    try {
      window.open(url, '_blank', 'width=600,height=400');
      setIsOpen(false);
    } catch (error) {
      console.error('Error sharing:', error);
      setError('Failed to open share window. Please try again.');
    }
  }, []);

  const generateShareImage = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1200;
      canvas.height = 630;

      // Background with gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, currentTheme.primary.replace('bg-', '#'));
      gradient.addColorStop(1, currentTheme.secondary.replace('bg-', '#'));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Book cover image
      const coverImg = new Image();
      coverImg.crossOrigin = 'anonymous';
      coverImg.src = book.cover_url;
      await new Promise((resolve, reject) => {
        coverImg.onload = resolve;
        coverImg.onerror = reject;
      });
      ctx.drawImage(coverImg, 50, 50, 300, 450);

      // Text with shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Title
      ctx.fillStyle = currentTheme.text.replace('text-', '#');
      ctx.font = 'bold 48px Arial';
      ctx.fillText(book.title, 400, 150);

      // Author
      ctx.font = '36px Arial';
      ctx.fillText(`by ${book.author}`, 400, 220);

      // Description
      ctx.font = '24px Arial';
      const description = book.description || 'Read on BookShelvz';
      const words = description.split(' ');
      let line = '';
      let y = 300;
      for (let word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 600) {
          ctx.fillText(line, 400, y);
          line = word + ' ';
          y += 30;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 400, y);

      // QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(window.location.href, {
        width: 150,
        margin: 1,
        color: {
          dark: currentTheme.text.replace('text-', '#'),
          light: '#ffffff'
        }
      });
      const qrCode = new Image();
      qrCode.src = qrCodeDataUrl;
      await new Promise((resolve, reject) => {
        qrCode.onload = resolve;
        qrCode.onerror = reject;
      });
      ctx.drawImage(qrCode, 400, y + 50, 150, 150);

      // Logo
      const logo = new Image();
      logo.src = '/logo.png'; // Make sure to add your logo
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });
      ctx.drawImage(logo, 50, canvas.height - 100, 200, 50);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating share image:', error);
      setError('Failed to generate share image. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [book, currentTheme]);

  const handleDownloadShareImage = useCallback(async () => {
    try {
      const imageUrl = await generateShareImage();
      if (!imageUrl) return;

      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${book.title.toLowerCase().replace(/\s+/g, '-')}-share.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading share image:', error);
      setError('Failed to download share image. Please try again.');
    }
  }, [book.title, generateShareImage]);

  return (
    <>
      <ResponsiveButton
        onClick={() => setIsOpen(true)}
        variant="secondary"
        className="flex items-center space-x-2"
      >
        <ShareIcon className="h-5 w-5" />
        <span>Share</span>
      </ResponsiveButton>

      <ResponsiveModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setError(null);
        }}
        title="Share Book"
        size="lg"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {shareOptions.map(option => (
              <button
                key={option.name}
                onClick={() => handleShare(option.shareUrl)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${currentTheme.hover} transition-colors duration-200`}
              >
                <span className="text-2xl">{option.icon}</span>
                <span>{option.name}</span>
              </button>
            ))}
          </div>

          <div className="border-t pt-4">
            <ResponsiveButton
              onClick={handleDownloadShareImage}
              disabled={isGenerating}
              className="flex items-center space-x-2 w-full"
            >
              <span className="text-2xl">📸</span>
              <span>{isGenerating ? 'Generating...' : 'Download Share Image'}</span>
            </ResponsiveButton>
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
});

export default ShareBook; 