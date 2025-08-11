// Auto-upload if image came from home page
window.addEventListener('DOMContentLoaded', () => {
  const storedImage = sessionStorage.getItem('uploadedImage');
  if (storedImage) {
    fetch(storedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'uploaded.png', { type: blob.type });
        handleFile(file); // Call your existing upload function
      });
    sessionStorage.removeItem('uploadedImage');
  }
});

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const spinner = document.getElementById('spinner');
const imageContainer = document.getElementById('image-container');
const originalImg = document.getElementById('original-img');
const processedImg = document.getElementById('processed-img');
const downloadDropdown = document.getElementById('download-dropdown');
const downloadMenu = document.getElementById('download-menu');
const downloadBtn = document.getElementById('download-btn');

// NEW: before/after toggle
const beforeLink = document.getElementById('before-link');
const afterLink = document.getElementById('after-link');
const toggleLinks = document.getElementById('toggle-links');

let originalImageSrc = "";
let processedImageSrc = "";

// Upload area interactions
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
  }
});

function handleFile(file) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    alert('Only PNG and JPG files allowed!');
    return;
  }
  if (file.size > 16 * 1024 * 1024) {
    alert('File too large (max 16MB)');
    return;
  }

  // Show spinner
  spinner.style.display = 'block';
  imageContainer.style.display = 'none';
  downloadDropdown.style.display = 'none';
  toggleLinks.style.display = 'none';
  processedImg.style.opacity = '0';

  // Reset animation
  originalImg.classList.remove('wipe-slide-out');

  // Read file locally for instant preview
  const reader = new FileReader();
  reader.onload = function (e) {
    originalImageSrc = e.target.result;
    originalImg.src = originalImageSrc;
    processedImg.src = '';
    processedImageSrc = '';
    imageContainer.style.display = 'block';
    toggleLinks.style.display = 'none'; // hide until processing finishes
  };
  reader.readAsDataURL(file);

  // Send file to server
  const formData = new FormData();
  formData.append('image', file);

  fetch('/process', {
    method: 'POST',
    body: formData,
  }).then(async res => {
    spinner.style.display = 'none';
    if (!res.ok) {
      const text = await res.text();
      alert('Error: ' + text);
      return;
    }
    return res.json();
  }).then(data => {
    if (!data) return;

    processedImageSrc = data.processed_high;
    processedImg.src = processedImageSrc;

    processedImg.onload = () => {
      processedImg.style.opacity = '1';

      // Run your original animation
      originalImg.classList.add('wipe-slide-out');

      // Enable download menu
      setupDownloadMenu(data.download_urls);
      downloadDropdown.style.display = 'inline-block';

      // Show toggle links AFTER animation
      setTimeout(() => {
        toggleLinks.style.display = 'block';
      }, 600); // matches your CSS animation duration
    };
  }).catch(e => {
    spinner.style.display = 'none';
    alert('Error: ' + e.message);
  });
}

// Setup the download dropdown menu items
function setupDownloadMenu(urls) {
  downloadMenu.innerHTML = `
    <a href="${urls.high_png}" download="background_removed_high.png">High Res PNG</a>
    <a href="${urls.low_png}" download="background_removed_low.png">Low Res PNG</a>
    <a href="${urls.high_jpg}" download="background_removed_high.jpg">High Res JPG</a>
    <a href="${urls.low_jpg}" download="background_removed_low.jpg">Low Res JPG</a>
  `;
}

// Dropdown toggle
downloadBtn.addEventListener('click', () => {
  downloadDropdown.classList.toggle('show');
});

window.addEventListener('click', (e) => {
  if (!downloadDropdown.contains(e.target)) {
    downloadDropdown.classList.remove('show');
  }
});



// Before/After toggle logic
function showBefore() {
  // Stop any animation and just show the original
  originalImg.classList.remove('wipe-slide-out');
  originalImg.style.display = 'block';
  processedImg.style.display = 'none';
}

function showAfter() {
  if (!processedImageSrc) {
    alert('Processed image not ready yet!');
    return;
  }
  // Just show the processed image without replaying animation
  processedImg.style.display = 'block';
  originalImg.style.display = 'none';
}

beforeLink.addEventListener('click', (e) => {
  e.preventDefault();
  showBefore();
});

afterLink.addEventListener('click', (e) => {
  e.preventDefault();
  showAfter();
});
