import React, { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import styled from 'styled-components'

import useStripeKey from '../hooks/useStripeKey'
import useCheckoutSessionId from '../hooks/useCheckoutSessionId'

let stripePromise
let stripe

const TierButton = ({ tier, price, onClick }) => {
    const { checkoutSessionId, loading } = useCheckoutSessionId(tier)
    
    return <button disabled={!checkoutSessionId} onClick={() => {
        onClick(checkoutSessionId)
    }}>Purchase ({price})</button>
}

const TierContainer = styled.div`
    display: flex;
    flex-direction: column;
    font-size: 16px;
    width: 100%;
    justify-content: space-between;
    border-radius: 16px;
    border: 1px solid #292929;
    padding-bottom: 4px;
    overflow: hidden;

    * {
        padding: 8px;
    }

    h4 {
        font-size: 19px;
        text-align: center;
        font-family: Roboto;
        font-weight: bold;
        border-bottom: 1px solid #292929;
        color: #edfbff;
        background: #292929;
    }

    ul {
        position: relative;
        padding-left: 1.7em;
        flex: 1;
        
        li:before {
            content: "✅";
            position: absolute;
            left: 8px;
        }

        li {
            margin-top: 12px;
            color: #edfbff;
        }
    }

    div {
        margin-top: 12px;
        text-align: center;

        button {
            border-radius: 3px;
            border: none;
            cursor: pointer;
        }
    }
`

const TiersContainer = styled.div`
    display: flex;

    ${TierContainer}:not(:first-child) {
        margin-left: 36px;
    }
`

const TierHeading = styled.h4`
    text-align: center;
    font-size: 21px;
    font-family: Roboto;
    font-weight: bold;
`

const Billing = styled.div`
    border: 1px solid #292929;
    padding: 21px;
    border-radius: 7px;

    ${TiersContainer} {
        margin-top: 12px;
    }

    ${TierHeading} {
        margin-bottom: 24px;
    }
`

const Tier = ({ title, benefits, children }) => (
    <TierContainer>
        <h4>{title}</h4>
        <ul>
            {benefits.map(benefit => (
                <li key={benefit}>{benefit}</li>
            ))}
        </ul>
        <div>
            {children}
        </div>
    </TierContainer>
)

const Tiers = ({ className }) => {
    const [error, setError] = useState(null)
    const [expanded, setExpanded] = useState(false)
    const { stripeKey } = useStripeKey()

    useEffect(() => {
        if (stripeKey) {
            if (!stripePromise) {
                stripePromise = loadStripe(stripeKey)
            }
            stripePromise.then(s => {
                stripe = s
            }).catch(console.error)
        }
    }, [stripeKey, stripePromise])

    const onClick = async sessionId => {
        setError(null)
        const stripe = await stripePromise
        const { error } = await stripe.redirectToCheckout({
            sessionId,
        })
        if (error) {
            setError(error.message)
        }
    }

    return (
        <Billing className={className}>
            <TierHeading>To start using Ultima, please select a tier</TierHeading>
            {!expanded && (
                <button style={{ display: 'block', margin: 'auto' }} onClick={() => setExpanded(true)}>View Options</button>
            )}
            {expanded && <TiersContainer>
                <Tier title="Hobby" benefits={[
                    '1 repository',
                    'Unlimited branches',
                    'Community Support'
                ]}>
                    <button disabled>Coming Soon</button>
                </Tier>
                <Tier title="Personal" benefits={[
                    '5 repositories',
                    'Unlimited branches',
                    'Community Support'
                ]}>
                    <TierButton price="£15 / month" tier="personal" onClick={onClick} />
                </Tier>
                <Tier title="Business" benefits={[
                    'Unlimited repositories',
                    'Organisation support',
                    'Dedicated support via slack',
                ]}>
                    <TierButton price="£150 / month" tier="business" onClick={onClick} />
                </Tier>
            </TiersContainer>}
            {error && <p>{error}</p>}
        </Billing>
    )
}

export default styled(Tiers)``