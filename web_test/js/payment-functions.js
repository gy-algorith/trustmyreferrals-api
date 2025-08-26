// Payment Functions
async function createConnectLink() {
    if (!currentToken) {
        showResponse('connectLinkResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/payment/connect-link`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('connectLinkResponse', response);
        
        if (response.url) {
            // Stripe Connect URL이 있으면 새 창에서 열기
            setTimeout(() => {
                window.open(response.url, '_blank');
            }, 2000);
        }
    } catch (error) {
        showResponse('connectLinkResponse', {
            error: 'Create connect link failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function addFund() {
    if (!currentToken) {
        showResponse('addFundResponse', { error: 'No token available' }, true);
        return;
    }

    const amount = $('#addFundAmount').val();
    const currency = $('#addFundCurrency').val();
    const description = $('#addFundDescription').val();
    const successUrl = $('#addFundSuccessUrl').val();
    const cancelUrl = $('#addFundCancelUrl').val();

    if (!amount || !successUrl || !cancelUrl) {
        alert('Please fill in all required fields (Amount, Success URL, Cancel URL)');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/payment/add-fund`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                amount: parseInt(amount),
                currency: currency,
                description: description,
                successUrl: successUrl,
                cancelUrl: cancelUrl
            })
        });

        showResponse('addFundResponse', response);
        
        if (response.checkoutUrl) {
            // Stripe Checkout URL이 있으면 새 창에서 열기
            setTimeout(() => {
                window.open(response.checkoutUrl, '_blank');
            }, 2000);
        }
    } catch (error) {
        showResponse('addFundResponse', {
            error: 'Add fund failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function checkBalance() {
    if (!currentToken) {
        showResponse('balanceResponse', { error: 'No token available' }, true);
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/payment/balance`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('balanceResponse', response);
    } catch (error) {
        showResponse('balanceResponse', {
            error: 'Check balance failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function withdrawFunds() {
    if (!currentToken) {
        showResponse('withdrawResponse', { error: 'No token available' }, true);
        return;
    }

    const amount = $('#withdrawAmount').val();
    const currency = $('#withdrawCurrency').val();
    const description = $('#withdrawDescription').val();

    if (!amount) {
        alert('Please enter withdrawal amount');
        return;
    }

    if (!confirm(`Are you sure you want to withdraw $${(amount / 100).toFixed(2)}? Processing fee will be applied.`)) {
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/payment/withdraw`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                amount: parseInt(amount),
                currency: currency,
                description: description
            })
        });

        showResponse('withdrawResponse', response);
        
        if (response.transferId) {
            // 출금 성공 시 입력 필드 초기화
            $('#withdrawAmount').val('500');
            $('#withdrawDescription').val('');
        }
    } catch (error) {
        showResponse('withdrawResponse', {
            error: 'Withdraw funds failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}

async function checkPaymentStatus() {
    if (!currentToken) {
        showResponse('paymentStatusResponse', { error: 'No token available' }, true);
        return;
    }

    const paymentId = $('#paymentId').val();
    
    if (!paymentId) {
        alert('Please enter payment ID');
        return;
    }

    try {
        const response = await $.ajax({
            url: `${API_BASE}/payment/payment/${paymentId}/status`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        showResponse('paymentStatusResponse', response);
    } catch (error) {
        showResponse('paymentStatusResponse', {
            error: 'Check payment status failed',
            details: error.responseJSON || error.statusText
        }, true);
    }
}
