import { gql, useQuery } from '@apollo/client'

const GET_CHECKOUT_SESSION_ID = gql`
    query getCheckoutSessionId($tier: String) {
        getCheckoutSessionId(tier: $tier)
    }
`

const useCheckoutSessionId = (tier) => {
    const { loading, error, data } = useQuery(GET_CHECKOUT_SESSION_ID, { variables: { tier } })

    return {
        loading,
        error,
        checkoutSessionId: data && data.getCheckoutSessionId,
    }
}

export default useCheckoutSessionId