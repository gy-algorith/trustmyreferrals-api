// Authentication Functions
const API_BASE = 'http://192.168.0.204:3000/api/v1';
let currentToken = localStorage.getItem('auth_token');

// Store verification IDs
let referrerVerificationId = null;
let candidateVerificationId = null;

// Utility Functions
function showResponse(elementId, data, isError = false) {
    const element = $(`#${elementId}`);
    element.removeClass('error success');
    element.addClass(isError ? 'error' : 'success');
    element.text(JSON.stringify(data, null, 2));
    element.show();
}

function showTokenSection() {
    $('#tokenContainer').show();
    $('#protectedContainer').show();
    $('#referralLinkContainer').show();
    $('#verificationContainer').show();
    updateTokenDisplay();
}

function updateTokenDisplay() {
    $('#tokenDisplay').text(currentToken || 'No token');
}

function clearToken() {
    currentToken = null;
    localStorage.removeItem('auth_token');
    $('#tokenContainer').hide();
    $('#protectedContainer').hide();
    $('#referralLinkContainer').hide();
    $('#verificationContainer').hide();
    $('#tokenDisplay').text('');
}

// Referrer Email Verification
async function sendReferrerVerification() {
    const email = $('#refEmail').val();
    
    if (!email) {
        alert('Please enter email address');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/email/send-verification`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email })
        });

        if (response.success && response.data && response.data.verificationId) {
            referrerVerificationId = response.data.verificationId;
            $('#refVerificationStatus').removeClass('verification-pending verification-error').addClass('verification-success');
            $('#refVerificationStatus').text('Verification code sent! Check your email. ID: ' + referrerVerificationId);
            $('#refVerificationStatus').show();
            $('#refVerificationForm').show();
            
            showResponse('referrerResponse', response);
        } else {
            throw new Error('No verification ID received from server');
        }
    } catch (error) {
        $('#refVerificationStatus').removeClass('verification-pending verification-success').addClass('verification-error');
        $('#refVerificationStatus').text('Failed to send verification code');
        $('#refVerificationStatus').show();
        
        showResponse('referrerResponse', {
            error: 'Failed to send verification code',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function verifyReferrerEmail() {
    const code = $('#refVerificationCode').val();
    
    if (!code) {
        alert('Please enter verification code');
        return;
    }

    if (!referrerVerificationId) {
        alert('Please send verification email first');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/email/verify`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                verificationId: referrerVerificationId,
                code: code 
            })
        });

        if (response.success) {
            $('#refVerificationStatus').removeClass('verification-pending verification-error').addClass('verification-success');
            $('#refVerificationStatus').text('Email verified successfully! You can now complete registration.');
            $('#refRegistrationForm').show();
            
            showResponse('referrerResponse', response);
        } else {
            throw new Error('Verification failed');
        }
    } catch (error) {
        $('#refVerificationStatus').removeClass('verification-pending verification-success').addClass('verification-error');
        $('#refVerificationStatus').text('Verification failed');
        
        showResponse('referrerResponse', {
            error: 'Email verification failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Candidate Email Verification
async function sendCandidateVerification() {
    const email = $('#canEmail').val();
    
    if (!email) {
        alert('Please enter email address');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/email/send-verification`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email })
        });

        if (response.success && response.data && response.data.verificationId) {
            candidateVerificationId = response.data.verificationId;
            $('#canVerificationStatus').removeClass('verification-pending verification-error').addClass('verification-success');
            $('#canVerificationStatus').text('Verification code sent! Check your email. ID: ' + candidateVerificationId);
            $('#canVerificationStatus').show();
            $('#canVerificationForm').show();
            
            showResponse('candidateResponse', response);
        } else {
            throw new Error('No verification ID received from server');
        }
    } catch (error) {
        $('#canVerificationStatus').removeClass('verification-pending verification-success').addClass('verification-error');
        $('#canVerificationStatus').text('Failed to send verification code');
        $('#canVerificationForm').show();
        
        showResponse('candidateResponse', {
            error: 'Failed to send verification code',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function verifyCandidateEmail() {
    const code = $('#canVerificationCode').val();
    
    if (!code) {
        alert('Please enter verification code');
        return;
    }

    if (!candidateVerificationId) {
        alert('Please send verification email first');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/email/verify`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                verificationId: candidateVerificationId,
                code: code 
            })
        });

        if (response.success) {
            $('#canVerificationStatus').removeClass('verification-pending verification-error').addClass('verification-success');
            $('#canVerificationStatus').text('Email verified successfully! You can now complete registration.');
            $('#canRegistrationForm').show();
            
            showResponse('candidateResponse', response);
        } else {
            throw new Error('Verification failed');
        }
    } catch (error) {
        $('#canVerificationStatus').removeClass('verification-pending verification-success').addClass('verification-error');
        $('#canVerificationStatus').text('Verification failed');
        
        showResponse('candidateResponse', {
            error: 'Email verification failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Registration Functions
async function registerReferrer() {
    const email = $('#refEmail').val();
    const firstName = $('#refFirstName').val();
    const lastName = $('#refLastName').val();
    const password = $('#refPassword').val();

    if (!email || !firstName || !lastName || !password) {
        showResponse('referrerResponse', { error: 'Please fill in all fields' }, true);
        return;
    }

    if (password.length < 8) {
        showResponse('referrerResponse', { error: 'Password must be at least 8 characters' }, true);
        return;
    }

    if (!referrerVerificationId) {
        showResponse('referrerResponse', { error: 'Email verification required. Please verify your email first.' }, true);
        return;
    }

    try {
        const registerData = {
            email: email,
            firstName: firstName,
            lastName: lastName,
            password: password,
            verificationId: referrerVerificationId
        };
        
        const response = await $.ajax({
            url: `${API_BASE}/auth/register/referrer`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(registerData)
        });

        showResponse('referrerResponse', response);
        
        if (response.success) {
            resetReferrerForm();
        }
    } catch (error) {
        showResponse('referrerResponse', {
            error: 'Referrer registration failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function registerCandidate() {
    const email = $('#canEmail').val();
    const firstName = $('#canFirstName').val();
    const lastName = $('#canLastName').val();
    const password = $('#canPassword').val();
    const referredBy = $('#referredBy').val();

    if (!email || !firstName || !lastName || !password || !referredBy) {
        showResponse('candidateResponse', { error: 'Please fill in all fields' }, true);
        return;
    }

    if (password.length < 8) {
        showResponse('candidateResponse', { error: 'Password must be at least 8 characters' }, true);
        return;
    }

    if (!candidateVerificationId) {
        showResponse('candidateResponse', { error: 'Email verification required. Please verify your email first.' }, true);
        return;
    }

    try {
        const registerData = {
            email: email,
            firstName: firstName,
            lastName: lastName,
            password: password,
            referredBy: referredBy,
            verificationId: candidateVerificationId
        };
        
        const response = await $.ajax({
            url: `${API_BASE}/auth/register/candidate`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(registerData)
        });

        showResponse('candidateResponse', response);
        
        if (response.success) {
            resetCandidateForm();
        }
    } catch (error) {
        showResponse('candidateResponse', {
            error: 'Candidate registration failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Form Reset Functions
function resetReferrerForm() {
    $('#refEmail').val('');
    $('#refFirstName').val('');
    $('#refLastName').val('');
    $('#refPassword').val('');
    $('#refVerificationCode').val('');
    $('#refVerificationStatus').hide();
    $('#refVerificationForm').hide();
    $('#refRegistrationForm').hide();
    referrerVerificationId = null;
}

function resetCandidateForm() {
    $('#canEmail').val('');
    $('#canFirstName').val('');
    $('#canPassword').val('');
    $('#referredBy').val('');
    $('#canVerificationCode').val('');
    $('#canVerificationStatus').hide();
    $('#canVerificationForm').hide();
    $('#canRegistrationForm').hide();
    candidateVerificationId = null;
}

// Login Function
async function login() {
    const email = $('#loginEmail').val();
    const password = $('#loginPassword').val();
    const role = $('#loginRole').val();

    if (!email || !password || !role) {
        showResponse('loginResponse', { error: 'Please fill in all fields' }, true);
        return;
    }

    try {
        const loginData = {
            email: email,
            password: password,
            role: role
        };
        
        const response = await $.ajax({
            url: `${API_BASE}/auth/login`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(loginData)
        });

        if (response.success && response.data && response.data.accessToken) {
            currentToken = response.data.accessToken;
            localStorage.setItem('auth_token', currentToken);
            showTokenSection();
            showResponse('loginResponse', response);
        } else {
            showResponse('loginResponse', { error: 'No token received' }, true);
        }
    } catch (error) {
        showResponse('loginResponse', {
            error: 'Login failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Password Reset Functions
async function forgotPassword() {
    const email = $('#forgotPasswordEmail').val();
    const role = $('#forgotPasswordRole').val();
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/forgot-password`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                email: email,
                role: role
            })
        });

        showResponse('forgotPasswordResponse', response);
        
        if (response.success) {
            $('#forgotPasswordEmail').val('');
        }
    } catch (error) {
        showResponse('forgotPasswordResponse', {
            error: 'Forgot password failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function resetPassword() {
    const token = $('#resetPasswordToken').val();
    const newPassword = $('#resetPasswordNewPassword').val();
    
    if (!token || !newPassword) {
        alert('Please enter both reset token and new password');
        return;
    }

    if (newPassword.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/reset-password`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                token: token,
                newPassword: newPassword
            })
        });

        showResponse('resetPasswordResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#resetPasswordToken').val('');
            $('#resetPasswordNewPassword').val('');
        }
    } catch (error) {
        showResponse('resetPasswordResponse', {
            error: 'Reset password failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Test Functions
async function testProtectedRoute() {
    if (!currentToken) {
        showResponse('protectedResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/me`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('protectedResponse', response);
    } catch (error) {
        showResponse('protectedResponse', {
            error: 'Protected route test failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Get Current User Info
async function getCurrentUserInfo() {
    if (!currentToken) {
        showResponse('getCurrentUserInfoResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/me`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getCurrentUserInfoResponse', response);
        
        if (response.success && response.data) {
            // 사용자 정보를 더 보기 좋게 표시
            displayUserInfo(response.data);
        }
    } catch (error) {
        showResponse('getCurrentUserInfoResponse', {
            error: 'Get current user info failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Display user info in a formatted way
function displayUserInfo(userData) {
    const userInfoDiv = document.createElement('div');
    userInfoDiv.className = 'user-info-display';
    userInfoDiv.style.cssText = 'margin-top: 15px; padding: 15px; background-color: #e8f5e8; border-radius: 4px; border: 1px solid #4caf50;';
    
    let html = '<h4>👤 User Information</h4>';
    html += `<p><strong>ID:</strong> ${userData.id || 'N/A'}</p>`;
    html += `<p><strong>Email:</strong> ${userData.email || 'N/A'}</p>`;
    html += `<p><strong>Name:</strong> ${userData.firstName || ''} ${userData.lastName || ''}</p>`;
    html += `<p><strong>Roles:</strong> ${userData.roles ? userData.roles.join(', ') : 'N/A'}</p>`;
    
    if (userData.subscriptionPlan) {
        html += `<p><strong>Subscription:</strong> ${userData.subscriptionPlan.name || 'N/A'} (${userData.subscriptionPlan.code || 'N/A'})</p>`;
    }
    
    if (userData.currentPlanCode) {
        html += `<p><strong>Current Plan:</strong> ${userData.currentPlanCode}</p>`;
    }
    
    html += `<p><strong>Created:</strong> ${userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</p>`;
    html += `<p><strong>Last Updated:</strong> ${userData.updatedAt ? new Date(userData.updatedAt).toLocaleDateString() : 'N/A'}</p>`;
    
    userInfoDiv.innerHTML = html;
    
    // Remove existing user info if any
    const existingInfo = document.querySelector('.user-info-display');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Add new user info after the response div
    const responseDiv = document.getElementById('getCurrentUserInfoResponse');
    responseDiv.parentNode.insertBefore(userInfoDiv, responseDiv.nextSibling);
}

async function generateReferralLink() {
    if (!currentToken) {
        showResponse('referralLinkResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/referral-link`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.success && response.data && response.data.referrerId) {
            showResponse('referralLinkResponse', response);
        } else {
            throw new Error('Invalid response structure');
        }
    } catch (error) {
        showResponse('referralLinkResponse', {
            error: 'Referral link generation failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function sendVerificationEmail() {
    const email = $('#verificationEmail').val();

    if (!email) {
        showResponse('verificationResponse', { error: 'Please enter email' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/auth/email/send-verification`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                email: email
            })
        });

        showResponse('verificationResponse', response);
    } catch (error) {
        showResponse('verificationResponse', {
            error: 'Verification email send failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Auto-fill forms
$(document).ready(function() {
    $('#refEmail, #refFirstName, #refLastName, #refPassword').on('input', function() {
        const field = $(this).attr('id');
        if (field === 'refEmail') {
            $('#loginEmail').val($(this).val());
        } else if (field === 'refPassword') {
            $('#loginPassword').val($(this).val());
        }
    });

    $('#canEmail, #canFirstName, #canLastName, #canPassword').on('input', function() {
        const field = $(this).attr('id');
        if (field === 'canEmail') {
            $('#loginEmail').val($(this).val());
        } else if (field === 'canPassword') {
            $('#loginPassword').val($(this).val());
        }
    });

    // Auto-fill password reset email
    $('#refEmail, #canEmail').on('input', function() {
        $('#resetEmail').val($(this).val());
    });

    // Check if token exists on page load
    if (currentToken) {
        showTokenSection();
    }
});
