// Requirements Functions
async function createRequirement() {
    if (!currentToken) {
        showResponse('createRequirementResponse', { error: 'No token available' }, true);
        return;
    }

    const title = $('#requirementTitle').val();
    const overview = $('#requirementOverview').val();
    const skills = $('#requirementSkills').val();
    const desiredSkills = $('#requirementDesiredSkills').val();
    const location = $('#requirementLocation').val();
    const workStyle = $('#requirementWorkStyle').val();
    const salaryCeiling = $('#requirementSalaryCeiling').val();
    const closingDate = $('#requirementClosingDate').val();
    const visibility = $('#requirementVisibility').val();

    if (!title || !overview) {
        alert('Please fill in all required fields (Title, Overview)');
        return;
    }

    try {
        const requestData = {
            title,
            overview
        };

        // Optional fields
        if (skills && skills.trim()) {
            requestData.skills = skills.split(',').map(s => s.trim()).filter(s => s);
        }
        if (desiredSkills && desiredSkills.trim()) {
            requestData.desiredSkills = desiredSkills.split(',').map(s => s.trim()).filter(s => s);
        }
        if (location && location.trim()) {
            requestData.location = location.trim();
        }
        if (workStyle && workStyle.length > 0) {
            // jQuery multiple select는 배열을 반환하므로 그대로 사용
            requestData.workStyle = workStyle;
        }
        if (salaryCeiling && salaryCeiling.trim()) {
            requestData.salaryCeiling = parseInt(salaryCeiling);
        }
        if (closingDate && closingDate.trim()) {
            requestData.closingDate = closingDate;
        }
        if (visibility && visibility.trim()) {
            requestData.visibility = visibility;
        }

        const response = await $.ajax({
            url: `${API_BASE}/requirements`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(requestData)
        });

        showResponse('createRequirementResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#requirementTitle').val('');
            $('#requirementOverview').val('');
            $('#requirementSkills').val('');
            $('#requirementDesiredSkills').val('');
            $('#requirementLocation').val('');
            $('#requirementWorkStyle').val('');
            $('#requirementSalaryCeiling').val('');
            $('#requirementClosingDate').val('');
            $('#requirementVisibility').val('');
        }
    } catch (error) {
        showResponse('createRequirementResponse', {
            error: 'Create requirement failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function searchRequirements() {
    if (!currentToken) {
        showResponse('searchRequirementsResponse', { error: 'No token available' }, true);
        return;
    }

    const skills = $('#searchSkills').val();
    const location = $('#searchLocation').val();
    const workStyle = $('#searchWorkStyle').val();
    const sortBy = $('#searchSortBy').val();
    const page = $('#searchPage').val();
    const limit = $('#searchLimit').val();

    try {
        let url = `${API_BASE}/requirements?`;
        const params = [];
        
        if (skills && skills.trim()) params.push(`skills=${encodeURIComponent(skills.trim())}`);
        if (location && location.trim()) params.push(`location=${encodeURIComponent(location.trim())}`);
        if (workStyle) params.push(`workStyle=${encodeURIComponent(workStyle)}`);
        if (sortBy) params.push(`sortBy=${encodeURIComponent(sortBy)}`);
        if (page) params.push(`page=${page}`);
        if (limit) params.push(`limit=${limit}`);
        
        url += params.join('&');

        const response = await $.ajax({
            url: url,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('searchRequirementsResponse', response);
    } catch (error) {
        showResponse('searchRequirementsResponse', {
            error: 'Search requirements failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getMyRequirements() {
    if (!currentToken) {
        showResponse('getMyRequirementsResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/requirements/my-requirements`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getMyRequirementsResponse', response);
    } catch (error) {
        showResponse('getMyRequirementsResponse', {
            error: 'Get my requirements failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getRequirementDetails() {
    if (!currentToken) {
        showResponse('getRequirementDetailsResponse', { error: 'No token available' }, true);
        return;
    }

    const requirementId = $('#requirementId').val();
    
    if (!requirementId) {
        alert('Please enter requirement ID');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/requirements/${requirementId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getRequirementDetailsResponse', response);
    } catch (error) {
        showResponse('getRequirementDetailsResponse', {
            error: 'Get requirement details failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function respondToRequirement() {
    if (!currentToken) {
        showResponse('respondToRequirementResponse', { error: 'No token available' }, true);
        return;
    }

    const requirementId = $('#respondRequirementId').val();
    const candidateId = $('#respondCandidateId').val();
    const candidateOverview = $('#respondCandidateOverview').val();
    const whyThisCandidate = $('#respondWhyThisCandidate').val();
    const purchasePrice = $('#respondPurchasePrice').val();
    const supportingSkills = $('#respondSupportingSkills').val();
    const anonymizedHeadline = $('#respondAnonymizedHeadline').val();

    if (!requirementId || !candidateId || !candidateOverview || !whyThisCandidate || !purchasePrice) {
        alert('Please fill in all required fields (Requirement ID, Candidate ID, Candidate Overview, Why This Candidate, Purchase Price)');
        return;
    }

    try {
        const requestData = {
            candidateId,
            candidateOverview,
            whyThisCandidate,
            purchasePrice: parseFloat(purchasePrice)
        };

        // Optional fields
        if (supportingSkills && supportingSkills.trim()) {
            requestData.supportingSkills = supportingSkills.split(',').map(skill => skill.trim()).filter(skill => skill);
        }
        if (anonymizedHeadline && anonymizedHeadline.trim()) {
            requestData.anonymizedHeadline = anonymizedHeadline.trim();
        }

        const response = await $.ajax({
            url: `${API_BASE}/requirements/${requirementId}/respond`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(requestData)
        });

        showResponse('respondToRequirementResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#respondRequirementId').val('');
            $('#respondCandidateId').val('');
            $('#respondCandidateOverview').val('');
            $('#respondWhyThisCandidate').val('');
            $('#respondPurchasePrice').val('');
            $('#respondSupportingSkills').val('');
            $('#respondAnonymizedHeadline').val('');
        }
    } catch (error) {
        showResponse('respondToRequirementResponse', {
            error: 'Respond to requirement failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getRequirementResponses() {
    if (!currentToken) {
        showResponse('getRequirementResponsesResponse', { error: 'No token available' }, true);
        return;
    }

    const requirementId = $('#responsesRequirementId').val();
    const page = $('#responsesPage').val();
    const limit = $('#responsesLimit').val();

    if (!requirementId) {
        alert('Please enter requirement ID');
        return;
    }

    try {
        let url = `${API_BASE}/requirements/${requirementId}/responses?`;
        const params = [];
        
        if (page) params.push(`page=${page}`);
        if (limit) params.push(`limit=${limit}`);
        
        url += params.join('&');

        const response = await $.ajax({
            url: url,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getRequirementResponsesResponse', response);
    } catch (error) {
        showResponse('getRequirementResponsesResponse', {
            error: 'Get requirement responses failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function approveResponse() {
    if (!currentToken) {
        showResponse('approveResponseResponse', { error: 'No token available' }, true);
        return;
    }

    const requirementId = $('#approveRequirementId').val();
    const responseId = $('#approveResponseId').val();

    if (!requirementId || !responseId) {
        alert('Please enter both requirement ID and response ID');
        return;
    }

    if (!confirm('Are you sure you want to approve this response? This will deduct the price from your balance.')) {
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/requirements/${requirementId}/responses/${responseId}/approve`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('approveResponseResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#approveRequirementId').val('');
            $('#approveResponseId').val('');
        }
    } catch (error) {
        showResponse('approveResponseResponse', {
            error: 'Approve response failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function rejectResponse() {
    if (!currentToken) {
        showResponse('rejectResponseResponse', { error: 'No token available' }, true);
        return;
    }

    const requirementId = $('#rejectRequirementId').val();
    const responseId = $('#rejectResponseId').val();

    if (!requirementId || !responseId) {
        alert('Please enter both requirement ID and response ID');
        return;
    }

    if (!confirm('Are you sure you want to reject this response?')) {
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/requirements/${requirementId}/responses/${responseId}/reject`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('rejectResponseResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#rejectRequirementId').val('');
            $('#rejectResponseId').val('');
        }
    } catch (error) {
        showResponse('rejectResponseResponse', {
            error: 'Reject response failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function reportRequirement() {
    if (!currentToken) {
        showResponse('reportRequirementResponse', { error: 'No token available' }, true);
        return;
    }

    const requirementId = $('#reportRequirementId').val();
    const reason = $('#reportReason').val();

    if (!requirementId || !reason) {
        alert('Please enter both requirement ID and reason');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/requirements/${requirementId}/report`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                reason
            })
        });

        showResponse('reportRequirementResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#reportRequirementId').val('');
            $('#reportReason').val('');
        }
    } catch (error) {
        showResponse('reportRequirementResponse', {
            error: 'Report requirement failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function closeRequirement() {
    if (!currentToken) {
        showResponse('closeRequirementResponse', { error: 'No token available' }, true);
        return;
    }

    const requirementId = $('#closeRequirementId').val();

    if (!requirementId) {
        alert('Please enter requirement ID');
        return;
    }

    if (!confirm('Are you sure you want to close this requirement? This action cannot be undone and will prevent new responses.')) {
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/requirements/${requirementId}/close`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('closeRequirementResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#closeRequirementId').val('');
        }
    } catch (error) {
        showResponse('closeRequirementResponse', {
            error: 'Close requirement failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}
