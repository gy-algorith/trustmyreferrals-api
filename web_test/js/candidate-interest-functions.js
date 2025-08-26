// Candidate Interest Functions
async function createCandidateInterest() {
    if (!currentToken) {
        showResponse('createInterestResponse', { error: 'No token available' }, true);
        return;
    }

    const candidateId = $('#interestCandidateId').val();
    const positionTitle = $('#interestPositionTitle').val();
    const company = $('#interestCompany').val();
    const comment = $('#interestComment').val();

    if (!candidateId || !positionTitle || !company) {
        alert('Please fill in all required fields (Candidate ID, Position Title, Company)');
        return;
    }

    try {
        const requestData = {
            candidateId,
            positionTitle,
            company
        };

        // Optional field
        if (comment && comment.trim()) {
            requestData.comment = comment.trim();
        }

        const response = await $.ajax({
            url: `${API_BASE}/candidate-interest`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(requestData)
        });

        showResponse('createInterestResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#interestCandidateId').val('');
            $('#interestPositionTitle').val('');
            $('#interestCompany').val('');
            $('#interestComment').val('');
        }
    } catch (error) {
        showResponse('createInterestResponse', {
            error: 'Create candidate interest failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getAllCandidateInterests() {
    if (!currentToken) {
        showResponse('getAllInterestsResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/candidate-interest`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getAllInterestsResponse', response);
    } catch (error) {
        showResponse('getAllInterestsResponse', {
            error: 'Get all candidate interests failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getSpecificCandidateInterest() {
    if (!currentToken) {
        showResponse('getSpecificInterestResponse', { error: 'No token available' }, true);
        return;
    }

    const interestId = $('#getInterestId').val();

    if (!interestId) {
        alert('Please enter Interest ID');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/candidate-interest/${interestId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getSpecificInterestResponse', response);
    } catch (error) {
        showResponse('getSpecificInterestResponse', {
            error: 'Get specific candidate interest failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function approveCandidateInterest() {
    if (!currentToken) {
        showResponse('approveInterestResponse', { error: 'No token available' }, true);
        return;
    }

    const interestId = $('#approveInterestId').val();

    if (!interestId) {
        alert('Please enter Interest ID');
        return;
    }

    if (!confirm('Are you sure you want to approve this position offer? This will indicate your acceptance of the offer.')) {
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/candidate-interest/${interestId}/approve`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('approveInterestResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#approveInterestId').val('');
        }
    } catch (error) {
        showResponse('approveInterestResponse', {
            error: 'Approve candidate interest failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function rejectCandidateInterest() {
    if (!currentToken) {
        showResponse('rejectInterestResponse', { error: 'No token available' }, true);
        return;
    }

    const interestId = $('#rejectInterestId').val();

    if (!interestId) {
        alert('Please enter Interest ID');
        return;
    }

    if (!confirm('Are you sure you want to reject this position offer? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/candidate-interest/${interestId}/reject`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('rejectInterestResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#rejectInterestId').val('');
        }
    } catch (error) {
        showResponse('rejectInterestResponse', {
            error: 'Reject candidate interest failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}
