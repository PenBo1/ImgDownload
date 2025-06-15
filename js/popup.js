document.addEventListener('DOMContentLoaded', function() {
    // 获取当前标签页中的图片信息
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'getImages'}, function(response) {
            if (response && response.images) {
                displayImages(response.images);
            }
        });
    });

    // 绑定按钮事件
    document.getElementById('selectAll').addEventListener('click', toggleSelectAll);
    document.getElementById('downloadSelected').addEventListener('click', downloadSelected);
    document.getElementById('downloadAll').addEventListener('click', downloadAll);
    document.getElementById('search').addEventListener('input', filterImages);
    document.getElementById('sizeFilter').addEventListener('change', filterImages);
});

// 显示图片列表
function displayImages(images) {
    const imageList = document.getElementById('imageList');
    imageList.innerHTML = '';

    images.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox';
        checkbox.dataset.url = image.url;
        
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = `Image ${index + 1}`;
        
        const sizeInfo = document.createElement('div');
        sizeInfo.className = 'size-info';
        sizeInfo.textContent = `${image.width}x${image.height}`;
        
        item.appendChild(checkbox);
        item.appendChild(img);
        item.appendChild(sizeInfo);
        
        // 单击图片直接下载
        img.addEventListener('click', () => {
            chrome.downloads.download({
                url: image.url,
                filename: getFilename(image.url)
            });
        });
        
        imageList.appendChild(item);
    });
}

// 切换全选/取消全选
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

// 下载选中的图片
function downloadSelected() {
    const selectedImages = document.querySelectorAll('.checkbox:checked');
    selectedImages.forEach(checkbox => {
        chrome.downloads.download({
            url: checkbox.dataset.url,
            filename: getFilename(checkbox.dataset.url)
        });
    });
}

// 下载所有图片
function downloadAll() {
    const checkboxes = document.querySelectorAll('.checkbox');
    checkboxes.forEach(checkbox => {
        chrome.downloads.download({
            url: checkbox.dataset.url,
            filename: getFilename(checkbox.dataset.url)
        });
    });
}

// 过滤图片
function filterImages() {
    const searchText = document.getElementById('search').value.toLowerCase();
    const sizeFilter = document.getElementById('sizeFilter').value;
    const items = document.querySelectorAll('.image-item');
    
    items.forEach(item => {
        const img = item.querySelector('img');
        const sizeInfo = item.querySelector('.size-info').textContent;
        const [width, height] = sizeInfo.split('x').map(Number);
        
        let showBySize = true;
        if (sizeFilter === 'large') {
            showBySize = width >= 800 || height >= 800;
        } else if (sizeFilter === 'medium') {
            showBySize = (width >= 400 && width < 800) || (height >= 400 && height < 800);
        } else if (sizeFilter === 'small') {
            showBySize = width < 400 && height < 400;
        }
        
        const showBySearch = img.alt.toLowerCase().includes(searchText) || 
                           img.src.toLowerCase().includes(searchText);
        
        item.style.display = showBySize && showBySearch ? 'block' : 'none';
    });
}

// 从URL生成文件名
function getFilename(url) {
    const name = url.split('/').pop().split('#')[0].split('?')[0];
    return name || 'image.jpg';
}
