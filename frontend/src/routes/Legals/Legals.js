import React from 'react'
import styled from 'styled-components'
import { Switch, Route, Link } from 'react-router-dom'

import Terms from './Terms'
import Privacy from './Privacy'
import DMCA from './DMCA'
import Takedown from './Takedown'

export const LegalContent = styled.div`
    padding-bottom: 42px;

    .back {
        display: block;
        margin-top: 16px;
        margin-bottom: 12px;
        padding-left: 16px;
        text-decoration: none;
    }

    h3 {
        font-size: 28px;
        margin-bottom: 1.2rem;
        margin-top: 1.4em;
        font-family: Steradian;
        font-style: normal;
        font-weight: bold;
        line-height: 111%;
        letter-spacing: -0.035em;
    }
    ol, ul {
        list-style: initial;
        margin: initial;
        padding: initial;
        line-height: 110%;
        padding-left: 1em;
    }
    li {
        margin-top: 12px;
    }
    p {
        margin-top: 1em;
    }
    h2 {
        margin-top: 1.6em;
        margin-bottom: 1.2em;
    }
    .container {
        width: 100%;
        max-width: 840px;
    }
    .Callout {
        border-left: 3px solid white;
        display: inline-block;
        padding-left: 12px;
    }
`

const AUP = () => (
    <article>
        <h1>Ultima Acceptable Use Policy</h1>
        <div>
            <p>Last modified: April 30, 2020</p>

            <p>Use of the Services is subject to this Acceptable Use Policy.</p>
            <p>Capitalized terms have the meaning stated in the applicable agreement between Customer and Ultima Technology Limited "Ultima".</p>
            <p>Customer agrees not to, and not to allow third parties to use the Services:</p>

            <ul>
                <li>to violate, or encourage the violation of, the legal rights of others (for example, this may
                include allowing Customer End Users to infringe or misappropriate the intellectual property rights of others
                in violation of the Digital Millennium Copyright Act);</li>
                <li>to engage in, promote or encourage illegal activity;</li>
                <li>for any unlawful, invasive, infringing, defamatory or fraudulent purpose (for example, this may include phishing, creating a pyramid scheme or mirroring a website);</li>
                <li>to intentionally distribute viruses, worms, Trojan horses, corrupted files, hoaxes, or other items of a destructive or deceptive nature;</li>
                <li>to interfere with the use of the Services, or the equipment used to provide the Services, by customers, authorized resellers, or other authorized users;</li>
                <li>to disable, interfere with or circumvent any aspect of the Services;</li>
                <li>to generate, distribute, publish or facilitate unsolicited mass email, promotions, advertisings or other solicitations (“spam”); or</li>
                <li>to use the Services, or any interfaces provided with the Services, to access any other Ultima product or service in a manner that violates the terms of service of such other Ultima product or service.</li>
            </ul>
        </div>
    </article>
)


const ListContainer = styled.ul`
    width: 300px;
    list-style: none !important;
    padding-left: 0;
`

const Container = styled.div`
    display: flex;
    flex-direction: row;
`

const List = () => (
    <ListContainer>
        <li><Link to="/legals/aup">Acceptable Use Policy</Link></li>
        <li><Link to="/legals/terms">Terms of Service</Link></li>
        <li><Link to="/legals/privacy">Privacy Policy</Link></li>
        <li><Link to="/legals/dmca">DMCA Policy</Link></li>
        <li><Link to="/legals/takedown">Emergency Takedown Request</Link></li>
        <li><a href="/.well-known/security.txt">Security.txt</a></li>
    </ListContainer>
)

const Legals = () => (
    <LegalContent id="ultima-root">
        <a href="/" className="back">{'<--'} back to Ultima</a>
        <Container>
            <List />
            <div className="container">
                <Switch>
                    <Route path="/legals/aup" component={AUP} />
                    <Route path="/legals/privacy" component={Privacy} />
                    <Route path="/legals/terms" component={Terms} />
                    <Route path="/legals/dmca" component={DMCA} />
                    <Route path="/legals/takedown" component={Takedown} />
                    <Route path="/legals/" component={List} />
                </Switch>
            </div>
        </Container>
    </LegalContent>
)

export default Legals