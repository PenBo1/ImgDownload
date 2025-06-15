// 初始化状态
let sidebarInitialized = false;
let sidebar = null;
let toggleButton = null;

// 等待DOM准备完成
function waitForDOM() {
    return new Promise((resolve) => {
        if (document.body) {
            resolve();
        } else {
            const observer = new MutationObserver((mutations, obs) => {
                if (document.body) {
                    obs.disconnect();
                    resolve();
                }
            });
            
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    });
}

// 创建打开按钮
function createToggleButton() {
    const button = document.createElement('div');
    button.id = 'image-downloader-toggle';
    button.innerHTML = `
        <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M4 18h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zm0-5h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zM3 7c0 .55.45 1 1 1h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1z"/>
        </svg>
        <span class="toggle-text">图片下载</span>
    `;
    button.title = '打开图片下载助手';
    document.body.appendChild(button);
    return button;
}

// 更新切换按钮状态
function updateToggleButtonState(isCollapsed) {
    if (!toggleButton) return;
    
    toggleButton.innerHTML = `
        <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            ${isCollapsed ? 
                '<path fill="currentColor" d="M4 18h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zm0-5h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zM3 7c0 .55.45 1 1 1h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1z"/>' : 
                '<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>'}
        </svg>
        <span class="toggle-text">图片下载</span>
    `;
    toggleButton.title = isCollapsed ? '打开图片下载助手' : '收起图片下载助手';
}

// 创建侧边栏
function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'image-downloader-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h3>图片下载助手</h3>
            <div class="controls">
                <button class="toggle-btn">◀</button>
            </div>
        </div>
        <div class="sidebar-toolbar">
            <div class="action-buttons">
                <button id="select-all-btn" class="btn">全选</button>
                <button id="download-selected-btn" class="btn primary">下载选中</button>
                <button id="download-all-btn" class="btn success">下载全部</button>
            </div>
            <div class="search-box">
                <input type="text" id="image-search" placeholder="搜索图片...">
                <select id="size-filter">
                    <option value="all">所有尺寸</option>
                    <option value="large">大图 (>800px)</option>
                    <option value="medium">中图 (400-800px)</option>
                    <option value="small">小图 (<400px)</option>
                </select>
            </div>
        </div>
        <div id="image-grid"></div>
    `;
    document.body.appendChild(sidebar);
    return sidebar;
}

// 收集所有图片信息
async function collectImages() {
    const images = new Set();
    const seenUrls = new Set();

    // 收集img标签图片
    Array.from(document.images).forEach(img => {
        if (img.src && img.src.startsWith('http') && !seenUrls.has(img.src)) {
            const rect = img.getBoundingClientRect();
            if (rect.width >= 50 && rect.height >= 50) {
                seenUrls.add(img.src);
                images.add({
                    src: img.src,
                    alt: img.alt || '未命名图片',
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                });
            }
        }
    });

    // 收集背景图片
    const promises = [];
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
            const url = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (url && url[1] && url[1].startsWith('http') && !seenUrls.has(url[1])) {
                const rect = el.getBoundingClientRect();
                if (rect.width >= 50 && rect.height >= 50) {
                    seenUrls.add(url[1]);
                    promises.push(new Promise(resolve => {
                        const img = new Image();
                        img.onload = () => {
                            images.add({
                                src: url[1],
                                alt: '背景图片',
                                width: img.naturalWidth,
                                height: img.naturalHeight
                            });
                            resolve();
                        };
                        img.onerror = resolve;
                        img.src = url[1];
                    }));
                }
            }
        }
    });

    await Promise.all(promises);
    return Array.from(images);
}

// 加载并显示图片
async function loadImages() {
    if (!sidebar) return;
    
    const grid = sidebar.querySelector('#image-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">正在加载图片...</div>';
    const images = await collectImages();
    displayImages(images);
}

// 显示图片
function displayImages(images) {
    if (!sidebar) return;
    
    const grid = sidebar.querySelector('#image-grid');
    if (!grid) return;

    grid.innerHTML = images.length ? '' : '<div class="no-images">未找到图片</div>';

    images.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.innerHTML = `
            <div class="image-preview">
                <img src="${image.src}" alt="${image.alt}" loading="lazy">
                <label class="checkbox-wrapper">
                    <input type="checkbox" data-url="${image.src}">
                    <span class="checkmark"></span>
                </label>
                <div class="image-overlay">
                    <button class="download-btn" data-url="${image.src}">下载</button>
                </div>
            </div>
            <div class="image-info">
                <span class="image-size">${image.width} × ${image.height}</span>
                <span class="image-name">${image.alt}</span>
            </div>
        `;
        grid.appendChild(item);
    });
}

// 设置事件监听器
function setupEventListeners() {
    if (!sidebar) return;

    // 折叠/展开侧边栏
    const toggleBtn = sidebar.querySelector('.toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = !sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed');
            updateToggleButtonState(isCollapsed);
        });
    }

    // 全选/取消全选
    const selectAllBtn = sidebar.querySelector('#select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = sidebar.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
        });
    }

    // 下载选中图片
    const downloadSelectedBtn = sidebar.querySelector('#download-selected-btn');
    if (downloadSelectedBtn) {
        downloadSelectedBtn.addEventListener('click', () => {
            const selectedUrls = Array.from(sidebar.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.dataset.url);
            downloadImages(selectedUrls);
        });
    }

    // 下载全部图片
    const downloadAllBtn = sidebar.querySelector('#download-all-btn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', () => {
            const allUrls = Array.from(sidebar.querySelectorAll('input[type="checkbox"]'))
                .map(cb => cb.dataset.url);
            downloadImages(allUrls);
        });
    }

    // 单个图片下载
    sidebar.addEventListener('click', (e) => {
        if (e.target.classList.contains('download-btn')) {
            downloadImages([e.target.dataset.url]);
        }
    });

    // 搜索和筛选
    const searchInput = sidebar.querySelector('#image-search');
    const sizeFilter = sidebar.querySelector('#size-filter');

    if (searchInput && sizeFilter) {
        const filterImages = () => {
            const searchText = searchInput.value.toLowerCase();
            const sizeValue = sizeFilter.value;
            
            sidebar.querySelectorAll('.image-item').forEach(item => {
                const img = item.querySelector('img');
                const size = item.querySelector('.image-size').textContent;
                const [width, height] = size.split('×').map(s => parseInt(s.trim()));
                
                let showBySize = true;
                if (sizeValue === 'large') {
                    showBySize = width >= 800 || height >= 800;
                } else if (sizeValue === 'medium') {
                    showBySize = (width >= 400 && width < 800) || (height >= 400 && height < 800);
                } else if (sizeValue === 'small') {
                    showBySize = width < 400 && height < 400;
                }
                
                const showBySearch = (img.alt && img.alt.toLowerCase().includes(searchText)) ||
                                   (img.src && img.src.toLowerCase().includes(searchText));
                
                item.style.display = showBySize && showBySearch ? 'block' : 'none';
            });
        };

        searchInput.addEventListener('input', filterImages);
        sizeFilter.addEventListener('change', filterImages);
    }
}

// 切换侧边栏显示状态
async function toggleSidebar() {
    try {
        if (!sidebar) {
            sidebar = createSidebar();
            if (sidebar) {
                setupEventListeners();
                await loadImages();
                updateToggleButtonState(false);
            }
        } else {
            const isCollapsed = !sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed');
            updateToggleButtonState(isCollapsed);
        }
    } catch (error) {
        console.error('切换侧边栏失败:', error);
    }
}

// 下载图片
function downloadImages(urls) {
    if (!urls || !urls.length) return;
    
    urls.forEach(url => {
        if (url && url.startsWith('http')) {
            chrome.runtime.sendMessage({
                type: 'downloadImage',
                url: url
            });
        }
    });
}

// 初始化
async function init() {
    try {
        // 等待DOM准备完成
        await waitForDOM();
        
        // 创建打开按钮
        if (!toggleButton) {
            toggleButton = createToggleButton();
            if (toggleButton) {
                toggleButton.addEventListener('click', toggleSidebar);
                sidebarInitialized = true;
            }
        }
    } catch (error) {
        console.error('初始化失败:', error);
        // 如果失败，1秒后重试
        setTimeout(init, 1000);
    }
}

// 启动初始化
init();

// 添加右键菜单支持
document.addEventListener('contextmenu', (e) => {
    const img = e.target.closest('img');
    if (img && img.src && img.src.startsWith('http')) {
        chrome.runtime.sendMessage({
            type: 'showContextMenu',
            url: img.src
        });
    }
});
