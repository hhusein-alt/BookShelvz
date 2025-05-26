class SocialSharing {
    constructor() {
        this.platforms = {
            facebook: {
                name: 'Facebook',
                icon: 'facebook',
                shareUrl: 'https://www.facebook.com/sharer/sharer.php?u=',
                color: '#1877f2'
            },
            twitter: {
                name: 'Twitter',
                icon: 'twitter',
                shareUrl: 'https://twitter.com/intent/tweet?text=',
                color: '#1da1f2'
            },
            linkedin: {
                name: 'LinkedIn',
                icon: 'linkedin',
                shareUrl: 'https://www.linkedin.com/sharing/share-offsite/?url=',
                color: '#0077b5'
            },
            pinterest: {
                name: 'Pinterest',
                icon: 'pinterest',
                shareUrl: 'https://pinterest.com/pin/create/button/?url=',
                color: '#e60023'
            },
            whatsapp: {
                name: 'WhatsApp',
                icon: 'whatsapp',
                shareUrl: 'https://api.whatsapp.com/send?text=',
                color: '#25d366'
            },
            email: {
                name: 'Email',
                icon: 'envelope',
                shareUrl: 'mailto:?subject=',
                color: '#ea4335'
            }
        };

        this.init();
    }

    init() {
        // Initialize share buttons
        this.initShareButtons();
        
        // Listen for share events
        document.addEventListener('share', (event) => {
            if (event.detail && event.detail.platform && event.detail.content) {
                this.share(event.detail.platform, event.detail.content);
            }
        });
    }

    initShareButtons() {
        const shareButtons = document.querySelectorAll('[data-share]');
        shareButtons.forEach(button => {
            const platform = button.dataset.share;
            if (this.platforms[platform]) {
                button.addEventListener('click', () => {
                    const content = this.getShareContent(button);
                    this.share(platform, content);
                });
            }
        });
    }

    getShareContent(button) {
        const content = {
            url: window.location.href,
            title: document.title,
            description: button.dataset.description || document.querySelector('meta[name="description"]')?.content || '',
            image: button.dataset.image || document.querySelector('meta[property="og:image"]')?.content || ''
        };

        return content;
    }

    share(platform, content) {
        const platformConfig = this.platforms[platform];
        if (!platformConfig) {
            console.warn(`Platform "${platform}" not supported`);
            return;
        }

        let shareUrl = platformConfig.shareUrl;

        switch (platform) {
            case 'facebook':
                shareUrl += encodeURIComponent(content.url);
                break;
            case 'twitter':
                shareUrl += encodeURIComponent(`${content.title} ${content.url}`);
                break;
            case 'linkedin':
                shareUrl += encodeURIComponent(content.url);
                break;
            case 'pinterest':
                shareUrl += encodeURIComponent(content.url) + '&media=' + encodeURIComponent(content.image);
                break;
            case 'whatsapp':
                shareUrl += encodeURIComponent(`${content.title} ${content.url}`);
                break;
            case 'email':
                shareUrl += encodeURIComponent(content.title) + '&body=' + encodeURIComponent(`${content.description}\n\n${content.url}`);
                break;
        }

        // Open share dialog
        this.openShareDialog(shareUrl, platform);
    }

    openShareDialog(url, platform) {
        const width = 600;
        const height = 400;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        const shareWindow = window.open(
            url,
            'share',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (shareWindow) {
            shareWindow.focus();
        }
    }

    createShareButton(platform, content, options = {}) {
        const platformConfig = this.platforms[platform];
        if (!platformConfig) {
            console.warn(`Platform "${platform}" not supported`);
            return null;
        }

        const button = document.createElement('button');
        button.className = `share-button share-button--${platform}`;
        button.dataset.share = platform;
        button.dataset.description = content.description;
        button.dataset.image = content.image;

        // Add icon
        const icon = document.createElement('i');
        icon.className = `icon-${platformConfig.icon}`;
        button.appendChild(icon);

        // Add text if specified
        if (options.showText) {
            const text = document.createElement('span');
            text.textContent = platformConfig.name;
            button.appendChild(text);
        }

        // Add styles
        button.style.backgroundColor = platformConfig.color;
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.padding = '8px 16px';
        button.style.cursor = 'pointer';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.gap = '8px';
        button.style.transition = 'opacity 0.2s';

        button.addEventListener('mouseover', () => {
            button.style.opacity = '0.9';
        });

        button.addEventListener('mouseout', () => {
            button.style.opacity = '1';
        });

        // Add click handler
        button.addEventListener('click', () => {
            this.share(platform, content);
        });

        return button;
    }

    createShareButtons(content, options = {}) {
        const container = document.createElement('div');
        container.className = 'share-buttons';
        container.style.display = 'flex';
        container.style.gap = '8px';
        container.style.flexWrap = 'wrap';

        Object.keys(this.platforms).forEach(platform => {
            const button = this.createShareButton(platform, content, options);
            if (button) {
                container.appendChild(button);
            }
        });

        return container;
    }
}

// Initialize social sharing
const socialSharing = new SocialSharing();

// Export for use in other scripts
window.socialSharing = socialSharing; 