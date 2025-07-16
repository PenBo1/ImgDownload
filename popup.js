class ImgDownloadPopup {
    constructor() {
        this.images = [];
        this.selectedImages = new Set();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
    }

    bindEvents() {
        document.getElementById('scanBtn').addEventListener('click', () => this.scanImages());
        document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadSelected());
        document.getElementById('sizeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('formatFilter').addEventListener('change', () => this.applyFilters());
    }

    async loadSettings() {
        const settings = await chrome.storage.sync.get({
            minSize: 200,
            format: 'all'
        });
        
        document.getElementById('sizeFilter').value = settings.minSize;
        document.getElementById('formatFilter').value = settings.format;
    }

    async saveSettings() {
        const settings = {
            minSize: parseInt(document.getElementById('sizeFilter').value),
            format: document.getElementById('formatFilter').value
        };
        
        await chrome.storage.sync.set(settings);
    }

    async scanImages() {
        this.showLoading(true);
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 检查是否是特殊页面（chrome://、chrome-extension://等）
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
                this.showEmptyState('无法在此页面扫描图片');
                return;
            }
            
            // 先尝试注入内容脚本
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                
                // 等待一小段时间确保脚本加载完成
                await this.delay(100);
            } catch (injectError) {
                console.log('内容脚本可能已经注入:', injectError.message);
            }
            
            // 发送消息获取图片
            const results = await chrome.tabs.sendMessage(tab.id, {
                action: 'scanImages'
            });
            
            this.images = results.images || [];
            this.applyFilters();
            
        } catch (error) {
            console.error('扫描图片失败:', error);
            if (error.message.includes('Could not establish connection')) {
                this.showEmptyState('无法连接到页面，请刷新页面后重试');
            } else if (error.message.includes('Cannot access')) {
                this.showEmptyState('无法访问此页面');
            } else {
                this.showEmptyState('扫描失败，请刷新页面后重试');
            }
        } finally {
            this.showLoading(false);
        }
    }

    applyFilters() {
        const minSize = parseInt(document.getElementById('sizeFilter').value);
        const format = document.getElementById('formatFilter').value;
        
        let filteredImages = this.images.filter(img => {
            // 尺寸过滤
            if (minSize > 0 && (img.width < minSize || img.height < minSize)) {
                return false;
            }
            
            // 格式过滤
            if (format !== 'all') {
                const formats = format.split(',');
                const imgFormat = this.getImageFormat(img.src);
                if (!formats.includes(imgFormat)) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.renderImages(filteredImages);
        this.saveSettings();
    }

    getImageFormat(src) {
        const url = new URL(src, window.location.href);
        const pathname = url.pathname.toLowerCase();
        
        if (pathname.includes('.jpg') || pathname.includes('.jpeg')) return 'jpg';
        if (pathname.includes('.png')) return 'png';
        if (pathname.includes('.gif')) return 'gif';
        if (pathname.includes('.webp')) return 'webp';
        
        return 'unknown';
    }

    renderImages(images) {
        const grid = document.getElementById('imageGrid');
        const emptyState = document.getElementById('emptyState');
        const imageCount = document.getElementById('imageCount');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        
        imageCount.textContent = images.length;
        
        if (images.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            downloadAllBtn.disabled = true;
            return;
        }
        
        emptyState.classList.add('hidden');
        downloadAllBtn.disabled = false;
        
        grid.innerHTML = images.map((img, index) => `
            <div class="image-item" data-index="${index}">
                <img src="${img.src}" alt="" loading="lazy">
                <div class="overlay">
                    <button class="download-btn" data-src="${img.src}">下载</button>
                </div>
                <div class="image-info">
                    ${img.width}×${img.height}
                </div>
            </div>
        `).join('');
        
        // 绑定图片点击事件
        grid.querySelectorAll('.image-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('download-btn')) {
                    e.stopPropagation();
                    this.downloadImage(e.target.dataset.src);
                    return;
                }
                
                const index = parseInt(item.dataset.index);
                this.toggleImageSelection(index, item);
            });
        });
    }

    toggleImageSelection(index, element) {
        if (this.selectedImages.has(index)) {
            this.selectedImages.delete(index);
            element.classList.remove('selected');
        } else {
            this.selectedImages.add(index);
            element.classList.add('selected');
        }
        
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        downloadAllBtn.textContent = this.selectedImages.size > 0 
            ? `下载选中 (${this.selectedImages.size})` 
            : '下载全部';
    }

    async downloadSelected() {
        const imagesToDownload = this.selectedImages.size > 0 
            ? Array.from(this.selectedImages).map(index => this.images[index])
            : this.getFilteredImages();
        
        if (imagesToDownload.length === 0) return;
        
        for (const img of imagesToDownload) {
            await this.downloadImage(img.src);
            await this.delay(100); // 避免下载过快
        }
        
        this.showNotification(`成功下载 ${imagesToDownload.length} 张图片`);
    }

    async downloadImage(src) {
        try {
            const filename = this.generateFilename(src);
            await chrome.downloads.download({
                url: src,
                filename: `ImgDownload/${filename}`
            });
        } catch (error) {
            console.error('下载失败:', error);
        }
    }

    generateFilename(src) {
        const url = new URL(src, window.location.href);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop() || 'image';
        
        // 如果没有扩展名，根据URL猜测
        if (!filename.includes('.')) {
            const format = this.getImageFormat(src);
            return `${filename}.${format === 'unknown' ? 'jpg' : format}`;
        }
        
        return filename;
    }

    getFilteredImages() {
        const minSize = parseInt(document.getElementById('sizeFilter').value);
        const format = document.getElementById('formatFilter').value;
        
        return this.images.filter(img => {
            if (minSize > 0 && (img.width < minSize || img.height < minSize)) {
                return false;
            }
            
            if (format !== 'all') {
                const formats = format.split(',');
                const imgFormat = this.getImageFormat(img.src);
                if (!formats.includes(imgFormat)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    showLoading(show) {
        const loading = document.getElementById('loadingSpinner');
        const grid = document.getElementById('imageGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (show) {
            loading.classList.remove('hidden');
            grid.classList.add('hidden');
            emptyState.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
            grid.classList.remove('hidden');
        }
    }

    showEmptyState(message) {
        const emptyState = document.getElementById('emptyState');
        const grid = document.getElementById('imageGrid');
        
        emptyState.querySelector('p').textContent = message;
        emptyState.classList.remove('hidden');
        grid.classList.add('hidden');
    }

    showNotification(message) {
        // 简单的通知实现
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #51cf66;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new ImgDownloadPopup();
});