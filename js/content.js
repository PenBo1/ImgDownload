// 初始化状态
let sidebarInitialized = false;
let sidebar = null;
let toggleButton = null;

// 等待DOM完全加载
function waitForDOM() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
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

// 初始化函数
function initializeSidebar() {
    // 防止重复初始化
    if (sidebarInitialized) return;
    
    // 创建切换按钮
    function init() {
        try {
            toggleButton = createToggleButton();
            if (toggleButton) {
                toggleButton.addEventListener('click', toggleSidebar);
                sidebarInitialized = true;
            }
        } catch (error) {
            console.error('初始化失败:', error);
            // 如果失败，1秒后重试
            setTimeout(init, 1000);
        }
    }

    // 确保DOM加载完成后再初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}

// 切换侧边栏显示状态
function toggleSidebar() {
    if (!sidebar) {
        sidebar = createSidebar();
        setupEventListeners();
        loadImages();
        toggleButton.innerHTML = `
            <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
            <span class="toggle-text">收起</span>
        `;
        toggleButton.title = '收起图片下载助手';
    } else {
        const isVisible = !sidebar.classList.contains('collapsed');
        sidebar.classList.toggle('collapsed');
        toggleButton.innerHTML = `
            <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                ${isVisible ? 
                    '<path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>' :
                    '<path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>'}
            </svg>
            <span class="toggle-text">${isVisible ? '下载图片' : '收起'}</span>
        `;
        toggleButton.title = isVisible ? '打开图片下载助手' : '收起图片下载助手';
    }
}

// 创建打开按钮
function createToggleButton() {
    const button = document.createElement('div');
    button.id = 'image-downloader-toggle';
    button.innerHTML = `
        <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span class="toggle-text">下载图片</span>
    `;
    button.title = '打开图片下载助手';
    document.body.appendChild(button);
    return button;
}

// 创建侧边栏
function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'image-downloader-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h3>图片下载助手</h3>
            <div class="controls">
                <button class="toggle-btn" title="折叠/展开">◀</button>
                <button class="close-btn" title="关闭">×</button>
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

// 加载并显示图片
function loadImages() {
    const imageSet = new Set();
    const imagePromises = [];

    // 获取普通img标签的图片
    document.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.startsWith('http')) {
            imagePromises.push(new Promise((resolve) => {
                const imgObj = {
                    src: img.src,
                    alt: img.alt || '未命名图片',
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                };

                if (img.complete) {
                    resolve(imgObj);
                } else {
                    img.onload = () => {
                        imgObj.width = img.naturalWidth;
                        imgObj.height = img.naturalHeight;
                        resolve(imgObj);
                    };
                    img.onerror = () => resolve(null);
                }
            }));
        }
    });

    // 获取背景图片
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
            const url = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (url && url[1] && url[1].startsWith('http')) {
                imagePromises.push(new Promise((resolve) => {
                    const img = new Image();
                    img.src = url[1];
                    img.onload = () => {
                        resolve({
                            src: url[1],
                            alt: '背景图片',
                            width: img.naturalWidth,
                            height: img.naturalHeight
                        });
                    };
                    img.onerror = () => resolve(null);
                }));
            }
        }
    });

    // 处理所有图片加载
    Promise.all(imagePromises).then(images => {
        const uniqueImages = images
            .filter(img => img !== null && img.width >= 50 && img.height >= 50)
            .filter(img => !imageSet.has(img.src))
            .map(img => {
                imageSet.add(img.src);
                return img;
            });

        displayImages(uniqueImages);
    });
}

// 显示图片
function displayImages(images) {
    const grid = document.getElementById('image-grid');
    if (!grid) return;

    // 添加加载提示
    if (images.length === 0) {
        grid.innerHTML = `
            <div class="no-images">
                <svg width="48" height="48" viewBox="0 0 24 24">
                    <path fill="#999" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <span>未找到符合条件的图片</span>
            </div>
        `;
        return;
    }

    // 清空现有内容
    grid.innerHTML = '';

    // 创建加载进度显示
    const progressBar = document.createElement('div');
    progressBar.className = 'loading-progress';
    progressBar.innerHTML = '<span>正在加载图片...</span><div class="progress-bar"></div>';
    grid.appendChild(progressBar);

    // 批量加载图片
    let loadedCount = 0;
    const totalImages = images.length;

    // 使用 DocumentFragment 提高性能
    const fragment = document.createDocumentFragment();

    images.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        
        // 添加加载状态
        item.innerHTML = `
            <div class="image-preview">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                </div>
            </div>
            <div class="image-info">
                <span class="image-size">加载中...</span>
                <span class="image-name">加载中...</span>
            </div>
        `;
        
        fragment.appendChild(item);
        
        // 预加载图片
        const img = new Image();
        img.src = image.src;
        img.onload = () => {
            loadedCount++;
            updateProgress(loadedCount, totalImages);
            
            // 更新卡片内容
            item.innerHTML = `
                <div class="image-preview">
                    <img src="${image.src}" alt="${image.alt}" loading="lazy">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" data-index="${index}" data-url="${image.src}">
                        <span class="checkmark"></span>
                    </label>
                    <div class="image-overlay">
                        <button class="download-btn" title="下载此图片" data-url="${image.src}">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="image-info">
                    <div class="image-size">${img.naturalWidth} × ${img.naturalHeight}</div>
                    <div class="image-name" title="${image.alt}">${image.alt}</div>
                </div>
            `;
            
            fragment.appendChild(item);
            
            // 当所有图片都加载完成时
            if (loadedCount === totalImages) {
                grid.innerHTML = '';  // 清除进度条
                grid.appendChild(fragment);
                
                // 触发初始筛选以更新计数
                const event = new Event('change');
                document.querySelector('#size-filter')?.dispatchEvent(event);
            }
        };
        
        img.onerror = () => {
            loadedCount++;
            updateProgress(loadedCount, totalImages);
        };
    });

    function updateProgress(loaded, total) {
        const progress = (loaded / total) * 100;
        const progressBar = document.querySelector('.loading-progress .progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.parentElement.querySelector('span').textContent = 
                `正在加载图片... ${loaded}/${total}`;
        }
    }
}

// 设置事件监听器
function setupEventListeners() {
    if (!sidebar) return;

    // 折叠/展开侧边栏
    const toggleBtn = sidebar.querySelector('.toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            updateToggleButtonState(sidebar.classList.contains('collapsed'));
        });
    }

    // 关闭侧边栏
    const closeBtn = sidebar.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.remove();
            sidebar = null;
            sidebarInitialized = false;
            updateToggleButtonState(true);
        });
    }

    // 全选/取消全选
    const selectAllBtn = sidebar.querySelector('#select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = sidebar.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            selectAllBtn.textContent = allChecked ? '全选' : '取消全选';
        });
    }

    // 下载选中图片
    const downloadSelectedBtn = sidebar.querySelector('#download-selected-btn');
    if (downloadSelectedBtn) {
        downloadSelectedBtn.addEventListener('click', () => {
            const selectedUrls = Array.from(sidebar.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.dataset.url);
            if (selectedUrls.length === 0) {
                alert('请先选择要下载的图片！');
                return;
            }
            downloadImages(selectedUrls);
        });
    }

    // 下载全部图片
    const downloadAllBtn = sidebar.querySelector('#download-all-btn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', () => {
            const allUrls = Array.from(sidebar.querySelectorAll('input[type="checkbox"]'))
                .map(cb => cb.dataset.url);
            if (allUrls.length === 0) {
                alert('当前页面没有找到可下载的图片！');
                return;
            }
            if (confirm(`确定要下载全部 ${allUrls.length} 张图片吗？`)) {
                downloadImages(allUrls);
            }
        });
    }

    // 单个图片下载
    const imageGrid = sidebar.querySelector('#image-grid');
    if (imageGrid) {
        imageGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-btn')) {
                downloadImages([e.target.dataset.url]);
            }
        });
    }

    // 搜索和筛选
    const searchInput = sidebar.querySelector('#image-search');
    const sizeFilter = sidebar.querySelector('#size-filter');

    function filterImages() {
        const searchText = searchInput.value.toLowerCase();
        const sizeValue = sizeFilter.value;
        const items = sidebar.querySelectorAll('.image-item');
        let visibleCount = 0;
        
        items.forEach(item => {
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
            
            const showBySearch = img.alt.toLowerCase().includes(searchText) ||
                               img.src.toLowerCase().includes(searchText);
            
            const shouldShow = showBySize && showBySearch;
            item.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount++;
        });

        // 更新显示计数
        const countInfo = sidebar.querySelector('.image-count') || (() => {
            const el = document.createElement('div');
            el.className = 'image-count';
            sidebar.querySelector('.sidebar-toolbar').appendChild(el);
            return el;
        })();
        
        countInfo.textContent = `显示 ${visibleCount} 张图片`;
    }

    if (searchInput && sizeFilter) {
        searchInput.addEventListener('input', filterImages);
        sizeFilter.addEventListener('change', filterImages);
    }
}

// 下载图片
function downloadImages(urls) {
    urls.forEach(url => {
        chrome.runtime.sendMessage({
            type: 'downloadImage',
            url: url
        });
    });
}

// 初始化侧边栏
initializeSidebar();

// 添加右键菜单支持
document.addEventListener('contextmenu', (e) => {
    const img = e.target.closest('img');
    if (img) {
        chrome.runtime.sendMessage({
            type: 'showContextMenu',
            url: img.src
        });
    }
});
