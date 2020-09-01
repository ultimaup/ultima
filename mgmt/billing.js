const {
    STRIPE_SECRET,
    STRIPE_KEY,
    PUBLIC_ROUTE_ROOT,
    PUBLIC_ROUTE_ROOT_PROTOCOL,
    PUBLIC_ROUTE_ROOT_PORT,
    BILLING_DISABLED,
} = process.env

const bodyParser = require('body-parser')
const stripe = require('stripe')(STRIPE_SECRET)

const User = require('./db/User')
const GithubRepository = require('./db/GithubRepository')
const Repository = require('./db/Repository')

const tiers = {
    business: 'price_1H5DbfAGuVE9p5CbrcwHxXDY',
    personal: 'price_1HMwHZAGuVE9p5CbCxygA4oL',
}

const handleStripeEvent = async event => {
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        if (session.metadata) {
            throw new Error('unknown tier')
        }
        const { customer, metadata: { tier, username } } = session
        await User.query().where('username', username).update({
            tier,
            stripeCustomerId: customer,
            activated: true,
        })
    }

    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price
        const customer = subscription.customer
        const tier = Object.entries(tiers).find(([k,v]) => v === priceId)[0]

        await User.query().where('stripeCustomerId', customer).update({
            tier,
        })
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object
        const customer = subscription.customer
        await User.query().where('stripeCustomerId', customer).update({
            tier: null,
        })
    }
}

const redirectUrl = `${PUBLIC_ROUTE_ROOT_PROTOCOL}://build.${PUBLIC_ROUTE_ROOT}:${PUBLIC_ROUTE_ROOT_PORT}/user/login`

const getCheckoutSessionId = async (tier, username) => {
    if (!['personal', 'business'].includes(tier)) {
        throw new Error('unknown tier')
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price: tiers[tier],
            quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${redirectUrl}?stripeStatus=success`,
        cancel_url: `${redirectUrl}?stripeStatus=cancel`,
        metadata: {
            username,
            tier,
        }
    })

    return session.id
}

const getPortalUrl = async (username) => {
    const { stripeCustomerId } = await User.query().where('username', username).first()

    if (!stripeCustomerId) {
        return null
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: redirectUrl,
    })

    return session.url
}

const webhook = app => {
    app.use('/stripe', bodyParser.json(), (req, res) => {

        if(!req.body || req.body.object !== 'event' || !req.body.id) {
            const error = new Error('Event data not included');
            error.status = 400;
            return res.status(400).json(error);
        }

        if (req.body.id === 'evt_00000000000000'){
            return res.status(200).end()
        }

        stripe.events.retrieve(req.body.id, (err, event) => {
            if(err) {
                if(err.type === 'StripeAuthenticationError') {
                    err.status = 401;
                } else {
                    err.status = 500;
                }
                return res.status(err.status).json(err)
            }
        
            if(!event) {
                const error = new Error('Stripe event not found');
                error.status = 400;
                return res.status(error.status).json(error);
            }

            handleStripeEvent(event).then(() => {
                return res.json(true)
            }).catch(err => {
                return res.status(500).json(err)
            })
        })
    })
}

const getStripeKey = () => STRIPE_KEY

const repoPaidFor = async ({ owner, repo }) => {
    if (BILLING_DISABLED) {
        return true
    }
    const ownerUser = await User.query().where('username', owner).first()
    if (ownerUser && ownerUser.tier) {
        const userRepos = await Repository.query().where('fullName', 'like', `${ownerUser}/%`).count()
        return userRepos < 5 
    }

    const usersWithAccess = await User.query().whereIn('username', GithubRepository.query('username').where('full_name', `${owner}/${repo}`))
    return usersWithAccess.some(user => {
        return user.tier === 'business'
    })
}

module.exports = {
    getCheckoutSessionId,
    getPortalUrl,
    webhook,
    getStripeKey,
    repoPaidFor,
}