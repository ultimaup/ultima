import { gql, useQuery } from '@apollo/client'

const GET_STRIPE_KEY = gql`
    query getStripePublicKey {
        getStripePublicKey
    }
`

const useStripeKey = () => {
    const { loading, error, data } = useQuery(GET_STRIPE_KEY)

    return {
        loading,
        error,
        stripeKey: data && data.getStripePublicKey,
    }
}

export default useStripeKey