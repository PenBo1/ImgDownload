// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'downloadAllImages',
        title: '下载所有图片',
        contexts: ['page']
    });
});

// 下载图片函数
function downloadImage(url) {
    // 从URL获取文件名
    const filename = url.split('/').pop().split('#')[0].split('?')[0] || 'image.jpg';
    
    // 使用chrome.downloads API下载图片
    chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
        }
    });
}

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'downloadAllImages') {
        // 在当前标签页执行脚本获取所有图片
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                const seenUrls = new Set(); // 用于去重
                const images = Array.from(document.images)
                    .filter(img => {
                        const rect = img.getBoundingClientRect();
                        return rect.width >= 50 && rect.height >= 50;
                    })
                    .filter(img => {
                        if (seenUrls.has(img.src)) return false;
                        seenUrls.add(img.src);
                        return true;
                    })
                    .map(img => img.src);
                return images;
            }
        }).then(results => {
            if (results && results[0] && results[0].result) {
                const images = results[0].result;
                images.forEach(url => downloadImage(url));
            }
        });
    }
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'downloadImage') {
        downloadImage(request.url);
    } else if (request.type === 'showContextMenu') {
        // 处理右键菜单相关逻辑
    }
});

// 获取页面上所有合格的图片
function getAllImages() {
    const images = Array.from(document.images);
    return images.filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width >= 100 && rect.height >= 100;
    }).map(img => ({
        url: img.src,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        alt: img.alt
    }));
}
