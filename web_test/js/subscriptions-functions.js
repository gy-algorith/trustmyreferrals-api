// Subscriptions Functions
async function getAllPlans() {
    if (!currentToken) {
        showResponse('getAllPlansResponse', { error: 'No token available' }, true);
        return;
    }

    const role = $('#planRole').val();
    
    try {
        let url = `${API_BASE}/subscriptions/plans`;
        if (role) {
            url += `?role=${role}`;
        }
        
        const response = await $.ajax({
            url: url,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getAllPlansResponse', response);
    } catch (error) {
        showResponse('getAllPlansResponse', {
            error: 'Get all plans failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function getMySubscription() {
    if (!currentToken) {
        showResponse('getMySubscriptionResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/subscriptions/my-subscription`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('getMySubscriptionResponse', response);
    } catch (error) {
        showResponse('getMySubscriptionResponse', {
            error: 'Get my subscription failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function createCheckout() {
    if (!currentToken) {
        showResponse('createCheckoutResponse', { error: 'No token available' }, true);
        return;
    }

    const planCode = $('#checkoutPlanCode').val();
    const successUrl = $('#checkoutSuccessUrl').val();
    const cancelUrl = $('#checkoutCancelUrl').val();
    const interval = $('#checkoutInterval').val();

    if (!planCode || !successUrl || !cancelUrl) {
        alert('Please fill in all required fields (Plan Code, Success URL, Cancel URL)');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/subscriptions/checkout`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                planCode,
                successUrl,
                cancelUrl,
                interval
            })
        });

        showResponse('createCheckoutResponse', response);
        
        if (response.checkoutUrl) {
            // Stripe Checkout URL이 있으면 새 창에서 열기
            setTimeout(() => {
                window.open(response.checkoutUrl, '_blank');
            }, 2000);
        }
    } catch (error) {
        showResponse('createCheckoutResponse', {
            error: 'Create checkout failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function manageSubscription() {
    if (!currentToken) {
        showResponse('manageSubscriptionResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/subscriptions/portal`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            }
        });

        showResponse('manageSubscriptionResponse', response);
        
        if (response.portalUrl) {
            // Stripe Customer Portal URL이 있으면 새 창에서 열기
            setTimeout(() => {
                window.open(response.portalUrl, '_blank');
            }, 2000);
        }
    } catch (error) {
        showResponse('manageSubscriptionResponse', {
            error: 'Open customer portal failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}
