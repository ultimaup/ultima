import React from 'react'
import { LegalContent } from '../Legals/Legals'
import '../Home/Home.css'

const Security = () => {
    return (
        <>
        <div className="nav">
            <div className="grid">
                <div className="logo" onClick={() => { window.location.href = '/' }}>
                    <div className="logo-img"></div>
                    <span className="logo-text">ultima</span>
                </div>
                <a href="https://medium.com/words-from-ultima">Announcements</a>
                <a href="https://twitter.com/ultimaup"><span className="mobile-hide">Live </span>updates</a>
            </div>
        </div>
        <LegalContent>
            <div className="container" style={{ margin: 'auto', maxWidth: 960, marginTop: 32 }}>
                
            <h1>Security</h1>
            <h2>Acknowledgements</h2>
            <p>Here are a list of people who have kindly reported vulnerabilities in our system, and helped us rectify them:</p>
                <ul>
                    <li><a href="/.well-known/security.txt">Your name here?</a></li>
                </ul>
            </div>
        </LegalContent>
        </>
    )
}

export default Security