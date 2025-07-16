// 后台脚本 - Service Worker
class ImgDownloadBackground {
    constructor() {
        this.init();
    }

    init() {
        // 监听插件安装
        chrome.runtime.onInstalled.addListener(() => {
            console.log('ImgDownload 插件已安装');
            this.createContextMenus();
        });

        // 监听下载完成
        chrome.downloads.onChanged.addListener((downloadDelta) => {
            if (downloadDelta.state && downloadDelta.state.current === 'complete') {
                this.onDownloadComplete(downloadDelta);
            }
        });

        // 监听来自 content script 的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
        });
    }

    createContextMenus() {
        // 创建右键菜单
        chrome.contextMenus.create({
            id: 'downloadImage',
            title: '使用 ImgDownload 下载图片',
            contexts: ['image']
        });

        chrome.contextMenus.create({
            id: 'downloadAllImages',
            title: '下载页面所有图片',
            contexts: ['page']
        });

        // 监听右键菜单点击
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }

    async handleContextMenuClick(info, tab) {
        if (info.menuItemId === 'downloadImage') {
            // 下载单张图片
            await this.downloadSingleImage(info.srcUrl);
        } else if (info.menuItemId === 'downloadAllImages') {
            // 下载所有图片
            await this.downloadAllImagesFromTab(tab.id);
        }
    }

    async downloadSingleImage(imageUrl) {
        try {
            const filename = this.generateFilename(imageUrl);
            await chrome.downloads.download({
                url: imageUrl,
                filename: `ImgDownload/${filename}`
            });
            
            this.showNotification('图片下载已开始', `正在下载: ${filename}`);
        } catch (error) {
            console.error('下载图片失败:', error);
            this.showNotification('下载失败', '无法下载该图片');
        }
    }

    async downloadAllImagesFromTab(tabId) {
        try {
            // 获取标签页信息
            const tab = await chrome.tabs.get(tabId);
            
            // 检查是否是特殊页面
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
                this.showNotification('无法下载', '无法在此页面下载图片');
                return;
            }
            
            // 先尝试注入内容脚本
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                
                // 等待脚本加载
                await this.delay(100);
            } catch (injectError) {
                console.log('内容脚本可能已经注入:', injectError.message);
            }
            
            const result = await chrome.tabs.sendMessage(tabId, {
                action: 'scanImages'
            });

            const images = result.images || [];
            if (images.length === 0) {
                this.showNotification('未找到图片', '当前页面没有可下载的图片');
                return;
            }

            // 批量下载
            let downloadCount = 0;
            for (const img of images) {
                try {
                    const filename = this.generateFilename(img.src);
                    await chrome.downloads.download({
                        url: img.src,
                        filename: `ImgDownload/${filename}`
                    });
                    downloadCount++;
                    
                    // 避免下载过快
                    await this.delay(200);
                } catch (error) {
                    console.error('下载图片失败:', img.src, error);
                }
            }

            this.showNotification(
                '批量下载完成', 
                `成功下载 ${downloadCount}/${images.length} 张图片`
            );

        } catch (error) {
            console.error('批量下载失败:', error);
            if (error.message.includes('Could not establish connection')) {
                this.showNotification('下载失败', '无法连接到页面，请刷新页面后重试');
            } else {
                this.showNotification('下载失败', '无法获取页面图片');
            }
        }
    }

    generateFilename(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            let filename = pathname.split('/').pop() || 'image';
            
            // 如果没有扩展名，添加默认扩展名
            if (!filename.includes('.')) {
                filename += '.jpg';
            }
            
            // 清理文件名中的特殊字符
            filename = filename.replace(/[<>:"/\\|?*]/g, '_');
            
            // 添加时间戳避免重名
            const timestamp = Date.now();
            const parts = filename.split('.');
            if (parts.length > 1) {
                const ext = parts.pop();
                const name = parts.join('.');
                filename = `${name}_${timestamp}.${ext}`;
            } else {
                filename = `${filename}_${timestamp}`;
            }
            
            return filename;
        } catch (error) {
            // 如果URL解析失败，使用时间戳作为文件名
            return `image_${Date.now()}.jpg`;
        }
    }

    onDownloadComplete(downloadDelta) {
        // 下载完成后的处理
        console.log('下载完成:', downloadDelta.id);
    }

    showNotification(title, message) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: title,
            message: message
        });
    }

    handleMessage(request, sender, sendResponse) {
        // 处理来自其他脚本的消息
        if (request.action === 'downloadImage') {
            this.downloadSingleImage(request.url).then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // 异步响应
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 初始化后台脚本
new ImgDownloadBackground();