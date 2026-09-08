document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  const loginBtn = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  // Check login status on page load (Redirect if already logged in)
  fetch('/api/auth/status')
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn) {
        if (data.user.role === 'admin') {
          window.location.href = '/admin.html';
        } else if (data.user.role === 'teacher') {
          window.location.href = '/teacher.html';
        }
      }
    })
    .catch(err => console.error('Status check failed:', err));

  // Handle Login form submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset alert
    errorAlert.classList.add('d-none');
    
    const emailPrefix = document.getElementById('email').value.trim();
    const email = emailPrefix.includes('@') ? emailPrefix : emailPrefix + '@waseem.edu.pk';
    const password = document.getElementById('password').value;
    const roleInput = document.querySelector('input[name="role"]:checked');
    const role = roleInput ? roleInput.value : '';

    if (!email || !password || !role) {
      showError('Please fill out all credentials.');
      return;
    }

    // Enter loading state
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check your details.');
      }

      // Success - Redirect based on role
      if (data.user.role === 'admin') {
        window.location.href = '/admin.html';
      } else if (data.user.role === 'teacher') {
        window.location.href = '/teacher.html';
      }

    } catch (err) {
      showError(err.message);
      setLoading(false);
    }
  });

  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('d-none');
  }

  function setLoading(isLoading) {
    if (isLoading) {
      loginBtn.disabled = true;
      btnText.classList.add('d-none');
      btnSpinner.classList.remove('d-none');
    } else {
      loginBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  }

  // Toggle Password Visibility
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');

  if (togglePassword && passwordInput && togglePasswordIcon) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Toggle eye icon
      if (type === 'password') {
        togglePasswordIcon.classList.remove('fa-eye-slash');
        togglePasswordIcon.classList.add('fa-eye');
      } else {
        togglePasswordIcon.classList.remove('fa-eye');
        togglePasswordIcon.classList.add('fa-eye-slash');
      }
    });
  }
});
