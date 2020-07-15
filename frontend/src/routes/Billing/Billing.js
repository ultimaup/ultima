import React, { useEffect } from 'react'

const isProd = window.location.hostname.endsWith('onultima.com')

const testKey = 'pk_test_51H5CBOAGuVE9p5CbNhw7kl0Tc3FgDR72fTsyqUPhFUhEnoQiRvDTq4cBUywNSs6kf9FyES6bywAWfwq0rZtrhlig00bQxhs7IU'
const liveKey = 'pk_live_51H5CBOAGuVE9p5CbtseF1mhTOkOubTr5pHK9VqLw1aUUgjw8hYof4amxJ5H2CHo6wmMcqoiGtQEJAltiGt37KM3s00OR60NqpB'
const key = isProd ? liveKey : testKey

const priceId = isProd ? 'price_1H5DbhAGuVE9p5CbbMnEN0Gq' : 'price_1H5DbfAGuVE9p5CbrcwHxXDY'

const stripe = window.Stripe(key)

const onCheckoutClick = () => {
    stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        successUrl: 'https://build.onultima.com/billing/success',
        cancelUrl: 'https://build.onultima.com',
    })
    .then((result) => {
        if (result.error) {
            alert(result.error.message)
        }
    })
}

const Billing = () => {
    useEffect(() => {
        onCheckoutClick()
    }, [])

    return (
        <p>Redirecting...</p>
    )
}

export default Billing