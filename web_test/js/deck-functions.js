// Deck Functions
async function getMyDeck() {
    if (!currentToken) {
        showResponse('deckResponse', { error: 'No token available' }, true);
        return;
    }

    const limit = parseInt($('#deckLimit').val()) || 20;
    const page = parseInt($('#deckPage').val()) || 1;

    try {
        const response = await $.ajax({
            url: `${API_BASE}/deck/my-deck`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            data: {
                limit: limit,
                page: page
            }
        });

        showResponse('deckResponse', response);
        
        if (response.success && response.data) {
            displayDeckInfo(response);
        }
    } catch (error) {
        showResponse('deckResponse', {
            error: 'Get deck failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

function displayDeckInfo(response) {
    const deckInfo = document.createElement('div');
    deckInfo.className = 'deck-info';
    deckInfo.style.cssText = 'margin-top: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;';
    
    let html = '<h4>Deck Summary</h4>';
    html += `<p><strong>Total Candidates:</strong> ${response.total || 0}</p>`;
    html += `<p><strong>Current Page:</strong> ${response.page || 1}</p>`;
    html += `<p><strong>Items per page:</strong> ${response.limit || 20}</p>`;
    
    if (response.data && response.data.length > 0) {
        html += '<h5>Candidates in this page:</h5>';
        html += '<ul style="list-style: none; padding: 0;">';
        
        response.data.forEach((item, index) => {
            html += `
                <li style="margin-bottom: 10px; padding: 10px; background-color: white; border-radius: 4px; border: 1px solid #ced4da;">
                    <strong>${index + 1}. ${item.name}</strong><br>
                    <small>Email: ${item.email}</small><br>
                    <small>Status: ${item.status}</small><br>
                    <small>Skills: ${item.skills ? item.skills.join(', ') : 'N/A'}</small><br>
                    <small>In Decks: ${item.inDecks}</small><br>
                    <small>Premium: ${item.isPremium ? 'Yes' : 'No'}</small><br>
                    <small>Added: ${new Date(item.dateAdded).toLocaleDateString()}</small>
                </li>
            `;
        });
        
        html += '</ul>';
    } else {
        html += '<p><em>No candidates found in your deck.</em></p>';
    }
    
    deckInfo.innerHTML = html;
    
    // Remove existing deck info if any
    const existingInfo = document.querySelector('.deck-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Add new deck info after the response div
    const responseDiv = document.getElementById('deckResponse');
    responseDiv.parentNode.insertBefore(deckInfo, responseDiv.nextSibling);
}

// Get My Referrers (Candidate Only)
async function getMyReferrers() {
    if (!currentToken) {
        showResponse('myReferrersResponse', { error: 'No token available' }, true);
        return;
    }

    const limit = parseInt($('#myReferrersLimit').val()) || 20;
    const page = parseInt($('#myReferrersPage').val()) || 1;

    try {
        const response = await $.ajax({
            url: `${API_BASE}/deck/my-referrers?limit=${limit}&page=${page}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('myReferrersResponse', response);
        
        if (response.success && response.data) {
            displayReferrersInfo(response);
        }
    } catch (error) {
        showResponse('myReferrersResponse', {
            error: 'Get my referrers failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Display referrers info in a formatted way
function displayReferrersInfo(response) {
    const referrersInfoDiv = document.createElement('div');
    referrersInfoDiv.className = 'referrers-info-display';
    referrersInfoDiv.style.cssText = 'margin-top: 15px; padding: 15px; background-color: #e3f2fd; border-radius: 4px; border: 1px solid #2196f3;';
    
    let html = '<h4>🤝 My Referrers</h4>';
    html += `<p><strong>Total Referrers:</strong> ${response.total || 0}</p>`;
    html += `<p><strong>Current Page:</strong> ${response.page || 1}</p>`;
    html += `<p><strong>Items per page:</strong> ${response.limit || 20}</p>`;
    
    if (response.data && response.data.length > 0) {
        html += '<h5>Referrers in this page:</h5>';
        html += '<ul style="list-style: none; padding: 0;">';
        
        response.data.forEach((referrer, index) => {
            html += `
                <li style="margin-bottom: 10px; padding: 10px; background-color: white; border-radius: 4px; border: 1px solid #bbdefb;">
                    <strong>${index + 1}. ${referrer.referrerName || 'Unknown Referrer'}</strong><br>
                    <small>Submissions: ${referrer.submissions || 0}</small><br>
                    <small>Last Submitted: ${referrer.lastSubmitted ? new Date(referrer.lastSubmitted).toLocaleDateString() : 'N/A'}</small><br>
                    <small>Date Connected: ${referrer.dateConnected ? new Date(referrer.dateConnected).toLocaleDateString() : 'N/A'}</small>
                </li>
            `;
        });
        
        html += '</ul>';
    } else {
        html += '<p><em>No referrers found in your network.</em></p>';
    }
    
    referrersInfoDiv.innerHTML = html;
    
    // Remove existing referrers info if any
    const existingInfo = document.querySelector('.referrers-info-display');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Add new referrers info after the response div
    const responseDiv = document.getElementById('myReferrersResponse');
    responseDiv.parentNode.insertBefore(referrersInfoDiv, responseDiv.nextSibling);
}
