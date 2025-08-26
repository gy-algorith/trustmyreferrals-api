// Resume Functions
async function createProfessionalSummary() {
    if (!currentToken) {
        showResponse('summaryResponse', { error: 'No token available' }, true);
        return;
    }

    const summaryText = $('#summaryText').val();
    
    if (!summaryText) {
        alert('Please enter summary text');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume/sections/summary`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                text: summaryText
            })
        });

        showResponse('summaryResponse', response);
        
        if (response.success) {
            $('#summaryText').val('');
        }
    } catch (error) {
        showResponse('summaryResponse', {
            error: 'Create professional summary failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function updateProfessionalSummary() {
    if (!currentToken) {
        showResponse('summaryResponse', { error: 'No token available' }, true);
        return;
    }

    const summaryText = $('#summaryText').val();
    
    if (!summaryText) {
        alert('Please enter summary text');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume/sections/summary`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                text: summaryText
            })
        });

        showResponse('summaryResponse', response);
        
        if (response.success) {
            $('#summaryText').val('');
        }
    } catch (error) {
        showResponse('summaryResponse', {
            error: 'Update professional summary failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function createWorkExperience() {
    if (!currentToken) {
        showResponse('workExperienceResponse', { error: 'No token available' }, true);
        return;
    }

    const title = $('#workTitle').val();
    const company = $('#workCompany').val();
    const dateRange = $('#workDateRange').val();
    const description = $('#workDescription').val();

    if (!title || !company || !dateRange || !description) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume/sections/experience`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                title,
                company,
                dateRange,
                description
            })
        });

        showResponse('workExperienceResponse', response);
        
        if (response.success) {
            $('#workTitle').val('');
            $('#workCompany').val('');
            $('#workDateRange').val('');
            $('#workDescription').val('');
        }
    } catch (error) {
        showResponse('workExperienceResponse', {
            error: 'Create work experience failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function addResumeSkill() {
    if (!currentToken) {
        showResponse('skillResponse', { error: 'No token available' }, true);
        return;
    }

    const skillName = $('#skillName').val();
    
    if (!skillName) {
        alert('Please enter skill name');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume/sections/skills`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                name: skillName
            })
        });

        showResponse('skillResponse', response);
        
        if (response.success) {
            $('#skillName').val('');
        }
    } catch (error) {
        showResponse('skillResponse', {
            error: 'Add skill failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getMyResumeSections() {
    if (!currentToken) {
        showResponse('resumeSectionsResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume/sections`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('resumeSectionsResponse', response);
    } catch (error) {
        showResponse('resumeSectionsResponse', {
            error: 'Get resume sections failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getMyCompleteResume() {
    if (!currentToken) {
        showResponse('completeResumeResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume/my-resume`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('completeResumeResponse', response);
    } catch (error) {
        showResponse('completeResumeResponse', {
            error: 'Get complete resume failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function parsePdfResume() {
    if (!currentToken) {
        showResponse('pdfParseResponse', { error: 'No token available' }, true);
        return;
    }

    const fileInput = $('#pdfFile')[0];
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a PDF file');
        return;
    }

    if (file.type !== 'application/pdf') {
        alert('Please select a valid PDF file');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
        alert('File size must be less than 10MB');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await $.ajax({
            url: `${API_BASE}/resume/parse-pdf`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            data: formData,
            processData: false,
            contentType: false
        });

        showResponse('pdfParseResponse', response);
        
        if (response.success) {
            // 성공 시 파일 입력 초기화
            $('#pdfFile').val('');
        }
    } catch (error) {
        showResponse('pdfParseResponse', {
            error: 'Parse PDF resume failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

// Resume Validation Functions
async function createResumeValidation() {
    if (!currentToken) {
        showResponse('createValidationResponse', { error: 'No token available' }, true);
        return;
    }

    const resumeId = $('#validationResumeId').val();
    const text = $('#validationText').val();

    if (!resumeId || !text) {
        alert('Please fill in all required fields (Resume Section ID and Feedback Text)');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume-validation`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                resumeId,
                text
            })
        });

        showResponse('createValidationResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#validationResumeId').val('');
            $('#validationText').val('');
        }
    } catch (error) {
        showResponse('createValidationResponse', {
            error: 'Create resume validation failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getResumeValidations() {
    if (!currentToken) {
        showResponse('getValidationsResponse', { error: 'No token available' }, true);
        return;
    }

    const resumeId = $('#getValidationsResumeId').val();

    if (!resumeId) {
        alert('Please enter Resume Section ID');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume-validation/${resumeId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getValidationsResponse', response);
    } catch (error) {
        showResponse('getValidationsResponse', {
            error: 'Get resume validations failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function deleteResumeValidation() {
    if (!currentToken) {
        showResponse('deleteValidationResponse', { error: 'No token available' }, true);
        return;
    }

    const validationId = $('#deleteValidationId').val();

    if (!validationId) {
        alert('Please enter Validation ID');
        return;
    }

    if (!confirm('Are you sure you want to delete this validation? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume-validation/${validationId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('deleteValidationResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#deleteValidationId').val('');
        }
    } catch (error) {
        showResponse('deleteValidationResponse', {
            error: 'Delete resume validation failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getCandidateResume() {
    if (!currentToken) {
        showResponse('getCandidateResumeResponse', { error: 'No token available' }, true);
        return;
    }

    const candidateId = $('#candidateResumeId').val();

    if (!candidateId) {
        alert('Please enter Candidate ID');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/resume/candidate/${candidateId}/resume`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getCandidateResumeResponse', response);
        
        if (response.success) {
            // 성공 시 입력 필드 초기화
            $('#candidateResumeId').val('');
        }
    } catch (error) {
        showResponse('getCandidateResumeResponse', {
            error: 'Get candidate resume failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}
