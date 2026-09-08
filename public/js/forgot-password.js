document.addEventListener('DOMContentLoaded', () => {
  // State variables
  let userEmail = '';
  let resetToken = '';
  let countdownInterval = null;

  // DOM Elements
  const statusAlert = document.getElementById('statusAlert');
  const statusMessage = document.getElementById('statusMessage');

  // Steps
  const stepRequestOtp = document.getElementById('stepRequestOtp');
  const stepVerifyOtp = document.getElementById('stepVerifyOtp');
  const stepNewPassword = document.getElementById('stepNewPassword');
  const stepSuccess = document.getElementById('stepSuccess');

  // Step 1 Elements
  const formRequestOtp = document.getElementById('formRequestOtp');
  const emailInput = document.getElementById('emailInput');
  const btnSendOtp = document.getElementById('btnSendOtp');
  const btnSendOtpText = document.getElementById('btnSendOtpText');
  const btnSendOtpSpinner = document.getElementById('btnSendOtpSpinner');

  // Step 2 Elements
  const formVerifyOtp = document.getElementById('formVerifyOtp');
  const otpInput = document.getElementById('otpInput');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const btnVerifyOtp = document.getElementById('btnVerifyOtp');
  const btnVerifyText = document.getElementById('btnVerifyText');
  const btnVerifySpinner = document.getElementById('btnVerifySpinner');
  const timerText = document.getElementById('timerText');
  const timerCountdown = document.getElementById('timerCountdown');
  const btnResendOtp = document.getElementById('btnResendOtp');
  const linkBackToEmail = document.getElementById('linkBackToEmail');

  // Step 3 Elements
  const formNewPassword = document.getElementById('formNewPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const btnResetPassword = document.getElementById('btnResetPassword');
  const btnResetText = document.getElementById('btnResetText');
  const btnResetSpinner = document.getElementById('btnResetSpinner');
  const strengthBar = document.getElementById('strengthBar');

  // Helper: Show Alert
  function showAlert(msg, type = 'danger') {
    statusAlert.className = `alert alert-${type} text-start alert-dismissible fade show`;
    statusMessage.innerHTML = `<i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-check'} me-2"></i>${msg}`;
    statusAlert.classList.remove('d-none');
  }

  function hideAlert() {
    statusAlert.classList.add('d-none');
  }

  // Helper: Switch Active Step View
  function showStep(stepToShow) {
    hideAlert();
    [stepRequestOtp, stepVerifyOtp, stepNewPassword, stepSuccess].forEach(step => {
      step.classList.add('d-none');
    });
    stepToShow.classList.remove('d-none');
  }

  // Helper: Start Resend Countdown Timer (45 seconds)
  function startResendTimer(durationSeconds = 45) {
    clearInterval(countdownInterval);
    let remaining = durationSeconds;
    
    timerText.classList.remove('d-none');
    btnResendOtp.classList.add('d-none');

    function updateDisplay() {
      const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
      const secs = String(remaining % 60).padStart(2, '0');
      timerCountdown.textContent = `${mins}:${secs}`;
    }

    updateDisplay();

    countdownInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        timerText.classList.add('d-none');
        btnResendOtp.classList.remove('d-none');
      } else {
        updateDisplay();
      }
    }, 1000);
  }

  // ====================================================
  // STEP 1: REQUEST OTP
  // ====================================================
  formRequestOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const emailPrefix = emailInput.value.trim();
    const email = emailPrefix.includes('@') ? emailPrefix : emailPrefix + '@waseem.edu.pk';
    if (!emailPrefix) {
      showAlert('Please enter your email username.');
      return;
    }

    userEmail = email;

    // Loading UI
    btnSendOtp.disabled = true;
    btnSendOtpText.classList.add('d-none');
    btnSendOtpSpinner.classList.remove('d-none');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Move to Step 2: Verify OTP
      userEmailDisplay.textContent = userEmail;
      showStep(stepVerifyOtp);
      showAlert(data.message, 'success');
      startResendTimer(45);
      otpInput.focus();

    } catch (err) {
      showAlert(err.message);
    } finally {
      btnSendOtp.disabled = false;
      btnSendOtpText.classList.remove('d-none');
      btnSendOtpSpinner.classList.add('d-none');
    }
  });

  // Resend OTP Click Handler
  btnResendOtp.addEventListener('click', async () => {
    hideAlert();
    btnResendOtp.classList.add('d-none');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('A new 6-digit verification code has been sent to your email.', 'success');
      startResendTimer(45);
      otpInput.value = '';
      otpInput.focus();

    } catch (err) {
      showAlert(err.message);
      btnResendOtp.classList.remove('d-none');
    }
  });

  // Change Email Link Click Handler
  linkBackToEmail.addEventListener('click', (e) => {
    e.preventDefault();
    clearInterval(countdownInterval);
    showStep(stepRequestOtp);
  });

  // Enforce numbers only on OTP Input
  otpInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  // ====================================================
  // STEP 2: VERIFY OTP
  // ====================================================
  formVerifyOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const otp = otpInput.value.trim();
    if (!otp || otp.length !== 6) {
      showAlert('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    // Loading UI
    btnVerifyOtp.disabled = true;
    btnVerifyText.classList.add('d-none');
    btnVerifySpinner.classList.remove('d-none');

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Store temporary reset token
      resetToken = data.resetToken;

      // Move to Step 3: New Password
      clearInterval(countdownInterval);
      showStep(stepNewPassword);
      showAlert(data.message, 'success');
      newPassword.focus();

    } catch (err) {
      showAlert(err.message);
    } finally {
      btnVerifyOtp.disabled = false;
      btnVerifyText.classList.remove('d-none');
      btnVerifySpinner.classList.add('d-none');
    }
  });

  // ====================================================
  // STEP 3: LIVE PASSWORD VALIDATION & STRENGTH METER
  // ====================================================
  const reqMinChar = document.getElementById('reqMinChar');
  const reqUpper = document.getElementById('reqUpper');
  const reqLower = document.getElementById('reqLower');
  const reqNumber = document.getElementById('reqNumber');
  const reqSpecial = document.getElementById('reqSpecial');

  function updatePasswordChecklist(pwd) {
    const minChar = pwd.length >= 8;
    const upper = /[A-Z]/.test(pwd);
    const lower = /[a-z]/.test(pwd);
    const number = /[0-9]/.test(pwd);
    const special = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

    function toggleReq(el, isValid) {
      if (isValid) {
        el.classList.add('valid');
        el.querySelector('i').className = 'fa-solid fa-circle-check me-1';
      } else {
        el.classList.remove('valid');
        el.querySelector('i').className = 'fa-solid fa-circle me-1';
      }
    }

    toggleReq(reqMinChar, minChar);
    toggleReq(reqUpper, upper);
    toggleReq(reqLower, lower);
    toggleReq(reqNumber, number);
    toggleReq(reqSpecial, special);

    // Calculate strength bar
    let score = 0;
    if (minChar) score += 20;
    if (upper) score += 20;
    if (lower) score += 20;
    if (number) score += 20;
    if (special) score += 20;

    strengthBar.style.width = `${score}%`;
    if (score <= 40) {
      strengthBar.className = 'progress-bar bg-danger';
    } else if (score <= 80) {
      strengthBar.className = 'progress-bar bg-warning';
    } else {
      strengthBar.className = 'progress-bar bg-success';
    }

    return score === 100;
  }

  newPassword.addEventListener('input', () => {
    updatePasswordChecklist(newPassword.value);
  });

  // Password Visibility Eye Toggles
  function setupEyeToggle(toggleBtnId, inputId, iconId) {
    const btn = document.getElementById(toggleBtnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (btn && input && icon) {
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      });
    }
  }

  setupEyeToggle('toggleNewPassword', 'newPassword', 'toggleNewIcon');
  setupEyeToggle('toggleConfirmPassword', 'confirmPassword', 'toggleConfirmIcon');

  // Submit Reset Password
  formNewPassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const pwd = newPassword.value;
    const confirmPwd = confirmPassword.value;

    if (!pwd || !confirmPwd) {
      showAlert('Please enter and confirm your new password.');
      return;
    }

    if (pwd !== confirmPwd) {
      showAlert('Passwords do not match.');
      return;
    }

    const isValid = updatePasswordChecklist(pwd);
    if (!isValid) {
      showAlert('Please make sure your password meets all security criteria.');
      return;
    }

    // Loading UI
    btnResetPassword.disabled = true;
    btnResetText.classList.add('d-none');
    btnResetSpinner.classList.remove('d-none');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          resetToken,
          newPassword: pwd,
          confirmPassword: confirmPwd
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Step 4: Success View
      showStep(stepSuccess);

    } catch (err) {
      showAlert(err.message);
    } finally {
      btnResetPassword.disabled = false;
      btnResetText.classList.remove('d-none');
      btnResetSpinner.classList.add('d-none');
    }
  });
});
