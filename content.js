class ImageScanner {
    constructor() {
        this.scannedImages = new Map();
    }

    async scanImages() {
        const images = [];
        const imageElements = document.querySelectorAll('img');
        const backgroundImages = this.findBackgroundImages();
        
        // 扫描 img 标签
        for (const img of imageElements) {
            const imageData = await this.processImage(img);
            if (imageData) {
                images.push(imageData);
            }
        }
        
        // 扫描背景图片
        for (const bgImg of backgroundImages) {
            images.push(bgImg);
        }
        
        // 去重
        const uniqueImages = this.removeDuplicates(images);
        
        return { images: uniqueImages };
    }

    async processImage(imgElement) {
        try {
            const src = this.getImageSrc(imgElement);
            if (!src || !this.isValidImageUrl(src)) {
                return null;
            }

            // 如果已经处理过这个图片，直接返回缓存结果
            if (this.scannedImages.has(src)) {
                return this.scannedImages.get(src);
            }

            const dimensions = await this.getImageDimensions(imgElement, src);
            if (!dimensions) {
                return null;
            }

            const imageData = {
                src: src,
                width: dimensions.width,
                height: dimensions.height,
                alt: imgElement.alt || '',
                title: imgElement.title || ''
            };

            this.scannedImages.set(src, imageData);
            return imageData;
            
        } catch (error) {
            console.error('处理图片失败:', error);
            return null;
        }
    }

    getImageSrc(imgElement) {
        // 优先使用 src，然后是 data-src（懒加载），最后是 data-original
        return imgElement.src || 
               imgElement.dataset.src || 
               imgElement.dataset.original ||
               imgElement.getAttribute('data-lazy-src');
    }

    isValidImageUrl(url) {
        if (!url) return false;
        
        // 排除 base64 图片（太小的通常是图标）
        if (url.startsWith('data:image/')) {
            return url.length > 1000; // 只保留较大的 base64 图片
        }
        
        // 排除 SVG（通常是图标）
        if (url.toLowerCase().includes('.svg')) {
            return false;
        }
        
        // 排除明显的图标路径
        const iconPatterns = [
            '/icon', '/favicon', '/logo', '/sprite',
            'icon.', 'favicon.', 'logo.', 'sprite.'
        ];
        
        const lowerUrl = url.toLowerCase();
        if (iconPatterns.some(pattern => lowerUrl.includes(pattern))) {
            return false;
        }
        
        return true;
    }

    async getImageDimensions(imgElement, src) {
        return new Promise((resolve) => {
            // 如果图片已经加载，直接获取尺寸
            if (imgElement.complete && imgElement.naturalWidth > 0) {
                resolve({
                    width: imgElement.naturalWidth,
                    height: imgElement.naturalHeight
                });
                return;
            }

            // 创建新的图片对象来获取真实尺寸
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            
            img.onerror = () => {
                resolve(null);
            };
            
            // 设置超时
            setTimeout(() => {
                resolve(null);
            }, 5000);
            
            img.src = src;
        });
    }

    findBackgroundImages() {
        const backgroundImages = [];
        const elements = document.querySelectorAll('*');
        
        elements.forEach(element => {
            const style = window.getComputedStyle(element);
            const backgroundImage = style.backgroundImage;
            
            if (backgroundImage && backgroundImage !== 'none') {
                const matches = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
                if (matches) {
                    matches.forEach(match => {
                        const url = match.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
                        if (this.isValidImageUrl(url)) {
                            backgroundImages.push({
                                src: url,
                                width: element.offsetWidth || 0,
                                height: element.offsetHeight || 0,
                                alt: '',
                                title: 'Background Image'
                            });
                        }
                    });
                }
            }
        });
        
        return backgroundImages;
    }

    removeDuplicates(images) {
        const seen = new Set();
        return images.filter(img => {
            if (seen.has(img.src)) {
                return false;
            }
            seen.add(img.src);
            return true;
        });
    }
}

// 防止重复注入
if (typeof window.imgDownloadInjected === 'undefined') {
    window.imgDownloadInjected = true;
    
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'scanImages') {
            const scanner = new ImageScanner();
            scanner.scanImages().then(result => {
                sendResponse(result);
            }).catch(error => {
                console.error('扫描图片失败:', error);
                sendResponse({ images: [], error: error.message });
            });
            
            // 返回 true 表示异步响应
            return true;
        }
    });
    
    console.log('ImgDownload content script loaded');
}