// Main JavaScript file
$(document).ready(function() {
    console.log('Auth API Test Page loaded');
    
    // Initialize the page
    initializePage();
});

function initializePage() {
    // Check if token exists on page load
    if (currentToken) {
        showTokenSection();
    }
    
    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Auto-fill forms
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
}
