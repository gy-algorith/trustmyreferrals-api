// User Updates Functions
async function createPost() {
    if (!currentToken) {
        showResponse('createPostResponse', { error: 'No token available' }, true);
        return;
    }

    const description = $('#postDescription').val();
    
    if (!description) {
        alert('Please enter post description');
        return;
    }

    if (description.length > 1000) {
        alert('Description must be 1000 characters or less');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/user-updates/post`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({ description: description })
        });

        showResponse('createPostResponse', response);
        
        if (response.id) {
            $('#postDescription').val('');
        }
    } catch (error) {
        showResponse('createPostResponse', {
            error: 'Create post failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getMyUpdates() {
    if (!currentToken) {
        showResponse('myUpdatesResponse', { error: 'No token available' }, true);
        return;
    }

    const limit = $('#myUpdatesLimit').val() || 20;
    const page = $('#myUpdatesPage').val() || 1;

    try {
        const response = await $.ajax({
            url: `${API_BASE}/user-updates/my-updates?limit=${limit}&page=${page}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('myUpdatesResponse', response);
    } catch (error) {
        showResponse('myUpdatesResponse', {
            error: 'Get my updates failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getReferrerUpdates() {
    if (!currentToken) {
        showResponse('referrerUpdatesResponse', { error: 'No token available' }, true);
        return;
    }

    const limit = $('#referrerUpdatesLimit').val() || 20;
    const page = $('#referrerUpdatesPage').val() || 1;

    try {
        const response = await $.ajax({
            url: `${API_BASE}/user-updates/referrer?limit=${limit}&page=${page}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('referrerUpdatesResponse', response);
    } catch (error) {
        showResponse('referrerUpdatesResponse', {
            error: 'Get referrer updates failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function updatePost() {
    if (!currentToken) {
        showResponse('updatePostResponse', { error: 'No token available' }, true);
        return;
    }

    const postId = $('#updatePostId').val();
    const description = $('#updatePostDescription').val();
    
    if (!postId) {
        alert('Please enter post ID');
        return;
    }

    if (!description) {
        alert('Please enter new description');
        return;
    }

    if (description.length > 1000) {
        alert('Description must be 1000 characters or less');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/user-updates/${postId}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({ description: description })
        });

        showResponse('updatePostResponse', response);
        
        if (response.id) {
            $('#updatePostId').val('');
            $('#updatePostDescription').val('');
        }
    } catch (error) {
        showResponse('updatePostResponse', {
            error: 'Update post failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}
