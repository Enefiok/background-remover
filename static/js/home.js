// home.js
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');

uploadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];

    // Validate type
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Only PNG and JPG files allowed!');
      return;
    }
    // Validate size
    if (file.size > 16 * 1024 * 1024) {
      alert('File too large (max 16MB)');
      return;
    }

    // Convert file to base64 and store in sessionStorage
    const reader = new FileReader();
    reader.onload = function (e) {
      sessionStorage.setItem('uploadedImage', e.target.result);
      window.location.href = '/upload'; // Go to editor
    };
    reader.readAsDataURL(file);
  }
});

document.querySelector('.btn-secondary').addEventListener('click', function () {
    alert("This app is still under development. Login is not currently available.");
  });

  document.querySelector('.btn-primary').addEventListener('click', function () {
    alert("This app is still under development. Sign up is not currently available.");
  });