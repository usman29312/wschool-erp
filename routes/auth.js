const express = require('express');
const router = express.Router();
const { User, Teacher } = require('../models');
const { isAuthenticated } = require('./middleware');

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Please provide email, password, and role.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.role !== role) {
      return res.status(403).json({ error: `You do not have authorization to log in as ${role}.` });
    }

    // Set session details
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.userName = user.name;
    req.session.userEmail = user.email;

    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { user_id: user.id } });
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found for this user.' });
      }
      req.session.teacherId = teacher.id;
    }

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teacherId: req.session.teacherId || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// Logout Route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully.' });
  });
});

// Status check Route
router.get('/status', async (req, res) => {
  if (req.session && req.session.userId) {
    const user = await User.findByPk(req.session.userId, {
      attributes: ['id', 'name', 'email', 'role', 'recovery_email', 'recovery_email_verified', 'recovery_email_verified_at']
    });

    return res.json({
      loggedIn: true,
      user: {
        id: req.session.userId,
        name: user ? user.name : req.session.userName,
        email: user ? user.email : req.session.userEmail,
        role: req.session.role,
        recovery_email: user ? user.recovery_email : null,
        recovery_email_verified: user ? user.recovery_email_verified : false,
        recovery_email_verified_at: user ? user.recovery_email_verified_at : null,
        teacherId: req.session.teacherId || null
      }
    });
  }
  return res.json({ loggedIn: false });
});

// Profile & Account Security details Route
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: ['id', 'name', 'email', 'role', 'recovery_email', 'recovery_email_verified', 'recovery_email_verified_at', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const userJson = user.toJSON();
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { user_id: user.id } });
      if (teacher) {
        userJson.photo = teacher.photo || null;
      }
    }

    return res.json({ user: userJson });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile details.' });
  }
});

// Change Password Route
router.post('/change-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide current and new passwords.' });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await user.validPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    user.password = newPassword; // Hooks will hash it
    await user.save();

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ error: 'An error occurred while updating the password.' });
  }
});

// ====================================================
// RECOVERY EMAIL MANAGEMENT (AUTHENTICATED USER)
// ====================================================
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PasswordReset } = require('../models');
const { sendOtpEmail, sendRecoveryVerificationOtpEmail, sendRecoveryEmailChangedNotification } = require('../utils/mailer');

// 1. REQUEST RECOVERY EMAIL VERIFICATION OTP
router.post('/request-recovery-otp', isAuthenticated, async (req, res) => {
  try {
    const { newRecoveryEmail } = req.body;
    if (!newRecoveryEmail || !/\S+@\S+\.\S+/.test(newRecoveryEmail)) {
      return res.status(400).json({ error: 'Please enter a valid personal email address.' });
    }

    const cleanNewEmail = newRecoveryEmail.trim().toLowerCase();
    const user = await User.findByPk(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.email.toLowerCase() === cleanNewEmail) {
      return res.status(400).json({ error: 'Recovery email should be a separate personal email (e.g. Gmail), not your official login email.' });
    }

    // Rate limit check: 45 seconds
    const recentReset = await PasswordReset.findOne({
      where: {
        email: user.email.toLowerCase(),
        target_email: cleanNewEmail,
        purpose: 'recovery_verification',
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (recentReset && (Date.now() - new Date(recentReset.createdAt).getTime()) < 45000) {
      const waitSeconds = Math.ceil((45000 - (Date.now() - new Date(recentReset.createdAt).getTime())) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${waitSeconds} seconds before requesting another verification code.` 
      });
    }

    // Generate 6-digit OTP
    const otpNum = crypto.randomInt(100000, 999999);
    const otpStr = otpNum.toString();
    const otpHash = await bcrypt.hash(otpStr, 10);

    // Invalidate old unverified requests
    await PasswordReset.update(
      { used: true },
      { where: { email: user.email.toLowerCase(), purpose: 'recovery_verification', used: false } }
    );

    // Save record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await PasswordReset.create({
      email: user.email.toLowerCase(),
      target_email: cleanNewEmail,
      purpose: 'recovery_verification',
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false
    });

    // Send OTP to new recovery email
    await sendRecoveryVerificationOtpEmail(cleanNewEmail, otpStr);

    return res.json({ message: `Verification code sent to ${cleanNewEmail}. Please check your inbox.` });
  } catch (error) {
    console.error('Request recovery OTP error:', error);
    return res.status(500).json({ error: 'Failed to send verification code to recovery email.' });
  }
});

// 2. VERIFY RECOVERY EMAIL OTP
router.post('/verify-recovery-email', isAuthenticated, async (req, res) => {
  try {
    const { newRecoveryEmail, otp } = req.body;
    if (!newRecoveryEmail || !otp) {
      return res.status(400).json({ error: 'Recovery email and 6-digit verification code are required.' });
    }

    const cleanNewEmail = newRecoveryEmail.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const resetRecord = await PasswordReset.findOne({
      where: {
        email: user.email.toLowerCase(),
        target_email: cleanNewEmail,
        purpose: 'recovery_verification',
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!resetRecord || new Date() > new Date(resetRecord.expires_at)) {
      return res.status(400).json({ error: 'This verification code has expired. Please request a new code.' });
    }

    if (resetRecord.attempts >= 5) {
      return res.status(429).json({ error: 'Too many verification attempts. Please request a new code.' });
    }

    resetRecord.attempts += 1;
    await resetRecord.save();

    const isMatch = await bcrypt.compare(cleanOtp, resetRecord.otp_hash);
    if (!isMatch) {
      const remaining = 5 - resetRecord.attempts;
      if (remaining > 0) {
        return res.status(400).json({ error: `The verification code is incorrect. (${remaining} attempts remaining)` });
      } else {
        return res.status(429).json({ error: 'Too many verification attempts. Please request a new code.' });
      }
    }

    const oldEmail = (user.recovery_email && user.recovery_email_verified) ? user.recovery_email : null;

    // Set new verified recovery email
    user.recovery_email = cleanNewEmail;
    user.recovery_email_verified = true;
    user.recovery_email_verified_at = new Date();
    await user.save();

    resetRecord.used = true;
    await resetRecord.save();

    // If changing existing recovery email, notify old email
    if (oldEmail && oldEmail.toLowerCase() !== cleanNewEmail) {
      await sendRecoveryEmailChangedNotification(oldEmail, cleanNewEmail);
    }

    return res.json({ 
      message: 'Recovery email verified and saved successfully.',
      recovery_email: cleanNewEmail,
      recovery_email_verified: true
    });
  } catch (error) {
    console.error('Verify recovery email error:', error);
    return res.status(500).json({ error: 'Failed to verify recovery email.' });
  }
});


// ====================================================
// FORGOT PASSWORD & EMAIL OTP ENDPOINTS (USING VERIFIED RECOVERY EMAIL)
// ====================================================

// 1. REQUEST RESET OTP FOR OFFICIAL LOGIN EMAIL
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ where: { email: cleanEmail } });
    
    // Privacy & Security rule:
    // If account does NOT exist or has NO verified recovery email:
    if (!user) {
      // Simulate delay
      await new Promise(r => setTimeout(r, 200));
      return res.json({
        message: 'If an account exists with this email address, a verification code will be sent to its verified recovery email.'
      });
    }

    if (!user.recovery_email || !user.recovery_email_verified) {
      return res.status(400).json({ 
        error: 'No verified recovery email is configured for this account. Please contact the administrator to recover your account.' 
      });
    }

    // Rate limit check (45s)
    const recentReset = await PasswordReset.findOne({
      where: {
        email: cleanEmail,
        purpose: 'password_reset',
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (recentReset && (Date.now() - new Date(recentReset.createdAt).getTime()) < 45000) {
      const waitSeconds = Math.ceil((45000 - (Date.now() - new Date(recentReset.createdAt).getTime())) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${waitSeconds} seconds before requesting another verification code.` 
      });
    }

    // Generate 6-digit OTP
    const otpNum = crypto.randomInt(100000, 999999);
    const otpStr = otpNum.toString();
    const otpHash = await bcrypt.hash(otpStr, 10);

    // Invalidate old unexpired reset tokens
    await PasswordReset.update(
      { used: true },
      { where: { email: cleanEmail, purpose: 'password_reset', used: false } }
    );

    // Save record with target_email = user's verified recovery email
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await PasswordReset.create({
      email: cleanEmail,
      target_email: user.recovery_email.toLowerCase(),
      purpose: 'password_reset',
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false
    });

    // Send OTP to VERIFIED RECOVERY EMAIL (e.g. imran@gmail.com)
    await sendOtpEmail(user.recovery_email.toLowerCase(), otpStr);

    // Mask recovery email for helpful feedback while maintaining privacy
    const parts = user.recovery_email.split('@');
    const maskedRecovery = parts[0].substring(0, 2) + '***@' + parts[1];

    return res.json({
      message: `A verification code has been sent to your verified recovery email (${maskedRecovery}).`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: "We couldn't send the verification code right now. Please try again later." });
  }
});

// 2. VERIFY OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: 'The verification code must be a 6-digit number.' });
    }

    // Find active reset record
    const resetRecord = await PasswordReset.findOne({
      where: {
        email: cleanEmail,
        purpose: 'password_reset',
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!resetRecord || new Date() > new Date(resetRecord.expires_at)) {
      return res.status(400).json({ error: 'This verification code has expired. Please request a new code.' });
    }

    if (resetRecord.attempts >= 5) {
      return res.status(429).json({ error: 'Too many verification attempts. Please request a new code.' });
    }

    resetRecord.attempts += 1;
    await resetRecord.save();

    const isMatch = await bcrypt.compare(cleanOtp, resetRecord.otp_hash);
    if (!isMatch) {
      const remaining = 5 - resetRecord.attempts;
      if (remaining > 0) {
        return res.status(400).json({ error: `The verification code is incorrect. (${remaining} attempts remaining)` });
      } else {
        return res.status(429).json({ error: 'Too many verification attempts. Please request a new code.' });
      }
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    resetRecord.reset_token = resetToken;
    await resetRecord.save();

    return res.json({
      message: 'Verification code confirmed successfully.',
      resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify verification code.' });
  }
});

// 3. RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;
    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.' 
      });
    }

    const resetRecord = await PasswordReset.findOne({
      where: {
        email: cleanEmail,
        reset_token: resetToken,
        purpose: 'password_reset',
        used: false
      }
    });

    if (!resetRecord || new Date() > new Date(resetRecord.expires_at)) {
      return res.status(400).json({ error: 'Invalid or expired password reset session. Please request a new code.' });
    }

    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const isSamePassword = await user.validPassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password.' });
    }

    user.password = newPassword;
    await user.save();

    resetRecord.used = true;
    resetRecord.reset_token = null;
    await resetRecord.save();

    if (req.session) {
      req.session.destroy(() => {});
    }

    return res.json({ message: 'Your password has been successfully updated. You can now log in using your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'An error occurred while resetting your password.' });
  }
});

module.exports = router;
