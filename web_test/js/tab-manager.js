// Tab Management - Simple version
function showTab(tabName) {
    // Hide all tab contents
    $('.tab-content').removeClass('active');
    $('.tab-button').removeClass('active');
    
    // Show selected tab
    $(`#${tabName}`).addClass('active');
    $(`.tab-button[onclick="showTab('${tabName}')"]`).addClass('active');
}

// Initialize on page load
$(document).ready(function() {
    console.log('Tab manager initialized');
});
